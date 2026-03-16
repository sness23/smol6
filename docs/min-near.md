# minNear in smol6

## What Is It?

`minNear` sets a **floor on the near clipping plane** — the closest distance from the camera at which geometry is still rendered. Anything closer than the near plane is invisible.

Without `minNear`, the near plane would be computed purely from geometry (`cameraDistance - radius`), which can push it dangerously close to zero. That breaks things. `minNear` prevents that by saying "never clip closer than this distance."

| Property | Value |
|----------|-------|
| Default | 5 (Angstroms, scaled by camera zoom) |
| Range | 0.1–100 |
| Step | 0.1 |
| Unit | World-space distance (Angstroms), scaled by `camera.scale` |

## How It Works Internally

The `updateClip()` function in `mol-canvas3d/camera.ts` computes the final near plane like this:

```
initial_near = cameraDistance - radius
final_near   = max( min(radiusMax, minNear), initial_near )
```

In plain English:

1. **Start with geometry**: `cameraDistance - radius` gives the natural near plane based on your clip radius setting
2. **Cap minNear at scene size**: `min(radiusMax, minNear)` — if the scene is smaller than your minNear, minNear gets capped to the scene radius so it doesn't clip everything away
3. **Take the larger**: The near plane is whichever is further from the camera — the geometry-derived value or the (capped) minNear

The far plane also respects minNear: `far = max(minNear, far)`, so far is never less than minNear.

### Special case: forceFull

When viewing the entire scene (`forceFull = true`), minNear is temporarily overridden to match the calculated near plane. This prevents minNear from clipping parts of the full scene view.

## Interaction with clipRadius

`minNear` and `radius` are independent but combine to produce the final near plane:

| Scenario | radius effect | minNear effect | Winner |
|----------|--------------|----------------|--------|
| Zoomed out, gentle clip | near = 150 | minNear = 5 | Geometry (150 > 5) |
| Zoomed in, aggressive clip | near = 2 | minNear = 5 | minNear (5 > 2) |
| Tiny molecule | radiusMax = 3, minNear = 5 | minNear capped to 3 | Depends on geometry |

**Key point**: When you turn the clip radius knob (CC 12) to slice deep into a structure, `minNear` limits how deep you can actually go. If the calculated near plane would be closer than minNear, minNear wins. To slice deeper, you need to lower minNear too (CC 8).

## Why Not Set It to 0.1?

The parameter description warns:

> "May cause performance issues rendering impostors when set too small and cause issues with outline rendering when too close to 0."

Specifically:

- **Sphere impostors** (the optimized sphere representations): When the near plane is very close to the camera, impostor geometry becomes numerically unstable and rendering slows down. The code comments recommend at least 5.
- **Outline rendering**: Depth comparisons for edge detection break down when near approaches 0, causing visual artifacts on silhouettes.
- **Z-fighting**: A near plane close to 0 reduces depth buffer precision across the entire scene, causing flickering where surfaces overlap.

| minNear value | Effect |
|---------------|--------|
| 0.1–1 | Maximum slice depth, but expect impostor slowdown and outline glitches |
| 1–5 | Good for close inspection, occasional artifacts |
| 5 (default) | Safe for all representations |
| 10–50 | Conservative, good for large assemblies |
| 50–100 | Very thick near plane, close geometry gets clipped |

## zknobs / MIDI Integration

| Knob (CC) | Parameter | MIDI Range | Mapped Range |
|-----------|-----------|------------|--------------|
| CC 8 | minNear | 0–127 | 0.1–50 A |

The mapping in `smol6/index.html`:

```javascript
// Map 0-127 to minNear 0.1-50
canvas3d.setProps({ cameraClipping: { minNear: 0.1 + (v / 127) * 49.9 } });
```

Turning CC 8 fully left gives 0.1 (maximum close-up slice depth, with performance risk). Fully right gives 50 (conservative, clips nearby geometry).

### zknobs knob layout (relevant row)

```
CC 8:  Near clip (minNear)    CC 9-11:  Coarse translation (x, y, z)
CC 12: Clip radius            CC 13-15: Fine translation (x, y, z)
```

## Can You Use Negative Values?

**No.** The parameter is defined with `min: 0.1`. Negative values have no meaning — you can't have a negative distance from the camera. The MIDI mapping also only produces values from 0.1 to 50.

## Console Access

There is **no dedicated console command** for minNear. To set it programmatically:

```javascript
viewer.plugin.canvas3d.setProps({ cameraClipping: { minNear: 2.0 } });
```

Or use the CC 8 knob via zknobs.

## Practical Tips

- **Default of 5 is good for most work.** Only lower it if you need to slice very close to geometry.
- **If rendering feels slow** after adjusting minNear, turn it back up — you've probably hit the impostor performance issue.
- **Use minNear + clipRadius together**: clipRadius controls *how much* of the scene to clip, minNear controls *how close* you're allowed to clip. For deep inspection of a binding pocket, lower both.
- **Large assemblies**: Consider raising minNear (10–20) for better depth precision across the scene.

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-canvas3d/canvas3d.ts` | `cameraClipping.minNear` parameter definition |
| `molstar0/src/mol-canvas3d/camera.ts` | `updateClip()` — near/far plane calculation using minNear |
| `smol6/index.html` (~line 561–563) | MIDI minNear event handler |
| `zknobs/zknobs.py` | MIDI Fighter Twister → WebSocket bridge |
