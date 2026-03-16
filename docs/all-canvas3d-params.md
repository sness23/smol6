# All Canvas3D Parameters

Complete reference of every runtime-controllable parameter in Mol* Canvas3D, accessible via `canvas3d.setProps()`. Organized by category with ranges, defaults, and notes on what's useful for MIDI knob mapping.

## Camera

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `camera.mode` | select | `'perspective'` \| `'orthographic'` | `'perspective'` | Projection mode |
| `camera.fov` | numeric | 10–130° (step 1) | 45 | Field of view (perspective only). Low = telephoto, high = fisheye. |
| `camera.helper.axes` | mapped | `'on'` \| `'off'` | `'off'` | Show orientation axes widget |
| `camera.stereo` | mapped | `'on'` \| `'off'` | `'off'` | Stereo 3D (perspective only) |
| `camera.stereo.on.eyeSeparation` | numeric | 0.02–0.1 (step 0.001) | — | Eye separation for stereo |
| `camera.stereo.on.focus` | numeric | 1–20 (step 0.1) | — | Stereo focus distance |

**Knob candidate**: `camera.fov` — dramatic visual control, maps well to a single knob.

## Clipping

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `cameraClipping.radius` | numeric | 0–99 (step 1) | 100 | How much of scene to show (%) |
| `cameraClipping.far` | boolean | — | true | Hide distant geometry |
| `cameraClipping.minNear` | numeric | 0.1–100 (step 0.1) | 5 | Minimum near plane distance (A) |

Already mapped: CC 12 (clipRadius), CC 8 (minNear).

## Fog

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `cameraFog` | mapped | `'on'` \| `'off'` | `'on'` | Enable/disable fog |
| `cameraFog.on.intensity` | numeric | 1–100 (step 1) | 15 | Fog strength. Higher = fog starts closer to camera. |

Already mapped: CC 4 (fog).

## Renderer — Lighting

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `renderer.ambientIntensity` | numeric | 0–2 (step 0.01) | ~0.6 | Ambient light level. 0 = only directional, 2 = washed out. |
| `renderer.ambientColor` | color | RGB | white | Ambient light color |
| `renderer.light[]` | array | — | — | Array of directional lights |
| `renderer.light[].inclination` | numeric | 0–180° (step 1) | — | Light elevation (0=top, 180=bottom) |
| `renderer.light[].azimuth` | numeric | 0–360° (step 1) | — | Light rotation |
| `renderer.light[].color` | color | RGB | — | Light color |
| `renderer.light[].intensity` | numeric | 0–5 (step 0.01) | — | Light brightness |
| `renderer.exposure` | numeric | 0–3 (step 0.01) | 1.0 | Tone mapping exposure. <1 = darker, >1 = brighter. |

**Knob candidates**: `renderer.exposure` (overall brightness), `renderer.ambientIntensity` (fill light level).

## Renderer — Interior & Surfaces

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `renderer.interiorDarkening` | numeric | 0–1 (step 0.01) | ~0.5 | How dark clipped interior surfaces appear. **This is the "grey interior" you see when clipping.** 0 = same as exterior, 1 = black. |
| `renderer.interiorColorFlag` | boolean | — | false | Use custom interior color instead of darkened exterior |
| `renderer.interiorColor` | color | RGB | grey | Custom interior color (when flag is true) |

**Important**: `interiorDarkening` directly controls that grey you see when the clip plane cuts through a surface. Lowering it makes the interior match the exterior color. Setting `interiorColorFlag` + `interiorColor` lets you pick any color for clipped faces.

## Renderer — Selection & Highlighting

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `renderer.colorMarker` | boolean | — | true | Enable selection/highlight coloring |
| `renderer.highlightColor` | color | RGB | — | Color overlay when hovering |
| `renderer.selectColor` | color | RGB | — | Color overlay when selected |
| `renderer.dimColor` | color | RGB | — | Color for dimmed/ghosted elements |
| `renderer.highlightStrength` | numeric | 0–1 (step 0.1) | — | Highlight overlay intensity |
| `renderer.selectStrength` | numeric | 0–1 (step 0.1) | — | Selection overlay intensity |
| `renderer.dimStrength` | numeric | 0–1 (step 0.1) | — | Dim overlay intensity |
| `renderer.markerPriority` | select | 1 \| 2 | 1 | Whether highlight or select takes priority |

## Renderer — Stylization

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `renderer.celSteps` | numeric | 2–16 (step 1) | — | Cel/toon shading steps. Lower = more cartoon-like. |
| `renderer.xrayEdgeFalloff` | numeric | 0–3 (step 0.1) | — | X-ray edge transparency falloff |

**Knob candidate**: `renderer.celSteps` for artistic rendering.

## Renderer — Background

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `renderer.backgroundColor` | color | RGB | white | Background color |
| `transparentBackground` | boolean | — | false | Transparent background (for compositing) |

