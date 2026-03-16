# Why the Protein Gets Cut Off (and What to Do About It)

## The Problem

You zoom into a protein and instead of being "inside" it, you see a flat grey cross-section — the near clipping plane is slicing through the structure. The grey is the background showing through where geometry has been discarded.

## What's Actually Happening

Mol* renders everything between two invisible walls: the **near plane** and the **far plane**. Anything closer than near or farther than far is discarded before it ever reaches the screen. When you zoom in, the camera moves toward the molecule, but the near plane doesn't automatically pull back to accommodate — so it starts cutting into the structure.

### The Pipeline: Scroll Wheel to Screen

```
1. You scroll the mouse wheel
       ↓
2. trackball.zoomCamera() scales the eye vector
   (moves camera position closer to target)
       ↓
3. camera.update() calls updateClip()
       ↓
4. near = cameraDistance - radius     ← radius is NOT changed by zoom
   far  = cameraDistance + normalizedFar
       ↓
5. near is clamped: near = max(min(radiusMax, minNear), near)
       ↓
6. Everything closer than near is discarded
       ↓
7. You see grey where the molecule should be
```

### The Root Cause: Zoom Doesn't Adjust Radius

This is the key insight. There are two independent parameters:

- **Camera distance** (`cameraDistance`): How far the camera is from the target point. Changed by scroll wheel.
- **Clipping radius** (`radius`): How far from the target the near plane extends. **NOT changed by scroll wheel.**

When you zoom in:

| State | cameraDistance | radius | near (= dist - radius) | Result |
|-------|--------------|--------|------------------------|--------|
| Initial | 50 | 10 | 40 | Everything visible |
| Zoomed 2x | 25 | 10 | 15 | Still OK |
| Zoomed 5x | 10 | 10 | 0 → clamped to minNear (5) | Clipping starts |
| Zoomed 10x | 5 | 10 | -5 → clamped to minNear (5) | Heavy clipping |

Once `cameraDistance - radius` drops below `minNear` (default 5), the near plane is locked at minNear and slices through your molecule.

## What You Can Do

### Quick Fixes

**`reset`** — Reset the camera to fit the whole molecule. Fastest way to get un-stuck.

**`focus`** — Re-focus on everything (or a selection). Recalculates camera distance AND radius to fit:
```
focus           # Fit entire structure
focus /A        # Fit chain A
focus :50-100   # Fit residues 50-100
focus sel       # Fit current selection
```

Focus is probably what you want most of the time. It adjusts both the camera position and the clipping radius to properly frame the target.

### Adjust Clipping Directly

**`clip` command:**
```
clip front 5     # Move front clip plane in by 5 (radius = 95)
clip front 50    # Aggressive front clip (radius = 50)
clip slab 80     # Set slab thickness
clip off         # Disable all clipping (radius=100, far=false)
```

**MIDI knobs (zknobs):**
- **CC 12**: Clip radius — turn left to clip more, right to show more
- **CC 8**: minNear — turn left to allow closer near plane (risk: performance), right for safer distance

**Lower minNear** to allow the near plane closer to the camera:
```
clip off                  # Console: disable clipping entirely
```
Or via CC 8 knob — turn it left toward 0.1. Beware of impostor rendering slowdown below ~5.

### Use Shift+Scroll Instead of Scroll

Regular scroll wheel moves the camera but leaves the clipping radius alone. **Shift+Scroll** adjusts the clipping radius (the `focusCamera()` function in trackball controls). This expands or contracts the visible slab around the target without moving the camera.

This is the "missing" control — if you Shift+Scroll to widen the radius as you zoom in, you won't get clipped.

### Move the Target, Not Just the Camera

**Pan** (middle-click drag or Shift+left-drag in trackball) moves both the camera AND the target point together. This doesn't change `cameraDistance`, so it won't make clipping worse. Use it to slide around inside a large structure.

**`center` command** moves the target to a specific selection:
```
center /A:50    # Center on residue 50 of chain A
```

This repositions the clipping sphere around the new target, which can help if the clipping is happening because your point of interest is far from the current target.

### Switch to Orthographic

```
camera ortho    # Switch to orthographic projection
camera persp    # Switch back to perspective
```

