# smol6 bugs / rough edges

Found while scripting figures via the HTTP command server (`smol-cmd`, port 8888)
on 2026-06-13. Repro is "send command via `smol-cmd "<cmd>"` and observe the
rendered `png`." Loaded structure: a large protein CIF (DDB1, ~9300 atoms).

---

## Resolution (2026-06-16)

All six addressed. Fixes are in **molstar0** source
(`src/mol-console/commands/chimerax/{visualization-commands,visualization,selection,atom-spec,types,structure}.ts`),
rebuilt and deployed to `public/smol/molstar.js`. Verified against `1cbs`
(protein + REA ligand) via `smol-cmd`.

| # | Status | Note |
|---|--------|------|
| 1 | ✅ Fixed | `style <spec> <repr>` applies to the selection; both arg orders accepted |
| 2 | ✅ Already fixed | overpaint applies to all rep types in current source; 2026-06-13 test was on a stale prod bundle |
| 3 | ✅ Fixed | residue/ligand by name: `:HEM`, `:REA`, `:A1ALA` (case-insensitive) |
| 4 | ✅ Fixed | full X11/CSS3 named-color set (151 names) via mol*'s `ColorNames` |
| 5 | ✅ Fixed | comma lists + mixed ranges: `:15,33,40-50` |
| 6 | ✅ Fixed | `open` format auto-detect extended: sdf/mol/mol2/xyz/gro/pdbqt/ent/bcif |

---

## 1. `style <repr> <selection>` ignores the selection — applies to ALL atoms

- **Command:** `style spacefill :915-992`
- **Got:** `Applied spacefill representation to all structures` — the *entire*
  structure became spacefill, not just residues 915–992.
- **Expected:** the representation change should be restricted to the selection,
  so you can mix representations (e.g. cartoon protein + spacefill pocket
  residues, or cartoon protein + ball-and-stick ligand).
- **Impact:** can't make a selection-scoped representation. Mixed-rep figures
  (the most common kind) are impossible from a single loaded structure. Current
  workaround is to load receptor and ligand as *separate models/files* so each
  gets its own default representation.

## 2. Per-residue color does not apply to `spacefill` or `surface` reps

- **Commands (in order):**
  ```
  style spacefill        # or: style surface
  color #9AA0A6          # all gray   -> works (whole thing turns gray)
  color :915-992 #2ECC40 # green pocket -> reports "Applied color to selection"
  ```
- **Got:** the spacefill/surface render stays uniform gray; the per-residue
  colors do **not** appear, even though the command reports success.
- **Works fine on `cartoon`:** the identical `color :1-356 #4C8DE0` etc. DO show
  up when the representation is the default cartoon. So per-selection coloring is
  only wired to the cartoon representation, not to spacefill/surface.
- **Expected:** spacefill/surface should reflect per-residue colors (this is the
  standard way to paint binding-site patches on a molecular surface).
- **Impact:** can't make a "colored binding-site patches on a grey surface"
  figure — a very common structural-biology view.

## 3. Cannot select a ligand/residue by NAME (only by number)

