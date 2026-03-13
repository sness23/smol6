import { app, BrowserWindow, globalShortcut, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const COMMAND_PORT = 8888
const SPACEMOUSE_WS_PORT = 8889

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
      req.on('end', () => {
        const command = body.trim()
        if (command && win) {
          win.webContents.send('execute-command', command)
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('OK: ' + command)
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
    // Set zoom level after page loads (3.0 = 300%)
    win?.webContents.setZoomFactor(3.0)
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
  createWindow()
  startCommandServer()
  startSpacemouseServer()
})
