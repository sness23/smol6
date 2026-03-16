# zknobs Architecture

## What It Is

zknobs is a Python bridge that reads MIDI from the Midi Fighter Twister and sends WebSocket messages to smol6 for real-time control of the molecular viewer.

## Signal Flow

```
Midi Fighter Twister (USB MIDI)
    │
    │  CC messages on channel 0 (knob turns)
    │  CC messages on channel 1 (button press/release)
    │
    ▼
zknobs.py (Python, async)
    │
    │  Converts MIDI to JSON events
    │  Two event types: "motion" (delta) and "clipfog" (absolute)
    │
    │  WebSocket ws://127.0.0.1:8889
    │
    ▼
smol6 main process (electron/main.ts)
    │
    │  Forwards via IPC channel 'spacemouse-event'
    │
    ▼
index.html renderer (spacemouse-event handler)
    │
    │  Parses JSON, calls canvas3d.setProps() or canvas3d.requestCameraReset()
    │
    ▼
Mol* Canvas3D (WebGL renderer)
```

## Two Event Types

### Motion events (delta-based, for rotation/translation)

Used by knobs that have no absolute position — you turn them and they generate relative movement. The delta is computed from the difference between current and last MIDI value, multiplied by a scale factor.

```json
{"type": "motion", "x": 0, "y": 0, "z": 500, "rx": 0, "ry": 0, "rz": 0}
```

- Positive/negative values indicate direction
- Scale: SCALE_NORMAL (500) or SCALE_FAST (5000) when button is held
- The renderer applies these as camera rotation (trackball-style) and translation (in camera space)

### Absolute events (for parameters with a fixed range)

Used by knobs that set a value on a 0–127 scale, mapped to a parameter range in the renderer.

```json
{"type": "clipfog", "param": "exposure", "value": 64}
```

- `param` identifies which parameter to set
- `value` is raw MIDI 0–127
- The renderer maps 0–127 to the parameter's actual range (e.g., 0–3 for exposure)

The event type is called "clipfog" for historical reasons (it originally only handled clip and fog). All absolute knobs use this type regardless of what they control.

## Button Press Detection

The Midi Fighter Twister sends knob presses as CC messages on MIDI channel 1 (status byte 0xB1), using the same CC number as the knob turn:

| Message | Meaning |
|---------|---------|
| `0xB1, CC, 127` | Button pressed down |
| `0xB1, CC, 0` | Button released |

Currently used only for motion knobs (CC 9–11, 13–15) to enable fast mode. Could be extended to absolute knobs for mode switching, toggling effects, etc.

## Multi-Page Support

The MFT has 4 pages of 16 knobs each:

| Page | CC Range | Status |
|------|----------|--------|
| 1 | CC 0–15 | Fully mapped |
| 2 | CC 16–31 | Available |
| 3 | CC 32–47 | Available |
| 4 | CC 48–63 | Available |

Pages are switched on the MFT itself (side buttons). All pages send on the same MIDI channel — the CC number is what changes. zknobs.py already handles any CC number, so adding page 2+ just requires adding new entries to the `absolute_knobs` or `knob_config` dicts.

## Files

| File | Location | Purpose |
|------|----------|---------|
| `zknobs.py` | `~/github/sness23/zknobs/zknobs.py` | MIDI → WebSocket bridge |
| `index.html` | `~/github/sness23/smol6/index.html` | WebSocket → canvas3d.setProps() |
| `electron/main.ts` | `~/github/sness23/smol6/electron/main.ts` | WebSocket server, IPC forwarding |

## Adding a New Knob Mapping

1. **zknobs.py**: Add CC constant and dict entry
   ```python
   CC_NEW_THING = 16
   absolute_knobs = { ..., CC_NEW_THING: "newThing" }
   ```

2. **index.html**: Add handler in the clipfog block (~line 556)
   ```javascript
   } else if (ev.param === 'newThing') {
       canvas3d.setProps({ path: { to: { param: (v / 127) * MAX } } });
   }
   ```

3. Update `all_knobs` and `last_value` — these are computed automatically from the dicts, so no extra step needed.

## Known Limitations

- **No feedback to MFT LEDs**: The MFT has RGB LEDs on each knob that can be set via MIDI. Currently unused — could show parameter state visually.
- **No page awareness**: zknobs.py doesn't know which page is active. All CCs are processed regardless of page. This is fine as long as CC ranges don't overlap in meaning.
- **Postprocessing params**: MappedStatic params in Mol* (SSAO, outline, DOF, bloom) error when set via setProps() with partial updates. Needs further investigation — may require reading current props and merging, or using the plugin state API instead.
- **Absolute knobs have no initial sync**: When zknobs starts, it doesn't know the current knob positions until first turned. First turn of each knob is ignored (used to establish baseline).
