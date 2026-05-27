---
phase: 05-call-controls
reviewed: 2026-05-27T15:18:10Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - frontend/src/contexts/CallContext.tsx
  - frontend/src/hooks/useCallTimer.ts
  - frontend/src/pages/CallPage.tsx
  - frontend/src/pages/UserListPage.tsx
  - frontend/src/test/CallContext.test.tsx
  - frontend/src/test/CallPage.test.tsx
  - frontend/src/test/setup.ts
findings:
  critical: 3
  warning: 6
  info: 3
  total: 12
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-27T15:18:10Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 5 adds call controls (mic mute, camera toggle, call timer, ICE status overlay) to an existing WebRTC call implementation. The architecture is sound and the code shows good attention to stale-closure pitfalls via refs. However, three critical bugs were found: a null-dereference crash in the signal handler race condition, stale-closure double-invocation on browser back-navigation, and incomplete state reset in `rejectCall`. Six warnings cover missing memoization of public API functions, a non-null assertion on a ref that can be null, and test reliability issues.

---

## Critical Issues

### CR-01: Null-dereference crash when callee accepts before caller finishes getUserMedia

**File:** `frontend/src/contexts/CallContext.tsx:277-290`

**Issue:** `startCall` sends the `call-request` signal to the callee at line 413 *before* acquiring local media and creating the `RTCPeerConnection`. If the callee accepts quickly (or the camera permission prompt is slow), the `call-accept` signal arrives and `handleSignal` executes the `call-accept` branch at line 282, which does `const pc = pcRef.current!` — but `pcRef.current` is still `null` because `createPeerConnection()` has not been called yet (line 434). Calling `.createOffer()` on `null` throws an unhandled TypeError that falls into the catch block, calling `teardown()` and showing "Connection lost" to both sides despite no real connection failure.

Reproduction: slow getUserMedia (camera permission prompt takes >1s), callee clicks Accept immediately.

**Fix:** Create the peer connection and acquire media *before* sending `call-request`, or guard `pcRef.current` in the `call-accept` handler:

```typescript
// Option A: guard in the handler (minimal change)
case 'call-accept': {
  if (callTimeoutRef.current !== null) {
    clearTimeout(callTimeoutRef.current)
    callTimeoutRef.current = null
  }
  const pc = pcRef.current
  if (!pc) {
    // getUserMedia still in progress — cannot create offer yet
    console.warn('[CallContext] call-accept received but PeerConnection not ready')
    return
  }
  const offer = await pc.createOffer()
  // ...rest unchanged
}

// Option B (preferred): acquire media synchronously before publishing call-request
// Move getLocalStream() + createPeerConnection() to BEFORE publishSignal({ type: 'call-request' })
// This also improves UX: the callee sees the modal only after the caller is truly ready.
```

---

### CR-02: Stale closure in unmount effect causes duplicate `hangUp` call on normal call end

**File:** `frontend/src/pages/CallPage.tsx:84-89`

**Issue:** The unmount cleanup effect is registered with an empty dependency array (`[]`) but references `callStatus` and `hangUp` from closure. `hangUp` is not memoized in `CallProvider` (no `useCallback` wrapping), so the stale reference captured at mount time is the one used at unmount. More critically, `callStatus` in the cleanup is the value from when the effect was registered (component mount), which is typically `'connected'`. When a call ends normally — remote peer hangs up → `teardown()` is called → `callStatus` becomes `'idle'` → `useEffect` at line 77 calls `navigate('/users')` → `CallPage` unmounts — the cleanup fires with the stale `callStatus !== 'idle'` check evaluating to `true`, so `hangUp()` is called a second time, publishing a redundant `call-end` signal to a peer who has already hung up.

```typescript
// Current (broken):
useEffect(() => {
  return () => {
    if (callStatus !== 'idle') hangUp()  // callStatus is always the mount-time value
  }
}, [])
```

**Fix:** Use a ref to track current `callStatus` so the cleanup reads the live value:

