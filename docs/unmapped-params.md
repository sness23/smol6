# Unmapped Parameters

Everything available in Canvas3D that we chose NOT to map to knobs, organized by category. These can still be set via console or `canvas3d.setProps()` in the JavaScript console.

## GI Parameters (removed from knobs, still available via setProps)

These were on knobs originally but dropped to make room for materials. Only the 4 essentials (enable, bounces, shadows, target FPS) are currently mapped on page 3 row 4.

| Parameter | Range | setProps path | Notes |
|-----------|-------|---------------|-------|
| GI iterations | 0–16 (actual = 2^x) | `{ illumination: { maxIterations } }` | Frames to accumulate |
| GI steps | 1–1024 | `{ illumination: { steps } }` | Ray marching samples per ray |
| GI ray distance | 1–8192 | `{ illumination: { rayDistance } }` | Max ray travel distance |
| GI shadow softness | 0.01–1 | `{ illumination: { shadowSoftness } }` | Penumbra width |
| GI shadow thickness | 0.1–32 | `{ illumination: { shadowThickness } }` | Surface thickness for shadows |
| GI glow | boolean | `{ illumination: { glow } }` | Self-illumination effect |
| GI first step size | 0.001–1 | `{ illumination: { firstStepSize } }` | Near-surface detail |
| GI refine steps | 0–8 | `{ illumination: { refineSteps } }` | Binary search precision |
| GI denoise | boolean | `{ illumination: { denoise } }` | Bilateral Gaussian denoising |
| GI denoise threshold | [0, 4] interval | `{ illumination: { denoiseThreshold } }` | Denoise strength range |
| GI ignore outline | boolean | `{ illumination: { ignoreOutline } }` | Skip outlines in GI pass |
| GI thickness mode | 'auto' \| 'fixed' | `{ illumination: { thicknessMode } }` | Surface thickness calc method |
| GI min thickness | 0.1–16 | `{ illumination: { minThickness } }` | Auto mode floor |
| GI thickness factor | 0.1–2 | `{ illumination: { thicknessFactor } }` | Auto mode multiplier |
| GI thickness | 0.1–512 | `{ illumination: { thickness } }` | Fixed mode thickness |

## Postprocessing (MappedStatic — requires special handling)

These errored when we tried mapping them directly. They use `PD.MappedStatic` wrappers that don't work with simple partial `setProps()` updates. May work if the effect is first enabled via console (`graphics high`) and then sub-params are adjusted.

| Parameter | Range | Notes |
|-----------|-------|-------|
| **SSAO radius** | 0–20 | Ambient occlusion spread. Most impactful postprocessing effect. |
| SSAO samples | 1–256 | AO quality |
| SSAO bias | 0–3 | Self-occlusion bias |
| SSAO blur kernel | 1–25 (odd) | Smoothing |
| SSAO resolution scale | 0.1–1 | Performance/quality tradeoff |
| SSAO color | RGB | Shadow tint |
| **Outline scale** | 1–5 | Silhouette edge thickness |
| Outline threshold | 0.01–1 | Edge detection sensitivity |
| Outline color | RGB | Edge color |
| Outline include transparent | boolean | Outline transparent objects |
| **DOF blur size** | 1–32 | Maximum blur radius |
| DOF blur spread | 0–10 | Blur growth rate |
| **DOF in-focus** | -5000–5000 | Focus distance offset |
| DOF PPM | 0–5000 | Depth of field size |
| DOF center | 'scene-center' \| 'camera-target' | Focus reference |
| DOF mode | 'plane' \| 'sphere' | Focus shape |
| **Bloom strength** | 0–3 | Glow intensity |
| Bloom radius | 0–1 | Glow spread |
| Bloom threshold | 0–1 | Brightness cutoff |
| Bloom mode | 'luminosity' \| 'emissive' | What triggers glow |
| **Sharpening** | 0–1 | CAS sharpening strength |
| Sharpening denoise | boolean | Also denoise |
| **Shadow steps** | 1–64 | Screen-space shadow quality |
| Shadow max distance | 0–256 | Shadow reach |
| Shadow tolerance | 0–10 | Shadow bias |
| **AA mode** | 'fxaa' \| 'smaa' \| 'off' | Antialiasing method |
| FXAA edge threshold min | 0.0312–0.0833 | Min edge detection |
| FXAA edge threshold max | 0.063–0.333 | Max edge detection |
| FXAA iterations | 0–16 | Search quality |
| FXAA subpixel quality | 0–1 | Smoothing |
| SMAA edge threshold | 0.05–0.15 | Sensitivity |
| SMAA max search steps | 0–32 | Quality |

## Renderer Params (simple but niche)

