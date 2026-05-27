---
phase: 04-1-1-call-core
plan: "04"
subsystem: frontend
tags: [webrtc, callpage, video-streams, srcobject, pitfall-3, tdd, wave-2]
depends_on:
  requires:
    - 04-02 (CallContext with localStream, remoteStream, peerUsername, hangUp)
    - 04-03 (IncomingCallModal fully implemented)
  provides:
    - CallPage full UI per UI-SPEC §5.3: remote video full-screen, local PiP, peer name overlay, hang-up button
    - srcObject wired via useEffect (Pitfall 3 mitigated, T-4-04-02 mitigated)
    - UI-03 verified: 7 active unit tests (0 skipped), all green
    - CALL-08 verified: hang-up button calls hangUp() from CallContext
    - Pitfall 4 documented inline: no unmount cleanup intentionally (Phase 5 TODO)
  affects:
    - frontend/src/pages/CallPage.tsx (stub → full implementation)
    - frontend/src/test/CallPage.test.tsx (5 it.skip → 7 active tests)
tech_stack:
  added: []
  patterns:
    - srcObject assigned via useRef + useEffect watching stream state (Pitfall 3 fix — never as JSX prop)
    - COPY object pattern for copy strings (matches UserListPage.tsx convention)
    - Conditional rendering: {!remoteStream && placeholder}, {peerUsername && overlay}
    - React `muted` is a DOM property not HTML attribute — test uses .muted property assertion
    - Pitfall 4 documented inline with Phase 5 TODO — no unmount cleanup by design
key_files:
  created: []
  modified:
    - frontend/src/pages/CallPage.tsx
    - frontend/src/test/CallPage.test.tsx
decisions:
  - "srcObject wired via useEffect watching [localStream]/[remoteStream] — Pitfall 3 closed (T-4-04-02 mitigated)"
  - "No unmount cleanup — Pitfall 4 documented inline with Phase 5 TODO marker"
  - "Remote video NOT muted per UI-SPEC §9: user must hear remote audio; browser autoplay satisfied by AcceptCall click gesture"
  - "Local video muted per browser autoplay policy; scale-x-[-1] for mirror effect per UI-SPEC §5.3"
  - "muted assertion in test uses .muted property (not toHaveAttribute) — React sets muted as DOM property in jsdom"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-27T01:35:00Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 4 Plan 04: CallPage Full UI Implementation Summary

**One-liner:** Full CallPage with remote video full-screen, local PiP overlay (mirrored, muted), peer username overlay, and hang-up button — srcObject wired via useEffect (Pitfall 3 closed), UI-03 verified by 7 active unit tests.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Activate CallPage tests — 7 failing tests | 92b2ee7 | CallPage.test.tsx |
| 1 (GREEN) | Full CallPage UI implementation + test fix | add4f45 | CallPage.tsx, CallPage.test.tsx |

## CallPage Layout (UI-SPEC §5.3)

### Component Structure

```
CallPage
  ├── Remote video (w-full h-full object-cover) — NOT muted
  ├── Placeholder (absolute inset-0) — shown when remoteStream is null
  │     └── Users icon (size-16 text-slate-700) + "Waiting for remote video..." text
  ├── Peer username overlay (absolute top-4 left-4 bg-slate-900/70)
  │     └── <span> {peerUsername} — conditional, shown when peerUsername set
  ├── Local video PiP (absolute bottom-24 right-4 w-32 aspect-video)
  │     └── <video muted scale-x-[-1]> — local stream, mirrored
  └── Control bar (absolute bottom-0 left-0 right-0 h-20)
        └── Hang-up Button (h-12 w-12 rounded-full bg-red-600) — PhoneOff icon, aria-label="End call"
```

## srcObject Wiring Pattern (Pitfall 3 — T-4-04-02 mitigated)

```typescript
// NEVER as JSX prop — React reconciliation resets srcObject on re-renders
useEffect(() => {
  if (localVideoRef.current) localVideoRef.current.srcObject = localStream
}, [localStream])

useEffect(() => {
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
}, [remoteStream])
```

Both `<video>` elements are wired via `useRef` + `useEffect` watching the stream state. Confirmed by the Pitfall 3 test: re-rendering with new `remoteStream` value updates `remoteVideoRef.current.srcObject` correctly.