## Postprocessing — Master

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.enabled` | boolean | — | — | Master switch for all postprocessing |

## Postprocessing — Ambient Occlusion (SSAO)

Adds shadow in crevices and cavities. Very effective for structural visualization.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.occlusion` | mapped | `'on'` \| `'off'` | — | Enable SSAO |
| `postprocessing.occlusion.on.samples` | numeric | 1–256 (step 1) | — | Sample count (quality vs performance) |
| `postprocessing.occlusion.on.radius` | numeric | 0–20 (step 0.1) | — | AO spread radius |
| `postprocessing.occlusion.on.bias` | numeric | 0–3 (step 0.1) | — | Depth bias (reduces self-shadowing artifacts) |
| `postprocessing.occlusion.on.blurKernelSize` | numeric | 1–25 (step 2, odd) | — | Blur kernel for smoothing AO |
| `postprocessing.occlusion.on.blurDepthBias` | numeric | 0–1 (step 0.01) | — | Depth-aware blur threshold |
| `postprocessing.occlusion.on.resolutionScale` | numeric | 0.1–1 (step 0.05) | — | Render AO at lower resolution (performance) |
| `postprocessing.occlusion.on.color` | color | RGB | — | AO shadow color |
| `postprocessing.occlusion.on.transparentThreshold` | numeric | 0–1 (step 0.05) | — | AO on transparent surfaces |

**Knob candidate**: `occlusion.on.radius` — controls how spread out the ambient shadows are.

## Postprocessing — Outline

Draws silhouette edges around structures.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.outline` | mapped | `'on'` \| `'off'` | — | Enable outlines |
| `postprocessing.outline.on.scale` | numeric | 1–5 (step 1) | — | Edge thickness |
| `postprocessing.outline.on.threshold` | numeric | 0.01–1 (step 0.01) | — | Edge detection sensitivity |
| `postprocessing.outline.on.color` | color | RGB | — | Edge color |
| `postprocessing.outline.on.includeTransparent` | boolean | — | — | Outline transparent objects too |

**Knob candidate**: `outline.on.scale` or `outline.on.threshold`.

## Postprocessing — Depth of Field

Blurs regions outside a focus distance — cinematic effect.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.dof` | mapped | `'on'` \| `'off'` | — | Enable depth of field |
| `postprocessing.dof.on.blurSize` | numeric | 1–32 (step 1) | — | Maximum blur radius |
| `postprocessing.dof.on.blurSpread` | numeric | 0–10 (step 0.1) | — | How quickly blur increases with distance |
| `postprocessing.dof.on.inFocus` | numeric | -5000–5000 (step 1) | — | Focus distance offset from center |
| `postprocessing.dof.on.PPM` | numeric | 0–5000 (step 0.1) | — | Depth of field size (pixels per meter) |
| `postprocessing.dof.on.center` | select | `'scene-center'` \| `'camera-target'` | — | Focus reference point |
| `postprocessing.dof.on.mode` | select | `'plane'` \| `'sphere'` | — | Focus region shape |

**Knob candidates**: `dof.on.inFocus` (sweep focus through scene), `dof.on.blurSize` (blur amount).

## Postprocessing — Bloom

Glow effect on bright surfaces.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.bloom` | mapped | `'on'` \| `'off'` | — | Enable bloom |
| `postprocessing.bloom.on.strength` | numeric | 0–3 (step 0.1) | — | Glow intensity |
| `postprocessing.bloom.on.radius` | numeric | 0–1 (step 0.01) | — | Glow spread |
| `postprocessing.bloom.on.threshold` | numeric | 0–1 (step 0.01) | — | Brightness threshold for glow |
| `postprocessing.bloom.on.mode` | select | `'luminosity'` \| `'emissive'` | — | What triggers bloom |

**Knob candidate**: `bloom.on.strength`.

## Postprocessing — Shadow

Screen-space shadows from directional lights.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.shadow` | mapped | `'on'` \| `'off'` | — | Enable shadows |
| `postprocessing.shadow.on.steps` | numeric | 1–64 (step 1) | — | Shadow quality (ray steps) |
| `postprocessing.shadow.on.maxDistance` | numeric | 0–256 (step 1) | — | Max shadow cast distance |
| `postprocessing.shadow.on.tolerance` | numeric | 0–10 (step 0.1) | — | Shadow bias |

## Postprocessing — Sharpening (CAS)

