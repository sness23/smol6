# Research: Console Hide via Remote Commands

## Problem Statement

When sending commands to smol via the HTTP command server (port 8888), the `console hide` command doesn't work as expected. The console hides momentarily, but then immediately reappears.

### Root Cause

In `smol6/index.html`, the remote command handler explicitly shows the console before executing any command:

```javascript
window.ipcRenderer.on('execute-command', function(event, command) {
    showConsole();           // <-- Always shows console first
    addConsoleOutput('smol> ' + command);
    addToHistory(command);
    executeCommand(command);
});
```

This design makes sense for most commands (users want to see what happened), but it defeats `console hide` because:
1. `showConsole()` is called
2. Command is displayed
3. `executeCommand('console hide')` runs
4. Console hides
5. ...but the next command will show it again anyway

In `molstar0/index.html`, there's a more sophisticated approach where `console hide` returns a `consoleAction: 'hide'` in the result, and the handler checks for this. But even this has issues with the timing.

---

## Proposed Solutions

### Approach 1: Silent Mode Flag

**Concept**: Add a `--silent` or `-s` flag to commands that suppresses console visibility.

```bash
./smol-cmd -s "load 1cbs"     # Load without showing console
./smol-cmd "console hide"     # Then hide works
```

**Implementation**:
- Modify HTTP server to parse flags from command
- Send a separate IPC message like `execute-command-silent`
- Handler skips `showConsole()` for silent commands

**Pros**:
- Simple to implement
- Backward compatible
- User has explicit control

**Cons**:
- Requires modifying both Electron main process and renderer
- Two code paths to maintain

---

### Approach 2: Persistent Console State

**Concept**: Track console visibility state and respect it across commands.

```bash
./smol-cmd "console hide"     # Sets persistent hidden state
./smol-cmd "load 1cbs"        # Console stays hidden
./smol-cmd "console show"     # Explicitly show again
```

**Implementation**:
- Add `consoleAutoShow` boolean state variable
- `console hide` sets `consoleAutoShow = false`
- `console show` sets `consoleAutoShow = true`
- Remote command handler: `if (consoleAutoShow) showConsole();`

**Pros**:
- Natural UX - hide once, stays hidden
- No changes to smol-cmd needed
- Matches user mental model

**Cons**:
- Need to sync state properly
- What happens on F2 toggle? Should it reset the flag?

---

### Approach 3: Headless/Batch Mode

**Concept**: A separate endpoint or mode for scripting that never shows the console.

```bash
./smol-cmd "load 1cbs"              # Normal - shows console
./smol-cmd --batch "load 1cbs"      # Batch - no console
```

**Implementation**:
- Add `/command-batch` endpoint that sets a flag
- Or: add `X-Smol-Batch: true` header
- Handler checks flag and skips UI updates

**Pros**:
- Clean separation of interactive vs scripted use
- No changes to existing behavior

**Cons**:
- Two endpoints/modes to maintain
- Might want partial feedback sometimes

---

### Approach 4: Pre-check Command Before Show

**Concept**: Parse the command before deciding whether to show console.

```javascript
window.ipcRenderer.on('execute-command', function(event, command) {
    var isConsoleHide = /^console\s+hide$/i.test(command.trim());

    if (!isConsoleHide) {
        showConsole();
        addConsoleOutput('smol> ' + command);
    }

    addToHistory(command);
    executeCommand(command);
});
```

**Pros**:
- Minimal code change
- Just works for `console hide`

**Cons**:
- Hardcoded command detection feels hacky
- What about `console toggle`?
- Doesn't solve the "stay hidden" problem for subsequent commands

---

### Approach 5: Command Queue with Deferred UI

**Concept**: Queue commands and batch UI updates, allowing hide to cancel pending shows.

**Implementation**:
- Commands go into a queue
- Process queue with microtask delay
- If queue contains `console hide` at end, skip show for all

**Pros**:
- Could enable interesting command batching

**Cons**:
- Complex
- Timing issues
- Over-engineered for the problem

---

### Approach 6: Separate Output Channel

**Concept**: Remote commands output to a different place (file, socket, stdout) instead of console.

```bash
./smol-cmd "load 1cbs"   # Output goes to stdout, not console
```

**Implementation**:
- HTTP response already returns "OK: command"
- Could enhance to return actual command result
- Console in smol stays hidden

**Pros**:
- Clean separation
- Better for scripting anyway

**Cons**:
- Loses the visual feedback in the app
- Would need significant changes to return rich results

---

## Recommendation

**Start with Approach 2 (Persistent Console State)** because:

1. Most intuitive for users - "hide means stay hidden"
2. Minimal changes to smol-cmd
3. Works naturally with existing `console show/hide` commands
4. Can be implemented entirely in renderer (index.html)

### Proposed Implementation for Approach 2

```javascript
// Add state variable
var consoleAutoShow = true;

// Modify remote command handler
window.ipcRenderer.on('execute-command', function(event, command) {
    if (consoleAutoShow) {
        showConsole();
    }
    addConsoleOutput('smol> ' + command);
    addToHistory(command);
    executeCommand(command);
});

// In executeCommand, after handling consoleAction:
if (action === 'hide') {
    consoleAutoShow = false;  // <-- Add this
    hideConsole();
    return;
} else if (action === 'show') {
    consoleAutoShow = true;   // <-- Add this
    showConsole();
    return;
}
```

### Edge Cases to Consider

1. **F2 toggle**: Should it reset `consoleAutoShow`? Probably yes - user is explicitly interacting.
2. **Escape to hide**: Should this set `consoleAutoShow = false`? Maybe not - temporary hide.
3. **Enter to show**: Should this set `consoleAutoShow = true`? Probably yes.
4. **App restart**: Should `consoleAutoShow` persist? Probably not needed.

---

## Alternative: Hybrid Approach (2 + 1)

Combine persistent state with explicit silent flag:

- `console hide` - hides and sets `consoleAutoShow = false`
- `console show` - shows and sets `consoleAutoShow = true`
- `--silent` flag - one-off suppression without changing state

This gives maximum flexibility for different use cases.
