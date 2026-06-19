# Implement: real electrostatic surface coloring (ESP) in smol6 / molstar0

**For the smol6 Claude session.** Goal: make `surfacecolor electrostatic` (and the
`electrostatic` command) render a real **blue → white → red** electrostatic-potential
surface instead of a flat single color. Source lives in the **molstar0** repo
(`~/github/sness23/molstar0`), which builds + deploys the bundle to
`~/github/sness23/smol6/public/smol/molstar.js`. Companion bug entries: `BUGS.md`
§2026-06-17 items **E–I**.

---

## 1. Current behaviour (verified 2026-06-18 by `smol-cmd` + `png` render)

| Command | Reply | Actual render |
|---|---|---|
| `surfacecolor hydrophobicity` | `Surface colored by hydrophobicity` | ✅ real green/brown gradient |
| `surfacecolor bfactor` | `Surface colored by uncertainty` | ✅ blue/white/red (B-factor — *looks* like ESP but is NOT) |
| **`surfacecolor electrostatic`** | `Surface colored by partial-charge` | ❌ **uniform/flat** (no gradient) |
| `electrostatic` / `espsurface` | help text | ❌ no coloring (stub) |
| `coulombic` | charge analysis text | ❌ no coloring; suggests invalid `color bycharge` |

The flat electrostatic render is the confusing one — it *reports success*.

## 2. Root cause (exact)

`src/mol-console/commands/chimerax/surface-analysis-commands.ts`
- **L412**: `surfacecolor electrostatic` maps `electrostatic` → mol\* theme `'partial-charge'`.
- **L40–87** `applySurfaceColorTheme()` applies that theme to the surface repr — this part works.
- mol\*'s `partial-charge` theme (`src/mol-theme/color/partial-charge.ts`) colors by **per-atom partial charge read from the model**. A plain PDB/mmCIF has **no partial charges** (`coulombic` itself prints *"No formal charge annotations in PDB file"*), so every atom = 0 → every surface vertex maps to the same color → flat.
- **L141–196** `ElectrostaticCommand` is a stub that prints instructions instead of coloring.

So: the plumbing is correct, but **there is no charge data and no potential calculation**.

## 3. What already works — reuse these

- **Working color path to mirror:** `surfacecolor hydrophobicity` → theme `'hydrophobicity'`
  (`src/mol-theme/color/hydrophobicity.ts`) renders because it uses a built-in per-atom
  lookup — **no external data required**. The ESP theme should likewise be self-contained.
- **Charge estimates already implemented:** `src/mol-console/commands/chimerax/coulombic-commands.ts`
  — `getExpectedCharge(resName)` (ARG/LYS +1, ASP/GLU −1, HIS ~0 at pH 7) and formal-charge
  reading via `Props.atom.pdbx_formal_charge`. Reuse this to assign charges.
- **Theme registry:** `src/mol-theme/color.ts` (imports at L30/L35, registrations at L192/L199).
  Add the new theme provider here.
- **Theme templates to copy:** `src/mol-theme/color/partial-charge.ts` and
  `hydrophobicity.ts` show the `ColorThemeProvider` shape (granularity, `color(location)`,
  palette/legend). Model the ESP theme on `partial-charge.ts`.

## 4. Implementation

### Option A — quick (assign charges → reuse `partial-charge` theme)
1. On `surfacecolor electrostatic`, first assign per-atom charges if none exist: reuse
   coulombic's pH-7 residue charges, placed on representative side-chain atoms
   (Lys NZ, Arg CZ, Asp OD1/OD2, Glu OE1/OE2; or net charge on CA as a v1), written as a
   mol\* CustomProperty the `partial-charge` theme can read.
2. Keep the existing `electrostatic → 'partial-charge'` mapping.

Pro: minimal. Con: colors by *atom charge at the surface point*, not a true projected
potential — patchy, less like the smooth ESP users expect.

### Option B — recommended (true Coulombic ESP color theme)
Create `src/mol-theme/color/electrostatic-potential.ts`, modeled on `partial-charge.ts`:
1. **Charges:** build a per-atom charge array (reuse coulombic logic; prefer formal/pH-7
   charges; optionally Gasteiger later).