```typescript
const callStatusRef = useRef(callStatus)
useEffect(() => { callStatusRef.current = callStatus }, [callStatus])

useEffect(() => {
  return () => {
    if (callStatusRef.current !== 'idle') hangUp()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

Alternatively, move the "back button" teardown logic into `CallContext` using a navigation listener, which is the cleaner approach.

---

### CR-03: `rejectCall` does not reset `iceState`, leaving stale UI state

**File:** `frontend/src/contexts/CallContext.tsx:474-479`

**Issue:** `rejectCall` manually resets `peerUsername` and `callStatus` but does NOT call `teardown()` and does not reset `iceState`. If an ICE state has been set on the `RTCPeerConnection` before the call is rejected (unlikely for ringing state but not impossible if a prior call left stale state), `iceState` will carry a non-null value into the next call. The status pill in `CallPage` would then show an incorrect ICE state at the start of a new call. Additionally, `isMuted` and `isCameraOff` are not reset — if a user toggles mute on a ringing call before rejecting, those states carry over into the next call.

More practically: in `acceptCall` at line 449, if `getLocalStream()` returns `null`, `rejectCall()` is called. By this point `createPeerConnection()` has NOT been called, so there is no peer connection to close — but `localStream` state may already have been partially set before the `null` return (it has not in this code path, so this specific path is safe). The structural issue remains.

**Fix:** Replace the manual state reset in `rejectCall` with a call to `teardown()` plus the decline signal:

```typescript
const rejectCall = (): void => {
  const target = peerUsernameRef.current
  if (target) {
    publishSignal({ type: 'call-decline', to: target, payload: '' })
  }
  teardown()  // resets all state including iceState, isMuted, isCameraOff
}
```

---

## Warnings

### WR-01: Public API functions in `CallProvider` are not memoized with `useCallback`

**File:** `frontend/src/contexts/CallContext.tsx:403-488`

**Issue:** `startCall` (line 403), `acceptCall` (line 444), `rejectCall` (line 474), and `hangUp` (line 485) are plain function declarations inside the component body. They are recreated on every render and passed into the context value object. Every consumer of `useCall()` — including `CallPage` and `UserListPage` — receives new function references on each render of `CallProvider`, triggering unnecessary re-renders in those consumers. This is also what enables the CR-02 stale closure: the `hangUp` captured in the empty-dep-array effect is the one created at mount, and subsequent renders create new `hangUp` instances that the effect never sees.

**Fix:**

```typescript
const startCall = useCallback(async (targetUsername: string): Promise<void> => {
  // ... existing body
}, [username, publishSignal, getLocalStream, createPeerConnection, addToast, teardown])

const acceptCall = useCallback(async (): Promise<void> => {
  // ... existing body
}, [getLocalStream, createPeerConnection, publishSignal, navigate, teardown, rejectCall])

const rejectCall = useCallback((): void => {
  // ... existing body
}, [publishSignal, teardown])

const hangUp = useCallback((): void => {
  // ... existing body
}, [publishSignal, teardown])
```

---

### WR-02: Non-null assertion on `peerUsernameRef.current` in `hangUp` when called after teardown

**File:** `frontend/src/contexts/CallContext.tsx:486`

**Issue:** `hangUp` uses `peerUsernameRef.current!` to specify the signal recipient. `teardown()` sets `peerUsernameRef.current = null` at line 198. If `hangUp` is somehow called after teardown has already run (e.g., double-click on the End Call button, or the CR-02 scenario where cleanup fires after normal teardown), the signal is sent with `to: null`, which gets serialized to `{"to":null,...}`. The backend will attempt to route to user `"null"` and silently fail or log an error.

**Fix:**

```typescript
const hangUp = (): void => {
  const target = peerUsernameRef.current
  if (target) {
    publishSignal({ type: 'call-end', to: target, payload: '' })
  }
  teardown()
}
```

Apply the same defensive pattern to `rejectCall` (line 475).

---

### WR-03: `ontrack` event does not guard against empty `event.streams`

**File:** `frontend/src/contexts/CallContext.tsx:227-229`

**Issue:** The `ontrack` handler sets `remoteStream` to `event.streams[0]`. If tracks are added without an associated stream (valid WebRTC usage, e.g., when `addTrack(track)` is called without a stream argument), `event.streams` will be an empty array and `event.streams[0]` is `undefined`. The `remoteStream` state type is `MediaStream | null`, not `MediaStream | null | undefined`, so an `undefined` value creates a type-unsound state. The `CallPage` placeholder check `!remoteStream` at line 104 would still evaluate to `true` for `undefined`, but the `<video>` element's `srcObject = undefined` (via `useEffect` at line 73) is not the same as `srcObject = null` in some browser implementations.

**Fix:**

```typescript
pc.ontrack = (event) => {
  if (event.streams && event.streams[0]) {
    setRemoteStream(event.streams[0])
  }
}
```

---

### WR-04: `mockAudioTrack.enabled` and `mockVideoTrack.enabled` are not reset between tests

**File:** `frontend/src/test/setup.ts:73-74` / `frontend/src/test/CallContext.test.tsx`

**Issue:** `mockAudioTrack` and `mockVideoTrack` are module-level singleton objects shared across all tests. The `enabled` property is mutated by toggle tests (`CTRL-01b`, `CTRL-01c`, `CTRL-02b`). While several tests manually reset `enabled = true` before their assertions (lines 545, 566, 616), this is error-prone — any new test that checks `enabled` but runs after a test that mutates it without resetting will see stale state. The `beforeEach` in `CallContext.test.tsx` does not reset `mockAudioTrack.enabled` or `mockVideoTrack.enabled`.

**Fix:** Add `enabled` reset to `beforeEach` in `CallContext.test.tsx`:

```typescript
beforeEach(() => {
  mockPublish = vi.fn()
  // ... existing resets ...
  mockAudioTrack.enabled = true
  mockVideoTrack.enabled = true
  mockAudioTrack.stop.mockClear()
  mockVideoTrack.stop.mockClear()
})
```

Alternatively, move these objects to per-test factory functions in `setup.ts`.

---

### WR-05: `MockRTCPeerConnection.lastInstance` is a static field not reset between tests

**File:** `frontend/src/test/setup.ts:13`

**Issue:** `MockRTCPeerConnection.lastInstance` is a static field that persists across all tests. If a test creates a peer connection and then another test uses `MockPC.lastInstance` without first creating a new connection (e.g., a test that calls `useCall()` but doesn't trigger `startCall`), `lastInstance` will point to the peer connection from the previous test. The ICE candidate buffering test (line 441) and CTRL-03/05 tests guard with `if (MockPC.lastInstance)`, which partially mitigates this, but a stale instance could cause false-positive assertions.

**Fix:** Clear `lastInstance` in `setup.ts`'s `afterEach` or in `beforeEach` of each test file that uses it:

```typescript
// In setup.ts afterEach, or in CallContext.test.tsx beforeEach:
;(globalThis.RTCPeerConnection as typeof MockRTCPeerConnection).lastInstance = null
```

---

### WR-06: `UserRow` will throw if `user` is an empty string

**File:** `frontend/src/pages/UserListPage.tsx:54`

**Issue:** `user[0].toUpperCase()` accesses the first character of the username for the avatar fallback. If `user` is an empty string (malformed backend data), `user[0]` is `undefined` and `.toUpperCase()` throws `TypeError: Cannot read properties of undefined`. The online user list is populated from backend STOMP presence events, so this depends on backend validation, but the frontend has no guard.

**Fix:**

```typescript
<AvatarFallback className="bg-slate-700 text-slate-200 text-sm font-semibold">
  {user.length > 0 ? user[0].toUpperCase() : '?'}