## Test Results

```
npm test -- --run src/test/CallPage.test.tsx --reporter=verbose

✓ UI-03: renders remote <video> with aria-label="Remote video stream"
✓ UI-03: renders local <video> with aria-label="Local video preview" and muted attribute
✓ UI-03: hang-up button has aria-label="End call"
✓ UI-03: clicking hang-up button calls hangUp()
✓ UI-03: shows "Waiting for remote video..." placeholder when remoteStream is null
✓ UI-03: renders peer username overlay top-left when peerUsername is set
✓ Pitfall 3: srcObject of remote video updates when remoteStream changes from null to a value

Tests  7 passed (7)
```

Full suite after plan: `42 passed | 0 skipped` (all 42 active tests pass).

## Verification Results

- `npm test -- --run`: 42/42 active tests pass, 0 skipped
- `npx tsc --noEmit`: exit 0
- `npm run build`: exit 0 (355 kB bundle, Vite build successful)
- Both `<video>` elements wired via useEffect — srcObject assignment verified by Pitfall 3 test
- Hang-up button is the ONLY interactive control (Phase 5 adds mic/camera/duration)
- Remote video NOT muted — callee hears caller and vice versa
- Local video muted + mirrored (scale-x-[-1])

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | 92b2ee7 | All 7 tests fail against stub CallPage — confirmed |
| GREEN | add4f45 | All 7 tests pass, full suite 42/42 — confirmed |
| REFACTOR | — | No refactoring needed — implementation was clean |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React `muted` attribute not available as HTML attribute in jsdom**
- **Found during:** Task 1 GREEN phase — `toHaveAttribute('muted')` failed even though local video is correctly muted
- **Issue:** React sets `muted` as a DOM property on `HTMLVideoElement`, not as an HTML attribute. In jsdom, `element.getAttribute('muted')` returns `null` even when `element.muted === true`. This is a React/jsdom interaction: boolean media attributes like `muted` bypass HTML attribute reflection.
- **Fix:** Changed test assertion from `expect(localVideo).toHaveAttribute('muted')` to `expect(localVideo.muted).toBe(true)` — uses DOM property access instead. Added a comment documenting the jsdom limitation.
- **Files modified:** `frontend/src/test/CallPage.test.tsx`
- **Commit:** add4f45

## Known Stubs

None — CallPage stub fully replaced. All 5 Wave 0 `it.skip` tests from Plan 01 activated, plus 2 additional tests added (peer overlay + Pitfall 3 srcObject). No remaining stubs in Phase 4 frontend components.

## Threat Flags

No new security-relevant surface beyond the plan's threat model:
- `remoteStream` comes from RTCPeerConnection `ontrack` (browser-native, T-4-04-01 accepted)
- `peerUsername` rendered as JSX text node (React escapes by default, T-4-04-03 accepted)
- srcObject via useEffect (T-4-04-02 mitigated)
- Camera/mic still active after navigation: T-4-04-03 accepted, Pitfall 4 documented inline

## Self-Check: PASSED

- `frontend/src/pages/CallPage.tsx` exists with:
  - `default export` named `CallPage`
  - TWO `useEffect` blocks assigning `.srcObject` (lines 31-38)
  - `aria-label="Remote video stream"` on remote `<video>`
  - `aria-label="Local video preview"` on local `<video>`
  - `muted` attribute on local `<video>`, absent on remote
  - `scale-x-[-1]` class on local video
  - `'Waiting for remote video...'` in COPY.placeholderText
  - `aria-label={COPY.endCallLabel}` on hang-up button (= "End call")
  - `onClick={hangUp}` on hang-up button
  - `top-4 left-4 bg-slate-900/70` on peer overlay
  - `bottom-24 right-4 w-32 aspect-video` on local PiP container
  - `absolute bottom-0 left-0 right-0 h-20` on control bar
  - `Pitfall 4` inline comment marker
- `frontend/src/test/CallPage.test.tsx` has 7 active `it()` tests, 0 `it.skip`
- Commits `92b2ee7` (RED) and `add4f45` (GREEN) verified in git log
