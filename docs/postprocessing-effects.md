# Postprocessing Effects Reference

All effects are applied after the main 3D render pass. Enable the master switch first:
```javascript
canvas3d.setProps({ postprocessing: { enabled: true } });
```

## Ambient Occlusion (SSAO)

Darkens crevices and cavities where ambient light would be occluded. The single most impactful visual improvement for molecular surfaces.

```javascript
canvas3d.setProps({
    postprocessing: {
        occlusion: {
            name: 'on',
            params: { radius: 5, samples: 32, bias: 0.8, resolutionScale: 0.5 }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `radius` | 0–20 | How far AO spreads. Small = tight crevice shadows. Large = broad soft shadows. |
| `samples` | 1–256 | Quality. 16–32 is usually enough. Higher = slower. |
| `bias` | 0–3 | Reduces self-occlusion artifacts. Increase if you see banding. |
| `blurKernelSize` | 1–25 (odd) | Smooths the AO. Higher = softer but loses detail. |
| `resolutionScale` | 0.1–1 | Render AO at lower res. 0.5 = half res, 2x faster. |
| `color` | RGB | AO shadow color (default black). Try dark blue for a softer look. |

**Knob candidate**: `radius` — maps well to a single knob, immediate visual feedback.

## Outline

Draws silhouette and crease edges. Great for illustrations and presentations.

```javascript
canvas3d.setProps({
    postprocessing: {
        outline: {
            name: 'on',
            params: { scale: 2, threshold: 0.33, color: { r: 0, g: 0, b: 0 } }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `scale` | 1–5 | Edge thickness in pixels |
| `threshold` | 0.01–1 | Edge detection sensitivity. Lower = more edges detected. |
| `color` | RGB | Edge color |
| `includeTransparent` | boolean | Also outline transparent objects |

**Note**: Outline rendering interacts with `minNear` — a very small minNear can cause outline artifacts.

## Depth of Field (DOF)

Blurs out-of-focus regions. Cinematic effect, great for focusing attention.

```javascript
canvas3d.setProps({
    postprocessing: {
        dof: {
            name: 'on',
            params: { blurSize: 8, blurSpread: 3, inFocus: 0, PPM: 200, center: 'camera-target' }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `blurSize` | 1–32 | Maximum blur radius |
| `blurSpread` | 0–10 | How quickly blur increases with distance from focus |
| `inFocus` | -5000–5000 | Focus distance offset. 0 = at center/target. Negative = closer, positive = farther. |
| `PPM` | 0–5000 | Depth of field size. Higher = shallower DOF (more blur). |
| `center` | select | `'scene-center'` or `'camera-target'` — reference point for focus |
| `mode` | select | `'plane'` (flat focus plane) or `'sphere'` (spherical focus region) |

**Knob candidates**: `inFocus` (sweep focus through scene), `blurSize` (blur amount).

## Bloom

Glow effect. Bright surfaces bleed light into surrounding areas.

```javascript
canvas3d.setProps({
    postprocessing: {
        bloom: {
            name: 'on',
            params: { strength: 0.5, radius: 0.5, threshold: 0.8 }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `strength` | 0–3 | Glow intensity |
| `radius` | 0–1 | Glow spread (0 = tight, 1 = wide) |
| `threshold` | 0–1 | Brightness cutoff. Only surfaces brighter than this glow. |
| `mode` | select | `'luminosity'` (brightness-based) or `'emissive'` (material-based) |

**Knob candidate**: `strength`.

## Shadow

Screen-space shadows from directional lights. Adds grounding and depth.

```javascript
canvas3d.setProps({
    postprocessing: {
        shadow: {
            name: 'on',
            params: { steps: 16, maxDistance: 64, tolerance: 1 }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `steps` | 1–64 | Shadow quality (ray marching steps). More = sharper but slower. |
| `maxDistance` | 0–256 | How far shadows can reach |
| `tolerance` | 0–10 | Shadow bias. Increase to reduce shadow acne. |

## Sharpening (CAS)

Contrast-adaptive sharpening. Crisps up the final image without over-sharpening edges.

```javascript
canvas3d.setProps({
    postprocessing: {
        sharpening: {
            name: 'on',
            params: { sharpness: 0.5, denoise: false }
        }
    }
});
```

| Param | Range | What it does |
|-------|-------|-------------|
| `sharpness` | 0–1 | Sharpening strength. 0.3–0.5 is subtle, >0.7 is aggressive. |
| `denoise` | boolean | Also apply denoising |

## Antialiasing

Smooths jagged edges. Choose one mode:

```javascript
// FXAA (fast, slight blur)
canvas3d.setProps({
    postprocessing: { antialiasing: { name: 'fxaa', params: { subpixelQuality: 0.5 } } }
});

// SMAA (higher quality, slightly slower)
canvas3d.setProps({
    postprocessing: { antialiasing: { name: 'smaa', params: { edgeThreshold: 0.1 } } }
});
```

## Combining Effects

Effects stack. A good default combination:

```javascript
canvas3d.setProps({
    postprocessing: {
        enabled: true,
        occlusion: { name: 'on', params: { radius: 5, samples: 32 } },
        outline: { name: 'on', params: { scale: 1, threshold: 0.33 } },
        antialiasing: { name: 'smaa', params: {} },
        sharpening: { name: 'on', params: { sharpness: 0.3 } }
    }
});
```

For cinematic shots, add DOF and bloom:

```javascript
canvas3d.setProps({
    postprocessing: {
        dof: { name: 'on', params: { blurSize: 12, PPM: 300 } },
        bloom: { name: 'on', params: { strength: 0.3, radius: 0.5, threshold: 0.9 } }
    }
});
```

## Performance Notes

| Effect | Cost | Notes |
|--------|------|-------|
| SSAO | Medium | `resolutionScale: 0.5` helps a lot. Reduce `samples` if slow. |
| Outline | Low | Almost free |
| DOF | Medium | Cost scales with `blurSize` |
| Bloom | Low–Medium | Cheap at low `radius` |
| Shadow | Medium–High | Cost scales with `steps` |
| Sharpening | Low | Almost free |
| FXAA | Low | Fastest AA |
| SMAA | Low–Medium | Better quality than FXAA |
| GI (illumination) | Very High | Ray tracing. GPU-intensive. Use for stills, not interactive. |
