# Midi Fighter Twister — Knob Cheatsheet

## Page 1 — Primary Controls

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  CC 0        │  CC 1        │  CC 2        │  CC 3        │
│  EXPOSURE    │  AMBIENT     │  LIGHT       │  FOV         │
│  brightness  │  fill light  │  intensity   │  perspective │
│  0–3         │  0–2         │  0–5         │  10–130°     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 4        │  CC 5        │  CC 6        │  CC 7        │
│  FOG         │  SCENE       │  LIGHT ↕     │  LIGHT ↔     │
│  depth haze  │  radius      │  inclination │  azimuth     │
│  0–100       │  1–10        │  0–180°      │  0–360°      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 8        │  CC 9        │  CC 10       │  CC 11       │
│  MIN NEAR    │  TRANSLATE Z │  TRANSLATE Y │  TRANSLATE X │
│  clip floor  │  ⟳ press=10x │  ⟳ press=10x │  ⟳ press=10x │
│  0.1–50      │  delta       │  delta       │  delta       │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 12       │  CC 13       │  CC 14       │  CC 15       │
│  CLIP RADIUS │  ROTATE Z    │  ROTATE Y    │  ROTATE X    │
│  clip sphere │  ⟳ press=10x │  ⟳ press=10x │  ⟳ press=10x │
│  1–200       │  delta       │  delta       │  delta       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Page 2 — Style & Sensitivity

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  CC 16       │  CC 17       │  CC 18       │  CC 19       │
│  INTERIOR    │  CEL STEPS   │  XRAY EDGE   │  ROTATE SPD  │
│  darkening   │  toon shading│  falloff     │  mouse sens  │
│  0–1         │  2–16        │  0–3         │  1–10        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 20       │  CC 21       │  CC 22       │  CC 23       │
│  ZOOM SPD    │  PAN SPD     │  EDGE SCALE  │  GHOST EDGE  │
│  scroll sens │  mid-click   │  sel. edges  │  hidden edges│
│  1–15        │  0.1–5       │  1–3         │  0–1         │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 24       │  CC 25       │  CC 26       │  CC 27       │
│  HIGHLIGHT   │  SELECT      │  DIM         │  RESET DUR   │
│  hover str   │  click str   │  ghost str   │  anim speed  │
│  0–1         │  0–1         │  0–1         │  0–1000ms    │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 28       │  CC 29       │  CC 30       │  CC 31       │
│  INNER EDGE  │  DPOIT       │  PICK PAD    │  HI EDGE STR │
│  contrast    │  transparency│  click target│  hover edge  │
│  0–3         │  1–10        │  0–10 px     │  0–1         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Page 3 — Materials & Quality

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  CC 32       │  CC 33       │  CC 34       │  CC 35       │
│  METALNESS   │  ROUGHNESS   │  BUMPINESS   │  MULTISAMPLE │
│  0=plastic   │  ◀ shiny     │  surface     │  AA quality  │
│  1=metal     │  matte ▶     │  texture 0–1 │  0–5         │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 36       │  CC 37       │  CC 38       │  CC 39       │
│  ROTATE SPD  │  ZOOM SPD    │  PAN SPD     │  MOVE SPD    │
│  mouse sens  │  scroll sens │  mid-click   │  WASD speed  │
│  1–10        │  1–15        │  0.1–5       │  0.1–3       │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 40       │  CC 41       │  CC 42       │  CC 43       │
│  BOOST       │  INTERACT    │  RESET DUR   │  DPOIT       │
│  shift+move  │  max FPS     │  anim speed  │  transparency│
│  0.1–10      │  10–60       │  0–1000ms    │  1–10        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 44       │  CC 45       │  CC 46       │  CC 47       │
│  GI ON/OFF   │  GI BOUNCES  │  GI SHADOWS  │  GI FPS      │
│  ◀off  on▶   │  indirect    │  ◀off  on▶   │  auto-adjust │
│  threshold64 │  light 1–32  │  threshold64 │  0–120       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Page 4 — Second Light, Debug & Misc

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  CC 48       │  CC 49       │  CC 50       │  CC 51       │
│  LIGHT 2 ↕   │  LIGHT 2 ↔   │  LIGHT 2     │  PICKING     │
│  inclination │  azimuth     │  intensity   │  alpha thres │
│  0–180°      │  0–360°      │  0–5         │  0–1         │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 52       │  CC 53       │  CC 54       │  CC 55       │
│  SEL EDGE    │  TRANSPARENT │  INTERIOR    │  COLOR       │
│  strength    │  background  │  color flag  │  marker      │
│  0–1         │  ◀off  on▶   │  ◀off  on▶   │  ◀off  on▶   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 56       │  CC 57       │  CC 58       │  CC 59       │
│  MARKING     │  FLY MODE    │  HiZ         │  HiZ LAG     │
│  enabled     │  fly-through │  occlusion   │  frame lag   │
│  ◀off  on▶   │  ◀off  on▶   │  ◀off  on▶   │  1–30        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  CC 60       │  CC 61       │  CC 62       │  CC 63       │
│  DBG SCENE   │  DBG OBJECTS │  INTERACT MS │  DBG VISIBLE │
│  bounds      │  bounds      │  release     │  bounds      │
│  ◀off  on▶   │  ◀off  on▶   │  0–1000ms    │  ◀off  on▶   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Quick Reference

**Boolean knobs**: Turn past midpoint (64) = on, below = off.

**Press+turn**: Rotation/translation knobs (CC 9–15) go 10x faster when pressed down.

**Most-used knobs**:
- **CC 33** (roughness) — shininess control, left=shiny right=matte
- **CC 12** (clip radius) — slice into structures
- **CC 0** (exposure) — overall brightness
- **CC 6/7** (light angles) — position the key light
- **CC 5** (scene radius) — expand bounding sphere to fix clipping
- **CC 4** (fog) — depth cueing
