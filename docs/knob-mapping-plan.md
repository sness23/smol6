# Knob Mapping — Midi Fighter Twister

## Overview

The Midi Fighter Twister (MFT) is a 4×4 grid of endless rotary encoders, each of which can also be pressed down as a button. It has **4 pages** of knobs, giving 64 total CCs.

- **Page 1**: CC 0–15 (currently mapped)
- **Page 2**: CC 16–31 (available for future mapping)
- **Page 3**: CC 32–47 (available)
- **Page 4**: CC 48–63 (available)

## Signal Flow

```
Midi Fighter Twister
    → MIDI CC (USB)
    → zknobs.py (Python, reads MIDI, sends WebSocket)
    → smol6 main process (Electron, forwards via IPC)
    → index.html spacemouse-event handler (renderer, calls canvas3d.setProps)
```

## Page 1 Layout (CC 0–15) — Active

```
Row 1:  CC 0  (exposure)    CC 1  (ambient)    CC 2  (light int)  CC 3  (fov)
Row 2:  CC 4  (fog)         CC 5  (scene rad)  CC 6  (light ↕)    CC 7  (light ↔)
Row 3:  CC 8  (minNear)     CC 9  (trans Z)    CC 10 (trans Y)    CC 11 (trans X)
Row 4:  CC 12 (clipRadius)  CC 13 (rot Z)      CC 14 (rot Y)      CC 15 (rot X)
```

### All knobs

| CC | Name | Type | MIDI 0–127 → | setProps path |
|----|------|------|---------------|---------------|
| 0 | Exposure | absolute | 0–3 | `{ renderer: { exposure } }` |
| 1 | Ambient intensity | absolute | 0–2 | `{ renderer: { ambientIntensity } }` |
| 2 | Light intensity | absolute | 0–5 | `{ renderer: { light: [{...light0, intensity}] } }` |
| 3 | Field of view | absolute | 10–130° | `{ camera: { fov } }` |
| 4 | Fog intensity | absolute | 0–100 | `{ cameraFog: { name: 'on', params: { intensity } } }` |
| 5 | Scene radius factor | absolute | 1–10 | `{ sceneRadiusFactor }` |
| 6 | Light inclination | absolute | 0–180° | `{ renderer: { light: [{...light0, inclination}] } }` |
| 7 | Light azimuth | absolute | 0–360° | `{ renderer: { light: [{...light0, azimuth}] } }` |
| 8 | minNear | absolute | 0.1–50 | `{ cameraClipping: { minNear } }` |
| 9 | Translation Z | motion (delta) | — | `{ z: delta }` |
| 10 | Translation Y | motion (delta) | — | `{ y: delta }` |
| 11 | Translation X | motion (delta) | — | `{ x: delta }` |
| 12 | Clip radius | absolute | 1–200 | `{ cameraClipping: { radius } }` |
| 13 | Rotation Z | motion (delta) | — | `{ rz: delta }` |
| 14 | Rotation Y | motion (delta) | — | `{ ry: delta }` |
| 15 | Rotation X | motion (delta) | — | `{ rx: delta }` |

### Button press = fast mode
Pressing down a rotation/translation knob (CC 9–11, 13–15) while turning sends at 10x speed (SCALE_FAST=5000 vs SCALE_NORMAL=500). Detected via CC on MIDI channel 1 (status byte 0xB1): value 127 = pressed, 0 = released.

### Design rationale

**Row 1 (rendering)**: Controls that affect overall image appearance — brightness, ambient fill, key light power, perspective. These are "set and forget" during a session.

**Row 2 (scene/lighting)**: Fog for depth cueing, scene radius to fight clipping, light direction for composition. Scene radius factor is especially useful — turning it up expands the bounding sphere, pushing clip planes out.

**Row 3 (clip + translation)**: minNear on the left (pairs with clipRadius below it), then translation XYZ. Press-to-boost for fast panning.

**Row 4 (clip + rotation)**: clipRadius on the left, then rotation XYZ. Press-to-boost for fast spinning.

## Page 2 Layout (CC 16–31) — Active

```
Row 1:  CC 16 (interior dk) CC 17 (cel steps)  CC 18 (xray edge)  CC 19 (rotate spd)
Row 2:  CC 20 (zoom spd)    CC 21 (pan spd)    CC 22 (edge scale) CC 23 (ghost edge)
Row 3:  CC 24 (highlight)    CC 25 (select str) CC 26 (dim str)    CC 27 (reset dur)
Row 4:  CC 28 (inner edge)   CC 29 (dpoit)      CC 30 (pick pad)   CC 31 (hi edge str)
```

