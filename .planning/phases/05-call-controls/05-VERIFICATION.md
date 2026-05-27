---
phase: 05-call-controls
verified: 2026-05-27T15:30:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app in two browser tabs on the same LAN, establish a live call, click the Mic (mute) button, and confirm the remote peer stops hearing audio; click again and confirm audio resumes. Verify the mic icon and button background change to reflect the muted state."
    expected: "Outgoing audio is silenced when muted (track.enabled=false); restored when unmuted; button shows MicOff + red background when muted, Mic + slate background when active"
    why_human: "track.enabled silences the RTP sender in the browser's media pipeline. This cannot be verified without a real WebRTC P2P connection carrying live audio."
  - test: "During a live call, click the Camera toggle button and confirm remote peer sees a frozen/black video frame; click again and confirm the camera feed resumes. Verify button icon and background change."
    expected: "Outgoing video track is disabled (videoTrack.enabled=false) when off; re-enabled when toggled back; button shows VideoOff + red background when off, Video + slate background when on"
    why_human: "Requires a real P2P connection with video; cannot be verified without live WebRTC streams."
  - test: "During a live call, observe the timer overlay at top-center. Confirm it reads 00:00 during the Connecting phase, then starts incrementing as MM:SS once the ICE state reaches 'connected'. Let it run to at least 00:05 to verify increment."
    expected: "Timer shows 00:00 before connected, then counts up in real time while connected. The pill is centered at the top of the call screen."
    why_human: "Timer behavior over real time requires a live call session; vi.useFakeTimers is not equivalent to confirming the UI updates in a real browser tab."
  - test: "During call setup, observe the status pill below the timer overlay. Confirm it shows amber 'Connecting...' during ICE negotiation, transitions to green 'Connected' once connection is established, and shows amber pulsing 'Reconnecting...' if the network is briefly interrupted."
    expected: "Status pill shows correct colored dot + label for each ICE state. The pill has role=status and aria-live=polite (verified in tests, but check visual rendering too)."
    why_human: "ICE state transitions require a real WebRTC negotiation on LAN; cannot be simulated without network."
  - test: "During a live call, click End Call. Confirm both sides return to the user list, the camera/mic indicator light turns off, and neither side is still connected."
    expected: "teardown() stops all tracks, closes peer connection, navigates both users to /users. isMuted/isCameraOff/iceState reset to false/false/null."
    why_human: "Bilateral teardown requires two real browser sessions; cannot be verified without live call infrastructure."
  - test: "While a call is in the 'calling' (ringing) state on UserListPage, confirm a Cancel button is visible alongside the Calling... spinner. Click it and confirm the outgoing call is cancelled on both sides."
    expected: "Cancel button with text 'Cancel' and aria-label='Cancel call' appears in a flex row next to the Calling... indicator; clicking it triggers hangUp() which sends call-end signal to callee."
    why_human: "Cancel button is visible in unit tests, but the end-to-end cancellation signal requires two live browser sessions."
---

# Phase 5: Call Controls Verification Report

**Phase Goal:** During a live call, a user has full control over mic, camera, and ending the call; connection quality and call duration are visible at all times
**Verified:** 2026-05-27T15:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking mute button silences outgoing audio; icon reflects muted state | VERIFIED (unit) / human needed (live) | `toggleMute` useCallback in CallContext.tsx L142-151; `audioTrack.enabled = !nextMuted` confirmed; CTRL-01a/b/c unit tests pass; mic button conditional aria-label/bg-red-600 in CallPage.tsx L149-156 |
| 2 | Clicking camera toggle turns off outgoing video track; clicking again restores | VERIFIED (unit) / human needed (live) | `toggleCamera` with audio-only guard in CallContext.tsx L158-166; `videoTracks[0].enabled = !nextOff`; CTRL-02a/b/c unit tests pass; camera button 3-state conditional in CallPage.tsx L167-178 |
| 3 | Clicking End Call terminates connection, stops media, both users return to user list | VERIFIED (unit) / human needed (live) | `teardown()` in CallContext.tsx L176-208 stops tracks, closes pc, resets all state; `hangUp()` sends call-end signal; CTRL-03 unit test verifies reset of isMuted/isCameraOff/iceState |
| 4 | Call duration timer starts from connection established, stays visible | VERIFIED (unit) / human needed (live) | `useCallTimer` hook in `frontend/src/hooks/useCallTimer.ts` — setInterval(1s) when callStatus==='connected', resets when not; MM:SS format verified; timer overlay at `absolute top-4 left-1/2 -translate-x-1/2` in CallPage.tsx L119-123; CTRL-04 tests 05-02-06 and 05-02-07 pass |
| 5 | Connection status (Connecting/Connected/Reconnecting/Failed) displayed visually | VERIFIED (unit) / human needed (live) | `ICE_STATUS` map in CallPage.tsx L31-39; `setIceState(state)` as first statement in `oniceconnectionstatechange` handler CallContext.tsx L234; status pill with `role="status"` `aria-live="polite"` at L124-131; CTRL-05 tests 05-02-08 through 05-02-11 pass |
| 6 | Local video shown as mirrored overlay; remote video fills dominant view with name overlay | VERIFIED (unit + code) | Local PiP `scale-x-[-1]` in CallPage.tsx L140; peer name overlay `absolute top-4 left-4` L112-116; remote video `w-full h-full object-cover` L95-101; CTRL-06 and CTRL-07 existing tests pass |