2. **Potential at each colored location** (surface vertex / nearest atom):
   `φ(p) = Σ_i q_i / (ε · |p − r_i|)` with a distance cutoff (~12–15 Å) and a
   distance-dependent dielectric `ε = 4·d` (ChimeraX `coulombic` default) or constant.
3. **Palette:** diverging ramp **red (−) → white (0) → blue (+)**, clamped to a range
   (default ±10 kT/e; expose as the optional arg the parser already accepts —
   `ElectrostaticCommand.parse` reads `range`, and add the same to `surfacecolor`).
   Include a legend like the other themes.
4. **Register** the provider in `src/mol-theme/color.ts` (e.g. name
   `'electrostatic-potential'`).
5. **Wire commands:** in `surface-analysis-commands.ts`, change the `electrostatic` map
   target (L412) to the new theme; and replace the `ElectrostaticCommand`/`EspSurfaceCommand`
   stub (L141–213) to call `applySurfaceColorTheme(plugin, 'electrostatic-potential', { range })`.

Pro: smooth, correct-looking ESP. Recommended.

## 5. Also fix while here (BUGS.md E/G/H/I — small, same area)
- **G/help:** `SurfaceColorCommand` help (L402) omits `electrostatic` and points to
  `coulombic`/`electrostatic`, which don't color — list `electrostatic` as an option and
  drop the dead pointers once it works.
- **I:** `coulombic`'s closing tip "use `color bycharge`" is an **invalid command** — point
  it at `surfacecolor electrostatic` instead.
- **E:** `lipophilicity`/`mlp` (L93–135) call the *same* working path as
  `surfacecolor hydrophobicity` yet error `Failed to color surface: Could not find node
  'undefined'` — suspect a stale/undefined repr ref in the `build().to(repr)` loop when
  reached via the alias; compare the repr selection at L45–54 across both entry points.
- **H:** repeated `surface` accumulates duplicate reprs (26 seen) — make `surface` replace
  or no-op an existing surface for the model (removal today is only `hide #N surfaces`).

## 6. Acceptance test (the exact harness we used)

smol6 must be running (HTTP server on `:8888`). Each step rendered to PNG and **inspected**
— the reply text is not trustworthy (it said success while flat).

```bash
smol-cmd "close"
smol-cmd "fetch 1cbs"                 # any protein; or a real target
smol-cmd "surface"
smol-cmd "surfacecolor electrostatic"
smol-cmd "png /tmp/esp_test.png"      # open it
```
**Pass:** smooth blue/white/red potential gradient (positive patches blue, acidic red).
**Fail (current):** uniform single color.

Controls / don't-confuse:
- `surfacecolor hydrophobicity` → green/brown gradient (already correct).
- `surfacecolor bfactor` → blue/white/red **but it's B-factor/uncertainty, not ESP**.
Also test on a charged input (mol2/pdbqt) to confirm both the auto-assign and
read-existing-charges paths.

## 7. Build & deploy

```bash
cd ~/github/sness23/molstar0
npm run build:apps          # produces build/smol/
npm run deploy:local        # scripts/deploy.js --local -> copies build/smol/ into the
                            #   smol6 public/smol/ (i.e. public/smol/molstar.js)
```
Then hard-refresh / restart the smol6 viewer to load the new bundle, and run §6.
(Per BUGS.md's 2026-06-16 resolution note, fixes are authored in molstar0 source,
rebuilt, and deployed to `public/smol/molstar.js`.)

## 8. Files at a glance
| Path (in `~/github/sness23/molstar0`) | Role |
|---|---|
| `src/mol-console/commands/chimerax/surface-analysis-commands.ts` | `surfacecolor` / `electrostatic` commands (L141, L370, L412) |
| `src/mol-console/commands/chimerax/coulombic-commands.ts` | reusable per-residue charge estimates |
| `src/mol-theme/color/partial-charge.ts`, `hydrophobicity.ts` | theme templates to copy |
| `src/mol-theme/color/electrostatic-potential.ts` | **new** ESP theme (Option B) |
| `src/mol-theme/color.ts` | register the new theme (L30/35 imports, L192/199 map) |
| `scripts/deploy.js` | `copySmol()` → smol6 `public/smol/` |
