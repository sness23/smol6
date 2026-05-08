import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

// Override the Chromium user data dir if SMOL_USER_DATA_DIR is set.
// This must run before the app emits 'ready' so that any internal Electron
// path lookups see the new value. Required when running two smol6 instances
// side-by-side (the mirror setup) — Chromium refuses two processes sharing
// the same profile.
{
  const dir = process.env.SMOL_USER_DATA_DIR
  if (dir) {
    const expanded = dir.startsWith('~/')
      ? path.join(os.homedir(), dir.slice(2))
      : dir
    const abs = path.isAbsolute(expanded) ? expanded : path.resolve(expanded)
    try { fs.mkdirSync(abs, { recursive: true }) } catch { /* ignore */ }
    app.setPath('userData', abs)
    console.log(`[smol6] user data dir: ${abs}`)
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0 || n > 65535) {
    console.warn(`[smol6] invalid ${name}="${raw}", using ${fallback}`)
    return fallback
  }
  return n
}

const COMMAND_PORT       = envInt('SMOL_HTTP_PORT', 8888)
const SPACEMOUSE_WS_PORT = envInt('SMOL_WS_PORT',   8889)

// Get file path from command line arguments (skip electron args)
function getFileFromArgs(): string | null {
  const args = process.argv.slice(app.isPackaged ? 1 : 2)
  for (const arg of args) {
    // Skip flags
    if (arg.startsWith('-')) continue
    // Check if it's a file path
    const resolved = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
    if (fs.existsSync(resolved)) {
      return resolved
    }
  }
  return null
}

let fileToLoad: string | null = null

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let commandServer: http.Server | null = null
let spacemouseWss: WebSocketServer | null = null

// Settings file: ~/.smol
const SETTINGS_PATH = path.join(os.homedir(), '.smol')

interface SmolSettings {
  consoleMode?: 'compact' | 'overlay'
  zoom?: number
  initialCwd?: string
  [key: string]: unknown
}

function loadSettings(): SmolSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Failed to load ~/.smol settings:', e)
  }
  return {}
}

const settings = loadSettings()

// Session cwd — the shell-style working directory shared by the in-app console
// and the HTTP command server. Survives renderer reload (`restart`).
function expandHome(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function resolveUnderCwd(p: string): string {
  const expanded = expandHome(p)
  if (path.isAbsolute(expanded)) return path.normalize(expanded)
  return path.resolve(sessionCwd, expanded)
}

let sessionCwd: string = (() => {
  const raw = typeof settings.initialCwd === 'string' ? settings.initialCwd : os.homedir()
  const expanded = expandHome(raw)
  try {
    if (fs.existsSync(expanded) && fs.statSync(expanded).isDirectory()) return expanded
  } catch {
    // fall through
  }
  return os.homedir()
})()

const LS_LIMIT = 500

function startSpacemouseServer() {
  spacemouseWss = new WebSocketServer({ port: SPACEMOUSE_WS_PORT, host: '127.0.0.1' })
  console.log(`SpaceMouse WebSocket server listening on ws://127.0.0.1:${SPACEMOUSE_WS_PORT}`)

  spacemouseWss.on('connection', (ws: WebSocket) => {
    console.log('SpaceMouse client connected')
    ws.on('message', (data: Buffer) => {
      if (win) {
        win.webContents.send('spacemouse-event', data.toString())
      }
    })
    ws.on('close', () => {
      console.log('SpaceMouse client disconnected')
    })
  })

  spacemouseWss.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`SpaceMouse WebSocket port ${SPACEMOUSE_WS_PORT} already in use`)
    } else {
      console.error('SpaceMouse WebSocket error:', err)
    }
  })
}

