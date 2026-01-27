# smol Video Scripts

Script files for creating YouTube videos with the smol molecular viewer.

## Usage

```bash
# Play a script (sends commands to running smol instance)
./smol-play scripts/01-molecule-tour-crambin.smol

# Record while playing
./smol-record scripts/01-molecule-tour-crambin.smol output.mp4
```

## Script Format

```
# Comments start with hash
load 1crn          # Commands are sent to smol
@2                 # Wait 2 seconds
color red          # Another command
@                  # Wait default (0.5s)
```

## Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `load <pdbid>` | Load PDB structure | `load 1crn` |
| `close` | Clear all structures | `close` |
| `style <type>` | Change representation | `style cartoon` |
| `color <color>` | Color all atoms | `color red` |
| `color <color> <sel>` | Color selection | `color blue :A` |
| `focus [sel]` | Focus camera | `focus @CA` |
| `reset` | Reset camera view | `reset` |

### Style Types
- `cartoon` - Ribbon/helix view
- `spacefill` - CPK spheres
- `ball-and-stick` / `sticks` - Bonds with spheres
- `lines` - Wire frame
- `surface` - Molecular surface

### Selection Syntax
- `:A` - Chain A
- `@CA` - Alpha carbons
- `:A and @CA` - Chain A alpha carbons
- `1-50` - Residues 1-50

## Scripts

1. **01-molecule-tour-crambin.smol** - Intro to molecular visualization
2. **02-docking-tutorial-1cbs.smol** - Protein-ligand binding example
3. **03-coding-demo.smol** - smol-cmd command reference