Both modes use the same clipping math, so orthographic won't fix clipping by itself. But in orthographic mode, zooming often feels different (no perspective distortion), and you may find it easier to work with the clip controls.

### Use `view` to Save/Restore Good Viewpoints

```
view name closeup     # Save current camera state as "closeup"
view closeup          # Restore it instantly
view closeup 30       # Restore with 30-frame animation
view list             # Show saved views
view delete closeup   # Remove a saved view
```

Standard orientations are also available:
```
view front    view back
view top      view bottom
view left     view right
```

## Could You Just Move the Molecule to Fit?

Sort of. You're not moving the molecule — you're moving the **camera target** (the center of the clipping sphere). The commands that help:

- **`focus <selection>`** — Best option. Recalculates everything to frame a selection properly.
- **`center <selection>`** — Moves the target to the selection's center without changing zoom.
- **Pan** (middle-drag) — Slides the target point to reposition the clipping sphere.

The underlying issue is that the clipping sphere is centered on `camera.state.target`. If the target is at the center of your protein and you zoom in on a surface residue, the near plane is calculated from the *target* (center), not from where you're looking. By re-centering the target on the region you care about (via `focus` or `center`), the clipping sphere moves with you.

## The Ideal Workflow

1. **Load structure**: `load 1cbs`
2. **Navigate broadly**: Scroll wheel to zoom, click-drag to rotate
3. **Want to inspect a region?** Use `focus :50-60` to reframe on residues 50-60. This adjusts both camera distance and clipping radius.
4. **Getting clipped?** `focus` (no args) to reset to the full structure, or `clip off` to disable clipping entirely.
5. **Fine-tuning**: Use CC 12 (clip radius) and CC 8 (minNear) knobs for precise control.
6. **Save a good view**: `view name mybinding` to come back later.

## Why Mol* Works This Way

Mol* separates zoom (camera distance) from clipping (radius) intentionally — it gives you independent control over "how close am I" and "how much depth do I see." In crystallography and cryo-EM work, you often want a thin slab through a large structure. The tradeoff is that casual zooming can push you through the clipping plane if you're not also adjusting the radius.

PyMOL and ChimeraX have similar issues but auto-adjust their slab more aggressively. Mol*'s approach is more manual but more controllable — once you know about `focus` and Shift+Scroll.

## Reference: All Camera/View Commands

| Command | What it does |
|---------|-------------|
| `reset` | Reset camera to fit all structures |
| `focus [spec]` | Re-focus camera on selection (adjusts distance + radius) |
| `center [spec]` | Move target to selection center |
| `zoom [factor]` | Zoom in/out (default 1.5x) |
| `view front/back/top/bottom/left/right` | Standard orientations |
| `view name <n>` / `view <n>` | Save / restore named views |
| `orient [spec]` | Orient to principal axes |
| `axes` | Reset to Cartesian axes |
| `cofr [spec]` | Set center of rotation |
| `fly [duration]` | Animated camera movement |
| `clip front/back/slab/off [dist]` | Clipping plane control |
| `camera persp/ortho` | Projection mode |
| `camera fov <degrees>` | Field of view (10-130) |
| `fog on/off/<intensity>` | Depth cueing |

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-canvas3d/camera.ts` | `updateClip()` — near/far plane calculation |
| `molstar0/src/mol-canvas3d/controls/trackball.ts` | `zoomCamera()` (scroll) and `focusCamera()` (Shift+scroll) |
| `molstar0/src/mol-canvas3d/canvas3d.ts` | `cameraClipping` params, `resolveCameraReset()` |
| `molstar0/src/mol-gl/scene.ts` | Scene bounding sphere calculation |
| `molstar0/src/mol-console/commands/chimerax/utility-commands.ts` | focus, center, zoom, view, reset commands |
| `molstar0/src/mol-console/commands/chimerax/graphics-commands.ts` | clip, camera, fog commands |
| `molstar0/src/mol-console/commands/chimerax/camera-extended-commands.ts` | orient, axes, cofr, fly commands |
| `molstar0/src/mol-plugin-state/manager/camera.ts` | Camera manager (focusLoci, focusSphere, reset) |
