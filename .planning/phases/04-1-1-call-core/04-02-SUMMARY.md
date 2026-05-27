---
phase: 04-1-1-call-core
plan: "02"
subsystem: frontend
tags: [webrtc, call-context, signal-dispatch, ice-buffering, tdd, wave-1]
depends_on:
  requires:
    - 04-01 (RTCPeerConnection global mock, CallContext stub, test infrastructure)
  provides:
    - Full CallContext implementation with STOMP signal dispatch table (D-05 all 7 types)
    - WebRTC offer/answer/ICE flow with ICE candidate buffering (RESEARCH Pattern 2)
    - 30-second call timeout with call-end signal + "No answer" toast (CALL-07)
    - ICE failure recovery: disconnected=2s grace, failed=immediate teardown (D-08/D-09)
    - Teardown sequence: timers → tracks.stop → pc.close → refs → state (RESEARCH Pattern 4)
    - Try/catch around signal handler with teardown fallback (T-4-02, T-4-05, Open Question 2)
    - RTCSessionDescription + RTCIceCandidate globals stubbed in setup.ts
    - 12 active CallContext unit tests covering all CALL-01/02/03/04/07/08 requirements
  affects:
    - frontend/src/contexts/CallContext.tsx (full implementation replacing stub)
    - frontend/src/test/CallContext.test.tsx (8 → 12 active tests, 0 skipped)
    - frontend/src/test/setup.ts (MockRTCSessionDescription, MockRTCIceCandidate, lastInstance)
tech_stack:
  added: []
  patterns:
    - useRef for RTCPeerConnection + localStream + peerUsername (stale closure prevention, Pattern 1)
    - peerUsernameRef mirrored from peerUsername state via useEffect (Pitfall 2 fix)
    - iceCandidateBufferRef + drainIceCandidateBuffer after every setRemoteDescription (Pattern 2)
    - STOMP subscribe inside useEffect([client]) with cleanup (Pattern 3)
    - Teardown order: timers first, tracks.stop second, pc.close third, refs fourth, state last (Pattern 4)
    - try/catch around async handleSignal with teardown fallback (T-4-05)
    - vi.useFakeTimers + vi.runAllTicks for async code under fake timer control
    - MockRTCPeerConnection.lastInstance static field for cross-test instance access
key_files:
  created: []
  modified:
    - frontend/src/contexts/CallContext.tsx
    - frontend/src/test/CallContext.test.tsx
    - frontend/src/test/setup.ts
decisions:
  - "Offer created only in call-accept handler (not startCall) — Pitfall 6 enforced; verified by grep"
  - "acceptCall does not createAnswer — callee waits for 'offer' signal before answering (Pitfall 6)"
  - "RTCSessionDescription and RTCIceCandidate stubbed in setup.ts (jsdom lacks WebRTC globals)"
  - "MockRTCPeerConnection.lastInstance static field used for ICE buffer assertions in tests"
  - "CALL-07 fake timer test uses vi.runAllTicks() instead of waitFor to avoid real-timer interference"
  - "Toast auto-dismiss uses 3s setTimeout per UI-SPEC §5.4; addToast uses crypto.randomUUID()"
  - "peerUsernameRef synced via useEffect([peerUsername]) per Pitfall 2 recommendation"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-27T01:21:52Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 4 Plan 02: Full CallContext Implementation Summary

**One-liner:** Complete CallContext with STOMP signal dispatch for all 7 signal types (D-05), WebRTC offer/answer/ICE buffering, 30s call timeout, ICE failure recovery, and teardown sequence — 12 unit tests green, TypeScript clean.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for CALL-01/02/03/04/07/08 | d9cf067 | CallContext.test.tsx |
| 2 (GREEN) | Full CallContext implementation + RTCSessionDescription/RTCIceCandidate mocks | f4fbc11 | CallContext.tsx, setup.ts, CallContext.test.tsx |

## Signal Dispatch Table (D-05 — all 7 types implemented)

| Signal Type | Handler | Behavior |
|-------------|---------|----------|
| `call-request` | Callee side | Sets `callStatus='ringing'`, stores `peerUsername` from `msg.from` |
| `call-accept` | Caller side | Clears 30s timeout, `createOffer` → `setLocalDescription` → publishes `offer`, navigates `/call` |
| `call-decline` | Caller side | `teardown()` + "Call declined" toast (red-400) |
| `call-end` | Either side | `teardown()` + "Call ended" toast (slate-400) |
| `offer` | Callee side | `setRemoteDescription` → `drainIceCandidateBuffer` → `createAnswer` → `setLocalDescription` → publishes `answer` |
| `answer` | Caller side | `setRemoteDescription` → `drainIceCandidateBuffer` |
| `ice-candidate` | Either side | Buffer if `!remoteDescSetRef.current`; else `addIceCandidate` directly |

