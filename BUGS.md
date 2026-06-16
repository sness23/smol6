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