Contrast-adaptive sharpening for crisp output.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.sharpening` | mapped | `'on'` \| `'off'` | — | Enable sharpening |
| `postprocessing.sharpening.on.sharpness` | numeric | 0–1 (step 0.05) | — | Sharpening strength |
| `postprocessing.sharpening.on.denoise` | boolean | — | — | Also denoise |

## Postprocessing — Antialiasing

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `postprocessing.antialiasing` | mapped | `'fxaa'` \| `'smaa'` \| `'off'` | — | AA mode |
| `postprocessing.antialiasing.fxaa.edgeThresholdMin` | numeric | 0.0312–0.0833 | — | Min edge detection |
| `postprocessing.antialiasing.fxaa.edgeThresholdMax` | numeric | 0.063–0.333 | — | Max edge detection |
| `postprocessing.antialiasing.fxaa.iterations` | numeric | 0–16 (step 1) | — | Search iterations |
| `postprocessing.antialiasing.fxaa.subpixelQuality` | numeric | 0–1 (step 0.01) | — | Subpixel smoothing |
| `postprocessing.antialiasing.smaa.edgeThreshold` | numeric | 0.05–0.15 | — | SMAA sensitivity |
| `postprocessing.antialiasing.smaa.maxSearchSteps` | numeric | 0–32 (step 1) | — | SMAA quality |

## Global Illumination

Full ray-traced lighting. Expensive but beautiful.

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `illumination.enabled` | boolean | — | false | Master GI switch |
| `illumination.maxIterations` | numeric | 0–16 (step 1) | — | Iterations (actual = 2^x) |
| `illumination.denoise` | boolean | — | — | Denoise GI output |
| `illumination.steps` | numeric | 1–1024 (step 1) | — | Ray marching steps |
| `illumination.firstStepSize` | numeric | 0.001–1 (step 0.001) | — | Initial step size |
| `illumination.refineSteps` | numeric | 0–8 (step 1) | — | Refinement iterations |
| `illumination.rayDistance` | numeric | 1–8192 (step 1) | — | Max ray distance |
| `illumination.bounces` | numeric | 1–32 (step 1) | — | Light bounces |
| `illumination.glow` | boolean | — | — | Emissive glow |
| `illumination.shadowEnable` | boolean | — | — | GI shadows |
| `illumination.shadowSoftness` | numeric | 0.01–1 (step 0.01) | — | Shadow edge softness |
| `illumination.shadowThickness` | numeric | 0.1–32 (step 0.1) | — | Shadow thickness |

## Marking (Selection Edge Rendering)

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `marking.enabled` | boolean | — | — | Enable edge marking |
| `marking.highlightEdgeColor` | color | RGB | — | Hover edge color |
| `marking.selectEdgeColor` | color | RGB | — | Selection edge color |
| `marking.edgeScale` | numeric | 1–3 (step 1) | — | Edge thickness |
| `marking.highlightEdgeStrength` | numeric | 0–1 (step 0.1) | — | Hover edge opacity |
| `marking.selectEdgeStrength` | numeric | 0–1 (step 0.1) | — | Selection edge opacity |
| `marking.ghostEdgeStrength` | numeric | 0–1 (step 0.1) | — | Hidden edge opacity |
| `marking.innerEdgeFactor` | numeric | 0–3 (step 0.1) | — | Interior edge contrast boost |

## Multi-Sampling

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `multiSample.mode` | select | `'off'` \| `'on'` \| `'temporal'` | — | AA sampling mode |
| `multiSample.sampleLevel` | numeric | 0–5 (step 1) | — | Sample count (level²) |
| `multiSample.reduceFlicker` | boolean | — | — | Temporal flicker reduction |

## Trackball Controls

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `trackball.rotateSpeed` | numeric | 1–10 (step 1) | 3 | Rotation sensitivity |
| `trackball.zoomSpeed` | numeric | 1–15 (step 1) | 6 | Zoom sensitivity |
| `trackball.panSpeed` | numeric | 0.1–5 (step 0.1) | 0.8 | Pan sensitivity |
| `trackball.moveSpeed` | numeric | 0.1–3 (step 0.1) | — | WASD movement speed |
| `trackball.boostMoveFactor` | numeric | 0.1–10 (step 0.1) | — | Shift+move speed multiplier |
| `trackball.flyMode` | boolean | — | false | Fly-through navigation |

## Viewport

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `viewport` | mapped | `'canvas'` \| `'static-frame'` \| `'relative-frame'` | `'canvas'` | Viewport mode |

## Miscellaneous

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `cameraResetDurationMs` | numeric | 0–1000 (step 1) | — | Animation duration for camera resets |
| `sceneRadiusFactor` | numeric | 1–10 (step 0.1) | 1.0 | Scale factor for scene bounding sphere |
| `dpoitIterations` | numeric | 1–10 (step 1) | — | Depth peeling layers (transparency quality) |
| `pickPadding` | numeric | 0–10 (step 1) | — | Click target padding (pixels) |

## Debug

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `debug.sceneBoundingSpheres` | boolean | — | false | Show scene bounding sphere |
| `debug.visibleSceneBoundingSpheres` | boolean | — | false | Show visible-only bounding sphere |
| `debug.objectBoundingSpheres` | boolean | — | false | Show per-object bounding spheres |
| `debug.instanceBoundingSpheres` | boolean | — | false | Show per-instance bounding spheres |

Useful for diagnosing clipping issues — turn on `sceneBoundingSpheres` to see exactly where Mol* thinks your scene extends.
