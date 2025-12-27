# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop application integrating the **smol** molecular viewer (Mol* with PyMOL-style console). Uses Vite + `vite-plugin-electron`.

## Development Commands

```bash
npm run dev      # Start dev server with HMR
npm run build    # Full production build (tsc → vite build → electron-builder)
npm run lint     # ESLint for TypeScript
npm run preview  # Preview production build
```

## Architecture

### Three-Process Model

1. **Main Process** (`electron/main.ts`): App lifecycle, window management, 300% default zoom
2. **Preload Script** (`electron/preload.ts`): IPC bridge via `contextBridge`
3. **Renderer Process** (`index.html`): Loads pre-built smol viewer from `public/smol/`

### Key Files

- `electron/main.ts` - Electron main process, creates BrowserWindow with no menu bar
- `electron/preload.ts` - Exposes `ipcRenderer` methods to renderer
- `index.html` - Console UI and viewer initialization (all console logic is inline)
- `public/smol/molstar.js` - Pre-built Mol* viewer (~9MB, not bundled by Vite)
- `vite.config.ts` - Vite + Electron plugin configuration

### Build Output

- `dist/` - Compiled renderer (HTML + public assets)
- `dist-electron/` - Compiled main process and preload
- `release/${version}/` - Platform installers (DMG, NSIS, AppImage)

## Updating Smol Viewer

When the molstar smol viewer is updated:

```bash
cd ../molstar
npm run build:apps  # or npm run dev:smol

cd ../smol6
cp ../molstar/build/smol/molstar.js ../molstar/build/smol/molstar.css ../molstar/build/smol/favicon.ico public/smol/
cp -r ../molstar/build/smol/images public/smol/
npm run dev
```

## Console Commands (in-app)

- **F2**: Toggle console | **Escape**: Hide | **Enter**: Show (when hidden)
- `load <pdbid>` - Load PDB structure
- `color <color>` - Color atoms (supports `@CA`, `:A` selections)
- `close` - Clear structures
- `help` - Show help

## Notes

- React deps in package.json are for Vite plugin compatibility only (app doesn't use React)
- Chunk size limit set to 10MB for molstar.js
- D-Bus errors on Linux are harmless
