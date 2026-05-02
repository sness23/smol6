# smol6 smoketest (manual)

Run from a fresh `smol6` launch. Each step: paste the command, watch the viewport, tick the box. Commands assume the HTTP server is up on port 8888 — easiest to use the `smol-cmd` wrapper (`./smol-cmd "<command>"`) or paste straight into the in-app console (F2).

When you find a step that fails, leave it unchecked, jot the symptom in **Today's focus** at the bottom, and keep going.

## How to run

Three things on screen at once:

1. **smol6 running.** If it isn't already, `npm run dev` from the repo root.
2. **This file open.** Pick whichever you prefer:
   - `less docs/SMOKETEST.md` in a terminal pane
   - your editor (so you can flip `☐` → `☑` as you tick boxes)
   - `glow docs/SMOKETEST.md` for pretty rendered markdown
3. **A terminal in `~/github/sness23/smol6`** so you can paste `./smol-cmd "<command>"` lines.

Then top-to-bottom: paste command → look at the viewport → match it against the *expected* description on that line → tick the box. Whole run is ~5 min.

**Alternative**: hit F2 inside smol6 and paste commands directly into the in-app console — same effect, one fewer window. The `./smol-cmd` route is preferred when you want a copy-paste log of the run.

**When something fails**: leave the box unchecked, jot a one-liner under **Today's focus** at the bottom, keep going. Don't stop the run on the first miss; you want to know the full damage before a deep-dive.

> Future plan: a CV-driven verifier reads the *expected* lines as assertions and runs the whole flow unattended. Until then, you're the AGI.

---

## 0. Setup

- ☐ App launches; viewport is dark; F2 toggles the console
- ☐ `pwd` prints a sensible cwd (matches `~/.smol`'s `initialCwd` or `$HOME`)
- ☐ `ls` returns directory entries (dirs suffixed with `/`)

## 1. Loading

- ☐ `load 1crn` — small (~46 res) helical protein, single chain A, no ligand
- ☐ `close` — viewport clears
- ☐ `load 1cbs` — single chain with retinoic acid ligand (sticks visible)
- ☐ `close` then `smol-load <some-local.pdb>` from a different directory — relative path resolves to absolute, structure loads

## 2. Selection + color

Stay loaded on `4hhb` for multi-chain coverage:

- ☐ `close` then `load 4hhb` — hemoglobin tetramer, 4 chains (A, B, C, D)
- ☐ `color red` — every atom red
- ☐ `color /A blue` — only chain A turns blue (`:` is the *residue* selector in ChimeraX, not chain — `/` is chain)
- ☐ `show ball-and-stick` — make the polymer atoms individually visible (default rep is cartoon-only; without this, `@CA` has nothing to recolor that's distinguishable from the ribbon)
- ☐ `color @CA green` — alpha-carbon spheres go green
- ☐ `color /A & @CA yellow` — chain A's alpha carbons yellow, others stay green (`&` is ChimeraX intersection; `and` also works but `&` is canonical)

## 3. Show / hide  ← *recently fixed*

Still on 4hhb:

- ☐ `hide cartoon` — all cartoons disappear; ligands (HEM groups) stay
- ☐ `show cartoon` — cartoons return
- ☐ `hide cartoon /B` — *only* chain B's cartoon hidden, A/C/D still visible
- ☐ `show cartoon /B` — chain B's cartoon returns
- ☐ `hide cartoon` (no selection again) — global hide still works

## 4. Multi-structure + align

Use a small single-chain pair so the visual stays clean:

- ☐ `close` then `load 1ubq` then `load 1ubi` — two ubiquitin structures, single chain each (77 res), initially in different positions
- ☐ Run `list` to read off the live model IDs (they don't reset; e.g. `#3` and `#4`)
- ☐ `align #N to #M` (use the IDs from `list`) — RMSD ≈ 0.1 Å over ~76 CA pairs; the two folds collapse onto each other and look like a single β-grasp fold

> Avoid `1ake` / `4ake` here: 4ake's asymmetric unit has two protein copies, so `align` only matches one and the other floats free, making the visual look like four overlapping models. If you want the open/closed conformational change as a follow-up, do it deliberately and pre-strip 4ake to one chain.

## 5. Camera / screenshot

- ☐ `png test.png` — file appears in cwd, opens as a valid PNG
- ☐ `png shot.png width 1920 height 1080` — same but at the requested resolution
- ☐ `preset default` — camera and canvas3d params reset

## 6. Lifecycle

- ☐ `restart` — fresh WebGL context, structures cleared, HTTP 8888 still answers (`./smol-cmd pwd` works without relaunching)
- ☐ (last, optional) `exit` — app quits cleanly

---

## Today's focus

> One sub-section per actively-changing feature. Append/edit per session; delete when stable.

### Documentation drift — found 2026-04-29

- Both `CLAUDE.md` and `README.md` say `color :A red` colors chain A. **Wrong** — `:` is ChimeraX's residue selector, not chain. The right syntax is `color /A red`. Parser correctly rejects `:A` ("Invalid atom specification: :A"). Fixed in CLAUDE.md/README.md as part of this session.
- Model `#N` IDs **do not reset on `close`** — they increment monotonically within a session. Implication: `align #2 to #1` works only when two structures are concurrently loaded; after a close+reload, the next ID is `previous-max + 1`. Confirm with `list` before using `#N` selectors.

### `hide` / `show` count asymmetry — found 2026-04-29

- `hide cartoon` (no selection) reports `Hidden 1 cartoon representation` for a 4-chain structure where 4-5 components have cartoons. Subsequent `show cartoon` reports `Shown 5 cartoon representations`. The visual effect is correct on both ends, but `show` and `hide` count differently — `hide` likely collapses to 1 because it stops at the first match per component-level builder commit, or counts only the global rep, while `show` re-creates one rep per component. Either fix `hide`'s counter to match (per-component) or fix `show` to match `hide` (single global).

### `hide` / `show` selection scoping (molstar0 fix shipped 2026-04-29)

- ☐ `hide cartoon /B` on a homodimer leaves chain A's cartoon intact (covered above; restate here while the fix is fresh)
- ☐ `show cartoon /A` after a `hide cartoon` only restores chain A
- ☐ `hide ball-and-stick /ligand-chain` (or whatever ligand chain ID is) — does the loci-scoped path work for non-cartoon reps too?
- ☐ `hide cartoon` with *no* selection still hits every structure (regression check)
