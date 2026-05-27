---
phase: 05-call-controls
plan: "01"
subsystem: frontend/call-context
tags: [webrtc, react, context, toggle, ice-state, unit-tests, tdd]
dependency_graph:
  requires: [04-05]
  provides: [CallContextValue.isMuted, CallContextValue.isCameraOff, CallContextValue.iceState, CallContextValue.toggleMute, CallContextValue.toggleCamera]
  affects: [frontend/src/contexts/CallContext.tsx, frontend/src/test/setup.ts, frontend/src/test/CallContext.test.tsx]
tech_stack:
  added: []
  patterns: [functional-updater-setState, useCallback-with-ref, tdd-red-green]
key_files:
  created: []
  modified:
    - frontend/src/contexts/CallContext.tsx
    - frontend/src/test/setup.ts
    - frontend/src/test/CallContext.test.tsx
decisions:
  - "toggleMute and toggleCamera use functional updater setIsMuted(prev => !prev) to avoid stale closure"
  - "iceState exposed from CallContext (centralized, testable) per D-10 — not read ad-hoc from pcRef in CallPage"
  - "setIceState(state) inserted as FIRST statement in oniceconnectionstatechange handler, before existing if/else chain"
  - "toggleCamera returns early (no-op) when localStream has no video tracks — audio-only guard per D-12"
  - "teardown() resets isMuted=false, isCameraOff=false, iceState=null — prevents second call inheriting previous call state"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-05-27"
  tasks_completed: 2
  files_modified: 3
requirements_covered: [CTRL-01, CTRL-02, CTRL-03, CTRL-05]
---

# Phase 5 Plan 1: CallContext Toggle State + ICE State Extension Summary

**One-liner:** Extended CallContext with mic/camera toggle state and iceState using functional updater pattern; backed by 9 new unit tests covering CTRL-01/02/03/05.

## What Was Built

### Task 1: setup.ts mock infrastructure for toggle tests (commit: b93d322)

Replaced the single `mockTrack` with separate `mockAudioTrack` and `mockVideoTrack` objects, each with `{ stop: vi.fn(), enabled: true }`. Updated `mockMediaStream` to expose all three methods (`getTracks`, `getAudioTracks`, `getVideoTracks`). Both track objects are exported at module scope so test files can read `.enabled` after toggle calls. All 45 pre-existing tests continued to pass.

### Task 2: CallContext extension + unit tests (commit: 694230d)

**CallContext.tsx changes:**

1. `CallContextValue` interface — 5 new fields added after `hangUp`: `isMuted: boolean`, `isCameraOff: boolean`, `iceState: RTCIceConnectionState | null`, `toggleMute: () => void`, `toggleCamera: () => void`

2. Three new `useState` declarations after `toasts`:
   - `const [isMuted, setIsMuted] = useState(false)`
   - `const [isCameraOff, setIsCameraOff] = useState(false)`
   - `const [iceState, setIceState] = useState<RTCIceConnectionState | null>(null)`

3. `toggleMute` — `useCallback` using functional updater `setIsMuted(prev => !prev)`; inside updater reads `localStreamRef.current?.getAudioTracks()[0]` and sets `audioTrack.enabled = !nextMuted`; dep array `[]`

4. `toggleCamera` — `useCallback`; audio-only guard checks `localStreamRef.current?.getVideoTracks()` and returns early if no tracks; inside `setIsCameraOff(prev => !prev)` updater sets `videoTracks[0].enabled = !nextOff`; dep array `[]`

5. `oniceconnectionstatechange` handler — `setIceState(state as RTCIceConnectionState)` added as FIRST statement after `const state = pc.iceConnectionState`, before the existing `if/else` chain

6. `teardown()` — `setIsMuted(false)`, `setIsCameraOff(false)`, `setIceState(null)` appended after `setCallStatus('idle')` in step 5

7. `CallContext.Provider value` — 5 new fields added: `isMuted`, `isCameraOff`, `iceState`, `toggleMute`, `toggleCamera`

**CallContext.test.tsx changes:**

Added import of `mockAudioTrack` and `mockVideoTrack` from `./setup`. Appended 9 new test cases:

- `CTRL-01a`: `toggleMute` sets `isMuted=true`
- `CTRL-01b`: `toggleMute` sets `audioTrack.enabled=false`
- `CTRL-01c`: `toggleMute` twice returns `isMuted=false` and `audioTrack.enabled=true`
- `CTRL-02a`: `toggleCamera` sets `isCameraOff=true`
- `CTRL-02b`: `toggleCamera` sets `videoTrack.enabled=false`
- `CTRL-02c`: `toggleCamera` no-op when no video tracks (audio-only stream)
- `CTRL-03`: `teardown()` resets `isMuted=false`, `isCameraOff=false`, `iceState=null` after `hangUp()`
- `CTRL-05`: `iceState` set to `'connected'` when `oniceconnectionstatechange` fires with that state
- `CTRL-05b`: `iceState` set to `'checking'`

**Test results:** 54 total tests pass (45 baseline + 9 new CTRL tests). Zero failures.

## Verification

```
npm test -- --run --reporter=verbose
Tests  54 passed (54)
```

Spot-check assertions:
- `CallContext.tsx` contains `isMuted: boolean` in `CallContextValue` interface
- `CallContext.tsx` contains `setIceState(state as RTCIceConnectionState)` before the `if/else` chain in `oniceconnectionstatechange`
- `CallContext.tsx` contains `setIsMuted(false)` inside `teardown()` after `setCallStatus('idle')`
- `setup.ts` contains `getAudioTracks` method on `mockMediaStream`
- `CallContext.test.tsx` contains `CTRL-01` test label

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | b93d322 | chore(05-01): extend setup.ts mock with getAudioTracks/getVideoTracks and enabled property |
| Task 2 | 694230d | feat(05-01): extend CallContext with toggle state + iceState + unit tests (CTRL-01/02/03/05) |

## Known Stubs

None — all new state fields are fully wired. `isMuted`, `isCameraOff`, `iceState`, `toggleMute`, and `toggleCamera` are implemented with real logic, not placeholders.

## Threat Flags

No new security-relevant surface introduced. Toggle functions operate on local browser MediaStreamTrack objects. `iceState` is read from the browser's WebRTC implementation (not user-controlled input). No new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- [x] `frontend/src/contexts/CallContext.tsx` — modified, contains all 5 new fields
- [x] `frontend/src/test/setup.ts` — modified, exports `mockAudioTrack` and `mockVideoTrack`
- [x] `frontend/src/test/CallContext.test.tsx` — modified, contains CTRL-01 through CTRL-05b tests
- [x] Commit b93d322 exists (Task 1)
- [x] Commit 694230d exists (Task 2)
- [x] 54 tests pass (45 baseline + 9 new)
