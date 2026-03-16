# Materials — Metalness, Roughness, Bumpiness

## What They Are

Mol* uses a physically-based rendering (PBR) material system with three properties that control how surfaces interact with light:

| Property | Range | Default | Effect |
|----------|-------|---------|--------|
| **Metalness** | 0–1 | 0 | 0 = plastic/dielectric (reflects white highlights), 1 = metal (reflects its own color) |
| **Roughness** | 0–1 | 0 | 0 = mirror-smooth (sharp specular highlights), 1 = fully matte (diffuse only). **This is the "shininess" knob.** |
| **Bumpiness** | 0–1 | 0 | Perlin noise normal perturbation. Adds a gritty/organic surface texture. |

### Built-in Presets (for reference)

| Preset | Metalness | Roughness | Bumpiness | Look |
|--------|-----------|-----------|-----------|------|
| Default | 0 | 0 | 0 | Smooth plastic with sharp highlights |
| Matte | 0 | 1 | 0 | Flat, no specular |
| Plastic | 0 | 0.2 | 0 | Glossy plastic |
| Glossy | 0 | 0.6 | 0 | Soft highlights |
| Metallic | 1 | 0.6 | 0 | Metal with colored reflections |

## How They Work in the Shader

The PBR lighting calculation in `apply-light-color.glsl.ts` uses these properties:

**Metalness** controls the split between diffuse and specular color:
```glsl
diffuseColor = color.rgb * (1.0 - metalness);    // metals have no diffuse
specularColor = mix(vec3(0.04), color.rgb, metalness);  // metals reflect their own color
```

**Roughness** controls the GGX microfacet distribution — how tight or spread-out specular highlights are:
- Roughness 0 → infinitely sharp highlight (mirror)
- Roughness 1 → highlight spread across the entire hemisphere (matte)

**Bumpiness** applies Fractional Brownian Motion (fBm) noise to perturb surface normals before lighting:
- Creates a subtle organic texture without changing geometry
- Controlled by internal `uBumpFrequency` and `uBumpAmplitude` uniforms

## How the Knob Mapping Works

Material properties are **per-representation**, not global Canvas3D params. They can't be set via `canvas3d.setProps()`. Instead, the knob handler:

1. Iterates all state cells in `plugin.state.data.cells`
2. Finds cells with `typeClass === 'Representation3D'`
3. Accesses each representation's `renderObjects`
4. Directly writes to the GPU uniform ValueCells (`uMetalness`, `uRoughness`, `uBumpiness`)
5. Calls `canvas3d.commit()` and `canvas3d.requestDraw()` to trigger re-render

This is a direct uniform update — it bypasses the normal representation param system. The change is immediate but will be reset if the representation is rebuilt (e.g., loading a new structure, changing representation type).

### ValueCell Update Pattern

A Mol* ValueCell is `{ ref: { id, version, value, metadata } }`. To update:
```javascript
cell.ref = { id: cell.ref.id, version: cell.ref.version + 1, value: newValue, metadata: cell.ref.metadata };
```
Incrementing `version` signals the renderer to sync the new value to the GPU uniform.

## Knob Layout (Page 3, Row 1)

```
CC 32: Metalness (0–1)    CC 33: Roughness (0–1)    CC 34: Bumpiness (0–1)
```

**Roughness is the main "shininess" control.** Turn CC 33 left for shiny, right for matte.

## Practical Tips

- **For shiny protein surfaces**: metalness=0, roughness=0.1–0.3 (plastic look)
- **For matte/illustration style**: metalness=0, roughness=0.8–1.0
- **For metallic look**: metalness=0.8–1.0, roughness=0.3–0.6
- **For organic texture**: bumpiness=0.3–0.5 adds subtle surface detail
- **Combine with lighting knobs**: Light inclination (CC 6) and azimuth (CC 7) let you position the highlight — together with roughness, you can sculpt exactly the look you want.

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-util/material.ts` | Material interface, presets, parameter definitions |
| `molstar0/src/mol-geo/geometry/base.ts` | Exposes Material.getParam() on all geometries, creates ValueCells |
| `molstar0/src/mol-gl/shader/chunks/apply-light-color.glsl.ts` | PBR lighting with metalness/roughness |
| `molstar0/src/mol-gl/shader/chunks/assign-material-color.glsl.ts` | Reads uMetalness, uRoughness, uBumpiness uniforms |
| `molstar0/src/mol-gl/renderable/schema.ts` | Uniform definitions (uMetalness, uRoughness, uBumpiness) |
| `smol6/index.html` | Knob handler iterates representations and updates ValueCells |