| Parameter | Range | setProps path | Why not mapped |
|-----------|-------|---------------|----------------|
| Marker priority | 1 \| 2 | `{ renderer: { markerPriority } }` | Only 2 values, not useful as a knob |
| Background color | RGB | `{ renderer: { backgroundColor: Color(hex) } }` | Needs Color object, not a simple numeric |
| Interior color | RGB | `{ renderer: { interiorColor: Color(hex) } }` | Same — needs Color object |
| Highlight color | RGB | `{ renderer: { highlightColor: Color(hex) } }` | Same |
| Select color | RGB | `{ renderer: { selectColor: Color(hex) } }` | Same |
| Dim color | RGB | `{ renderer: { dimColor: Color(hex) } }` | Same |
| Ambient color | RGB | `{ renderer: { ambientColor: Color(hex) } }` | Same |

## Multisampling & Misc

| Parameter | Range | setProps path | Why not mapped |
|-----------|-------|---------------|----------------|
| Multisample mode | 'off' \| 'on' \| 'temporal' | `{ multiSample: { mode } }` | Select, not numeric |
| Multisample reduce flicker | boolean | `{ multiSample: { reduceFlicker } }` | Niche |
| Multisample reuse occlusion | boolean | `{ multiSample: { reuseOcclusion } }` | Niche |
| HiZ min level | 1–10 | `{ hiZ: { minLevel } }` | Niche occlusion culling param |
| Interaction convert coords to ray | boolean | `{ interaction: { convertCoordsToRay } }` | Internal |
| Interaction prefer atom pixel padding | 0–20 | `{ interaction: { preferAtomPixelPadding } }` | Niche |
| Debug instance bounding spheres | boolean | `{ debug: { instanceBoundingSpheres } }` | Very niche debug |

## Camera Params

| Parameter | Range | setProps path | Why not mapped |
|-----------|-------|---------------|----------------|
| Camera mode | 'perspective' \| 'orthographic' | `{ camera: { mode } }` | Select, better via console (`camera ortho`) |
| Stereo enable | 'on' \| 'off' | `{ camera: { stereo } }` | MappedStatic |
| Stereo eye separation | 0.02–0.1 | — | Needs stereo enabled |
| Stereo focus | 1–20 | — | Needs stereo enabled |
| Camera axes helper | 'on' \| 'off' | `{ camera: { helper } }` | MappedStatic |

## Trackball Params

| Parameter | Range | setProps path | Why not mapped |
|-----------|-------|---------------|----------------|
| Static moving | boolean | `{ trackball: { staticMoving } }` | Hidden param |
| Dynamic damping factor | 0–1 | `{ trackball: { dynamicDampingFactor } }` | Hidden param |
| Animate mode | 'off' \| 'spin' \| 'rock' | `{ trackball: { animate } }` | MappedStatic, better via console (`spin`, `rock`) |
| Auto adjust min/max distance | 'on' \| 'off' | `{ trackball: { autoAdjustMinMaxDistance } }` | MappedStatic |

## Marking Params (colors)

| Parameter | Type | Why not mapped |
|-----------|------|----------------|
| Highlight edge color | RGB | Needs Color object |
| Select edge color | RGB | Needs Color object |

## Per-Representation (via ValueCell, like material)

| Parameter | Range | Uniform | Notes |
|-----------|-------|---------|-------|
| Emissive | 0–1 | `uEmissive` | Self-illumination strength. Could be mapped same way as material. |
| Alpha | 0–1 | `uAlpha` | Transparency. Could be mapped but risky (0 = invisible). |
| Density | 0–1 | — | Volume density |

## XR Params

| Parameter | Range | setProps path | Why not mapped |
|-----------|-------|---------------|----------------|
| Min target distance | 0.001–1 | `{ xr: { minTargetDistance } }` | VR only |
| Disable postprocessing | boolean | `{ xr: { disablePostprocessing } }` | VR only |
| Resolution scale | 0.1–2 | `{ xr: { resolutionScale } }` | VR only |
| Scene radius in meters | 0.01–2 | `{ xr: { sceneRadiusInMeters } }` | VR only |

## Viewport

| Parameter | Type | Why not mapped |
|-----------|------|----------------|
| Viewport mode | 'canvas' \| 'static-frame' \| 'relative-frame' | MappedStatic, niche |
| Viewport x, y, width, height | numeric | Only for multi-viewport setups |

## Summary

**Total Canvas3D params**: ~130+
**Currently mapped to knobs**: 64 (all 4 MFT pages)
**Unmapped**: ~70, of which:
- ~30 are postprocessing (blocked by MappedStatic issue)
- ~10 are RGB colors (need Color objects, not simple numerics)
- ~10 are GI fine-tuning (dropped for space)
- ~10 are niche/internal/VR-only
- ~5 are select/enum types (better via console)
- ~5 are per-representation (could use ValueCell approach like material)

### Most Wanted (if we solve the access issues)

1. **SSAO radius** — single most impactful visual improvement
2. **Outline scale** — great for illustrations
3. **DOF in-focus** — cinematic focus sweep
4. **Bloom strength** — glow effect
5. **Emissive** (per-repr) — self-illumination, easy to add via ValueCell
6. **Background color** — needs Color object helper
