# Windows Port Checklist

This doc captures everything needed to get smol6 running on Windows, with a focus on the Meta Quest 2 + Quest Link workflow that is the main motivation for a Windows build. Read `docs/vr-setup.md` first if you have not already.

## TL;DR

The Electron app itself is already almost cross-platform. The `electron-builder.json5` Windows target is configured, `os.homedir()` and `path.join` are used consistently, and the bundled molstar viewer is just WebGL2 + WebXR. The gaps are:

1. A handful of bash helper scripts (`smol-cmd`, `smol-repl`, `smol-play`, `smol-present`, `smol-record`) need Windows equivalents.
2. The `BrowserWindow.icon` points at an SVG, which does not render well on Windows.
3. `smol-record` uses ffmpeg `x11grab`, which is Linux-only.
4. Default zoom factor 3.0 is tuned for a 4K Linux workstation and is probably too aggressive on typical Windows displays.
5. Quest Link / Air Link must be active before launching smol6, otherwise Chromium will not enumerate the headset.

None of those are blockers. The app will launch, the VR icon will light up under Quest Link, and the HTTP command server on port 8888 will work.

## Prerequisites on the Windows host

- **Node.js 18+** (matches the version used on Linux; any LTS works)
- **Git for Windows** — ships `bash` + `curl` via Git Bash, which is the fastest way to run the existing bash helper scripts unchanged
- **Meta Quest Link desktop app** installed and signed in
- **Quest Link cable** (USB 3 to USB-C) or a reliable 5 GHz Wi-Fi for Air Link
- **Visual Studio Build Tools** only if you hit native-module compile issues (unlikely — `ws` is the only native dep and `bufferutil` / `utf-8-validate` are externalized in `vite.config.ts`)

## Building on Windows

```powershell
cd C:\path\to\smol6
npm install
npm run build
```

This runs `tsc && vite build && electron-builder`. electron-builder reads `electron-builder.json5` and produces:

- `release\<version>\smol-Windows-<version>-Setup.exe` — NSIS installer (x64)

The installer defaults to per-user install (`"perMachine": false`), allows choosing the install directory, and does not wipe app data on uninstall. The VR icon, HTTP server, WebSocket knobs server, `~/.smol` settings reader, and presentation system are all packaged in.

### Cross-building from Linux (not recommended)

electron-builder can build the Windows installer from Linux using Wine, but it is flaky and slower than building natively. Do it on the Windows host. If you really need to cross-build, run it inside the official electron-builder Docker image.

## Runtime notes

### `~/.smol` settings location

On Windows, `os.homedir()` returns `C:\Users\<you>`. Create the settings file at `C:\Users\<you>\.smol`:

```json
{
  "consoleMode": "compact",
  "zoom": 1.5
}
```

The `zoom` default of 3.0 in `electron/main.ts:182` was picked for a high-DPI Linux workstation. On a typical Windows 100% scale display, that is far too large — drop it to `1.5` or `1.0`.

### Windows Firewall prompts

On first launch smol6 will bind:

- HTTP command server on `127.0.0.1:8888`
- WebSocket spacemouse server on `127.0.0.1:8889`

Both bind to loopback only, so Windows Firewall usually does not prompt. If it does, accept "Private networks" (not Public) so external machines on the LAN cannot reach them.

### Quest Link startup order

Chromium only enumerates VR devices at process startup. The correct sequence is:

1. Start the Meta Quest Link desktop app, put the headset on, confirm you see the Meta desktop environment.
2. *Then* launch smol6.

If you start smol6 first and then plug in the Quest, the VR icon will stay greyed out. Quit and relaunch.

### Enabling WebXR by flag (only if the icon stays greyed out)

Electron 30 ships Chromium 124, which enables WebXR Device API by default on Windows. If for some reason the icon is unresponsive and you know Quest Link is running, add this to `electron/main.ts` before `app.whenReady()`:

```ts
app.commandLine.appendSwitch('enable-features', 'WebXR,WebXRLayers')
```

Do not add this speculatively — it is harmless but muddies intent.

### D-Bus errors

The existing D-Bus noise on Linux does not happen on Windows. You may see different Chromium warnings (GPU process, ANGLE) which are similarly harmless.

## Helper scripts — status per script