**Score:** 6/6 truths verified (automated checks all pass; 6 human verification items required for live-call confirmation)

### Deferred Items

None — all phase 5 success criteria are addressed within this phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/contexts/CallContext.tsx` | Extended CallContextValue with 5 new fields + toggleMute + toggleCamera | VERIFIED | Interface at L26-41: `isMuted: boolean`, `isCameraOff: boolean`, `iceState: RTCIceConnectionState \| null`, `toggleMute: () => void`, `toggleCamera: () => void`. All 5 fields in Provider value object L490-507. |
| `frontend/src/test/setup.ts` | mockAudioTrack and mockVideoTrack with enabled property exported | VERIFIED | L73-79: `export const mockAudioTrack = { stop: vi.fn(), enabled: true }`, `export const mockVideoTrack = { stop: vi.fn(), enabled: true }`. `mockMediaStream` exposes `getTracks`, `getAudioTracks`, `getVideoTracks`. |
| `frontend/src/test/CallContext.test.tsx` | Unit tests for CTRL-01, CTRL-02, CTRL-03, CTRL-05 | VERIFIED | 9 new tests (CTRL-01a/b/c, CTRL-02a/b/c, CTRL-03, CTRL-05, CTRL-05b) verified at L516-769. All pass. |
| `frontend/src/hooks/useCallTimer.ts` | useCallTimer(callStatus) hook returning MM:SS string | VERIFIED | File exists, named export `useCallTimer`, setInterval/clearInterval cleanup (StrictMode safe), MM:SS format. |
| `frontend/src/pages/CallPage.tsx` | Extended 3-button control bar + timer overlay + status overlay + unmount cleanup | VERIFIED | Mic button L149-156, End Call L159-165, Camera button L167-178; timer overlay L119-123; status pill L124-131; unmount cleanup useEffect L83-89. |
| `frontend/src/pages/UserListPage.tsx` | Cancel button visible during callStatus=calling | VERIFIED | `onCancel?: () => void` prop at L43; Cancel Button at L71-79 inside `isCallingThisUser` branch; `onCancel={hangUp}` passed at L198. |
| `frontend/src/test/CallPage.test.tsx` | Component tests for CTRL-01 through CTRL-05 | VERIFIED | 11 new tests (05-02-01 through 05-02-11) at L144-233. All pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CallContextValue interface` | `CallProvider return value` | 5 new fields in Provider value object | WIRED | `isMuted, isCameraOff, iceState, toggleMute, toggleCamera` present in both interface (L36-40) and Provider value (L500-504). |
| `toggleMute useCallback` | `localStreamRef.current.getAudioTracks` | functional updater `setIsMuted(prev => !prev)` | WIRED | CallContext.tsx L143-150: `const audioTrack = localStreamRef.current?.getAudioTracks()[0]; if (audioTrack) audioTrack.enabled = !nextMuted` |
| `oniceconnectionstatechange handler` | `setIceState` | first statement before existing if/else | WIRED | CallContext.tsx L232-234: `const state = pc.iceConnectionState; setIceState(state as RTCIceConnectionState)` — confirmed before `if (state === 'disconnected')` at L235. |
| `teardown useCallback` | `setIsMuted(false), setIsCameraOff(false), setIceState(null)` | step 5 React state resets | WIRED | CallContext.tsx L205-207: all three reset calls present after `setCallStatus('idle')` at L204. |
| `CallPage useCall() destructure` | `isMuted, isCameraOff, iceState, toggleMute, toggleCamera` | `useCall()` from CallContext | WIRED | CallPage.tsx L45-56: all 5 new fields destructured from `useCall()`. |
| `useCallTimer hook` | `CallPage timerDisplay` | `const timerDisplay = useCallTimer(callStatus)` | WIRED | CallPage.tsx L12 (import) + L62 (call) + L122 (`{timerDisplay}` rendered). |
| `ICE_STATUS map` | `status pill JSX` | `const statusInfo = iceState ? (ICE_STATUS[iceState] ?? ICE_STATUS.new) : ICE_STATUS.new` | WIRED | CallPage.tsx L64 (derivation) + L126-131 (rendered: `statusInfo.pulse`, `statusInfo.colorClass`, `statusInfo.label`). |
| `CallPage unmount useEffect` | `hangUp()` | cleanup function: `if (callStatus !== 'idle') hangUp()` | WIRED | CallPage.tsx L84-89: `return () => { if (callStatus !== 'idle') hangUp() }` with empty dep array. |
| `UserListPage hangUp` | `UserRow onCancel prop` | `onCancel={hangUp}` passed in UserListPage render | WIRED | UserListPage.tsx L103 (`hangUp` destructured from `useCall()`); L198 (`onCancel={hangUp}` on UserRow). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CallPage.tsx` (mic button) | `isMuted` | `useCall()` → CallContext `useState(false)` → mutated by `toggleMute` → `audioTrack.enabled` | Yes — `toggleMute` directly mutates `MediaStreamTrack.enabled` on localStreamRef | FLOWING |
| `CallPage.tsx` (camera button) | `isCameraOff` / `hasVideoTracks` | `useCall()` → CallContext `useState(false)` → `toggleCamera`; `localStream?.getVideoTracks().length` | Yes — directly reads live MediaStream ref | FLOWING |
| `CallPage.tsx` (timer) | `timerDisplay` | `useCallTimer(callStatus)` → `setInterval` increments `seconds` state | Yes — real setInterval counter | FLOWING |
| `CallPage.tsx` (status pill) | `statusInfo` | `iceState` from `useCall()` → CallContext `setIceState` in `oniceconnectionstatechange` → `ICE_STATUS[iceState]` | Yes — real browser ICE state events populate iceState | FLOWING |
| `UserListPage.tsx` (Cancel button) | `onCancel` | `hangUp` from `useCall()` → CallContext `teardown()` + STOMP signal | Yes — calls real hangUp chain | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| useCallTimer hook compiles and exports | `node -e "const m = require('./frontend/src/hooks/useCallTimer.ts')"` | N/A — TypeScript source; verified via test run importing it | SKIP (TypeScript; no transpiled output) |
| All 65 tests pass | `npm test -- --run --reporter=verbose` | `Tests 65 passed (65)` — confirmed via test run | PASS |

### Probe Execution

No probes declared or conventionally expected for a frontend UI phase. Step 7c: SKIPPED (no probe scripts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CTRL-01 | 05-01, 05-02 | User can mute/unmute microphone during a call | SATISFIED | `toggleMute` in CallContext + mic button in CallPage; CTRL-01a/b/c tests pass; 05-02-01/02/03 component tests pass |
| CTRL-02 | 05-01, 05-02 | User can turn camera on/off during a call | SATISFIED | `toggleCamera` with audio-only guard; camera button with 3 states; CTRL-02a/b/c + 05-02-04/05 tests pass |
| CTRL-03 | 05-01, 05-02 | User can end call; all tracks and peer connections cleaned up | SATISFIED | `teardown()` stops tracks, closes pc, resets state; CTRL-03 test verifies reset of isMuted/isCameraOff/iceState; CALL-08 hangUp sends call-end signal |
| CTRL-04 | 05-02 | Call duration timer displayed once connection established | SATISFIED | `useCallTimer` hook + timer overlay in CallPage; 05-02-06/07 tests verify 00:00 before connected and increment after |
| CTRL-05 | 05-01, 05-02 | Connection status shown (Connecting/Connected/Reconnecting/Failed) | SATISFIED | `iceState` in CallContext via `setIceState` in handler; `ICE_STATUS` map + status pill with `role=status` `aria-live=polite`; CTRL-05/05b + 05-02-08/09/10/11 tests pass |
| CTRL-06 | 05-02 (confirmed passing) | Local video self-view as mirrored overlay | SATISFIED | `scale-x-[-1]` on local video PiP in CallPage; pre-existing UI-03 local video test passes |
| CTRL-07 | 05-02 (confirmed passing) | Remote video fills dominant view with remote user's name overlay | SATISFIED | Remote video `w-full h-full object-cover`; peerUsername overlay `absolute top-4 left-4`; pre-existing UI-03 tests pass |

All 7 requirement IDs from the phase plan (CTRL-01 through CTRL-07) are satisfied by codebase evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CallPage.tsx` | 18 | `placeholderText: 'Waiting for remote video...'` — name contains "placeholder" | Info | Not a debt marker; this is a UI copy string for the "no remote stream" state, rendered when `!remoteStream`. Correct behavior. |

