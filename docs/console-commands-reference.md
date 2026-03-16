# Console Commands Reference

Complete list of commands available in the smol console (F2 to toggle).

## Structure Loading & Management

| Command | Description | Example |
|---------|-------------|---------|
| `load <pdbid>` | Load PDB structure | `load 1cbs` |
| `close` | Clear all structures | `close` |

## Camera & Navigation

| Command | Description | Example |
|---------|-------------|---------|
| `reset` | Reset camera to fit all structures | `reset` |
| `reset all` | Clear structures and reset camera | `reset all` |
| `focus [spec]` | Focus camera on selection (adjusts distance + radius) | `focus`, `focus /A`, `focus :50-100`, `focus sel` |
| `center [spec]` | Move target to selection center | `center /A:50` |
| `zoom [factor]` | Zoom in/out (default 1.5x) | `zoom`, `zoom 2`, `zoom 0.5` |
| `orient [spec]` | Orient to principal axes | `orient` |
| `axes` | Reset to Cartesian axes | `axes` |
| `cofr [spec]` | Set center of rotation | `cofr /A:50` |
| `fly [duration]` | Animated camera movement | `fly`, `fly 500` |

## Views

| Command | Description | Example |
|---------|-------------|---------|
| `view front` | Standard front orientation | `view front` |
| `view back` | Standard back orientation | `view back` |
| `view top` | Standard top orientation | `view top` |
| `view bottom` | Standard bottom orientation | `view bottom` |
| `view left` | Standard left orientation | `view left` |
| `view right` | Standard right orientation | `view right` |
| `view name <n>` | Save current view | `view name closeup` |
| `view <n>` | Restore saved view | `view closeup` |
| `view <n> <frames>` | Restore with animation | `view closeup 30` |
| `view list` | List saved views | `view list` |
| `view delete <n>` | Delete saved view | `view delete closeup` |

## Clipping & Fog

| Command | Description | Example |
|---------|-------------|---------|
| `clip front <dist>` | Set front clipping plane | `clip front 10` |
| `clip back [dist]` | Toggle/set far clipping | `clip back`, `clip back 50` |
| `clip slab <dist>` | Set slab thickness | `clip slab 80` |
| `clip off` | Disable all clipping | `clip off` |
| `fog on` | Enable fog | `fog on` |
| `fog off` | Disable fog | `fog off` |
| `fog <intensity>` | Set fog intensity (1–100) | `fog 30` |
| `fog intensity <n>` | Set fog intensity (explicit) | `fog intensity 50` |

## Camera Mode

| Command | Description | Example |
|---------|-------------|---------|
| `camera perspective` | Perspective projection | `camera persp` |
| `camera orthographic` | Orthographic projection | `camera ortho` |
| `camera fov <degrees>` | Set field of view (10–130) | `camera fov 60` |
| `camera` | Show current camera settings | `camera` |

## Coloring

| Command | Description | Example |
|---------|-------------|---------|
| `color <color>` | Color all atoms | `color red` |
| `color @CA <color>` | Color alpha carbons | `color @CA green` |
| `color :A <color>` | Color chain A | `color :A blue` |

## Graphics & Lighting

| Command | Description | Example |
|---------|-------------|---------|
| `lighting default` | Default lighting | `lighting default` |
| `lighting flat` | Flat/minimal lighting | `lighting flat` |
| `lighting glossy` | Glossy preset | `lighting glossy` |
| `lighting matte` | Matte preset | `lighting matte` |
| `lighting metallic` | Metallic preset | `lighting metallic` |
| `lighting ambient <val>` | Set ambient intensity | `lighting ambient 0.8` |
| `graphics auto` | Auto quality | `graphics auto` |
| `graphics low` | Low quality (fast) | `graphics low` |
| `graphics medium` | Medium quality | `graphics medium` |
| `graphics high` | High quality | `graphics high` |
| `graphics highest` | Highest quality (slow) | `graphics highest` |
| `background <color>` | Set background color | `background black` |

## Animation

| Command | Description | Example |
|---------|-------------|---------|
| `rock [speed] [angle]` | Oscillating rotation | `rock`, `rock 2 30` |
| `roll [speed]` | Continuous rotation | `roll`, `roll 0.5` |
| `spin [speed]` | Spin animation | `spin` |
| `wobble [speed] [angle]` | Small wobble animation | `wobble` |
| `stop` | Stop all animations | `stop` |

## Console UI

| Command | Description |
|---------|-------------|
| `console overlay` | Full-screen overlay mode |
| `console compact` | Small bottom-left console |
| `console hide` | Hide console |
| `console show` | Show console |
| `console toggle` | Toggle console visibility |
| `help` | Show available commands |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F2** | Toggle console |
| **Escape** | Hide console |
| **Enter** | Show console (when hidden) |
| **Up/Down** | Command history |

## Selection Specifiers

Used with `focus`, `center`, `color`, `view`, etc:

| Spec | Meaning | Example |
|------|---------|---------|
| `/A` | Chain A | `focus /A` |
| `:50` | Residue 50 | `focus :50` |
| `:50-100` | Residues 50–100 | `focus :50-100` |
| `@CA` | Alpha carbons | `color @CA red` |
| `sel` | Current selection | `focus sel` |
