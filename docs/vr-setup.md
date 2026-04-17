# VR Setup (Meta Quest 2 and other WebXR headsets)

The VR icon on the right side of the smol6 interface is Mol*'s built-in WebXR button. Clicking it calls `navigator.xr.requestSession()` — it prioritizes `'immersive-ar'`, then falls back to `'immersive-vr'`. Anything that can run WebXR in a browser can drive it.

The relevant source (in the `molstar0` repo, not bundled here):

| File | Role |
|------|------|
| `molstar0/src/mol-plugin-ui/viewport.tsx:152` | Renders the headset icon, gated on `showXr` config + `xrIsSupported` |
| `molstar0/src/mol-canvas3d/helper/xr-manager.ts:263-278` | `navigator.xr.isSessionSupported()` check + `requestSession()` call |
| `molstar0/src/mol-plugin/config.ts:63` | `ShowXR` config: `'auto'` (default) / `'always'` / `'never'` |

## The problem: Electron + Linux cannot see the Quest

On Linux, Chromium (and therefore Electron) has no VR runtime to enumerate devices. `navigator.xr.isSessionSupported('immersive-vr')` returns `false` no matter what flags you pass, so the icon will stay disabled inside the smol6 Electron window. Meta's Quest Link and Air Link are Windows-only; there is no official Oculus/Meta runtime for Linux.

ALVR exists as a community Linux-side Quest streamer, but it targets SteamVR games and does **not** expose a WebXR device to Chromium, so it does not help here.

## What works on Linux: serve smol6 to the Meta Quest Browser

The smol viewer is just WebGL2 + WebXR, so it runs directly inside the Quest's built-in Meta Quest Browser, which has full WebXR support. The flow is: serve the viewer over HTTPS on your LAN, open it in the headset's browser, click the VR icon from there.

### 1. Serve over HTTPS

WebXR requires a secure context. `localhost` is exempt, but the Quest connects from a different IP on your LAN, so you need real HTTPS.

```bash
cd ~/github/sness23/smol6
npx vite --host --https    # self-signed; Quest will warn, accept it
```

Alternatives:
- **`mkcert`** — generate a locally-trusted cert so the Quest does not warn.
- **`ngrok http https://localhost:5173`** — tunnel with a public HTTPS URL (easier if LAN cert handling is a hassle).

### 2. Open on the Quest

1. On the desktop, find your LAN IP: `ip a`.
2. On the Quest, put on the headset and launch **Meta Quest Browser**.
3. Navigate to `https://<lan-ip>:5173`. Accept the certificate warning if self-signed.
4. Wait for the viewer to load (the `molstar.js` bundle is ~5MB).
5. Click the headset icon on the right side. The browser will prompt to enter immersive mode.

### 3. Loading structures

Once in-VR, use the console as normal (`load 1cbs`, etc.). The viewer renders into the headset while the desktop window mirrors a flat view.

## Caveats when loading via Quest Browser

Loading smol6 through the Quest browser means you are running it as a plain web page, not inside Electron. You lose everything the Electron main process provides:

- **HTTP command server on port 8888** — not available, so `curl` scripting and the `smol-present` terminal presenter do not reach the viewer.
- **WebSocket knob server on port 8889** — no forwarding of `zknobs.py` / SpaceMouse events.
- **`~/.smol` settings file** — not read.
- **CLI file loading (`./smol6 file.pdb`)** — not applicable.
- **`read-show-file` IPC** — the in-console `present` command reads show files from disk via IPC and will not work over the web.

You get the viewer and its built-in console, and that is it.

## Does running on Windows help?

Yes — see `docs/windows-port.md` for the full checklist. Short version: Windows has an Oculus/Meta runtime, so Electron's Chromium can actually enumerate the headset. With **Quest Link** (USB cable) or **Air Link** (Wi-Fi), the Quest becomes a PC VR headset as far as Chromium is concerned, and WebXR inside the smol6 Electron window should light up.

**What you gain on Windows:**
- The VR icon inside the native smol6 window works, so you keep the HTTP command server, WebSocket knobs, `~/.smol` settings, `present` command, and CLI file loading — all the Electron-only features that the Quest-browser path loses.
- Commands from `curl`, `smol-present`, and `zknobs.py` reach the viewer while it is rendering to the headset.

**What you still need to verify on Windows:**
- Electron may need to be launched with WebXR feature flags. The relevant Chromium flag is `--enable-features=WebXR`; set it in `electron/main.ts` via `app.commandLine.appendSwitch()` before `app.whenReady()` if the button stays greyed out. Not needed in recent Electron versions, but worth knowing.
- Quest Link / Air Link has to be active and the headset has to be showing the Link desktop before launching smol6 — otherwise Chromium will not see a device at startup.
- Electron's Chromium version must be recent enough to include WebXR (anything from the last couple of years is fine; smol6 is on Electron 30 which is recent).
- The Oculus/Meta software still has to be installed and running on the Windows host.

**What Windows does not fix:**
- Running smol6 natively on Linux and having the Quest work. That would require a Linux WebXR runtime, which does not exist today.
- The standalone Quest (no PC connection). If the Quest is not tethered to a PC, you are back to the Meta Quest Browser path from a machine serving the web assets — and that machine can be Linux or Windows, it does not matter.

## Quick decision tree

- **You want VR and you are staying on Linux:** serve smol6 over HTTPS, open in Meta Quest Browser. Accept loss of Electron-only features (HTTP server, knobs, presenter, `~/.smol`).
- **You want VR and can switch to Windows:** install Quest Link / Air Link, run smol6 natively, click the VR button. All Electron features still work.
- **You want VR with full knob + spacemouse control:** Windows is currently the only path that gives you both at once.
