---
phase: 04-1-1-call-core
plan: "03"
subsystem: frontend
tags: [webrtc, incoming-call, modal, web-audio, ringtone, tdd, wave-2]
depends_on:
  requires:
    - 04-02 (CallContext full implementation with callStatus/peerUsername/acceptCall/rejectCall)
  provides:
    - useRingtone hook: 800Hz sine-wave Web Audio API beep, 2s cycle, AudioContext cleanup on unmount (D-10/D-11)
    - IncomingCallModal full UI per UI-SPEC §5.1: backdrop, card, Avatar, caller name, Accept/Reject buttons
    - CALL-02 verified: modal renders on ringing, ARIA attributes correct, ringtone active while visible
    - CALL-03 verified: Accept calls acceptCall(), Reject calls rejectCall(), Escape key calls rejectCall()
    - 6 active IncomingCallModal unit tests (0 skipped)
  affects:
    - frontend/src/hooks/useRingtone.ts (stub → full implementation)
    - frontend/src/components/IncomingCallModal.tsx (stub → full UI per UI-SPEC §5.1)
    - frontend/src/test/IncomingCallModal.test.tsx (5 it.skip → active + 1 new Escape test)
tech_stack:
  added: []
  patterns:
    - Inner component pattern for conditional hook mount (useRingtone via IncomingCallModalInner)
    - AudioContext + OscillatorNode + GainNode per MDN Web Audio API (D-10)
    - stopped flag + audioCtx.state === 'closed' guard prevents schedule-after-unmount race (T-4-03-02)
    - COPY object pattern for copy strings (matching UserListPage.tsx pattern)
    - keydown event listener for Escape key (UI-SPEC §9 accessibility)
    - afterEach mock reset pattern for mutable mock state in tests
key_files:
  created: []
  modified:
    - frontend/src/hooks/useRingtone.ts
    - frontend/src/components/IncomingCallModal.tsx
    - frontend/src/test/IncomingCallModal.test.tsx
decisions:
  - "IncomingCallModalInner inner component used so useRingtone() mounts/unmounts with modal visibility — satisfies Rules of Hooks while enabling clean lifecycle"
  - "AudioContext guard checks both stopped flag AND audioCtx.state === 'closed' (plan spec adds closed-state check beyond RESEARCH Pattern 6)"
  - "afterEach added to test file to reset mutable mock state between tests — prevents test bleed"
  - "Escape key listener on window (not modal div) to ensure keydown captured regardless of focus position"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-27T01:27:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 4 Plan 03: IncomingCallModal + useRingtone Implementation Summary

**One-liner:** useRingtone Web Audio API hook (800Hz sine, 2s cycle, AudioContext cleanup) and full IncomingCallModal overlay (backdrop, Avatar, Accept/Reject buttons, Escape key) per UI-SPEC §5.1 — CALL-02 and CALL-03 verified by 6 active unit tests.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useRingtone Web Audio API implementation | 50581aa | useRingtone.ts |
| 2 (RED) | Activate IncomingCallModal tests | 95fdc24 | IncomingCallModal.test.tsx |
| 2 (GREEN) | Full IncomingCallModal UI implementation | 5f991e0 | IncomingCallModal.tsx |

## useRingtone Hook (D-10/D-11)

| Aspect | Implementation |
|--------|---------------|
| Audio API | `AudioContext` + `OscillatorNode` + `GainNode` |
| Frequency | 800 Hz sine wave |
| Pattern | 0.3s on (gain 0.3 → 0.001 exponential ramp) + 1.7s off = 2s cycle via `setTimeout(beep, 2000)` |
| Autoplay mitigation | `audioCtx.resume()` called immediately after creation (Pitfall 7) |
| Race condition guard | `if (stopped \|\| !audioCtx \|\| audioCtx.state === 'closed') return` in `beep()` |
| Cleanup | `stopped = true`, `clearTimeout(timeoutId)`, `audioCtx?.close()` |
| Lifecycle | Empty deps `[]` — runs once on mount, cleans on unmount (D-11) |

## IncomingCallModal Structure (UI-SPEC §5.1)

### Component Architecture

