# Auto-Generated Slideshows

A pipeline for turning a PDB id into a narrated `.show` slideshow that walks through every non-covalent interaction between a ligand and its protein target.

The output is a standard `.show` file you play with `smol-present`. You read the narration aloud while pressing Enter to advance — smol6 does the camera work and highlighting.

## Quick Start

```bash
cd ~/github/sness23/smol6

# Generate only — writes shows/generated/<pdbid>.show, then stops so you can edit
./smol-present --generate 1cbs

# Generate then immediately play (smol6 must already be running)
./smol-present --generate 1cbs --play

# Specify a particular ligand resname when a PDB has several HET groups
./smol-present --generate 3ert OHT
```

## What the Pipeline Does

1. **Fetches** the PDB file from `files.rcsb.org` (cached in `~/.cache/smol-gen-show/`).
2. **Parses** it with Biopython.
3. **Auto-picks** the largest non-water, non-ion HET residue as "the ligand" (or uses the resname you supplied).
4. **Computes** every protein–ligand interaction:
   - **Hydrogen bonds** — heavy-atom donor/acceptor pairs (N, O, F, S) within 3.5 Å. Angle is not checked since most PDB structures lack hydrogens.
   - **Salt bridges** — Lys/Arg/His positively-charged sidechain atoms vs. ligand oxygens, and Asp/Glu negatively-charged sidechain atoms vs. ligand nitrogens, within 5.0 Å.
   - **π-stacking** — Phe/Tyr/Trp/His aromatic ring centroids within 5.5 Å of a cluster of ligand carbons. Heuristic; no ring perception.
   - **Hydrophobic / van der Waals contacts** — any other heavy-atom pair within 4.0 Å.
5. **Sends** the structured interaction list to OpenAI **o3** for narration. The model receives the residue→interaction mapping as JSON and returns narration in a fixed schema.
6. **Emits** a `.show` file using a standard slide template:
   - **Intro** — load + cartoon + chain coloring
   - **Overview** — slow spin
   - **Ligand close-up** — focus + ball-and-stick + yellow
   - **Pocket surface** — semi-transparent surface around the ligand
   - **All interactions** — `interactions` command shows every non-covalent contact at once
   - **Per residue × N** — one slide per unique residue that touches the ligand, with selection + highlight + camera focus
   - **Summary** — reset + slow spin

## Files

| File | Purpose |
|------|---------|
| `scripts/smol-gen-show.py` | The Python generator. Standalone — can be run directly. |
| `smol-present` | Bash playback driver. New `--generate` flag invokes the Python script. |
| `shows/generated/<pdbid>.show` | Default output location. |
| `~/.cache/smol-gen-show/` | PDB download cache. |

## smol-gen-show.py CLI

```
smol-gen-show.py <pdbid> [resname] [options]
```

| Option | Description |
|--------|-------------|
| `<pdbid>` | 4-character PDB id (e.g., `1cbs`) |
| `[resname]` | Optional ligand residue name to pin (e.g., `REA`). Auto-picked if omitted. |
| `-o, --output PATH` | Write `.show` to a custom path |
| `--model NAME` | OpenAI model (default: `o3`) |
| `--cache DIR` | PDB cache directory |
| `--no-llm` | Skip the LLM call; emit placeholder narration. Useful for debugging the structural analysis. |
| `--dump-json` | Print the raw analysis as JSON to stdout instead of emitting a `.show` |

### Environment

- `OPENAI_API_KEY` — required unless `--no-llm`

### Examples

```bash
# Inspect what the analyzer found, no LLM cost
python3 scripts/smol-gen-show.py 3ert --dump-json | jq '.interactions | length'

# Iterate on the slide template without burning API credits
python3 scripts/smol-gen-show.py 1cbs --no-llm

# Use a different model
python3 scripts/smol-gen-show.py 1cbs --model gpt-4o
```

## smol-present --generate flags

```
smol-present --generate <pdbid> [resname] [options]
```

| Flag | Description |
|------|-------------|
| `--play` | After generating, immediately enter playback mode |
| `--no-llm` | Forwarded to the generator |
| `--model NAME` | Forwarded to the generator |
| `--output, -o PATH` | Custom output path |

If `--play` is omitted, the script writes the `.show` file and stops, giving you a chance to hand-edit the narration before recording.

## The Generated `.show` Template

Every generated slideshow follows the same six-section layout, regardless of structure:

