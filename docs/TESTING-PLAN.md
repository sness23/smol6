# smol6 Testing Plan

## Context

smol6 is an Electron wrapper around the smol molecular viewer (built in molstar0). The viewer logic itself should be tested in molstar0 — this plan covers testing the **Electron shell**: settings, IPC, hardware input mapping, console UI, command routing, and build integrity.

There are ~80+ distinct testable units across the codebase, currently with zero test coverage.

## Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit tests (fast, Vite-native, no Electron needed) |
| **Playwright Electron** | Integration tests (real app, real window) |
| **CI script** | Build smoke tests (does it compile, are outputs correct) |

---

## Phase 1: Foundation & First Unit Tests

**Goal:** Get Vitest running, extract testable logic from inline code, write first unit tests.

### 1a. Install & Configure Vitest

- `npm install -D vitest`
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to package.json scripts
- Create `vitest.config.ts` (can extend vite.config.ts but exclude Electron plugins)

### 1b. Extract Testable Modules

The biggest barrier to unit testing is that most logic lives inline in `index.html` and `electron/main.ts`. Extract pure functions into importable modules:

**`src/settings.ts`** — Settings loading & defaults
```
- parseSettings(jsonString: string): SmolSettings
- applyDefaults(settings: Partial<SmolSettings>): SmolSettings
- Default values: { consoleMode: 'compact', zoom: 3.0 }
```

**`src/knobs.ts`** — Knob/MIDI mapping logic
```
- KNOB_META table (the _knobMeta object from index.html)
- mapMidiToValue(param: string, midiValue: number): number | boolean
- formatKnobDisplay(param: string, midiValue: number): { name, percentage, displayValue, unit }
```

**`src/history.ts`** — Command history management
```
- loadHistory(storage: Storage): string[]
- saveHistory(storage: Storage, history: string[]): void
- addToHistory(history: string[], command: string): string[]
- navigateHistory(history: string[], index: number, direction: 'up' | 'down'): { index, value }
```

**`src/file-args.ts`** — CLI file argument parsing
```
- getFileFromArgs(argv: string[], isPackaged: boolean): string | null
- FILE_FORMAT_MAP: Record<string, string> (extension-to-format mapping)
```

**`src/spacemouse.ts`** — 6DOF math (rotation/translation)
```
- applyRotation(snapshot, rx, ry, rz, scale): { position, target, up }
- applyTranslation(snapshot, x, y, z, scale): { position, target }
```

### 1c. Unit Tests to Write

| Test file | What it covers | Priority |
|-----------|---------------|----------|
| `test/settings.test.ts` | Valid JSON, invalid JSON, missing file, defaults, partial settings | High |
| `test/knobs.test.ts` | MIDI 0/64/127 boundary mapping, boolean params, all 48 params have valid metadata | High |
| `test/history.test.ts` | Add/navigate/load/save, dedup, empty commands, 100-item cap | Medium |
| `test/file-args.test.ts` | Absolute/relative paths, flags skipped, non-existent files, packaged mode | Medium |
| `test/spacemouse.test.ts` | Identity rotation, 90-degree rotations, translation in camera space | Medium |

### Estimated effort: 2-3 sessions

---

## Phase 2: Integration Tests with Playwright

**Goal:** Verify the app actually launches and core workflows work end-to-end.

### 2a. Install & Configure Playwright Electron

- `npm install -D @playwright/test`
- Create `playwright.config.ts` for Electron testing
- Add `"test:e2e": "playwright test"` script

### 2b. Integration Tests to Write

| Test file | What it covers | Priority |
|-----------|---------------|----------|
| `test/e2e/launch.test.ts` | App launches, window appears, correct title | High |
| `test/e2e/console.test.ts` | F2 toggles console, Escape hides, Enter shows | High |
| `test/e2e/settings.test.ts` | Custom ~/.smol zoom/consoleMode applied on startup | Medium |
| `test/e2e/commands.test.ts` | `help` prints output, `load 1cbs` loads structure, `close` clears | Medium |
| `test/e2e/http-api.test.ts` | POST to localhost:8888/command returns result, CORS headers present | Medium |
| `test/e2e/websocket.test.ts` | Connect to ws://127.0.0.1:8889, send clipfog event, verify no crash | Low |

### Estimated effort: 2-3 sessions

---

## Phase 3: Build & CI Smoke Tests

**Goal:** Catch build regressions automatically.

### 3a. Build Verification Script

Create `test/build.test.ts` (runs with Vitest, no Electron needed):

- `npm run build` exits with code 0
- `dist/index.html` exists
- `dist-electron/main.js` exists
- `dist-electron/preload.js` exists
- `dist/smol/molstar.js` exists and is > 1MB (catches missing/truncated asset)
- `dist/smol/molstar.css` exists

### 3b. GitHub Actions CI

Create `.github/workflows/test.yml`:

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      # E2E tests need xvfb for headless Electron
      - run: xvfb-run npm run test:e2e
```

### Estimated effort: 1 session

---

## Phase 4: Ongoing & Advanced

These are lower priority but worth considering as the project matures.

### 4a. Knob Parameter Regression Tests

Auto-generate test cases from the `_knobMeta` table: for every defined parameter, verify that `mapMidiToValue` returns values within `[min, max]` for all MIDI inputs 0-127. This catches off-by-one errors and typos in the mapping table. (~48 parameterized test cases, auto-generated from metadata.)

### 4b. Snapshot Tests for Default Canvas3D Props

Capture the default canvas3d props object as a snapshot. If molstar.js is updated and defaults change, the snapshot test fails — alerting you to review whether `preset default` still resets correctly.

### 4c. Performance Benchmarks

Not traditional tests, but useful baselines:
- App startup time (time from launch to `viewer.plugin.canvas3d` being ready)
- `load 1cbs` time (time from command to structure visible)
- Memory usage after loading N structures

### 4d. Cross-Platform Testing

Extend CI to test on macOS and Windows runners for platform-specific behavior (app lifecycle `window-all-closed` behaves differently on macOS).

---

## Recommended Implementation Order

```
Phase 1a  Install Vitest, config           (30 min)
Phase 1b  Extract settings + knobs modules  (1-2 hrs)
Phase 1c  Write unit tests for them         (1-2 hrs)
       ---- you now have `npm test` working ----
Phase 3a  Build smoke test                  (30 min)
Phase 3b  GitHub Actions CI                 (30 min)
       ---- you now have CI on every push ----
Phase 2a  Install Playwright Electron       (30 min)
Phase 2b  Launch + console e2e tests        (1-2 hrs)
       ---- you now have e2e coverage ----
Phase 1b+ Extract remaining modules         (ongoing)
Phase 4   Advanced tests                    (as needed)
```

Build smoke tests (Phase 3) come before e2e (Phase 2) because they're simpler to set up and catch the most common regression: "I updated molstar.js and now the build is broken."

## File Structure

```
smol6/
  src/
    settings.ts        # Extracted from electron/main.ts
    knobs.ts           # Extracted from index.html
    history.ts         # Extracted from index.html
    file-args.ts       # Extracted from electron/main.ts
    spacemouse.ts      # Extracted from index.html
  test/
    settings.test.ts
    knobs.test.ts
    history.test.ts
    file-args.test.ts
    spacemouse.test.ts
    build.test.ts
    e2e/
      launch.test.ts
      console.test.ts
      settings.test.ts
      commands.test.ts
      http-api.test.ts
      websocket.test.ts
  vitest.config.ts
  playwright.config.ts
  .github/
    workflows/
      test.yml
```
