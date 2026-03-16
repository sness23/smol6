# Interior Darkening — The Grey You See When Clipping

## What Is It?

When the clip plane slices through a molecular surface, you see the "inside" of that surface. By default, Mol* darkens these interior faces so they're visually distinct from the exterior. This is the grey you see when zooming into a protein.

| Parameter | Type | Range | Default |
|-----------|------|-------|---------|
| `renderer.interiorDarkening` | numeric | 0–1 (step 0.01) | ~0.5 |
| `renderer.interiorColorFlag` | boolean | — | false |
| `renderer.interiorColor` | color | RGB | grey |

## How It Works

When a fragment is rendered and the surface normal points away from the camera (i.e., you're looking at the back face / inside), Mol* applies darkening:

- `interiorDarkening = 0` → interior looks identical to exterior (no darkening)
- `interiorDarkening = 0.5` → interior is 50% darkened (default — the grey you see)
- `interiorDarkening = 1.0` → interior is black

If `interiorColorFlag` is true, the interior is painted with `interiorColor` instead of a darkened version of the exterior color. This lets you pick any color for clipped faces — useful for presentations or to make the cross-section visually meaningful.

## What You Can Do About the Grey

### Option 1: Reduce interior darkening
```javascript
viewer.plugin.canvas3d.setProps({ renderer: { interiorDarkening: 0.1 } });
```
Makes clipped interiors nearly match the exterior. The clipping still happens, but it's less visually jarring.

### Option 2: Custom interior color
```javascript
viewer.plugin.canvas3d.setProps({
    renderer: {
        interiorColorFlag: true,
        interiorColor: { r: 0.2, g: 0.2, b: 0.3 }  // dark blue-grey
    }
});
```
Gives the cross-section a specific color. Good for contrast against the exterior.

### Option 3: Fix the clipping itself
See [clipping-deep-dive.md](clipping-deep-dive.md) — use `focus`, `clip off`, or Shift+Scroll to prevent the clip plane from cutting through your molecule in the first place.

### Option 4: Map to a knob
Interior darkening is a great candidate for CC 0 (spare knob) or a freed-up knob. MIDI 0–127 → 0–1 maps perfectly. Turn the knob left for transparent-looking interiors, right for dark cross-sections.

## Console Access

The `lighting` command has presets that affect interior rendering:
```
lighting flat      # Minimal shading, affects interior appearance
lighting default   # Standard lighting
```

For direct control, use the JavaScript console or add a custom console command.

## When Interior Darkening Is Actually Useful

Don't always set it to 0. Darkened interiors serve a purpose:

- **Depth cue**: The darker interior helps you distinguish inside from outside when clipping through a surface representation
- **Surface vs cartoon**: For cartoon/ribbon representations, you rarely see interiors. For spacefill/surface, you see them constantly when clipping.
- **Presentations**: A controlled interior color (e.g., matching your slide background) looks professional in figures

The "problem" isn't interior darkening itself — it's that accidental clipping exposes interiors you didn't want to see. Fix the clipping, and interior darkening becomes a useful tool rather than an annoyance.