- **Command:** `select :A1ALA`  (A1ALA is a bound ligand's residue/CCD name)
- **Got:** `Error: Invalid atom specification: :A1ALA`
- **`:` only accepts residue *numbers*** (`:50`, `:50-100`). There's no documented
  way to select a HETATM/ligand by its component name.
- **Expected (ChimeraX parity):** `:UNL`, `:A1ALA`, or a `ligand` keyword
  (`select ligand`) should select by residue name / ligand category.
- **Impact:** to style/color a bound ligand you must know its numeric residue id,
  or load it as a separate file.

## 4. Only a small set of named colors; CSS/ChimeraX color names rejected

- **Commands:** `color cornflowerblue` / `mediumseagreen` / `goldenrod` / `orchid`
- **Got:** `Error: Invalid color: cornflowerblue. Use color name (red, blue, etc.)
  or hex (#FF0000)`
- **Workaround:** hex codes (`#4C8DE0`) work everywhere — fine, but verbose.
- **Suggestion:** accept the full CSS4 / ChimeraX named-color set; these are
  standard and people reach for them reflexively.

## Notes (not bugs — worked well)

- `color :<range> #hex` on cartoon, `background black/white`, `graphics
  low|medium|high`, `reset`, `zoom`, `png <file> width N height N`, `cd/pwd/ls`,
  and loading local CIF/PDB/SDF by absolute path all worked reliably.
- Loading a protein file defaults to cartoon; loading a small-molecule SDF
  defaults to ball-and-stick — so loading receptor + ligand as separate files
  gives a good mixed view automatically (the workaround for #1).

## 5. Comma-separated residue lists in a selection silently color nothing

- **Command:** `color :15,33,35,40,42,49,51,69,72 #FF3B30`
- **Got:** reports success but nothing is colored (render unchanged).
- **Works:** a single contiguous range colors fine: `color :15-152 #FF3B30`.
- **Expected (ChimeraX parity):** `:15,33,35` and `:15-20,33,40-50` should select
  the union of those residues.
- **Impact:** can't highlight a scattered binding-site residue set in one command;
  must split into multiple contiguous-range `color` calls.

## 6. Cannot load a standalone small-molecule SDF: "Failed to load structure from URL"

- **Command:** `load /abs/path/ligand_t2383.sdf` (valid RDKit 3D SDF, ~25 heavy atoms)
- **Got:** `Error: Failed to load structure from URL` — the molecule never loads,
  so subsequent `focus` reports `No structure loaded` and the viewport is black.
- **Protein PDB/CIF at the same path loads fine**, and a ligand embedded as a
  HETATM inside a protein CIF displays fine — so the failure is specific to
  standalone `.sdf` files (likely a missing/!inferred format hint passed to
  `viewer.loadStructureFromUrl`, or `.sdf`/`.mol` not in the recognized extensions).
- **Expected:** `load foo.sdf` (and `.mol`, `.mol2`) should load the small molecule
  as ball-and-stick.
- **Workaround:** convert SDF → PDB before loading.

## `color` requires selector-first (`color #N name`); `color sel` / `color name #N` both fail

Discovered 2026-06-16 scripting a multi-structure docking overlay.

- **`style` accepts both `style <rep> #N` and `select #N; style sel <rep>`** — good.
- **`color` is inconsistent**: only `color #N <colorname>` works.
  - `color <colorname> #N` → `Error: Invalid color: #N` (parses the trailing
    selector as a color).
  - `color sel <colorname>` and `color <colorname> sel` → both error, even right
    after a successful `select` (whereas `style sel ...` works fine).
- **Expected:** `color` should accept the same `sel` keyword and argument order as
  `style` (and/or accept `color <colorname> #N`).
- **Workaround:** always use `color #N <colorname>`; never use `sel` with `color`.

## `save <file>` only works in headless mode (can't screenshot the GUI instance)

- `save /tmp/x.png` on a running GUI/electron instance → `Error: Save command is
  only available in headless mode`. No way to grab a screenshot of the live view
  programmatically. `copyimage` (clipboard) is the only GUI option.
- **Expected (nice-to-have):** allow `save` to write a PNG of the current GUI
  viewport, or document `copyimage` as the GUI screenshot path.

---

## 2026-06-16 — found while rendering Boltz minimal-cell complexes (mvc project)

Driving via `smol-cmd`/`smol-load` (port 8888), GUI electron instance, loading 2-chain
Boltz-predicted protein complexes (CIF, ~500–760 residues). `png <abs-path>` works well
in this GUI instance (writes the file — contrast with the older `save` headless-only note
above).

### A. `orient` resets rotation but NOT camera distance/zoom — zoom state leaks between structures
- **Repro:** load complex #1, `orient` → nicely framed. `zoom 1.5`. `close`; load complex #2;
  `chainid`; `orient` → structure is cut off / wrong size because the *previous* zoom distance
  persisted. `orient` re-derives the rotation to principal axes but does not refit the camera
  distance to the new structure's bounds.
- **Impact:** can't get consistent framing across a batch of structures; every structure needs
  manual `zoom <factor>` tuning verified by screenshot. Painful for scripted figure batches.
- **Expected:** `orient` (or a dedicated `fit`/`view reset`) should reset camera distance so the
  whole structure fits the viewport, like PyMOL `orient`/`zoom` or ChimeraX `view`.
- **Workaround:** after `orient`, issue `zoom <factor>` and screenshot-verify; factor differs per
  structure (elongated complexes ~default, compact ones needed ~0.4 then back to ~2.4).

### B. Coloring command applied immediately after `load` hits a partially-loaded structure
- **Repro:** `smol-load big.cif` then immediately `chainid` → render comes back single-color
  (coloring applied before chains were parsed). Re-issuing `chainid` after a ~1.5 s delay gives
  correct per-chain colors.
- **Impact:** scripted load+color sequences are racy for larger structures; first color often lost.
- **Expected:** `load` should block (or the command queue should serialize) until the structure is
  fully parsed/represented before the next command runs; or commands should auto-retry once the
  model is ready.
- **Workaround:** insert a delay (≥1.5 s) or re-apply the color command after load.

### C. `turntable` recipe `spin y 360` = 360 rotations/SECOND, not a single 360° turn
- **Repro:** `turntable` prints `Use "movie record" + "spin y 360" + "movie stop" to capture`.
  Following it: `movie record`; `spin y 360` → server replies *"Spinning at 360 rotations/sec"*
  → the capture is a high-speed blur, not one clean revolution.
- **Root cause:** `spin y N` sets angular **velocity** in rotations/sec (bare `spin` = 0.5/sec,
  `roll` = 0.3/sec). The documented `360` is read as speed, not degrees.
- **Also:** `spin`, `roll`, `turntable` have **no help/dry-run form** — invoking them to read
  usage immediately *starts* the animation (had to `stop` after each "usage" check).
- **Impact:** the one documented way to record a turntable produces garbage; following the
  built-in instructions fails.
- **Expected:** a one-shot, bounded `turn y 360` (degrees, stops after one revolution) like
  PyMOL `turn` / ChimeraX `turn y 3 120`; or make `turntable` itself execute the bounded
  120-frame revolution it advertises; and fix the help text.
- **Workaround:** spin at a known rate for a matched wall-clock duration —
  `movie record` → `spin y 0.25` → sleep 4 → `stop` → `movie stop` → `movie encode` = exactly
  one revolution (0.25 rot/sec × 4 s).

### D. `movie record` captures 0 frames; `movie encode` reports success but writes no file
- **Repro:** `movie record` → `spin y 0.25` → sleep 4 → `stop` → `movie stop` (replies
  "Recording stopped (4.1s)") → `movie encode <abs>.mp4`. Encode prints
  `Movie export: <abs>.mp4.mp4` (note **doubled** `.mp4`) and `FPS: 30`, but **no file is
  written** anywhere on disk, and a follow-up `movie` shows `Frames: 0`.
- **Impact:** in-app movie capture is non-functional end-to-end (no frames captured, no file
  emitted). Turntable/animation export unusable from the command server.
- **Expected:** `movie record` should capture frames during the animation; `movie encode`
  should write a single `.mp4` at the given path (and not double the extension).
- **Workaround (for now):** capture externally (OBS / `ffmpeg x11grab` via `smol-record`) while
  driving the spin over the HTTP server.

---

## 2026-06-17 — surface property coloring (lipophilicity / electrostatic)

Found while coloring a DDB1 (`9bbg`, ~8700-atom) molecular surface via `smol-cmd`
on port 8888, **verified by rendering each result to PNG** (`png <path>`) and
inspecting it — the command-reply text alone is misleading (see G).
Net: **lipophilicity works via `surfacecolor hydrophobicity` (real gradient,
render-confirmed); the `lipophilicity`/`mlp` aliases are broken; `surfacecolor
electrostatic` is accepted and reports success but renders FLAT (no charges on
the structure → nothing to map).**

Note: `surfacecolor hydrophobicity` and the `lipophilicity`/`mlp` aliases all
target ONE scheme — `surface color` help labels hydrophobicity as the
"Lipophilicity gradient", and the bundle uses an atom-based octanol/logP measure
(`octanol`, `HydrophobicAtom` tokens; no Kyte-Doolittle/Eisenberg residue scale).
Lipophilicity and hydrophobicity are the same property/direction, not negatives.

**✅ Resolved 2026-06-19** (per `IMPLEMENT-electrostatic-surface.md`). A real,
self-contained Coulombic ESP color theme was added in molstar0
(`src/mol-theme/color/electrostatic-potential.ts`, registered in
`mol-theme/color.ts`) and wired to `surfacecolor electrostatic`, the
`electrostatic`/`espsurface` commands, and `coulombic`'s tip. Per item:
- **E / F** — `lipophilicity`/`mlp` aliases now color (and find a surface created
  earlier). The shared `applySurfaceColorTheme` was hardened (explicit, re-validated
  repr refs + per-repr try/catch), eliminating the `Could not find node 'undefined'`.
- **G** — `surfacecolor electrostatic` renders a real red(−)/white(0)/blue(+)
  gradient computed from pH-7 residue charges (no external data needed); the
  `surface color` help now lists `electrostatic`; the bare `electrostatic` command
  colors instead of printing help.
- **H** — `surface` removes any existing surface reprs before creating a fresh one,
  so repeated calls replace rather than pile up (was 26 deep).
- **I** — `coulombic`'s closing tip now points at `surfacecolor electrostatic`.

Charge source priority: per-atom partial charges (mol2/pdbqt) → PDB formal charges
→ pH-7 residue estimates on a representative side-chain atom. Color range
auto-scales to the data (override with `electrostatic <range>`). Render-verified on
`9bbg` (8673 atoms) via smol-cmd + png on the production bundle.

### E. `lipophilicity` / `mlp` alias broken — use `surfacecolor hydrophobicity`
- **Repro:** `surface #16` → `lipophilicity #16` (or `mlp #16`).
- **Got:** `Error: Failed to color surface: Error: Could not find node 'undefined'.`
- **Works:** `surfacecolor hydrophobicity #16` → `OK`, renders MLP coloring fine.
- **Root cause (inferred):** the `lipophilicity`/`mlp` command does NOT delegate to
  the working `surfacecolor hydrophobicity` codepath — it resolves the surface
  representation by an `undefined` node ref → mol*'s "Could not find node
  'undefined'". The alias and the `surfacecolor` path should converge.
- **Impact:** the discoverable/aliased command for the feature fails; only the
  less-obvious `surfacecolor hydrophobicity` actually works.
- **Workaround:** `surfacecolor hydrophobicity #N`.

### F. `lipophilicity`/`mlp` can't find a surface created earlier
- **Repro:** `surface #16` (→ OK); run any other command; `lipophilicity #16`.
- **Got:** `Error: No surface representation found. Create one first with "surface".`
  even though the surface still exists (and `list` shows #16).
- **Expected:** the handler should locate the existing surface rep on #16 (as
  `surfacecolor` does), not only when `surface` was the immediately prior command.

### G. Electrostatic surface coloring reports success but renders FLAT (no charges)
- **`surfacecolor electrostatic #N`** (and `surface color electrostatic`) → reply
  `Surface colored by partial-charge` (so the command IS wired) — **but the render
  is a uniform single color** (green here), not a red/white/blue ESP gradient.
  Confirmed by PNG: `surfacecolor hydrophobicity` → real gradient; `surfacecolor
  electrostatic` → flat, identical before and after `coulombic`.
- **Root cause:** the structure (a stripped PDB) carries **no per-atom partial
  charges** — `coulombic` itself reports "No formal charge annotations in PDB
  file." The partial-charge color theme has no data, so every vertex maps to one
  color. The success message is misleading.
- **`electrostatic` / `espsurface` command:** prints instructional help text
  ("1. coulombic  2. APBS .dx  3. partial-charge theme") — performs no coloring.
- **`coulombic #N`:** charge *analysis* only (ionizable counts, net ≈ −41 at pH 7);
  does not color. Its closing tip **"To color by charge, use: `color bycharge`"**
  is wrong — see I.
- **`surface color` help omits electrostatic** entirely (lists only hydrophobicity/
  bfactor/occupancy/element/chain) even though `surfacecolor electrostatic` is
  accepted — discoverability gap.
- **Fix:** (a) auto-assign charges (Gasteiger, or apply `coulombic`'s pH-estimated
  charges) before/within the partial-charge theme so it actually renders, or load
  charges and document the requirement; (b) make the success message conditional on
  charges being present (warn if all-zero → flat); (c) list `electrostatic` in
  `surface color` help; (d) make the bare `electrostatic` command do the coloring
  instead of printing help.
- **Impact:** no usable electrostatic surface potential on a charge-less structure,
  despite a success message — the most confusing failure mode (looks like it worked).
- **Note / easy mix-up:** `surfacecolor bfactor` renders a blue→white→red gradient
  that is visually indistinguishable from a classic ESP surface (blue=+, red=−,
  white=0). Verified: a user recalled "electrostatic working with white/blue/red"
  but it was `surfacecolor bfactor`. Until G is fixed there is no real ESP coloring;
  consider naming/legending bfactor clearly to avoid the confusion.
- **→ Implementation spec:** `IMPLEMENT-electrostatic-surface.md` (root cause with
  file:line, charge-reuse from coulombic-commands.ts, a real ESP color theme, the
  smol-cmd+png acceptance test, and build/deploy). Covers E, G, H, I.

### H. `surface` accumulates duplicate representations instead of replacing
- **Repro:** call `surface #N` several times, then `hide #N surfaces`.
- **Got:** `Hidden 26 surface representations of #16` — each `surface` call ADDED a
  new surface rep rather than replacing the existing one; 26 had piled up.
- **Impact:** stacked transparent surfaces compound opacity/z-fighting and slow
  rendering; recoloring/`hide` act on an ambiguous pile.
- **Expected:** `surface #N` should replace (or no-op on) an existing surface for
  that model, or there should be a documented `~surface`/`surface off` (note:
  `~surface` errors `Unknown command`; removal is only via `hide #N surfaces`).

### I. `coulombic` recommends `color bycharge`, which is an invalid command
- **Repro:** `coulombic #N` → tip "To color by charge, use: `color bycharge`".
- **Got:** `color bycharge` → `Error: Invalid color: bycharge. Use color name
  (red, blue...) or hex`. Same for `color partialcharge`. So the documented
  follow-up command does not exist — dead-ends the user.
- **Fix:** point the tip at the working `surfacecolor electrostatic` (once G is
  fixed), or implement a `bycharge` color theme.

---

## 2026-06-18 — camera framing / screenshot (found scripting OBS scenes)

Building per-scene scripts (`view_site/_domains/_surface/_tool_smol.sh`) that load
subsets + colour + frame a pocket, driven over `smol-cmd` and checked with `png`.

### J. `view #<id>` works interactively but the offscreen `png` screenshot renders BLACK
- **Repro:** load structures; `view #24` (a small ligand) → reply `Centered on
  selection`; the **interactive viewer frames it correctly** (user-confirmed), but
  `png /tmp/x.png` immediately after comes back **all black**. A double `png` and a
  `list` round-trip in between don't help.
- **Likely cause:** the screenshot uses a different camera/canvas than the
  interactive view, or captures before the `view` camera move settles — the two
  cameras diverge. `reset`-framed scenes DO screenshot fine; only `view`-framed ones
  go black.
- **Impact:** screenshot-based automation/QA can't verify any `view`-framed scene;
  makes scripted figure/movie capture of focused views unreliable.
- **Expected:** `png` should capture exactly what `view <spec>` framed.

### K. `select <spec>` then `view sel` reports "Selection is empty"
- **Repro:** `select /L` → `Selected 170 atoms`; immediately `view sel` →
  `Error: Selection is empty`.
- **Cause:** the persistent selection set by `select` is not visible to `view sel`
  (selection state not shared between the two commands).
- **Workaround:** `view <spec>` directly (e.g. `view #24`) instead of `select` +
  `view sel`.

### L. Heavy `view`/interaction can leave the renderer stuck black until restart
- **Observed:** after many `view #<id>` calls (+ concurrent UI interaction), even
  `reset`/`orient` report success but every `png` is black while `list` shows the
  structures still loaded. Restarting/refreshing the viewer clears it.
- **Note:** partly contention (a second session was driving the viewer), but the
  renderer not recovering on `reset` is the concerning part. Hard to repro cleanly.

---

## 2026-06-19 — atom/element ("CPK") colouring is a silent no-op

Found trying to CPK-colour ligand sticks so they read against a coloured cartoon.
**Render-verified** on an isolated ball-and-stick ligand that filled the frame, so
it's unambiguous (not a tiny-ligand visibility issue).

**✅ Resolved 2026-06-19.** Root cause: `color <name>` paints an *overpaint* layer,
while element/scheme colouring only changes the base colour *theme* — overpaint is
drawn on top, so the theme was masked (the ligand stayed the overpaint colour).
Fixes in molstar0:
- `applyColorScheme` (the `color #N byelement`/`byhet`/`bychain`/… path) and
  `applyColorTheme` (the `cpk`/`element`/`chainid`/… commands) now clear overpaint
  before applying the theme, so the colouring is actually visible.
- `color #N <scheme>` now scopes to model `#N` and validates it — it previously
  recoloured every structure and reported success even for a non-existent id
  (`color #1 byelement` on a missing #1 now errors).
Render-verified: `color #N byelement` and `cpk #N` show CPK colours (after a prior
`color red`) on the production bundle.
**Limitation:** a scheme is a whole-representation theme, so a sub-model spec like
`color /L byelement` still colours the whole structure by element (model `#N`
scoping works; chain/residue scoping would need per-atom element overpaint).

### M. element / CPK colouring does nothing on atoms, though it reports success
- **Repro:** `close`; load a ligand; `style ball-and-stick #N`; `color #N red`
  (→ ligand goes fully red, confirmed in render); then ANY of:
  - `color #N byelement` → "Applied byelement color scheme"
  - `color #N byhet`     → "Applied byhet color scheme"
  - `cpk #N`             → "Applied element-symbol coloring"
  - `element #N`         → "Applied element-symbol coloring"
- **Got:** the ligand stays **100% red** for all four — element colouring is never
  applied, despite each command reporting success. Chain-spec `color /L byelement`
  behaves the same.
- **Control:** named colours / hex (`color #N red`) DO apply and render correctly,
  so the representation, the structure, and the screenshot path are all fine — it is
  specifically the element/CPK colour path.
- **Contrast:** `surfacecolor element` colours a *surface* fine (theme
  `element-symbol`), so the theme exists — it just isn't reaching the
  ball-and-stick / atom representation (likely a theme-name or granularity mismatch
  in the handler, which still returns success).
- **Impact:** can't CPK-colour ligands or any atoms — the standard way to make a
  small molecule readable. Workaround: a bright uniform named colour
  (e.g. `color /L yellow`).
- **UPDATE 2026-06-19 — core fixed, but scoping regressed (see M2).** Element
  colouring now applies (isolated ligand → proper CPK: teal C, red O, blue N,
  yellow-green F, render-confirmed). Good. But it ignores the selection — see M2.

### M2. element/CPK colouring scopes among ligands but LEAKS onto the receptor/cartoon
Refined 2026-06-19 with controlled render tests (corrects an earlier "recolours the
whole scene" reading — it's more specific than that).
- **Repro A — ligands only (WORKS):** load two ball-and-stick ligands, NO receptor;
  `color #A red`; `color #B byelement` → A stays fully red, B gets proper CPK
  (gold C, blue N, red O, green F). **Scopes correctly** between the two ligand
  structures. ✅ render-confirmed.
- **Repro B — receptor present (LEAKS):** load a receptor as cartoon (any colour) +
  ligand sticks; `color #<ligand-id> byelement` (per-structure, naming ONE ligand)
  → the **receptor cartoon also recolours** to byelement's carbon colour (gold),
  even though the spec named only a ligand. `color /L byelement` does the same.
- **So:** byelement honours the spec relative to other *ligand* structures, but
  still **bleeds onto the receptor / polymer cartoon** whenever one is loaded.
- **Contrast:** plain `color #N <name>` scopes fully (never touches the receptor);
  byelement should match it.
- **Impact:** blocks the common "domain/grey cartoon + CPK ligand sticks" figure —
  CPK-colouring the ligands golds the whole protein. (Workaround in scenes: keep
  ligands on plain per-site colours, which scope correctly.)
- **Want:** byelement/cpk/element honour `#id`/`/L`/`:range`/`sel` exactly like
  `color #N <name>`, including NOT recolouring the receptor when a ligand is named.

### E. Command server loses rendering/screenshot ability mid-session ("No 3D canvas available")
- **Repro:** earlier in the same session, `load`+`chainid`+`orient`+`png` rendered complexes fine
  and wrote PNGs. Later (after idle / loading an 88k-atom model), `windowsize` → `Error: No 3D
  canvas available`; `load`/`chainid`/`orient` still return success strings, but `png` →
  `Error: screenshot helper not available`. The command server stays up and accepts geometry/color
  commands but can no longer render or screenshot.
- **Impact:** scripted figure capture is unreliable across a long session — the viewer can silently
  enter a state where it accepts commands but produces no output, with no way to recover over the
  HTTP API.
- **Expected:** `png`/screenshot should work whenever the server is up, or the server should report
  the canvas as unavailable on *all* commands (not just some) and expose a way to re-attach the
  canvas. Large-structure load (~88k atoms) as a possible trigger is worth checking.
- **Workaround:** rendered that figure with an external matplotlib-3D fallback; smol6 can re-render
  once the canvas is restored (app refocus/reload).

## 2026-07-02 — `transparency` is a stub (surface renders fully opaque)

Found while building the pocket-view preset for the smol6 Claude Code plugin
(`~/github/sness23/smol-claude-plugin`). Loaded structure: DDB1 receptor
(protein-only PDB, ~9300 atoms) + one crystal ligand as separate models.

### T1. `transparency` reports success but does nothing — self-declares "full implementation pending"
- **Commands (in order):**
  ```
  style surface #102        # receptor -> molecular surface
  color #102 gray
  transparency #102 0.5     # want a translucent surface to see the pocketed ligand
  focus #103                # the ligand
  png /tmp/pocket.png width 1600 height 1200
  ```
- **Got:** `transparency #102 0.5` returns
  `Set #102 transparency to 50% (note: full implementation pending)` — the
  response string literally flags it as unimplemented. The rendered surface is
  **fully opaque**; the ligand (yellow sticks) is almost entirely hidden behind
  it, only a sliver poking through a gap.
- **Expected:** opacity 0.5 → a translucent surface you can see the ligand
  through. This is the standard "ligand inside a translucent pocket surface"
  figure — the whole point of surfacing a receptor around a bound ligand.
- **Impact:** `--surface` pocket views are not usable — an opaque surface buries
  the ligand it's meant to showcase. The plugin's pocket preset therefore
  defaults to **grey cartoon + ligand sticks** (which reads the pocket fine) and
  only offers `--surface` behind a printed "transparency may be a stub" warning.
- **Also applies to:** `transparency <opacity>` (all) and `surface transparency
  <value>` are worth checking together — the per-rep opacity path in general.
- **Want:** wire `transparency [target] [opacity]` to the representation's alpha
  so `transparency #N 0.5` actually renders at 50% (and drop the
  "implementation pending" note once it lands). Relatedly, bug #2 (resolved list)
  notes per-residue *color* doesn't reach surface/spacefill reps — transparency
  is the same rep-property gap on the opacity axis.

### T2. Multi-model / NMR-ensemble load no longer registers as a trajectory — `play` fails
- **REGRESSION:** this worked ~2026-06-18 (watched a 50-frame MD trajectory
  animate from a multi-model PDB via `load` + `play`); it does not now.
- **Repro A (local multi-model PDB):**
  ```
  load /…/Cterm_traj.pdb     # a 50-MODEL PDB (one MODEL per MD frame)
  coordset                   # -> "Total models/frames: 1 … Single model structure (no trajectory data)"
  frame                      # -> "Single frame structure (no trajectory). Frame 1 of 1."
  play 8                     # -> "Error: No trajectory to play. Load a multi-frame structure first."
  models                     # -> lists the MODELs as SEPARATE structures (1, 2, 3 … each ~8953 atoms), not frames
  ```
- **Repro B (canonical NMR ensemble, rules out the file):**
  ```
  load 1d3z                  # ubiquitin, 10 NMR MODELs from RCSB (fetched as MMCIF)
  coordset                   # -> "Total models/frames: 1 … no trajectory data"
  play 5                     # -> "Error: No trajectory to play."
  ```
- **Got:** a multi-model structure collapses to a single frame (RCSB fetch) or
  explodes into N separate static models (local PDB). Either way `coordset`/
  `frame`/`play` see one frame — no animation.
- **Expected:** N MODEL records → one structure with N coordinate sets (frames),
  navigable by `coordset`/`frame` and animatable by `play` (the June behavior).
- **Impact:** MD-trajectory and NMR-ensemble playback is dead — the whole
  `play`/`frame`/`coordset` subsystem has nothing to act on. Blocks the smol6
  Claude-plugin `traj` preset (it now detects `coordset` == 1 frame and warns
  instead of silently claiming to play).
- **Note:** the multi-model file still renders fine as a static frame (cartoon +
  ligand look correct) — this is purely the frame-ingestion/animation path.

#### Source investigation (2026-07-03) — molstar0 code paths

Searched `~/github/sness23/molstar0/src`. The crux: `frame`/`play`/`coordset` all
derive their frame count from **one number** — `Trajectory.frameCount` — and it is
coming back as **1** for genuinely multi-model inputs.

- **Where the count is read:** `src/mol-console/commands/chimerax/trajectory-commands.ts`,
  `getTrajectoryInfo()` (~line 41-76): `totalFrames = trajectories[0].obj.data.frameCount`
  (selects `PluginStateObject.Molecule.Trajectory`). `PlayCommand`/`FrameCommand`
  bail with "no trajectory" whenever `totalFrames <= 1`. So the readout is only as
  good as the parsed trajectory — the navigation code itself looks correct.
- **Load path A — local file / `file://` / `http` (the MD case):** built app
  `smol6/index.html:605` calls `viewer.loadStructureFromUrl(url, format, false)` →
  `src/apps/smol/app.ts:107` → the **`DownloadStructure`** action with
  `createDefaultParams`, whose root-structure type defaults to **`'auto'`**
  (`src/mol-plugin-state/actions/structure.ts:29`). `'auto'` materializes a single
  deposited model.
- **Load path B — 4-char PDB id:** console `open` (`structure.ts:299` & `:347`)
  does `parseTrajectory(data, fmt)` then `applyPreset(trajectory, 'default')`.
- **Two candidate root causes** (couldn't fully disambiguate without instrumenting
  a build — both produce `frameCount == 1`):
  1. **`parseTrajectory` is yielding a 1-frame trajectory** for these inputs (the
     MODEL records / `pdbx_PDB_model_num` aren't being merged into frames). If so
     the defect is upstream of the preset, in how the fork wires format detection /
     parsing in the `load` path — stock mol* scrubs NMR models fine, so this fork
     diverges somewhere in `loadStructureFromUrl`/format handling. **Most likely.**
  2. **`getTrajectoryInfo` selects the wrong/ghost `Trajectory` node** (e.g. the
     `DownloadStructure` path leaves the multi-frame trajectory as a ghost/nested
     node and `selectQ(Trajectory)[0]` picks a 1-frame one). Less likely but cheap
     to rule out.
- **Note on the `all-models` preset:** `src/mol-plugin-state/builder/structure/hierarchy-preset.ts:85-122`
  (`preset-trajectory-all-models`) is NOT the fix — it loops `frameCount` and builds
  **N separate static structures** (overlaid, colored by trajectory-index), which is
  a different feature (show-all-NMR-models) and is not navigable by `frame`/`play`.
  Playback needs the **`default`** trajectory preset: a single model via
  `StateTransforms.Model.ModelFromTrajectory` whose `modelIndex` `FrameCommand`
  bumps, with the multi-frame `Trajectory` retained.
- **Decisive next diagnostic:** log `trajectory.data.frameCount` immediately after
  `parseTrajectory` in `app.ts:loadStructureFromUrl` (and in the `DownloadStructure`
  build) for a local 50-MODEL PDB. If it's 50 there but 1 at `getTrajectoryInfo`, it's
  cause #2 (state-selection); if it's 1 right after parse, it's cause #1 (parse/wiring).
- **Suggested fix direction:** route `load` so a multi-frame parse keeps a navigable
  single-model-over-trajectory (the `'default'` trajectory preset path used by
  `loadStructureFromData`, `app.ts:132`), rather than `DownloadStructure`'s `'auto'`
  single-model collapse — i.e. detect `frameCount > 1` and build via
  `parseTrajectory` + `applyPreset('default')` keeping the trajectory node.
- **Was working ~2026-06-18** (memory: watched these exact MD PDBs animate), so a
  commit since then changed the local-file `load` wiring. `git -C molstar0 log`
  around `apps/smol/app.ts` (`91a5560 More`) and `mol-console/.../structure.ts`
  (`f54ce72 Fix OpenCommand for local files…`) are the places to bisect.

#### Fix plan (for the implementing agent)

Do these in order. All paths are in `~/github/sness23/molstar0` unless noted.

1. **Confirm which cause (do this first — 5 min, decides the fix).** Temporarily
   log the parsed frame count in the local-file load path:
   in `src/apps/smol/app.ts` `loadStructureFromUrl` (~line 107), before returning,
   `parseTrajectory` the same data and `console.log('frameCount', trajectory.data.frameCount)`
   (or add the log inside the `DownloadStructure` build). Rebuild (step 4), load
   `…/T2383/md/robust/out/Cterm_traj.pdb`, read the devtools console.
   - **frameCount == 50 after parse** → cause #2 (state-selection): the multi-frame
     trajectory exists but `getTrajectoryInfo()` in
     `src/mol-console/commands/chimerax/trajectory-commands.ts` isn't finding it
     (it's ghost/nested, or `selectQ(Trajectory)[0]` is the wrong node). Fix there:
     select the trajectory that actually feeds the visible model, or read frame
     count off the model's parent trajectory rather than `[0]`.
   - **frameCount == 1 after parse** → cause #1 (parse/wiring): the `load` route is
     collapsing models. Go to step 2.

2. **Fix the load route (cause #1).** Make `loadStructureFromUrl` retain a navigable
   multi-frame trajectory instead of `DownloadStructure`'s `'auto'` single-model
   collapse. Mirror `loadStructureFromData` (`app.ts:132`) which already does the
   right thing:
   ```ts
   const data = await plugin.builders.data.download({ url, isBinary }, …);
   const trajectory = await plugin.builders.structure.parseTrajectory(data, format);
   await plugin.builders.structure.hierarchy.applyPreset(
       trajectory, 'default', { representationPresetParams: options?.representationParams });
   ```
   Gate on frames if you want to preserve current single-model behavior for normal
   structures: if `trajectory.data.frameCount > 1` use the `'default'` **trajectory**
   preset (single model via `ModelFromTrajectory`, trajectory node retained — NOT
   `'all-models'`, which builds N separate overlaid structures); else keep the
   existing `DownloadStructure` path. Keep label/representationParams handling that
   `loadStructureFromUrl` currently passes through.

3. **Check the console `open` path too** (`src/mol-console/commands/chimerax/structure.ts:299` & `:347`).
   It already uses `parseTrajectory` + `applyPreset('default')`, yet `load 1d3z`
   still showed 1 frame — so if the diagnostic says parse==1 for the RCSB mmcif,
   the parse/format detection is the shared culprit and fixing it helps both paths.

4. **Rebuild + deploy the bundle:**
   ```bash
   cd ~/github/sness23/molstar0 && npm run build:apps
   cd ~/github/sness23/smol6
   cp ../molstar0/build/smol/molstar.js ../molstar0/build/smol/molstar.css ../molstar0/build/smol/favicon.ico public/smol/
   cp -r ../molstar0/build/smol/images public/smol/
   # restart smol6 (npm run dev, or relaunch the AppImage)
   ```

5. **Verify (must pass):** with smol6 running,
   ```bash
   smolshow cmd "close"
   smolshow cmd "load /home/sness/data/vaults/casp/inputs/casp17/T2383/md/robust/out/Cterm_traj.pdb"
   smolshow cmd "coordset"     # expect: Total models/frames: 50
   smolshow cmd "frame next"   # expect: Frame 2 of 50
   smolshow cmd "play 8"       # expect: animation (NOT "No trajectory to play")
   smolshow cmd "load 1d3z"    # NMR control -> coordset should report 10
   ```
   Then re-run the plugin preset end-to-end:
   `smolshow traj …/Cterm_traj.pdb --resn MOL --color yellow --fps 8` should now
   print ">> playing 50 frames" instead of the single-frame warning. (`smolshow` =
   `~/github/sness23/smol-claude-plugin/bin/smolshow`.)

6. **On success:** remove the `traj`-preset single-frame warning's "currently
   broken" wording in the smol6 Claude plugin
   (`smol-claude-plugin/{bin/smolshow,skills/smol/SKILL.md,commands/smol-traj.md}`),
   and move this T2 entry to the Resolution list at the top with the fix commit.