| CC | Name | Type | MIDI 0–127 → | setProps path | Notes |
|----|------|------|---------------|---------------|-------|
| 16 | Interior darkening | absolute | 0–1 | `{ renderer: { interiorDarkening } }` | Grey on clipped surfaces |
| 17 | Cel shading steps | absolute | 2–16 | `{ renderer: { celSteps } }` | Needs cel rendering mode |
| 18 | X-ray edge falloff | absolute | 0–3 | `{ renderer: { xrayEdgeFalloff } }` | Needs x-ray mode |
| 19 | Rotate speed | absolute | 1–10 | `{ trackball: { rotateSpeed } }` | Mouse rotation sensitivity |
| 20 | Zoom speed | absolute | 1–15 | `{ trackball: { zoomSpeed } }` | Scroll wheel sensitivity |
| 21 | Pan speed | absolute | 0.1–5 | `{ trackball: { panSpeed } }` | Middle-click pan sensitivity |
| 22 | Edge scale | absolute | 1–3 | `{ marking: { edgeScale } }` | Selection edge thickness |
| 23 | Ghost edge strength | absolute | 0–1 | `{ marking: { ghostEdgeStrength } }` | Hidden edge visibility |
| 24 | Highlight strength | absolute | 0–1 | `{ renderer: { highlightStrength } }` | Hover highlight intensity |
| 25 | Select strength | absolute | 0–1 | `{ renderer: { selectStrength } }` | Selection highlight intensity |
| 26 | Dim strength | absolute | 0–1 | `{ renderer: { dimStrength } }` | Ghost/dim effect |
| 27 | Reset duration | absolute | 0–1000ms | `{ cameraResetDurationMs }` | Animation speed for resets |
| 28 | Inner edge factor | absolute | 0–3 | `{ marking: { innerEdgeFactor } }` | Interior edge contrast |
| 29 | Depth peeling iters | absolute | 1–10 | `{ dpoitIterations }` | Transparency quality |
| 30 | Pick padding | absolute | 0–10 px | `{ pickPadding }` | Click target padding |
| 31 | Highlight edge str | absolute | 0–1 | `{ marking: { highlightEdgeStrength } }` | Hover edge visibility |

### Page 2 design rationale

**Row 1 (style)**: Situational rendering modes — interior darkening (only visible when clipping), cel shading, x-ray edges, plus mouse rotation speed.

**Row 2 (controls + edges)**: Mouse/scroll sensitivity, plus marking edge appearance.

**Row 3 (selection)**: How selections and highlights look — strength of hover, click, and dim overlays, plus camera reset animation speed.

**Row 4 (misc)**: Inner edge contrast, transparency quality, pick target size, highlight edge strength.

## Page 3 Layout (CC 32–47) — Global Illumination & Quality

```
Row 1:  CC 32 (GI enable)   CC 33 (GI iters)   CC 34 (GI bounces)  CC 35 (GI steps)
Row 2:  CC 36 (GI ray dist) CC 37 (GI shd on)   CC 38 (GI shd soft) CC 39 (GI shd thick)
Row 3:  CC 40 (GI glow)     CC 41 (GI 1st step) CC 42 (GI refine)   CC 43 (GI fps)
Row 4:  CC 44 (multisample)  CC 45 (interact fps) CC 46 (move spd)   CC 47 (boost)
```

| CC | Name | Type | MIDI 0–127 → | setProps path |
|----|------|------|---------------|---------------|
| 32 | GI enable | boolean | off/on (threshold 64) | `{ illumination: { enabled } }` |
| 33 | GI iterations | absolute | 0–16 (actual = 2^x) | `{ illumination: { maxIterations } }` |
| 34 | GI bounces | absolute | 1–32 | `{ illumination: { bounces } }` |
| 35 | GI steps | absolute | 1–1024 | `{ illumination: { steps } }` |
| 36 | GI ray distance | absolute | 1–8192 | `{ illumination: { rayDistance } }` |
| 37 | GI shadow enable | boolean | off/on (threshold 64) | `{ illumination: { shadowEnable } }` |
| 38 | GI shadow softness | absolute | 0.01–1 | `{ illumination: { shadowSoftness } }` |
| 39 | GI shadow thickness | absolute | 0.1–32 | `{ illumination: { shadowThickness } }` |
| 40 | GI glow | boolean | off/on (threshold 64) | `{ illumination: { glow } }` |
| 41 | GI first step size | absolute | 0.001–1 | `{ illumination: { firstStepSize } }` |
| 42 | GI refine steps | absolute | 0–8 | `{ illumination: { refineSteps } }` |
| 43 | GI target FPS | absolute | 0–120 | `{ illumination: { targetFps } }` |
| 44 | Multisample level | absolute | 0–5 (samples = level²) | `{ multiSample: { sampleLevel } }` |
| 45 | Interaction FPS | absolute | 10–60 (step 10) | `{ interaction: { maxFps } }` |
| 46 | Move speed | absolute | 0.1–3 | `{ trackball: { moveSpeed } }` |
| 47 | Boost move factor | absolute | 0.1–10 | `{ trackball: { boostMoveFactor } }` |

**Page 3 notes**: GI is GPU-intensive ray tracing. Turn on CC 32 first, then tune quality with the other knobs. Lower GI steps and bounces for interactive use, raise for stills. GI target FPS (CC 43) lets it self-regulate quality.

## Page 4 Layout (CC 48–63) — Second Light, Debug & Misc