```
IncomingCallModal (outer guard)
  └── reads callStatus from useCall()
  └── returns null if callStatus !== 'ringing'
  └── renders IncomingCallModalInner when ringing
        └── useRingtone()          — starts beep, stops on unmount
        └── useEffect(keydown)     — Escape → rejectCall()
        └── Backdrop div           — fixed inset-0 z-50 bg-slate-950/80
              └── Modal card (role=dialog aria-modal aria-labelledby)
                    └── "Incoming Call" header
                    └── Avatar (h-16 w-16) + caller name + "is calling you..."
                    └── Reject button (red-600, h-11) + Accept button (emerald-500, h-11)
```

### Accessibility Coverage (UI-SPEC §9)

| Requirement | Implementation |
|-------------|----------------|
| `role="dialog"` | On modal card element |
| `aria-modal="true"` | On modal card element |
| `aria-labelledby="modal-caller-name"` | Points to caller name `<div id="modal-caller-name">` |
| Escape key dismisses modal | `window.addEventListener('keydown')` → `rejectCall()` |
| Accept button labeled | `aria-label="Accept call from {peerUsername}"` |
| Reject button labeled | `aria-label="Reject call from {peerUsername}"` |

## Test Results

```
npm test -- --run src/test/IncomingCallModal.test.tsx --reporter=verbose

✓ CALL-02: renders nothing when callStatus !== "ringing"
✓ CALL-02: renders modal when callStatus === "ringing" with caller name
✓ CALL-02: modal has correct ARIA attributes
✓ CALL-03: clicking Accept button calls acceptCall()
✓ CALL-03: clicking Reject button calls rejectCall()
✓ CALL-02: Escape key on backdrop calls rejectCall()

Tests  6 passed (6)
```

Full suite (after plan): `35 passed | 5 skipped` (5 skipped = Wave 0 CallPage stubs, Plan 04's scope)

## Verification Results

- `npm test -- --run`: 35/35 active tests pass, 5 skipped (CallPage stubs — Plan 04)
- `npx tsc --noEmit`: exit 0
- Modal renders only when `callStatus === 'ringing'` — verified by test 1 (null) and test 2 (visible)
- All four copy strings from UI-SPEC §8 present: "Incoming Call", "is calling you...", "Accept", "Reject"
- Accessibility: role/aria attributes verified by test 3
- Ringtone: `useRingtone` mock called — Web Audio API not available in jsdom (manual verification per VALIDATION.md)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- The plan spec for `useRingtone` guard uses `stopped` OR `state === 'closed'`. This plan implements both checks as specified, which adds a more robust check beyond the RESEARCH Pattern 6 baseline.
- `afterEach` reset of mock call counts added to test file — not explicitly in plan spec but required to prevent test bleed between tests mutating `mockAcceptCall`/`mockRejectCall`.

## Known Stubs

None — all stub bodies from Plan 01 replaced in this plan. `useRingtone.ts` and `IncomingCallModal.tsx` are fully implemented. Plan 04 can now build `CallPage` on top of the complete call stack.

## Threat Flags

No new security-relevant surface beyond what was in the plan's threat model:
- `peerUsername` rendered in JSX text nodes (React escapes by default — T-4-03-03 accepted)
- `audioCtx` cleanup on unmount mitigates AudioContext leak (T-4-03-02 mitigated)
- No new network endpoints, auth paths, or schema changes

## Self-Check: PASSED

- `frontend/src/hooks/useRingtone.ts` exists with `new AudioContext()`, `frequency.value = 800`, `'sine'`, `setTimeout(beep, 2000)`, `audioCtx.resume()`, guard with `stopped || !audioCtx || audioCtx.state === 'closed'`
- `frontend/src/components/IncomingCallModal.tsx` exists with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-caller-name"`, all copy strings, `useRingtone()`, keydown Escape handler, ARIA labels for buttons
- `frontend/src/test/IncomingCallModal.test.tsx` has 6 active `it()` tests, 0 `it.skip`
- Commits `50581aa` (useRingtone), `95fdc24` (RED tests), `5f991e0` (GREEN IncomingCallModal) verified in git log
