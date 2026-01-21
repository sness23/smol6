import { app, BrowserWindow, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

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

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Remove the menu bar
  win.setMenu(null)

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
})

app.whenReady().then(() => {
  fileToLoad = getFileFromArgs()
  createWindow()
})