## ICE Candidate Buffering (RESEARCH Pattern 2, Pitfall 1 closed)

`iceCandidateBufferRef` collects candidates arriving before `setRemoteDescription`. `drainIceCandidateBuffer()` is called after every `setRemoteDescription` (both offer and answer handlers) — sets `remoteDescSetRef.current = true`, iterates buffer with `await addIceCandidate()`, clears buffer. Verified by unit test: 2 candidates buffered → 0 `addIceCandidate` calls before offer → 2 calls after offer handled.

## ICE Recovery State Machine (D-08/D-09)

| ICE State | Action |
|-----------|--------|
| `disconnected` | `teardownTimerRef = setTimeout(teardown, 2000)` (grace window for transient glitch) |
| `failed` | Clear grace timer + immediate `teardown()` + "Connection lost" toast |
| `connected` / `completed` | Clear grace timer + `setCallStatus('connected')` |

## Teardown Sequence (RESEARCH Pattern 4)

1. Clear `teardownTimerRef` and `callTimeoutRef`
2. `localStreamRef.current?.getTracks().forEach(t => t.stop())` (Pitfall 5 closed)
3. `pcRef.current?.close()`
4. Reset refs (`iceCandidateBufferRef`, `remoteDescSetRef`, `peerUsernameRef`)
5. Update React state: `setLocalStream(null)`, `setRemoteStream(null)`, `setPeerUsername(null)`, `setCallStatus('idle')`

## Verification Results

- `npm test -- --run src/test/CallContext.test.tsx`: 12/12 passed, 0 failed
- `npm test -- --run`: 30 passed, 9 skipped (Wave 0 stubs for Plans 03/04), 0 failed
- `npx tsc --noEmit`: exit 0
- `grep -c "case '" frontend/src/contexts/CallContext.tsx`: 7 (all D-05 cases)
- `createOffer` appears only in `call-accept` handler — not in `startCall` (Pitfall 6 verified absent)
- `acceptCall` contains no `createAnswer` (callee waits for `offer` signal)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RTCSessionDescription and RTCIceCandidate not defined in jsdom**
- **Found during:** Task 2 GREEN phase — `offer` and `ice-candidate` signal handler tests threw `ReferenceError: RTCSessionDescription is not defined`
- **Issue:** jsdom environment lacks WebRTC browser globals (`RTCSessionDescription`, `RTCIceCandidate`) — only `RTCPeerConnection` was stubbed in Wave 0 setup.ts
- **Fix:** Added `MockRTCSessionDescription` and `MockRTCIceCandidate` stub classes to `setup.ts` via `vi.stubGlobal`, mirroring the existing `MockRTCPeerConnection` pattern
- **Files modified:** `frontend/src/test/setup.ts`
- **Commit:** f4fbc11

**2. [Rule 1 - Bug] CALL-07 fake timer test timed out with waitFor**
- **Found during:** Task 2 GREEN phase — `waitFor` (from @testing-library/dom) internally uses real timers for its polling loop; with `vi.useFakeTimers()` active, `waitFor` waited forever and triggered a 5s test timeout
- **Fix:** Replaced `waitFor(() => { expect(callStatus).toBe('idle') })` with `vi.runAllTicks()` + direct assertion after `vi.advanceTimersByTime(30_000)`, consistent with how fake-timer tests must be written without waitFor
- **Files modified:** `frontend/src/test/CallContext.test.tsx`
- **Commit:** f4fbc11

**3. [Rule 2 - Missing mock] MockRTCPeerConnection needed lastInstance for ICE buffer test**
- **Found during:** Task 2 — test for ICE buffering needed to access `addIceCandidate` mock on the specific instance created inside `acceptCall()`
- **Fix:** Added `static lastInstance: MockRTCPeerConnection | null = null` to `MockRTCPeerConnection` class and `MockRTCPeerConnection.lastInstance = this` in constructor
- **Files modified:** `frontend/src/test/setup.ts`
- **Commit:** f4fbc11

## Known Stubs

None — all stub bodies from Plan 01 have been replaced with real WebRTC logic. Plans 03 and 04 can now build UI on top of `useCall()`.

## Threat Flags

No new security-relevant surface beyond what was already in the plan's threat model. The try/catch in `handleSignal` (T-4-02/T-4-05) is in place. Signal `from` field is treated as server-authoritative per T-4-01.

## Self-Check: PASSED

- `frontend/src/contexts/CallContext.tsx` exists and contains all required strings
- `frontend/src/test/CallContext.test.tsx` exists with 12 active `it()` tests, 0 `it.skip`
- `frontend/src/test/setup.ts` contains `MockRTCSessionDescription` and `MockRTCIceCandidate`
- Commits `d9cf067` (RED) and `f4fbc11` (GREEN) verified in git log
