---
phase: 05-call-controls
plan: "02"
subsystem: frontend/call-page-ui
tags: [webrtc, react, ui, timer, ice-state, control-bar, tdd, accessibility]
dependency_graph:
  requires: [05-01]
  provides: [CallPage.3-button-control-bar, CallPage.timer-overlay, CallPage.status-overlay, useCallTimer, UserListPage.cancel-button]
  affects:
    - frontend/src/pages/CallPage.tsx
    - frontend/src/pages/UserListPage.tsx
    - frontend/src/hooks/useCallTimer.ts
    - frontend/src/test/CallPage.test.tsx
tech_stack:
  added: []
  patterns: [tdd-red-green, useEffect-cleanup, conditional-tailwind-classes, aria-pressed, aria-live-polite]
key_files:
  created:
    - frontend/src/hooks/useCallTimer.ts
  modified:
    - frontend/src/pages/CallPage.tsx
    - frontend/src/pages/UserListPage.tsx
    - frontend/src/test/CallPage.test.tsx
decisions:
  - "ICE_STATUS map defined at module level (before component function) to avoid recreation on every render"
  - "act imported from @testing-library/react (not vitest) for fake timer tests — Rule 1 auto-fix"
  - "Unmount cleanup useEffect with empty dep array calls hangUp() if callStatus !== idle (Pitfall 5)"
  - "Cancel button uses variant=ghost with text-red-400 — consistent with destructive-secondary pattern"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-27"
  tasks_completed: 2
  files_modified: 4
requirements_covered: [CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07]
---

# Phase 5 Plan 2: CallPage UI Extension — Control Bar, Timer, Status Summary

**One-liner:** Extended CallPage with 3-button control bar (Mic/End Call/Camera), MM:SS timer overlay, ICE status pill, and UserListPage Cancel button; backed by 11 new CTRL-01–05 component tests (65 total, all green).

## What Was Built

### Task 1: useCallTimer hook + RED tests (commit: 04dbf4a)

**useCallTimer.ts (new file):**

- Named export `useCallTimer(callStatus: CallStatus): string`
- `useState(0)` for seconds counter
- `useEffect` watches `callStatus`: resets seconds to 0 when not `'connected'`; starts `setInterval(() => setSeconds(s => s + 1), 1000)` when `'connected'` and returns `() => clearInterval(id)` for StrictMode safety (Pitfall 4 T-05-05 mitigation)
- Returns MM:SS string with zero-padded `Math.floor(seconds / 60)` and `seconds % 60`
- Header comment block follows `useRingtone.ts` style with 8-line ────── block

**CallPage.test.tsx extensions:**

- Added `mockToggleMute`, `mockToggleCamera` as `vi.fn()`; `mockIsMuted`, `mockIsCameraOff`, `mockIceState`, `mockCallStatus` as mutable module-level vars
- Extended `vi.mock('@/contexts/CallContext')` to include all 5 new fields (replaces hardcoded `callStatus: 'connected'` with `mockCallStatus`)
- Extended `beforeEach` to reset all new mocks; added `afterEach` with `vi.useRealTimers()`
- Appended 11 new RED tests (05-02-01 through 05-02-11) covering CTRL-01/02/04/05
- Result: 7 pre-existing tests GREEN, 11 new tests RED (expected TDD RED phase)

### Task 2: CallPage UI + UserListPage Cancel button (commit: c1619cc)

**CallPage.tsx changes:**

1. **Import additions:** `Mic, MicOff, Video, VideoOff` from `lucide-react`; `useCallTimer` from `@/hooks/useCallTimer`

2. **COPY constant additions:** `muteMicLabel`, `unmuteMicLabel`, `cameraOffLabel`, `cameraOnLabel`, `cameraUnavailableLabel` with exact UI-SPEC §8 strings

3. **ICE_STATUS constant** (module-level before component): 7 ICE state keys → `{ label, colorClass, pulse }` objects per D-08/D-09 and UI-SPEC §5.4

4. **useCall() destructure extension:** adds `isMuted, isCameraOff, iceState, toggleMute, toggleCamera`

5. **Derived values inside component:**
   - `const timerDisplay = useCallTimer(callStatus)`
   - `const hasVideoTracks = (localStream?.getVideoTracks().length ?? 0) > 0`
   - `const statusInfo = iceState ? (ICE_STATUS[iceState] ?? ICE_STATUS.new) : ICE_STATUS.new`

6. **Unmount cleanup useEffect** with empty dep array: `return () => { if (callStatus !== 'idle') hangUp() }` — fixes Pitfall 5 (browser back button)

