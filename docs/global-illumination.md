# Global Illumination in smol6

## What Is It?

Global Illumination (GI) is Mol*'s built-in **screen-space path tracer**. Instead of the standard rendering where each surface is lit only by direct light sources, GI simulates how light bounces between surfaces — filling in shadows with reflected color, making cavities naturally dark, and creating soft indirect lighting that looks dramatically more realistic.

Standard rendering: each atom is lit independently, shadows are faked.
GI: light rays bounce around the scene, surfaces illuminate each other, shadows are physically accurate.

The difference is immediately visible — proteins look like they exist in a real physical space rather than floating in a void.

## How It Works

### The Algorithm: Screen-Space Path Tracing

For every pixel on screen, the renderer:

1. **Looks up the surface** at that pixel (color, normal, depth) from the standard render
2. **Shoots a ray** in a random direction from that surface into the scene
3. **Marches the ray** through the depth buffer using exponentially growing steps — starts fine-grained near the surface, gets coarser with distance
4. **If the ray hits something**: reads that surface's color and normal, applies lighting, then bounces again from the new hit point
5. **Repeats** for up to N bounces, accumulating light at each step
6. **Averages** across many frames (temporal accumulation) to reduce noise

This is Monte Carlo path tracing — the same core algorithm used in movie-quality renderers like Pixar's RenderMan, but running in screen space on your GPU in real time.

### Why Screen-Space?

Traditional path tracing builds a full 3D acceleration structure (BVH) and traces rays through world geometry. That's expensive. Mol*'s approach traces rays through the **depth buffer** — a 2D image of distances already computed by the standard renderer. This is much faster but has limitations:

- Can only see surfaces visible on screen (no reflections of off-screen geometry)
- Thin objects can be missed if the ray steps over them
- Accuracy depends on depth buffer resolution

The tradeoff is worth it — you get real-time GI that converges to a clean image in seconds rather than minutes.

## The Parameters

### Core Controls

| Parameter | CC | Range | What It Does |
|-----------|-----|-------|-------------|
| **GI enable** | 32 | on/off | Master switch. Turn this on first. |
| **Bounces** | 34 | 1–32 | How many times light bounces between surfaces. 1 = direct + one bounce. 4 = rich indirect light. More = slower. |
| **Steps** | 35 | 1–1024 | Ray marching samples per ray. More = finds thin geometry better, but slower. |
| **Max iterations** | 33 | 0–16 | Total frames to accumulate (actual = 2^x). More = cleaner image. |

**Quick start**: Enable GI (CC 32), leave everything else at defaults. You'll see results immediately.

### Ray Marching Detail

| Parameter | CC | Range | What It Does |
|-----------|-----|-------|-------------|
| **First step size** | 41 | 0.001–1 | Size of the first step in screen pixels. Smaller = better near-surface detail, slower. |
| **Ray distance** | 36 | 1–8192 | Maximum distance a ray can travel (world units). Larger = light bounces further across the scene. |
| **Refine steps** | 42 | 0–8 | Binary search iterations after a ray hit. More = sharper edges at hit points. 0 = jagged but fast. |

The ray marcher uses **exponential step growth**: it starts at `firstStepSize` and grows each step by a factor of `(rayDistance / firstStepSize)^(1/steps)`. This means near geometry is sampled densely (catches small features) while distant geometry gets coarser sampling (efficient for long-range bounces).

### Shadows

| Parameter | CC | Range | What It Does |
|-----------|-----|-------|-------------|
| **Shadow enable** | 37 | on/off | Trace shadow rays toward light sources. |
| **Shadow softness** | 38 | 0.01–1 | Random jitter on shadow ray direction. Higher = softer shadow edges (penumbra). |
| **Shadow thickness** | 39 | 0.1–32 | How thick surfaces appear to shadow rays. Prevents light leaking through thin geometry. |

Shadows are traced separately from bounce rays. When a surface is hit, a ray is sent toward each light source — if it hits something on the way, the surface is in shadow.

### Self-Regulation

| Parameter | CC | Range | What It Does |
|-----------|-----|-------|-------------|
| **Target FPS** | 43 | 0–120 | The renderer automatically adjusts quality to hit this framerate. |

This is one of the most important parameters. The GI system measures actual frame time and dynamically adjusts:
1. First it reduces/increases `rendersPerFrame` (rays per pixel per frame)
2. Then `refineSteps`
3. Then `steps`

Set target FPS to 30 for interactive use. The system will find the best quality it can maintain at that framerate. Set to 0 for maximum quality (no regulation).

### Visual Effects