function startCommandServer() {
  commandServer = http.createServer((req, res) => {
    // CORS headers for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url === '/command') {
      let body = ''
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString()
      })
      req.on('end', async () => {
        const command = body.trim()
        if (command && win) {
          // Send command and wait for renderer to reply with result
          const resultPromise = new Promise<string>((resolve) => {
            const timeout = setTimeout(() => resolve('OK'), 5000)
            ipcMain.once('command-result', (_event, result: string) => {
              clearTimeout(timeout)
              resolve(result)
            })
          })
          win.webContents.send('execute-command', command)
          const result = await resultPromise
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end(result)
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Error: No command or no window')
        }
      })
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found. POST to /command')
    }
  })

  commandServer.listen(COMMAND_PORT, '127.0.0.1', () => {
    console.log(`Command server listening on http://127.0.0.1:${COMMAND_PORT}`)
  })

  commandServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${COMMAND_PORT} is already in use`)
    } else {
      console.error('Command server error:', err)
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // Allow fetch() from the renderer to local files (file://) and
      // non-CORS-enabled localhost servers. smol6 renders only trusted
      // bundled content and never navigates to untrusted URLs, so the
      // same-origin policy buys us nothing here and blocks the 'load'
      // command from reaching local files.
      webSecurity: false,
    },
  })

  // Minimal menu with DevTools shortcut (F12)
  const menu = Menu.buildFromTemplate([{
    label: 'Dev',
    submenu: [
      { role: 'toggleDevTools', accelerator: 'F12' },
    ],
  }])
  win.setMenu(menu)
  win.setMenuBarVisibility(false)

  // Register zoom keyboard shortcuts
  registerZoomShortcuts(win)

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    // Set zoom level after page loads (default 3.0 = 300%, configurable via ~/.smol)
    win?.webContents.setZoomFactor(settings.zoom ?? 3.0)
    win?.webContents.send('main-process-message', (new Date).toLocaleString())

    // Send file to load if provided via command line
    if (fileToLoad) {
      win?.webContents.send('load-file', fileToLoad)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function registerZoomShortcuts(_window: BrowserWindow) {
  // Note: Ctrl+= and Ctrl+- conflict with Chrome's built-in zoom shortcuts
  // and cannot be reliably overridden in Electron. All zoom shortcuts have been removed.
  // Chrome's native zoom shortcuts will still work for page zoom.
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()

  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts before quitting
  globalShortcut.unregisterAll()
  // Close command server
  if (commandServer) {
    commandServer.close()
    commandServer = null
  }
  // Close spacemouse server
  if (spacemouseWss) {
    spacemouseWss.close()
    spacemouseWss = null
  }
})

app.whenReady().then(() => {
  fileToLoad = getFileFromArgs()

  // IPC handler for settings
  ipcMain.handle('get-settings', () => settings)

  // Session CWD: pwd / cd / ls / resolve
  ipcMain.handle('fs-pwd', () => sessionCwd)

  ipcMain.handle('fs-cd', (_event, arg: string) => {
    const target = arg && arg.trim() ? arg.trim() : os.homedir()
    try {
      const resolved = resolveUnderCwd(target)
      if (!fs.existsSync(resolved)) return { ok: false, error: `no such file or directory: ${target}` }
      if (!fs.statSync(resolved).isDirectory()) return { ok: false, error: `not a directory: ${target}` }
      sessionCwd = resolved
      return { ok: true, cwd: sessionCwd }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('fs-ls', (_event, arg: string) => {
    const target = arg && arg.trim() ? resolveUnderCwd(arg.trim()) : sessionCwd
    try {
      if (!fs.existsSync(target)) return { ok: false, error: `no such file or directory` }
      const st = fs.statSync(target)
      if (!st.isDirectory()) {
        return { ok: true, cwd: target, entries: [{ name: path.basename(target), isDir: false }], truncated: false, total: 1 }
      }
      const raw = fs.readdirSync(target, { withFileTypes: true })
        .filter((d) => !d.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name))
      const total = raw.length
      const truncated = total > LS_LIMIT
      const entries = raw.slice(0, LS_LIMIT).map((d) => ({ name: d.name, isDir: d.isDirectory() }))
      return { ok: true, cwd: target, entries, truncated, total }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('fs-resolve', (_event, arg: string) => {
    try {
      return { ok: true, absolutePath: resolveUnderCwd(arg) }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.on('app-quit', () => app.quit())

  ipcMain.handle('save-png', (_event, arg: { path: string; base64: string }) => {
    try {
      const target = resolveUnderCwd(arg.path)
      const dir = path.dirname(target)
      if (!fs.existsSync(dir)) return { ok: false, error: `no such directory: ${dir}` }
      fs.writeFileSync(target, Buffer.from(arg.base64, 'base64'))
      return { ok: true, path: target }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // IPC handler for reading show files
  ipcMain.handle('read-show-file', (_event, filePath: string) => {
    try {
      // In dev, shows/ lives at APP_ROOT. In a packaged build, electron-builder
      // copies it to process.resourcesPath via extraResources.
      const showsRoot = app.isPackaged
        ? path.join(process.resourcesPath, 'shows')
        : path.join(process.env.APP_ROOT!, 'shows')
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(showsRoot, filePath)
      // Try exact path first, then with .show extension
      let target = resolved
      if (!fs.existsSync(target) && !target.endsWith('.show')) {
        target = resolved + '.show'
      }
      if (!fs.existsSync(target)) {
        return { error: `File not found: ${filePath}` }
      }
      const content = fs.readFileSync(target, 'utf-8')
      return { content, path: target }
    } catch (e: unknown) {
      return { error: `Failed to read file: ${(e as Error).message}` }
    }
  })

  createWindow()
  startCommandServer()
  startSpacemouseServer()
})
