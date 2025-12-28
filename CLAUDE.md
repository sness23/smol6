# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**smol6** is an Electron desktop application that wraps the **smol** molecular viewer - a Mol* variant with an integrated PyMOL-style command console for interactive molecular visualization.

### Project Relationship

```
~/github/sness23/
├── molstar0/           # Fork of Mol* with smol viewer source
│   └── src/apps/smol/  # smol viewer source code
│       ├── app.ts      # Main viewer class
│       ├── index.html  # Console UI
│       └── console/    # Console commands
│
└── smol6/              # THIS PROJECT - Electron wrapper
    └── public/smol/    # Pre-built smol assets (copied from molstar0)
        ├── molstar.js  # ~5MB bundled viewer
        └── molstar.css
```

**smol6** does NOT contain the viewer source code. It loads pre-built assets from `public/smol/` which are built in `molstar0` and copied here.

## Development Commands

```bash
npm run dev      # Start dev server with HMR
npm run build    # Full production build (tsc → vite build → electron-builder)
npm run lint     # ESLint for TypeScript
npm run preview  # Preview production build
```

## Syncing with molstar0

When the smol viewer in molstar0 is updated, sync the built assets:

```bash
# 1. Build smol in molstar0
cd ~/github/sness23/molstar0
npm run build:apps   # Production build
# OR
npm run dev:smol     # Dev build (larger, with source maps)

# 2. Copy built assets to smol6
cd ~/github/sness23/smol6
cp ../molstar0/build/smol/molstar.js ../molstar0/build/smol/molstar.css ../molstar0/build/smol/favicon.ico public/smol/
cp -r ../molstar0/build/smol/images public/smol/

# 3. Test
npm run dev
```

## Architecture

### Three-Process Model (Electron)

1. **Main Process** (`electron/main.ts`): App lifecycle, window management, 300% default zoom
2. **Preload Script** (`electron/preload.ts`): IPC bridge via `contextBridge`
3. **Renderer Process** (`index.html`): Loads pre-built smol viewer from `public/smol/`

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.ts` | Electron main process, creates BrowserWindow with no menu bar |
| `electron/preload.ts` | Exposes `ipcRenderer` methods to renderer |
| `index.html` | Console UI and viewer initialization (all console logic inline) |
| `public/smol/molstar.js` | Pre-built Mol* smol viewer (~5MB, not bundled by Vite) |
| `public/smol/molstar.css` | Viewer styles |
| `vite.config.ts` | Vite + Electron plugin configuration |

### Build Output

- `dist/` - Compiled renderer (HTML + public assets)
- `dist-electron/` - Compiled main process and preload
- `release/${version}/` - Platform installers (DMG, NSIS, AppImage)

## Console Commands (in-app)

| Shortcut | Action |
|----------|--------|
| **F2** | Toggle console |
| **Escape** | Hide console |
| **Enter** | Show console (when hidden) |
| **Up/Down** | Command history |

| Command | Description |
|---------|-------------|
| `load <pdbid>` | Load PDB structure (e.g., `load 1cbs`) |
| `color <color>` | Color all atoms |
| `color @CA <color>` | Color alpha carbons |
| `color :A <color>` | Color chain A |
| `close` | Clear all structures |
| `help` | Show available commands |

## Notes

- React deps in package.json are for Vite plugin compatibility only (app doesn't use React)
- Chunk size limit set to 10MB for molstar.js
- D-Bus errors on Linux are harmless
- Default zoom is 300% (set in `electron/main.ts`)
