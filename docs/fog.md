# Fog in smol6

## What Is It?

Fog (depth cueing) gradually fades distant geometry into the background color. Unlike clipping, which is a hard cutoff, fog provides a **soft visual fade** — objects further from the camera become progressively transparent or blended with the background. This gives depth perception and helps focus attention on nearby structure.

| Property | Value |
|----------|-------|
| Default | 15 (when enabled) |
| Range | 1–100 |
| Can be toggled | Yes (`fog on` / `fog off`) |

## How It Works Internally

Fog is computed in two stages: **CPU** (camera.ts) calculates the fog distance range, then the **GPU** (fragment shader) applies the visual fade per-pixel.

### CPU: fogNear and fogFar

In `updateClip()` in `mol-canvas3d/camera.ts`:

```
fogNearFactor = -(50 - intensity) / 50
fogNear       = cameraDistance - (normalizedFar * fogNearFactor)
fogFar        = far   (the camera's far clipping plane)
```

- `normalizedFar` is the effective clipping radius (depends on `cameraClipping.radius` and `cameraClipping.far`)
- `cameraDistance` is the distance from camera to the scene target

What intensity does to fogNear:

| Intensity | fogNearFactor | fogNear position | Effect |
|-----------|---------------|------------------|--------|
| 1 | -0.98 | Far beyond scene | Almost no fog visible |
| 15 (default) | -0.70 | Well behind scene center | Gentle fade on distant atoms |
| 50 | 0 | At camera distance | Fog starts at scene center |
| 100 | +1.0 | In front of camera | Everything heavily fogged |

### GPU: The Shader

The fragment shader (`apply-fog.glsl.ts`) does:

```glsl
float viewZ = depthToViewZ(fragmentDepth);
float fogFactor = smoothstep(uFogNear, uFogFar, abs(viewZ));
```

`smoothstep` gives a smooth 0-to-1 transition between fogNear and fogFar:
- At fogNear: fogFactor = 0 (fully visible)
- At fogFar: fogFactor = 1 (fully fogged)
- Between: smooth cubic interpolation

How it's applied depends on the object type:
- **Opaque objects**: Color blended toward background — `mix(objectColor, fogColor, fogFactor)`
- **Transparent objects**: Alpha reduced — `alpha *= (1.0 - fogFactor)`

The fog color matches the background, so fogged geometry visually dissolves into nothing.

## Interaction with Clipping

Fog and clipping are coupled through `normalizedFar`:

| Clipping parameter | Effect on fog |
|--------------------|---------------|
| `radius` (clipRadius) | Changes `normalizedFar`, which shifts fogNear. Lower clip radius = fog starts closer |
| `far` toggle | When true, uses clip radius for `normalizedFar`. When false, uses full scene radius |
| `minNear` | No direct effect on fog |

**In practice**: If you tighten the clip radius to inspect a pocket, the fog range tightens too, making the depth cueing more pronounced within the visible slab. This is usually what you want — the fog adapts to your current view.

## Console Commands

```
fog on                  # Enable fog with current intensity
fog off                 # Disable fog entirely
fog intensity <1-100>   # Set intensity (clamped to 1-100)
fog <number>            # Shorthand for intensity
```

Examples:
- `fog 50` — moderate fog, starts around scene center
- `fog 5` — very subtle depth cueing
- `fog off` — no fog at all

## zknobs / MIDI Integration

| Knob (CC) | Parameter | MIDI Range | Mapped Range |
|-----------|-----------|------------|--------------|
| CC 4 | fog intensity | 0–127 | 0–100 |

The mapping in `smol6/index.html`:

```javascript
// Map 0-127 to fog 0-100
var fogVal = (v / 127) * 100;
canvas3d.setProps({ cameraFog: { name: 'on', params: { intensity: fogVal } } });
```

**Note**: The MIDI handler always sets fog to `'on'` — turning the knob to 0 gives intensity 0, but fog remains technically enabled. Use `fog off` in the console to fully disable it.

### zknobs knob layout (relevant knobs)

```
CC 0: Spare         CC 1-3: Coarse rotation
CC 4: Fog           CC 5-7: Fine rotation
CC 8: Near clip     CC 9-11: Coarse translation
CC 12: Clip radius  CC 13-15: Fine translation
```

## Can You Use Negative Values?

**No.** Intensity is defined with `min: 1, max: 100`. The MIDI mapping produces 0–100. Values below 1 are clamped. A negative intensity has no meaning — fog always fades *away* from the camera, never toward it.

## Fog vs Clip: When to Use Which

| | Fog | Clip |
|---|-----|------|
| **Visual** | Soft fade | Hard cutoff |
| **Purpose** | Depth perception, focus | Reveal interior, remove occluding geometry |
| **Distant atoms** | Fade to background | Completely hidden |
| **Good for** | Context while keeping focus on nearby structure | Slicing into binding pockets, cavities |
| **Combined** | Works well together — fog for context, clip for access |

A typical workflow: use clip radius to slice into a region of interest, then add gentle fog to make the depth structure of the exposed interior readable.

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-canvas3d/canvas3d.ts` | `CameraFogParams` definition (intensity 1–100) |
| `molstar0/src/mol-canvas3d/camera.ts` | `updateClip()` — fogNear/fogFar calculation |
| `molstar0/src/mol-gl/shader/chunks/apply-fog.glsl.ts` | Fragment shader fog application |
| `molstar0/src/mol-gl/shader/chunks/common-frag-params.glsl.ts` | Fog uniform declarations |
| `molstar0/src/mol-gl/renderer.ts` | Fog uniform updates per frame |
| `molstar0/src/mol-console/commands/chimerax/graphics-commands.ts` | `FogCommand` console command |
| `smol6/index.html` (~line 564–568) | MIDI fog event handler |
| `zknobs/zknobs.py` | MIDI Fighter Twister → WebSocket bridge |