7. **Timer + status overlay JSX** at `absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none`:
   - Timer pill: `bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1` with `text-sm font-semibold text-slate-50 tabular-nums` span
   - Status pill: same backdrop + conditional `animate-pulse`, `role="status"`, `aria-live="polite"`, colored label from `statusInfo`

8. **3-button control bar** replaces single End Call button:
   - Mic button: `h-10 w-10 rounded-full`, conditional `bg-red-600`/`bg-slate-700`, `aria-label`, `aria-pressed={isMuted}`, `onClick={toggleMute}`
   - End Call button: unchanged from Phase 4 (`h-12 w-12`, center anchor)
   - Camera button: `h-10 w-10 rounded-full`, 3-state conditional classes for active/off/audio-only, `disabled={!hasVideoTracks}`, `aria-disabled`, `aria-pressed={isCameraOff}`

**UserListPage.tsx changes:**

1. Added `cancelButton: 'Cancel'` to COPY constant
2. Added `onCancel?: () => void` prop to `UserRow`
3. In `isCallingThisUser` branch: wrapped Calling... button + new Cancel Button in `div className="flex items-center gap-2"`. Cancel: `variant="ghost" size="sm"` with `text-red-400 hover:text-red-300`, `aria-label="Cancel call"`
4. Destructured `hangUp` from `useCall()` in `UserListPage`; passed as `onCancel={hangUp}` to `UserRow`

**Test results:** 65 total tests pass (54 baseline + 11 new CTRL tests). Zero failures.

## Verification

```
npm test -- --run --reporter=verbose
Tests  65 passed (65)
```

Spot-check assertions:
- `CallPage.tsx` contains `toggleMute` in useCall() destructure
- `CallPage.tsx` contains `ICE_STATUS` constant before the `CallPage` function
- `CallPage.tsx` contains `useCallTimer` import and call
- `CallPage.tsx` contains `role="status"` and `aria-live="polite"` on status pill
- `CallPage.tsx` contains `aria-label={isMuted ? COPY.unmuteMicLabel : COPY.muteMicLabel}` on mic button
- `useCallTimer.ts` exists and exports `useCallTimer`
- `UserListPage.tsx` contains `onCancel` prop and Cancel button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `act` import source in CallPage.test.tsx**
- **Found during:** Task 2 test run
- **Issue:** `act` was imported from `vitest` in the test file header, but Vitest's `act` is not a function — it's only available from `@testing-library/react` for DOM-based component testing
- **Fix:** Changed import line from `import { ..., act } from 'vitest'` to importing `act` from `@testing-library/react` alongside `render, screen, fireEvent`
- **Files modified:** `frontend/src/test/CallPage.test.tsx`
- **Commit:** included in Task 2 commit `c1619cc`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (RED) | 04dbf4a | test(05-02): add useCallTimer hook + RED tests for CTRL-01 through CTRL-05 |
| Task 2 (GREEN) | c1619cc | feat(05-02): extend CallPage with 3-button control bar + timer + status overlays; add Cancel button to UserListPage |

## Known Stubs

None — all new UI elements are fully wired to live CallContext state. `isMuted`, `isCameraOff`, `iceState`, `toggleMute`, `toggleCamera` from Plan 1's CallContext are fully consumed in the UI.

## Threat Flags

No new security-relevant surface introduced. Timer interval is local-only (T-05-05 — mitigated by `clearInterval` cleanup). ICE state labels are browser-controlled enum values displayed to local user only (T-05-07 — accepted). Cancel button calls the same `hangUp()` function as the End Call button (T-05-06 — accepted, idempotent-safe).

## TDD Gate Compliance

- [x] RED gate: `test(05-02)` commit `04dbf4a` exists before any implementation
- [x] GREEN gate: `feat(05-02)` commit `c1619cc` exists after RED commit
- No REFACTOR gate needed — code is clean as written

## Self-Check: PASSED

- [x] `frontend/src/hooks/useCallTimer.ts` — created, exports `useCallTimer`
- [x] `frontend/src/pages/CallPage.tsx` — modified, contains `toggleMute`, `ICE_STATUS`, `useCallTimer`, `role="status"`, `aria-live="polite"`
- [x] `frontend/src/pages/UserListPage.tsx` — modified, contains `onCancel` prop and Cancel button
- [x] `frontend/src/test/CallPage.test.tsx` — modified, contains CTRL-01 through CTRL-05 tests (05-02-01 through 05-02-11)
- [x] Commit 04dbf4a exists (Task 1 RED)
- [x] Commit c1619cc exists (Task 2 GREEN)
- [x] 65 tests pass (54 baseline + 11 new)