</AvatarFallback>
```

---

## Info

### IN-01: `callStatus` shown in the timer overlay even during `'calling'`/`'ringing'` phases

**File:** `frontend/src/hooks/useCallTimer.ts:15-18` / `frontend/src/pages/CallPage.tsx:119-123`

**Issue:** `CallPage` renders the timer overlay unconditionally. During `'calling'` or `'ringing'` states (before the call is connected), `useCallTimer` resets seconds to 0 and returns `'00:00'`. The timer pill is visible on the page even before the call is connected, which may confuse users into thinking the call timer has started. This is a UX issue rather than a bug, but the `CallPage` itself is only navigated to after a call reaches `'connected'` state (per `acceptCall` at line 465 and `call-accept` handler at line 290), so in practice `'calling'`/`'ringing'` states do not appear on `CallPage` normally.

**Fix:** No code change needed. Document the invariant: `CallPage` is only rendered during `'connected'` state and the timer display at `'00:00'` during any transient states is acceptable.

---

### IN-02: `startCall` sends `call-request` before the call timeout is set on an awaited async boundary

**File:** `frontend/src/contexts/CallContext.tsx:413-420`

**Issue:** `call-request` is published at line 413, and the 30-second timeout is set at line 416 — these are sequential synchronous statements. However, `getLocalStream()` is `await`ed at line 423. There is a window between the `call-request` signal being sent and the timeout being armed where, in theory, `call-accept` could arrive and the timeout timer would already be set. This ordering is actually correct. Noted for documentation clarity only.

---

### IN-03: `eslint-disable-next-line react-hooks/exhaustive-deps` comment on stale-closure effect in `CallPage`

**File:** `frontend/src/pages/CallPage.tsx:88`

**Issue:** The ESLint disable comment is suppressing a legitimate warning. The exhaustive-deps rule is correctly flagging that `callStatus` and `hangUp` are used inside the effect but not declared as dependencies. This suppression is the root of CR-02. The comment itself is an indicator that the implementer knew the effect had a dependency issue but chose to suppress rather than fix it.

**Fix:** Remove the disable comment after applying the CR-02 fix. If a ref-based approach is used, the hook deps will be clean and no suppression is needed.

---

_Reviewed: 2026-05-27T15:18:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
