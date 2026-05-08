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
npm run dev      # Start dev server with HMR (also launches Electron)
npm run build    # Full production build (tsc → vite build → electron-builder)
npm run lint     # ESLint for TypeScript (--max-warnings 0)
npm run preview  # Preview production build
```

There is no test suite — `package.json` defines only `dev`, `build`, `lint`, and `preview`. Don't hunt for test commands. Default branch is `main`; active work usually lives on a feature branch.

## Platforms

Primary development is on Linux. The `electron-builder.json5` config has targets for macOS (DMG), Windows (NSIS x64), and Linux (AppImage). For VR support (Meta Quest 2 via Quest Link), a Windows build is required — Linux has no WebXR runtime. See `docs/vr-setup.md` for the VR story and `docs/windows-port.md` for the Windows porting checklist. Windows-specific helper scripts live in `scripts/*.cmd`; the bash scripts in the repo root are Linux/macOS (or Git Bash on Windows).

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
| `shows/` | Presentation `.show` files (casp15/, generated/) — see Presentation System below |
| `smol-present` | Terminal-side presenter script (sends commands via HTTP 8888) |
| `smol-cmd` | Send a single console command via HTTP 8888 |
| `smol-load` | Load local file(s) by relative path — resolves to absolute path, then POSTs `load` |
| `smol-repl` | Bash REPL: read commands from stdin, send each via HTTP 8888 |
| `smol-cli.py` | Python REPL (uses `urllib`/`readline`) — same protocol as `smol-repl` |
| `smol-play` | Replay a `.smol` script (timed command list — see below) via HTTP 8888 |
| `smol-record` | `smol-play` + `ffmpeg x11grab` to record screen while a script plays |
| `scripts/*.smol` | Timed command scripts for `smol-play`/`smol-record` |
| `scripts/smol-gen-show.py` | Generates `.show` slideshow files from a template |

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
| `load <path>` | Load local file — relative paths resolve against session cwd (see `cd`/`pwd`) |
| `load <url>` | Load from `http(s)://` or `file://` URL |
| `pwd` | Print session working directory |
| `cd [<path>]` | Change session working directory (`~` expansion, no-arg = home) |
| `ls [<path>]` | List directory entries (default: cwd); dirs suffixed with `/`; capped at 500 |
| `png [<file>] [width N] [height N] [transparent]` | Save viewport PNG to session cwd (or absolute path). Default filename `shot-YYYY-MM-DDTHHMMSS.png`. |
| `screenshot ...` | Alias for `png` |
| `color <color>` | Color all atoms |
| `color @CA <color>` | Color alpha carbons (`@` = atom name) |
| `color /A <color>` | Color chain A (`/` = chain; **note**: `:` is *residue*, not chain — ChimeraX semantics) |
| `color #2 <color>` | Color structure with model ID 2 (`#` = model; IDs increment monotonically and don't reset on `close` — use `list` to check) |
| `close` | Clear all structures |
| `console overlay` | Full-screen console overlay (mouse controls terminal, spacemouse/knobs control protein) |
| `console compact` | Return to small bottom-left console |
| `console hide` | Hide console |
| `console show` | Show console |
| `console toggle` | Toggle console visibility |
| `preset default` | Reset all canvas3d parameters and camera to startup defaults |
| `present <file>` | Run interactive slideshow (Enter to advance, q to quit) |
| `restart` | Reload the renderer — fresh WebGL context, clears all structures. Main process and HTTP/WS servers untouched. |
| `exit` / `quit` | Quit the smol6 application (main process + all windows). |
| `help` | Show available commands |

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
| `initialCwd` | string | `$HOME` | Starting session cwd (`~` expansion supported). Used by `pwd`/`cd`/`ls`/`load`. Falls back to `$HOME` if invalid. |

Settings are loaded once at startup by `electron/main.ts` and passed to the renderer via IPC (`get-settings` channel). The renderer applies `consoleMode` after initialization.

### Console Overlay Mode

When in overlay mode (`console overlay`), the console covers the entire window with a semi-transparent dark background. This is designed for spacemouse/knob workflows where:
- The **mouse** interacts with the terminal (typing commands, scrolling output)
- The **spacemouse** controls protein translation/rotation
- The **MIDI knobs** control clip/fog/other parameters

Use `console compact` or restart with `"consoleMode": "compact"` to return to the small console.

## Side instance (mirror setup)

To run a second smol6 alongside the main one (e.g. one on the main display, one on a side window, both showing the same molecule responding to the same input):

```bash
npm run dev          # main instance:  ports 8888 / 8889, Vite 5173, default profile
npm run dev:side     # side instance:  ports 9888 / 9889, Vite 5174, ~/.smol6-side profile
```

`dev:side` sets these env vars before running Vite + Electron:
- `SMOL_HTTP_PORT=9888`
- `SMOL_WS_PORT=9889`
- `SMOL_USER_DATA_DIR=$HOME/.smol6-side`  (Chromium needs a distinct profile per process)
- `vite --port 5174`  (so Vite doesn't collide with the main instance on 5173)

Defaults remain 8888/8889 when no env vars are set, so existing workflows are unchanged.

There's also a `./smol-side` wrapper that runs the **packaged AppImage** with the same env-var setup — useful if you've done `npm run build` and want to run the side window from the production build.

Pair either approach with two broker-relay processes (one per port) to fan the same input out to both windows. See `~/data/dev/broker/README.md` "Running the full system" section.

## Hardware Control (zknobs / SpaceMouse)

smol6 accepts real-time hardware input via a WebSocket server on port 8889 (configurable via `SMOL_WS_PORT`):

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
- `restart` — `window.location.reload()` the renderer
- `exit` / `quit` — send `app-quit` IPC; main calls `app.quit()`
- `png` / `screenshot` — grab PNG via `viewportScreenshot.getImageDataUri()`, send base64 to main, main writes to session cwd. Bypasses molstar's browser-download path so files land in a specified directory, not `~/Downloads`.
- `pwd` / `cd` / `ls` — backed by `fs-*` IPC to main (session cwd lives in main, survives `restart`)
- `load <path|url>` — paths resolve against session cwd; absolute paths, `file://`, and `http(s)://` go straight to `viewer.loadStructureFromUrl`. 4-char alphanumeric args fall through to molstar (PDB ID).

All other commands (including 900+ ChimeraX commands) pass through to `window.viewer.plugin.console.execute()`.

## HTTP Command Server (port 8888)

The main process runs an HTTP server on `127.0.0.1:8888` for external scripting:

```bash
# Send any console command from the terminal
curl -X POST http://127.0.0.1:8888/command -d "load 1cbs"
curl -X POST http://127.0.0.1:8888/command -d "color red"
```

Returns the command result as plain text (5s timeout). This enables scripting smol6 from external tools, shell scripts, or other applications.

### Helper scripts

- `smol-cmd <command>` — thin wrapper around the `curl` call above.
- `smol-load <file>...` — resolves each arg to an absolute path (via `realpath` on Linux, dirname/pwd fallback on macOS) before POSTing `load <abs>`. Lets you type `smol-load pred.model_idx_0.cif` from any directory; shell brace-expansion (`smol-load pred.model_idx_{0..4}.cif`) loads multiple files. Both honor `SMOL_HOST` / `SMOL_PORT`.

## File Loading from Command Line

```bash
# Open a local structure file directly
./smol6 /path/to/structure.pdb
```

The main process resolves the file path from `process.argv` and sends it to the renderer via `load-file` IPC channel after the window loads.

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-settings` | renderer → main | Load `~/.smol` settings (invoke/handle) |
| `spacemouse-event` | main → renderer | Forward WebSocket hardware events |
| `execute-command` | main → renderer | Forward HTTP command server requests |
| `command-result` | renderer → main | Return command execution result |
| `load-file` | main → renderer | Send file path from CLI args |
| `fs-pwd` | renderer → main | Return session cwd (invoke/handle) |
| `fs-cd` | renderer → main | Change session cwd; returns `{ok, cwd}` or `{ok:false, error}` |
| `fs-ls` | renderer → main | List dir entries; returns `{ok, cwd, entries, truncated, total}` |
| `fs-resolve` | renderer → main | Resolve arg against session cwd → absolute path (used by `load` interceptor) |
| `app-quit` | renderer → main | Quit the app (main calls `app.quit()`) |
| `save-png` | renderer → main | Write PNG bytes (base64) to session-cwd-resolved path; returns `{ok, path}` or `{ok:false, error}` |
| `main-process-message` | main → renderer | Startup timestamp (unused by renderer) |

## Presentation System (Video Production)

Interactive slideshow system for creating molecular visualization videos.

### In-Console Presenter

```
present casp15/01-H1114-hydrogenase    # relative to shows/ dir
present /absolute/path/to/file.show    # absolute path
```

- Displays narration text in console, executes commands automatically
- Press **Enter** to advance slides, **q** to quit
- Designed for live recording with OBS (read narration aloud while presenting)

### Terminal Presenter (`smol-present`)

```bash
./smol-present shows/casp15/01-H1114-hydrogenase.show
```

Same slideshow but narration displays in the terminal (larger text, better for teleprompter use). Commands sent to smol6 via HTTP port 8888.

### Show File Format (`.show`)

```
# Title of the Show
---
Narration text displayed for you to read.
Multiple lines are fine.

> load 1cbs
> @2
> view ligand
> spin 0.2
---
Next slide narration here.

> stop
> reset
```

- `---` separates slides
- `> command` lines are sent to smol6
- `> @N` waits N seconds between commands
- `## comments` are skipped
- `# Title` (before first `---`) is the show title
- Everything else is narration text

### Show Files

Located in `shows/casp15/` — 15 pre-written shows for CASP15 ligand targets. Auto-generated shows live in `shows/generated/` (see `scripts/smol-gen-show.py` and `docs/auto-show-generation.md`).

### `.smol` Script Format (for `smol-play` / `smol-record`)

Distinct from `.show` slideshows — `.smol` files are timed command scripts with no narration:

```
# Comments start with #
close
load 1crn
@2          # wait 2 seconds
color :A red
@1
spin 0.5
```

- One command per line; blank lines and `#`-comments are skipped
- `@N` lines pause for N seconds (script-level timing, not command-level)
- Examples in `scripts/01-molecule-tour-crambin.smol`, `scripts/02-docking-tutorial-1cbs.smol`, `scripts/03-coding-demo.smol`

### IPC Channels (Presentation)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `read-show-file` | renderer → main | Read .show file from disk (invoke/handle) |

## Reference Docs (`docs/`)

Long-form reference material that's worth grepping before guessing at Mol* internals:

| File | Topic |
|------|-------|
| `console-commands-reference.md` | Full console command reference (canonical list) |
| `all-canvas3d-params.md`, `unmapped-params.md` | Mol* `canvas3d` parameter tour |
| `clipping-deep-dive.md`, `clip-radius.md`, `min-near.md`, `fog.md` | Clipping/fog/near-plane mechanics |
| `materials.md`, `postprocessing-effects.md`, `global-illumination.md`, `interior-darkening.md` | Render/material parameter notes |
| `knob-cheatsheet.md`, `knob-mapping-plan.md`, `zknobs-architecture.md` | MIDI knob mapping + hardware architecture |
| `auto-show-generation.md` | `.show` file authoring / generator |
| `RESEARCH-console-hide.md`, `TESTING-PLAN.md` | Design notes |
| `SMOKETEST.md` | Manual run-through covering load / select / show-hide / align / png / restart, plus a "Today's focus" section for in-flight work |
| `vr-setup.md`, `windows-port.md` | VR (Quest 2) and Windows-port checklists |

## Notes

- React deps in package.json are for Vite plugin compatibility only (app doesn't use React)
- Chunk size limit set to 10MB for molstar.js
- D-Bus errors on Linux are harmless
- Default zoom is 300% (configurable via `~/.smol`)
- `bufferutil` and `utf-8-validate` are externalized in Vite config (optional native deps for `ws`)