No blockers or warnings found. No TBD/FIXME/XXX markers. No empty implementations.

### Human Verification Required

#### 1. Mic mute toggle — live audio silencing

**Test:** Open the app in two browser tabs on the same LAN. Establish a live call. On one side, click the Mic button. Confirm the remote peer stops hearing audio. Click again and confirm audio resumes.
**Expected:** Outgoing audio is silenced when muted (track.enabled=false in the browser's RTP sender layer); restored when unmuted. Mic button shows MicOff icon + red background when muted; Mic icon + slate background when active.
**Why human:** `track.enabled=false` silences the RTP sender at the browser level. Unit tests confirm the JS state and `.enabled` property are set correctly, but actual silence can only be verified with a live P2P audio connection.

#### 2. Camera toggle — live video freeze/restore

**Test:** During a live call, click the Camera toggle button. Confirm the remote peer sees a frozen or black video frame. Click again and confirm the camera feed resumes.
**Expected:** Outgoing video track is disabled when off; re-enabled when toggled back. Button shows VideoOff + red background when off; Video + slate background when on. When the local device has no camera (audio-only), the button is disabled with "Camera unavailable" label and opacity-50.
**Why human:** Requires a real P2P connection with live video streams; cannot be tested without running two browser sessions with active cameras.

#### 3. Call timer — real-time increment during live call

**Test:** During a live call, observe the timer overlay at the top-center of the call screen. Confirm it shows 00:00 during the connecting phase, then begins counting up as MM:SS once the WebRTC ICE connection reaches 'connected'. Let it run to at least 00:05.
**Expected:** Timer starts at 00:00, increments by 1 second per second when connected, and resets to 00:00 if the call disconnects and reconnects.
**Why human:** `vi.useFakeTimers()` in unit tests confirms the setInterval logic, but visual real-time increment across the full browser render loop and real ICE connection requires a live session.

#### 4. ICE status pill — Connecting → Connected → Reconnecting transitions

**Test:** During call setup, watch the status pill below the timer. Confirm it shows amber "Connecting..." during ICE negotiation, transitions to green "Connected" once the connection is established. Optionally: briefly disable the network adapter and confirm it shows amber pulsing "Reconnecting...".
**Expected:** Status pill color and label match the `ICE_STATUS` map: amber for new/checking, emerald for connected/completed, amber + animate-pulse for disconnected, red for failed/closed.
**Why human:** ICE state transitions occur asynchronously during real WebRTC negotiation on LAN. `oniceconnectionstatechange` fires with browser-controlled state values that cannot be triggered without a real network path.

#### 5. End call — bilateral teardown

**Test:** During a live call, click End Call on one side. Confirm both sides navigate to the user list. Confirm the camera/mic indicator lights in the browser's tab icon or OS turn off. Confirm that a subsequent call attempt works (no stuck state from previous call).
**Expected:** `teardown()` stops all tracks, closes the RTCPeerConnection, and both users are returned to the /users route. isMuted/isCameraOff/iceState are reset (second call does not inherit previous state).
**Why human:** Bilateral teardown requires two real browser sessions. The `call-end` STOMP signal must traverse the server and trigger teardown on the remote side.

#### 6. Cancel button — outgoing call cancellation

**Test:** Initiate a call from UserListPage. While in the "Calling..." state, confirm a Cancel button appears next to the Calling... spinner. Click Cancel. Confirm the outgoing call is cancelled on both the caller and callee side.
**Expected:** Cancel Button with text "Cancel" and `aria-label="Cancel call"` appears in a flex row alongside the Calling... indicator. Clicking it calls `hangUp()`, which sends a `call-end` signal to the callee and runs teardown on the caller.
**Why human:** The cancel button itself is verified by unit tests in UserListPage.test.tsx (CALL-01 suite). The end-to-end cancellation (signal reaches callee, modal dismisses) requires two live browser sessions.

### Gaps Summary

No gaps identified. All automated checks passed:

- All 7 required artifacts exist, are substantive (not stubs), and are fully wired to live data sources.
- All 7 requirement IDs (CTRL-01 through CTRL-07) are satisfied.
- All key links between CallContext state and CallPage UI are verified at source level.
- 65 tests pass (45 Phase 4 baseline + 9 new CallContext unit tests + 11 new CallPage component tests).
- All 4 committed hashes exist in the repository history: b93d322, 694230d, 04dbf4a, c1619cc.

The 6 human verification items are required to confirm that the live WebRTC call behavior (audio silencing, video toggling, ICE state transitions, bilateral teardown) works end-to-end in a real browser environment — this cannot be verified by static analysis or unit tests alone.

---

_Verified: 2026-05-27T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