```
# <PDB title> — <RESNAME> in <PDBID>
---
<intro narration>

> console hide
> close
> load <pdbid>
> cartoon
> color bychain
---
<overview narration>

> reset
> spin 0.15
---
<ligand close-up narration>

> stop
> select ligand
> style sel ball-and-stick
> color sel yellow
> focus sel
---
<pocket narration>

> surface
> surface transparency 0.6
> focus sel
---
<all interactions narration>

> hide surface
> interactions
> focus sel
---
<per-residue narration #1>

> select /A:15
> style sel ball-and-stick
> color sel cyan
> focus /A:15
---
... (one slide per unique interacting residue) ...
---
<summary narration>

> stop
> reset
> spin 0.1
```

The selection syntax is ChimeraX-style — `/<chain>:<resnum>` — handled by the `select`, `focus`, and `style sel` commands in molstar0's chimerax command set.

## The `interactions` Command

The pipeline relies on a new smol command, `interactions`, that wraps Mol\*'s built-in `InteractionsRepresentationProvider`. It displays *all* non-covalent interactions in the loaded structure as color-coded dashed cylinders in a single command:

| Color | Type |
|-------|------|
| Blue | Hydrogen bonds |
| Yellow | Salt bridges |
| Purple | π-stacking |
| Grey-green | Hydrophobic |
| Cyan | Halogen bonds |
| Dark grey | Metal coordination |
| Light blue | Weak C–H hydrogen bonds |
| Orange | Cation-π |

```
interactions          show all non-covalent interactions
interactions off      hide them
~interactions         hide them (alias)
```

This is distinct from the existing `hbonds` command, which uses the same underlying representation but tags itself as hydrogen bonds for separate management.

The command lives in `~/github/sness23/molstar0/src/mol-console/commands/chimerax/interactions-commands.ts`. After modifying it, rebuild and re-sync per the [smol6 sync guide](../CLAUDE.md#syncing-with-molstar0).

## LLM Narration Schema

The generator sends a JSON payload to o3 containing the PDB id, title, ligand info, and `interactions_by_residue` map, and asks for narration in this strict shape:

```json
{
  "intro": "...",
  "overview": "...",
  "pocket": "...",
  "ligand_closeup": "...",
  "interactions_overview": "...",
  "per_residue": [
    {"residue": "Asn253", "text": "..."},
    ...
  ],
  "summary": "..."
}
```

Each section maps to one slide. If the LLM's `per_residue` array is missing some residues that the analyzer detected, those residues still get fallback slides with stub narration — no residue is silently dropped.

## Test Result (1cbs / Retinoic Acid)

End-to-end run on PDB `1cbs` (cellular retinoic-acid binding protein with all-trans retinoic acid):

- 38 raw interactions detected: 4 H-bonds, 6 salt bridge candidates, 1 π-stacking, 27 hydrophobic contacts
- 16 unique interacting residues
- 22 slides total, 85 commands

The narration correctly references **Phe15 π-stacking at 5.23 Å**, the **Arg132 bidentate salt bridge with O1/O2**, **Tyr134's hydroxyl 2.6 Å from the ligand carboxylate**, and per-residue hydrophobic contacts (e.g., `Leu19 CD2 ↔ C18 at 3.76 Å`). All distances are grounded in the real Biopython analysis, not hallucinated.

## Caveats and Future Work

- **`load <pdbid>` only** — no local-file loading yet. PDBs already deposited in the RCSB are the supported input.
- **π-stacking heuristic** — centroid distance only, no proper ring perception. Works for 1cbs but may miss subtle cases or false-positive on aliphatic ligands. Adding RDKit-based ring perception would tighten this.
- **No `--top-n` cap** — for ligands that contact many residues you get a long deck (e.g., 22 slides for 1cbs). A `--top-n` flag to keep the strongest N contacts is a natural next addition.
- **No hydrogen angle check on H-bonds** — most deposited PDBs lack hydrogens, so the heuristic is heavy-atom distance only. Reduce to OK rather than great.
- **Hand-editing is expected** — the LLM narration is a strong starting point but the `--generate`-without-`--play` default exists so you can polish before recording.

## See Also

- [console-commands-reference.md](console-commands-reference.md) — full smol command list
- [`~/data/vaults/docs/ARCH-auto-show-generation.md`](~/data/vaults/docs/ARCH-auto-show-generation.md) — vault architecture doc
- [`~/data/vaults/docs/ARCH-smol6.md`](~/data/vaults/docs/ARCH-smol6.md) — smol6 architecture overview
