# Knob Mapping Plan

## Current Layout (Midi Fighter Twister, CC 0–15)

```
Row 1:  CC 0  (exposure)    CC 1  (ambient)    CC 2  (interior)   CC 3  (fov)
Row 2:  CC 4  (fog)         CC 5  (cel steps)  CC 6  (light ↕)    CC 7  (light ↔)
Row 3:  CC 8  (minNear)     CC 9  (trans Z)    CC 10 (trans Y)    CC 11 (trans X)
Row 4:  CC 12 (clipRadius)  CC 13 (rot Z)      CC 14 (rot Y)      CC 15 (rot X)
```

### Button press = fast mode
Pressing down a rotation/translation knob while turning sends at 10x speed (SCALE_FAST=5000 vs SCALE_NORMAL=500). Detected via CC on channel 1 (0xB1): value 127=pressed, 0=released.

### All knobs assigned

| CC | Function | Type | MIDI 0–127 → |
|----|----------|------|---------------|
| 0 | Exposure | absolute | 0–3 |
| 1 | Ambient intensity | absolute | 0–2 |
| 2 | Interior darkening | absolute | 0–1 |
| 3 | Field of view | absolute | 10–130° |
| 4 | Fog intensity | absolute | 0–100 |
| 5 | Cel shading steps | absolute | 2–16 |
| 6 | Light inclination | absolute | 0–180° |
| 7 | Light azimuth | absolute | 0–360° |
| 8 | minNear | absolute | 0.1–50 |
| 9 | Translation Z | motion (delta, button=fast) | — |
| 10 | Translation Y | motion (delta, button=fast) | — |
| 11 | Translation X | motion (delta, button=fast) | — |
| 12 | Clip radius | absolute | 1–200 |
| 13 | Rotation Z | motion (delta, button=fast) | — |
| 14 | Rotation Y | motion (delta, button=fast) | — |
| 15 | Rotation X | motion (delta, button=fast) | — |

## Files to Edit for New Mappings

Both files must be updated in tandem:

1. **`zknobs/zknobs.py`** — Add CC constant, add to `clip_fog_knobs` dict
2. **`smol6/index.html`** (~line 556) — Add handler in `spacemouse-event` listener

### zknobs.py pattern
```python
# Add to clip_fog_knobs dict
clip_fog_knobs = {
    CC_MIN_NEAR: "minNear",
    CC_FOG: "fog",
    CC_NEW: "newParam",  # ← add here
}
```

### index.html pattern
```javascript
} else if (ev.param === 'newParam') {
    var val = MIN + (v / 127) * (MAX - MIN);
    canvas3d.setProps({ /* appropriate prop path */ });
}
```

## Suggested Mapping for Free Knobs

### Row 1 (CC 0–3): Rendering controls

| CC | Parameter | setProps path | MIDI 0–127 → | Why |
|----|-----------|--------------|---------------|-----|
| 0 | Exposure | `{ renderer: { exposure: val } }` | 0–3 | Overall brightness |
| 1 | Ambient intensity | `{ renderer: { ambientIntensity: val } }` | 0–2 | Fill light level |
| 2 | Interior darkening | `{ renderer: { interiorDarkening: val } }` | 0–1 | Grey interior control |
| 3 | Field of view | `{ camera: { fov: val } }` | 10–130° | Perspective distortion |

### Row 2 (CC 5–7): Postprocessing

| CC | Parameter | setProps path | MIDI 0–127 → | Why |
|----|-----------|--------------|---------------|-----|
| 5 | SSAO radius | `{ postprocessing: { occlusion: { name: 'on', params: { radius: val } } } }` | 0–20 | Ambient shadow spread |
| 6 | Outline scale | `{ postprocessing: { outline: { name: 'on', params: { scale: val } } } }` | 1–5 | Edge thickness |
| 7 | DOF focus | `{ postprocessing: { dof: { name: 'on', params: { inFocus: val } } } }` | -5000–5000 | Sweep focus |

### CC 12: Clip radius (unchanged)

## WebSocket Message Format

All absolute-value knobs use the `clipfog` event type:
```json
{"type": "clipfog", "param": "exposure", "value": 64}
```

The smol6 handler maps MIDI 0–127 to each parameter's actual range.

## Console Command Equivalents

```
lighting ambient 0.8          # Ambient intensity
camera fov 60                  # Field of view
fog 30                         # Fog intensity
clip front 10                  # Clip
clip off                       # Disable clipping
```