```
Row 1:  CC 48 (light2 ↕)    CC 49 (light2 ↔)   CC 50 (light2 int)  CC 51 (pick alpha)
Row 2:  CC 52 (sel edge str) CC 53 (transp bg)   CC 54 (interior flg) CC 55 (color marker)
Row 3:  CC 56 (marking on)   CC 57 (fly mode)    CC 58 (HiZ on)      CC 59 (HiZ lag)
Row 4:  CC 60 (dbg scene)    CC 61 (dbg obj)     CC 62 (interact ms) CC 63 (dbg visible)
```

| CC | Name | Type | MIDI 0–127 → | setProps path |
|----|------|------|---------------|---------------|
| 48 | Light 2 inclination | absolute | 0–180° | `{ renderer: { light: [..., {inclination}] } }` |
| 49 | Light 2 azimuth | absolute | 0–360° | `{ renderer: { light: [..., {azimuth}] } }` |
| 50 | Light 2 intensity | absolute | 0–5 | `{ renderer: { light: [..., {intensity}] } }` |
| 51 | Picking alpha threshold | absolute | 0–1 | `{ renderer: { pickingAlphaThreshold } }` |
| 52 | Select edge strength | absolute | 0–1 | `{ marking: { selectEdgeStrength } }` |
| 53 | Transparent background | boolean | off/on (threshold 64) | `{ transparentBackground }` |
| 54 | Interior color flag | boolean | off/on (threshold 64) | `{ renderer: { interiorColorFlag } }` |
| 55 | Color marker | boolean | off/on (threshold 64) | `{ renderer: { colorMarker } }` |
| 56 | Marking enabled | boolean | off/on (threshold 64) | `{ marking: { enabled } }` |
| 57 | Fly mode | boolean | off/on (threshold 64) | `{ trackball: { flyMode } }` |
| 58 | HiZ enabled | boolean | off/on (threshold 64) | `{ hiZ: { enabled } }` |
| 59 | HiZ frame lag | absolute | 1–30 | `{ hiZ: { maxFrameLag } }` |
| 60 | Debug scene bounds | boolean | off/on (threshold 64) | `{ debug: { sceneBoundingSpheres } }` |
| 61 | Debug object bounds | boolean | off/on (threshold 64) | `{ debug: { objectBoundingSpheres } }` |
| 62 | User interaction ms | absolute | 0–1000ms | `{ userInteractionReleaseMs }` |
| 63 | Debug visible bounds | boolean | off/on (threshold 64) | `{ debug: { visibleSceneBoundingSpheres } }` |

**Page 4 notes**: Second light (CC 48–50) auto-creates a second light source if one doesn't exist. Boolean knobs toggle at midpoint (0–63 = off, 64–127 = on). Debug bounding spheres (CC 60–61, 63) are great for diagnosing clipping issues — they show exactly where Mol* thinks your scene extends.

## Boolean Knob Convention

For boolean parameters mapped to endless rotary encoders:
- **MIDI 0–63**: parameter is **off** (false)
- **MIDI 64–127**: parameter is **on** (true)

Turn the knob past the midpoint to toggle. Since the MFT knobs are endless, the actual position doesn't matter — just the last value sent.

### Postprocessing — Still Needs Investigation

SSAO, outline, DOF, bloom, and sharpening use MappedStatic param structures that error with simple `setProps()`. May work if enabled first via console (`graphics high`) and then only sub-params are adjusted. These could go on a future custom page or be addressed by adding proper merge logic in the handler.

## Files to Edit

Both files must be updated for any new mapping:

### 1. zknobs.py — Add CC constant + dict entry

```python
# Add constant
CC_NEW_PARAM = 16  # Page 2 starts at CC 16

# Add to absolute_knobs dict
absolute_knobs = {
    ...
    CC_NEW_PARAM: "newParam",
}
```

### 2. index.html — Add handler in clipfog block

```javascript
} else if (ev.param === 'newParam') {
    // Map 0-127 to desired range
    var val = MIN + (v / 127) * (MAX - MIN);
    canvas3d.setProps({ path: { to: { param: val } } });
}
```

### WebSocket message format

All absolute knobs use the same event type:
```json
{"type": "clipfog", "param": "paramName", "value": 0-127}
```

Motion knobs (delta-based):
```json
{"type": "motion", "x": 0, "y": 0, "z": 0, "rx": 0, "ry": 500, "rz": 0}
```

## MIDI Protocol Reference

| Status byte | Channel | Meaning |
|-------------|---------|---------|
| 0xB0 (176) | 0 | CC message — knob turn |
| 0xB1 (177) | 1 | CC message — button press/release (value: 127=down, 0=up) |

Button presses use the same CC number as the knob turn, just on channel 1 instead of channel 0.

## Console Command Equivalents

For when you don't have the MFT connected:

```
lighting ambient 0.8       # CC 1
camera fov 60              # CC 3
fog 30                     # CC 4
clip front 10              # CC 12 (sort of)
clip off                   # Disable clipping
camera persp               # Perspective mode
camera ortho               # Orthographic mode
background black           # Background color
graphics high              # Quality preset (may enable postprocessing)
```