| Parameter | CC | Range | What It Does |
|-----------|-----|-------|-------------|
| **Glow** | 40 | on/off | When on, bounced rays always receive full light strength — surfaces glow as if self-illuminated. When off, proper physically-based lighting. |

Glow mode makes everything look luminous and warm. Off mode is more physically accurate but can be darker.

## Practical Usage

### Interactive Exploration

```
Best settings for real-time use:
- Enable GI (CC 32 past midpoint)
- Target FPS: 30 (CC 43 to ~32)
- Bounces: 2-4 (CC 34 to ~10-16)
- Steps: 16-32 (CC 35 to ~2-4)
- Let auto-regulation handle the rest
```

The image starts noisy and cleans up over a few seconds as frames accumulate. Moving the camera resets accumulation and starts fresh.

### Still Images / Screenshots

```
Best settings for quality:
- Target FPS: 0 (CC 43 fully left) — disables regulation
- Bounces: 4-8 (CC 34 to ~16-32)
- Steps: 64-256 (CC 35 to ~8-32)
- Refine steps: 4-8 (CC 42 to ~64-127)
- Max iterations: 8-16 (CC 33 to ~64-127)
- Wait for convergence (image stops changing)
```

### Performance Tips

| Change | Effect on Speed | Effect on Quality |
|--------|----------------|-------------------|
| Fewer bounces | Much faster | Less indirect light |
| Fewer steps | Faster | Misses thin geometry, light leaks |
| Lower refine steps | Faster | Jagged hit edges |
| Lower max iterations | Fewer frames to converge | Noisier final image |
| Higher target FPS | Auto-reduces quality | Stays interactive |
| Enable denoise | Slight cost | Cleans noise significantly |

**Rule of thumb**: Bounces have the biggest impact on both quality and performance. Start with 2 bounces for interactive, increase for stills.

### What It Looks Like

- **1 bounce**: Soft ambient occlusion effect. Cavities darken, surfaces get subtle color from neighbors.
- **2-4 bounces**: Rich color bleeding. A red helix near a white sheet will tint the sheet pink. Binding pockets fill with warm reflected light.
- **8+ bounces**: Diminishing returns visually, but the most physically accurate. Deep cavities get multiple reflections.
- **With shadows**: Crisp directional shadows from light sources. Shadow softness controls penumbra width.
- **With glow**: Ethereal, luminous look — every surface appears to emit light.

## How It Fits in the Rendering Pipeline

Normal rendering:
```
Geometry → Shading → Postprocessing → Screen
```

With GI enabled:
```
Geometry → G-buffers (color, normal, depth)
    ↓
Path Tracing (multiple iterations)
    ↓ accumulate
Denoising → Compose with outlines/fog/SSAO → Screen
```

GI replaces the standard shading with iterative path tracing. It still composites with postprocessing effects (outlines, fog, bloom) in the final compose step. It does **not** combine with multisampling — they're mutually exclusive.

## Denoising

The denoiser uses a **bilateral Gaussian filter** (smartDeNoise):
- 13×13 pixel kernel
- Edge-aware: respects surface normals (won't blur across edges)
- Color-aware: won't blur across large color differences
- **Adaptive threshold**: Aggressive early in accumulation (heavy blur to clean noise), conservative later (preserves detail as the image converges)

The result: early frames look smooth but soft, later frames look sharp and clean.

## Knob Layout (Page 3)

```
Row 1:  CC 32 (GI on/off)   CC 33 (iterations)  CC 34 (bounces)     CC 35 (steps)
Row 2:  CC 36 (ray distance) CC 37 (shadows on)  CC 38 (shadow soft) CC 39 (shadow thick)
Row 3:  CC 40 (glow on/off)  CC 41 (first step)  CC 42 (refine)      CC 43 (target fps)
Row 4:  CC 44 (multisample)  CC 45 (interact fps) CC 46 (move speed) CC 47 (boost factor)
```

Row 1 is the main controls. Row 2 is shadows. Row 3 is fine-tuning. Row 4 is quality/controls (not GI-specific).

## Key Source Files

| File | What |
|------|------|
| `molstar0/src/mol-canvas3d/passes/illumination.ts` | IlluminationPass orchestrator |
| `molstar0/src/mol-canvas3d/passes/tracing.ts` | TracingPass — ray tracing core, FPS self-regulation |
| `molstar0/src/mol-gl/shader/illumination/trace.frag.ts` | Path tracing fragment shader (the algorithm) |
| `molstar0/src/mol-gl/shader/illumination/compose.frag.ts` | Composition + denoising shader |
| `molstar0/src/mol-gl/shader/illumination/accumulate.frag.ts` | Frame accumulation |
| `molstar0/src/mol-canvas3d/canvas3d.ts` | Render loop integration (lines ~675-680) |