The `smol-*` bash scripts in the repo root are the main porting gap. Status as of this writing:

| Script | Purpose | Status on Windows |
|---|---|---|
| `smol-cmd` | POST one command to port 8888 | Ported — use `scripts\smol-cmd.cmd` |
| `smol-repl` | Interactive command REPL | Ported — use `scripts\smol-repl.cmd` |
| `smol-play` | Run a `.smol` timed script | **Not yet ported.** Bash logic is simple; Node or PowerShell rewrite is ~30 lines |
| `smol-present` | 290-line interactive slideshow presenter | **Not yet ported.** Complex bash parsing + keyboard handling; best to rewrite in Node as `scripts/smol-present.mjs` for full cross-platform support |
| `smol-record` | Screen capture via `ffmpeg x11grab` | **Linux-only.** Windows equivalent would swap `x11grab` for `gdigrab` (desktop) or `dshow` (window capture). Separate script, not a straight port |

Shortcut for everything not yet ported: **install Git for Windows and run the original scripts from Git Bash.** They work unchanged because `curl` is available on Git Bash's PATH, and the scripts only touch HTTP endpoints on `localhost`. This is the recommended path until the Node rewrites land.

### Python dependency for `smol-present --generate`

`scripts/smol-gen-show.py` is called from `smol-present --generate`. It needs Python 3 on PATH and `OPENAI_API_KEY` set in the environment. No changes needed for Windows — just `pip install` whatever the script imports (check the script header).

## zknobs / SpaceMouse on Windows

The `zknobs.py` daemon lives in a separate repo (`~/github/sness23/zknobs`) and talks to a Midi Fighter Twister over USB MIDI. On Windows:

- Python `mido` + `python-rtmidi` work out of the box with Windows MIDI (WinMM backend).
- The Midi Fighter Twister shows up as a standard USB MIDI device, no driver needed.
- Run `python zknobs.py` from PowerShell or CMD; it will connect to smol6's WebSocket on `127.0.0.1:8889`.

SpaceMouse (3Dconnexion) hardware support on Windows goes through the 3DxWare driver, which exposes the device to any WebHID-capable browser. The smol6 viewer reads SpaceMouse via the same WebSocket protocol as knobs, so whatever produces those `motion` events needs to keep working — check how it is wired on the Linux side.

## Cosmetic polish (nice-to-have)

### Window icon

`electron/main.ts:160` sets `icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg')`. SVG is not a reliable window icon format on Windows. Replace with a real `.ico`:

1. Drop an `icon.ico` into `public/` (256×256 multi-size ICO, or regenerate from the existing `public/smol/favicon.ico`).
2. Update `main.ts` to reference it.
3. Optionally drop a `build/icon.ico` so electron-builder uses it for the NSIS installer too.

### Installer icon

No `build/icon.ico` exists, so electron-builder will use its default Electron icon for the NSIS installer. Not a blocker; add one when you care.

## Test plan after the port

1. `npm run dev` on Windows — main window opens, console responds to F2.
2. Drop a `~/.smol` with `zoom: 1.5` — window comes up at comfortable size on restart.
3. `curl -X POST http://127.0.0.1:8888/command -d "load 1cbs"` from PowerShell — structure loads.
4. `scripts\smol-repl.cmd` — interactive commands work.
5. Plug in Quest 2, start Meta Quest Link, confirm desktop mirror. Launch smol6. VR icon in the Mol* viewport should be active.
6. Click VR icon, accept XR permission prompt if shown. Headset enters immersive session.
7. In-headset, load a structure via the console (mouse-and-keyboard still work on the desktop mirror while the viewer renders to the headset).
8. `npm run build` — installer lands in `release\<version>\smol-Windows-<version>-Setup.exe`.
9. Install, launch from Start menu, repeat step 5. Verify `present casp15/01-H1114-hydrogenase` works in the packaged build (confirms `shows/` is reachable via `extraResources` → `process.resourcesPath`).

## Known gaps after this checklist is green

- `smol-play`, `smol-present`, `smol-record` still need native Windows equivalents. Git Bash is the workaround.
- No installer signing, so Windows SmartScreen will warn on first launch. Sign later if you distribute outside your own machine.
- No auto-update wiring.
