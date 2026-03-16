# Clip Radius in smol6

## What Is It?

Clip radius controls a **clipping sphere** around the scene that hides geometry beyond a certain distance from the camera. It works like slicing through a molecule — turn the knob and the front of the structure disappears, revealing the interior. This is essential for inspecting binding pockets, internal cavities, and buried residues.

Mol* defines clipping via `cameraClipping` on the Canvas3D, which has three parameters:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `radius` | 0–99 (%) | 100 | How much of the scene to show. Lower = more clipped. |
| `far` | boolean | true | Whether to hide distant geometry |
| `minNear` | 0.1–100 (A) | 5 | Minimum near clipping plane distance |

`radius` is the main one. At 100 the full scene is visible. At 0 nearly everything is clipped away. The camera code in `mol-canvas3d/camera.ts` converts this percentage into actual near/far plane distances, scaled by the camera's current zoom level.

## How It Works Internally

In `camera.ts`, `updateClip()` does the math:

1. Takes the radius percentage and the scene's bounding sphere
2. Multiplies by the camera's scale factor (so clipping adapts to zoom)
3. Enforces a minimum radius of `0.01 * scale`
4. Sets the near plane accordingly; if `far` is enabled, also clips the back

The key insight: **radius is relative to the scene**, not an absolute distance. Zooming in/out changes the effective clip distance even at the same radius value.

## Console Commands

The `clip` command (ChimeraX-style) provides direct control:

```
clip front <distance>    # Set front clipping (converted: radius = 100 - distance)
clip slab <distance>     # Set slab thickness
clip back [distance]     # Toggle/set far clipping
clip off                 # Disable all clipping (radius=100, far=false)
```

Example: `clip front 10` sets radius to 90 (shows 90% of scene).

## zknobs / MIDI Integration

The Midi Fighter Twister maps two knobs to clipping:

| Knob (CC) | Parameter | MIDI Range | Mapped Range |
|-----------|-----------|------------|--------------|
| CC 8 | minNear | 0–127 | 0.1–50 A |
| CC 12 | clipRadius | 0–127 | 1–200 |

The mapping happens in `smol6/index.html` when a `clipfog` WebSocket event arrives from zknobs:

```javascript
// clipRadius: MIDI 0-127 → radius 1-200
canvas3d.setProps({ cameraClipping: { radius: 1 + (v / 127) * 199 } });

// minNear: MIDI 0-127 → minNear 0.1-50
canvas3d.setProps({ cameraClipping: { minNear: 0.1 + (v / 127) * 49.9 } });
```

**Note:** smol6 maps clipRadius to 1–200, which exceeds the standard UI range of 0–99. Values above 99 effectively mean "no clipping" (the full scene is visible with margin). This wider range gives the physical knob more resolution in the useful region.

### zknobs knob layout (relevant row)

```
CC 8:  Near clip (minNear)    CC 9-11:  Coarse translation (x, y, z)
CC 12: Clip radius            CC 13-15: Fine translation (x, y, z)
```

## Can You Use Negative Values?

**No.** Negative values are not meaningful and not supported:

- The Mol* parameter definition clamps `radius` to `{ min: 0, max: 99 }` in the UI
- `minNear` is clamped to `{ min: 0.1, max: 100 }`
- The camera's `updateClip()` enforces a minimum radius of `0.01 * scale`
- MIDI knobs only send 0–127, so the zknobs mapping always produces positive values (1–200 for clipRadius, 0.1–50 for minNear)

If you set radius to 0 via `setProps`, you get maximum clipping (nearly everything hidden). There's no concept of "negative clipping" — the clip plane can't go behind the camera.

## Practical Tips

- **To slice into a structure**: Lower the radius (turn CC 12 left). Combine with rotation to inspect from different angles.
- **To see internal cavities**: Use `clip front` with a moderate distance, or turn the clip radius knob partway.
- **minNear gotcha**: Setting minNear very low (< 0.5) can cause rendering artifacts with impostor-based representations (spheres, cylinders). The default of 5 is safe.
- **Fog vs clip**: Fog (CC 4) provides depth cueing (fading distant atoms) without hard cutoff. Clip provides a hard cutoff. They work well together — fog for context, clip for focus.
- **Reset**: `clip off` in the console disables all clipping.

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-canvas3d/canvas3d.ts` | `cameraClipping` parameter definitions |
| `molstar0/src/mol-canvas3d/camera.ts` | `updateClip()` — actual near/far plane math |
| `molstar0/src/mol-console/commands/chimerax/graphics-commands.ts` | `ClipCommand`, `FogCommand` |
| `smol6/index.html` (lines ~556–570) | MIDI clipfog event handler |
| `zknobs/zknobs.py` | MIDI Fighter Twister → WebSocket bridge |
