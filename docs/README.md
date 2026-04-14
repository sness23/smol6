# smol6 Documentation

## Quick Reference
- [Console Commands Reference](console-commands-reference.md) — All available console commands
- [Auto-Generated Slideshows](auto-show-generation.md) — `smol-present --generate <pdbid>` pipeline
- [Knob Mapping Plan](knob-mapping-plan.md) — Current MFT layout and future plans

## Clipping & Camera
- [Clipping Deep Dive](clipping-deep-dive.md) — Why proteins get cut off and what to do about it
- [Clip Radius](clip-radius.md) — How clipRadius works, zknobs integration
- [minNear](min-near.md) — Near clipping plane floor, performance tradeoffs
- [Interior Darkening](interior-darkening.md) — The grey you see on clipped surfaces

## Visual Effects
- [Fog](fog.md) — Depth cueing, interaction with clipping
- [Postprocessing Effects](postprocessing-effects.md) — SSAO, outline, DOF, bloom, shadow, sharpening, AA
- [All Canvas3D Params](all-canvas3d-params.md) — Complete parameter reference with ranges

## Hardware Integration
- [zknobs Architecture](zknobs-architecture.md) — MIDI → WebSocket → Mol* signal flow
- [Knob Mapping Plan](knob-mapping-plan.md) — Page 1 layout, page 2+ ideas, how to add mappings
