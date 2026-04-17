# FEATURE-load-local: Load local files / arbitrary URLs via the HTTP command server

## Goal

Allow scripting smol6 to load **local files** and **arbitrary HTTP URLs** via the HTTP command server on port 8888 (and via the in-app console), the same way the CLI-arg `load-file` IPC path already works.

Today only PDB-ID loads work over the command server. Trying to load a local file path or a localhost URL returns `Command executed successfully` but silently fails to register the structure.

## Use case

Running `chai-lab fold` on a RunPod GPU pod produces 5 CIF files locally:

```
out0/pred.model_idx_0.cif
out0/pred.model_idx_1.cif
...
out0/pred.model_idx_4.cif
```

Expected workflow (while smol6 is already running):

```bash
# either of these should work
curl -X POST http://127.0.0.1:8888/command \
  -d "load /home/sness/github/sness23/chai-lab/out0/pred.model_idx_0.cif"

# or via a local HTTP server
python3 -m http.server 8765 &
curl -X POST http://127.0.0.1:8888/command \
  -d "load http://127.0.0.1:8765/pred.model_idx_0.cif"
```

Actual: both return `Command executed successfully` and do nothing visible.

## Reproduction

1. Start smol6: `npm run dev`
2. Verify the HTTP command server is up:
   ```bash
   curl -X POST http://127.0.0.1:8888/command -d "load 1cbs"
   # → "Opened 1CBS (MMCIF format) ..."  ✓
   ```
3. Try a local absolute path:
   ```bash
   curl -X POST http://127.0.0.1:8888/command \
     -d "load /home/sness/github/sness23/chai-lab/out0/pred.model_idx_0.cif"
   # → "Command executed successfully"
   curl -X POST http://127.0.0.1:8888/command -d "list"
   # → still only shows 1CBS  ✗
   ```
4. Try a localhost URL (with a python http.server in the background on :8765):
   ```bash
   curl -X POST http://127.0.0.1:8888/command \
     -d "load http://127.0.0.1:8765/pred.model_idx_0.cif"
   # → "Command executed successfully"
   # python http.server log shows: GET /pred.model_idx_0.cif HTTP/1.1 200
   # but "list" still shows no new structure  ✗
   ```
5. Same result with `.pdb` (converted via `gemmi read_structure(...).write_pdb(...)`).
6. Same result with explicit format: `load http://.../foo.cif, format=mmcif` — only 1CBS remains loaded.

So:

- HTTP transport from caller → command server works
- HTTP fetch from renderer → local file server succeeds (200 logged)
- Something between "fetch succeeded" and "structure registered in the scene" is silently eating the result

## What already works (reference path)

CLI-arg loading via `load-file` IPC does work and is the right reference implementation.

`electron/main.ts:187`:
```ts
win?.webContents.send('load-file', fileToLoad)
```

`index.html:249-263`:
```js
window.ipcRenderer.on('load-file', function(event, filePath) {
    var ext = filePath.split('.').pop().toLowerCase();
    var format = ext;
    if (ext === 'pdb') format = 'pdb';
    else if (ext === 'sdf' || ext === 'mol') format = 'sdf';
    else if (ext === 'mol2') format = 'mol2';
    else if (ext === 'cif' || ext === 'mmcif') format = 'mmcif';
    else if (ext === 'xyz') format = 'xyz';
    else if (ext === 'gro') format = 'gro';

    var fileUrl = 'file://' + filePath;
    addConsoleOutput('Loading file: ' + filePath);
    viewer.loadStructureFromUrl(fileUrl, format, false);
});
```

This path:
- Derives format from extension (good)
- Uses `viewer.loadStructureFromUrl(fileUrl, format, false)` directly — bypasses the console `load` command

The console `load <url>` path (reached via HTTP) presumably routes through `plugin.console.execute('load ...')` (the ChimeraX-style command dispatcher), which treats its argument as a PDB ID or has a URL code path that fails silently for non-PDB URLs or ModelCIF content.

## Proposed fix (pick one)

### Option A — fix the `load` console command to handle URLs and paths

In the command dispatcher (wherever `load` lives in smol / molstar0), detect the argument:

- bare 4-char alphanumeric → treat as PDB ID (current behavior)
- starts with `/` or `file://` or `http(s)://` → call the same code path as `load-file`:
  infer format from extension, call `viewer.loadStructureFromUrl(url, format, false)`

This gives both the in-app console and the HTTP command server the working behavior.

### Option B — add a new console command `loadurl` / `loadfile`

If mutating `load` semantics is too risky, add a new command that explicitly takes a file path or URL and pipes through the `load-file` IPC handler directly. Document it alongside `load`.

### Option C — add a dedicated HTTP endpoint

Add `POST /load-file` (or a separate IPC-forwarded endpoint) that takes `{ path: "..." }` and triggers the `load-file` IPC channel directly. Cleanest for scripting but requires external callers to know about the second endpoint.

**Recommendation: Option A.** Users already type `load <path>` intuitively; silent failure is the worst outcome. Making the one command handle all three input kinds (PDB ID, file path, URL) matches PyMOL's `load` semantics the help text already claims.

## Extra notes

- Security: local-file loading is already possible via the CLI-arg path, so enabling it via the in-app console doesn't widen the attack surface meaningfully. The HTTP command server is bound to `127.0.0.1:8888` only — same trust boundary.
- The error-visibility problem is worth fixing regardless. `Command executed successfully` is not a correct return value when the parser silently dropped the load. If `loadStructureFromUrl` returns a promise, await it and propagate rejections into the HTTP response body.
- Test fixtures: the 5 ModelCIF files in `~/github/sness23/chai-lab/out0/` are a realistic test case — they are mmCIF with the ModelCIF extension dictionary (`mmcif_ma.dic`). Plain-PDB converts of the same files (via `gemmi`) are also in that folder.

## Files likely to touch

- `index.html` around the command-dispatch block (where `load` lives, ~line 700+ based on the `clipfog` handler location noted in CLAUDE.md)
- Possibly `molstar0/src/apps/smol/console/` — smol-side command handlers
- `electron/main.ts` only if going with Option C (new HTTP endpoint)

## Out of scope (but related)

- The renderer can't read local files from a relative path in `load ...` — expected (Electron renderer sandbox). All local loads must go through `file://` URLs from the renderer, which only the main process can safely construct from paths it verifies. Keep the `file://` construction main-side if tightening security later.
- Drag-and-drop support for CIF/PDB onto the window already works via Mol*'s native drop handler, and is an adequate workaround today for one-off loads.
