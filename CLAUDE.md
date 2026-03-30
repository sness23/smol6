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

### Important: Renderer is all inline

All renderer logic (console UI, command execution, knob handling, spacemouse camera control) lives as inline `<script>` in `index.html`. There are no separate `.ts` or `.js` source files for the renderer — edit `index.html` directly.

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-settings` | renderer → main (invoke) | Fetch `~/.smol` settings |
| `load-file` | main → renderer | Load molecular file from CLI args |
| `execute-command` | main → renderer | Execute console command from HTTP API |
| `command-result` | renderer → main (send) | Return command execution result |
| `spacemouse-event` | main → renderer | Forward WebSocket hardware events |
| `main-process-message` | main → renderer | Startup timestamp |

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
| `console overlay` | Full-screen console overlay (mouse controls terminal, spacemouse/knobs control protein) |
| `console compact` | Return to small bottom-left console |
| `console hide` | Hide console |
| `console show` | Show console |
| `console toggle` | Toggle console visibility |
| `preset default` | Reset all canvas3d parameters and camera to startup defaults |
| `help` | Show available commands |

## Command-Line File Loading

```bash
# Open a local molecular file directly
smol6 myprotein.pdb
smol6 /path/to/structure.cif
```

Supported formats: `.pdb`, `.sdf`, `.mol`, `.mol2`, `.cif`/`.mmcif`, `.xyz`, `.gro`. The main process resolves the path and sends it to the renderer via IPC `load-file` after window loads.

## Remote Command Server (HTTP)

The main process starts an HTTP server on `127.0.0.1:8888` for scripting/automation:

```bash
# Execute any console command remotely
curl -X POST http://127.0.0.1:8888/command -d "load 1cbs"
curl -X POST http://127.0.0.1:8888/command -d "color red"
```

Returns the command result as plain text. Times out after 5 seconds.

## Settings File (`~/.smol`)

smol6 reads a JSON settings file from `~/.smol` on startup. Create it manually if needed:

```json
{
  "consoleMode": "compact",
  "zoom": 3.0
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `consoleMode` | `"compact"` \| `"overlay"` | `"compact"` | Console mode on startup |
| `zoom` | number | `3.0` | Window zoom factor (3.0 = 300%) |

Settings are loaded once at startup by `electron/main.ts` and passed to the renderer via IPC (`get-settings` channel). The renderer applies `consoleMode` after initialization.

### Console Overlay Mode

When in overlay mode (`console overlay`), the console covers the entire window with a semi-transparent dark background. This is designed for spacemouse/knob workflows where:
- The **mouse** interacts with the terminal (typing commands, scrolling output)
- The **spacemouse** controls protein translation/rotation
- The **MIDI knobs** control clip/fog/other parameters

Use `console compact` or restart with `"consoleMode": "compact"` to return to the small console.

## Hardware Control (zknobs / SpaceMouse)

smol6 accepts real-time hardware input via a WebSocket server on port 8889:

```
Midi Fighter Twister (USB MIDI) → zknobs.py → WebSocket ws://127.0.0.1:8889
    → electron/main.ts (forwards as IPC 'spacemouse-event')
    → index.html renderer (parses JSON, calls canvas3d.setProps())
```

### Two Event Types

- **`clipfog`** (absolute): `{"type": "clipfog", "param": "exposure", "value": 64}` — raw MIDI 0-127, mapped to parameter range in index.html
- **`motion`** (delta): `{"type": "motion", "x": 0, "y": 0, "z": 500, "rx": 0, "ry": 0, "rz": 0}` — relative camera rotation/translation from spacemouse or knobs

### Adding a New Knob Parameter

1. **zknobs.py** (`~/github/sness23/zknobs/zknobs.py`): Add CC constant and `absolute_knobs` dict entry
2. **index.html**: Add `else if (ev.param === 'newParam')` handler in the clipfog block (~line 700+)
3. **index.html**: Add entry to `_knobMeta` table for HUD display: `newParam: ['Display Name', min, max, decimals, 'unit']`

### Knob HUD Badge

A floating overlay (top-right, `#knob-hud`) shows parameter name, progress bar, and mapped value when any knob is turned. Auto-fades after 1.5s. Uses `z-index: 200000` to stay above Mol*'s UI layers (which go up to `100000`).

### Console Commands Handled Locally

Some commands are intercepted in index.html before reaching molstar's ConsoleManager:
- `console overlay` / `console compact` — handled locally for CSS mode switching
- `preset default` — resets all canvas3d props to captured startup defaults

All other commands (including 900+ ChimeraX commands) pass through to `window.viewer.plugin.console.execute()`.

## Notes

- React deps in package.json are for Vite plugin compatibility only (app doesn't use React)
- Chunk size limit set to 10MB for molstar.js
- D-Bus errors on Linux are harmless
- Default zoom is 300% (configurable via `~/.smol`)
