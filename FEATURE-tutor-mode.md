# smol6 — Tutor Mode (design)

A feature that makes smol6 a first-class collaborator with the Zax Tutor AI. When tutor-mode is active, smol6 visually highlights commands as they arrive from the tutor (over HTTP port 8888), so the student sees *what the tutor just did* rather than guessing what changed.

This is the differentiator vs. ChimeraX/PyMOL: tools that the AI tutor can drive — and that show it.

## Why this matters

Without tutor-mode, a student running smol6 alongside the Zax Tutor sees:
- They ask a question in the tutor.
- The tutor sends a command (e.g., `color :CYS yellow`).
- The viewer updates.
- The student doesn't know which atoms changed, why, or what the command was.

With tutor-mode, the same flow becomes:
- They ask a question in the tutor.
- The tutor sends a command.
- The viewer briefly flashes the affected atoms (the cysteines).
- A small toast at the top shows the command literally: `> color :CYS yellow` (faded out after 5 seconds).
- The student sees both the result *and* the operation that produced it. That's the teaching moment.

## Spec

### Toggle

- New console command: `tutor on` / `tutor off` / `tutor status`
- Persisted setting in `~/.smol`: `"tutorMode": true|false`
- Default: off (opt-in; existing users unaffected)
- Visual indicator when on: a small "TUTOR" badge in the top-right corner

### Behavior in tutor-mode

When tutor-mode is on AND a command arrives via HTTP (port 8888):

1. **Toast notification** at the top of the viewer for 5 seconds:
   ```
   > color :CYS yellow
   ```
   Styled with a small "tutor →" prefix in muted orange (#d9a36b — matches the Zax brand).

2. **Visual highlight** of the affected atoms/structure:
   - For `load` commands: brief 1-second pulse of the newly-loaded structure (scale 1.05→1.0 over 500ms with easing)
   - For `color` commands: 500ms flash of the affected atoms (briefly brighten to white, fade back to the new color)
   - For `close` commands: brief fade-out before clearing

3. **Console log entry** in the smol6 console history:
   ```
   tutor → color :CYS yellow (10 atoms affected)
   ```
   So the student can scroll back and see what was done.

4. **Optional audio cue** (off by default; `tutor audio on` to enable): subtle 100ms chime when a tutor command arrives.

### Behavior when manually typing same command

When the *student* types the same command in the console (not via HTTP):
- No tutor-mode visual treatment
- Just runs normally
- This is the key distinction: tutor-mode visualizes what *the AI* did, not what the human did

### HTTP request differentiation

smol6's existing HTTP server (port 8888) currently accepts any POST to `/command` and runs it. To support tutor-mode, the request shape can grow:

```json
POST /command
Content-Type: application/json

{
  "command": "color :CYS yellow",
  "actor": "tutor",
  "rationale": "Highlighting the cysteines that form crambin's three disulfide bonds"
}
```

Backward compatibility: existing plain-text `POST /command` requests still work and are treated as `actor: "external"` (no tutor-mode visual treatment).

The `rationale` field, when present, can be shown in a sidebar tooltip that explains *why* the tutor sent the command. Useful for course videos where you want to walk through the tutor's logic.

## Implementation sketch

| File | Change |
|---|---|
| `electron/main.ts` | HTTP server parses JSON body when Content-Type is JSON; extracts `actor` and `rationale`. Existing text/plain path unchanged. Forwards as IPC `execute-command` with extra fields. |
| `index.html` (renderer) | New `applyTutorMode(command, rationale, affectedAtoms)` function. Triggered when the IPC message has `actor === "tutor"` and tutor-mode is enabled. Renders toast + flash. |
| `index.html` console | New commands: `tutor on|off|status|audio on|off`. Persists to `~/.smol`. |
| Settings (`~/.smol`) | Add `tutorMode: boolean`, `tutorAudio: boolean`. |

## UI mockup (ascii)

```
┌───────────────────────────────────────────────┐
│ 🧬                          [TUTOR●]    smol6 │ ← Top-right badge when on
│ ┌─────────────────────────────────────────┐  │
│ │ tutor → color :CYS yellow              │  │ ← Toast, 5s fade
│ └─────────────────────────────────────────┘  │
│                                               │
│         [3D structure rendering area]         │
│           (with affected atoms flashing       │
│            on tutor command arrival)          │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ > tutor on                              │  │
│ │ Tutor mode enabled                      │  │
│ │ tutor → color :CYS yellow (10 atoms)    │  │ ← Console line, persistent
│ └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

## What this unlocks for the Zax Academy curriculum

For every module, the Zax Tutor can:

1. **Drive the student's visualization** — when a concept is being taught, the tutor sets up the right view automatically
2. **Run guided tours** — pre-scripted sequences of commands that walk the student through a structure with explanations at each step
3. **Verify understanding** — after a Socratic question, the tutor can show the answer visually rather than describe it in text

Real example for M1 (Protein Structure):
- Student: "Why does crambin have so many disulfide bonds?"
- Tutor: [sends `load 1crn; color :CYS yellow`] "Take a look — the six cysteines form three S-S bridges. What do you think happens to crambin's stability if one disulfide is missing?"
- Student sees the structure load and the cysteines highlight, plus the tutor's question. The visual is part of the teaching, not separate from it.

## MVP scope vs full scope

**MVP (~2 days of work):**
- Toggle (`tutor on/off`)
- JSON request format with `actor: "tutor"` field
- Toast notification with command text
- Console log entry

**Full (1-2 weeks):**
- Visual flash/highlight on affected atoms
- Rationale tooltip in sidebar
- Audio cue
- Per-command animation style (flash for color, pulse for load, fade for close)
- Replay mode: scroll through tutor history with state restoration

## Open questions

1. Should tutor commands log to a persistent file for replay? Useful for video production / course capture. Probably yes, optional.
2. Should manually-entered commands also trigger highlights (so the student gets visual feedback for their own commands)? Probably no — that would dilute the "this is what the AI did" signal.
3. Should the tutor be able to *query* smol6 (read the current state) via the HTTP server, not just write commands? Useful for tutor responses like "I see you've already loaded 1HVR — let's color by chain." Adds a `GET /state` endpoint. Worth designing.

## File location and status

This is a design document, not yet implemented. The implementation is tracked as a separate smol6 issue.

Status: design (2026-05-26).
