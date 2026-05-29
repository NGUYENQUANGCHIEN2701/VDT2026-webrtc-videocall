---
phase: 06-screen-sharing
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - frontend/src/contexts/CallContext.tsx
  - frontend/src/pages/CallPage.tsx
  - frontend/src/test/CallContext.test.tsx
  - frontend/src/test/CallPage.test.tsx
  - frontend/src/test/setup.ts
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-05-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 6 adds screen-sharing (start/stop), a Share Screen button in `CallPage`, and associated teardown integration. The core WebRTC replaceTrack approach is architecturally sound and the ref-based stale-closure mitigations follow established patterns. However, two critical defects exist: (1) `replaceTrack` inside `startScreenShare` is unguarded — a rejection leaves a leaked, un-stopped screen track; (2) the WebSocket mock is missing the `isConnected` field that `CallContext` actually reads, meaning the STOMP subscription may never register in several tests, making those tests unreliable. Several warnings address edge cases around `stopScreenShare` when the camera was turned off prior to sharing, unhandled promise rejections when `onended` fires after teardown, and test infrastructure mismatches.

---

## Critical Issues

### CR-01: Unguarded `replaceTrack` in `startScreenShare` leaks screen track on rejection

**File:** `frontend/src/contexts/CallContext.tsx:239`

**Issue:** `await videoSender.replaceTrack(screenTrack)` is called with no try/catch. If `replaceTrack` rejects (e.g., the peer connection was closed between the `pcRef.current` null-guard at line 227 and this call — a real TOCTOU window during async `getDisplayMedia`), the function exits via the unhandled rejection. At that point `screenTrack` has been obtained from `getDisplayMedia` but `.stop()` is never called, and `screenTrackRef.current` remains `null` (line 240 was never reached). The browser camera-indicator light stays on for the screen capture source with no way for the user or the app to release it.

**Fix:**
```typescript
// Replace lines 239-245:
try {
  await videoSender.replaceTrack(screenTrack)
} catch {
  screenTrack.stop()
  addToast('Screen sharing unavailable', 'bg-slate-800 border border-amber-600/40 text-amber-400')
  return
}
screenTrackRef.current = screenTrack
setIsScreenSharing(true)

screenTrack.onended = () => stopScreenShareRef.current()
```

---

### CR-02: `isConnected` missing from WebSocket mock — subscription silently never fires

**File:** `frontend/src/test/CallContext.test.tsx:29-39`

**Issue:** `CallContext` reads `isConnected` from `useWebSocket()` to gate STOMP subscription setup (line 459 of `CallContext.tsx`: `if (!isConnected) return`). The mock at lines 29-39 of the test file returns a plain object with `client`, `onlineUsers`, `isLoading`, `connect`, `disconnect`, `subscribe`, and `publish` — but no `isConnected` field. The destructured value is `undefined`, which is falsy, so the `useEffect` returns early and `subscribe` is never called.

Tests that `waitFor(() => expect(mockSubscribe).toHaveBeenCalled...)` pass only because `mockSubscribe` is reassigned in `beforeEach` (line 85) using `vi.fn().mockImplementation(...)` — the implementation captures the callback. If `subscribe` is never called, `waitFor` would eventually time out. That these tests currently pass at all suggests either the effect fires on a different path, or there is implicit timing luck. This needs the mock to explicitly set `isConnected: true` to be correct and reliable.

**Fix:**
```typescript
vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    client: mockClient,
    isConnected: true,   // <-- add this field
    onlineUsers: [],
    isLoading: false,
    connect: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: mockSubscribe,
    publish: mockPublish,
  }),
}))
```

Because `mockPublish` and `mockSubscribe` are module-level `let` bindings that are reassigned in `beforeEach`, the factory closure will capture them by reference correctly since the mock factory is evaluated lazily per test via Vitest's module-mocking mechanism. Verify this works with the existing reassignment pattern or switch to getter syntax if needed:
```typescript
get subscribe() { return mockSubscribe },
get publish() { return mockPublish },
```

---

## Warnings

### WR-01: `stopScreenShare` ignores `isCameraOff` state — camera resumes enabled after stop

**File:** `frontend/src/contexts/CallContext.tsx:181-192`

**Issue:** When `stopScreenShare` calls `videoSender.replaceTrack(cameraTrack)`, it unconditionally replaces with the camera track regardless of whether the camera was toggled off (`isCameraOff === true`) before screen sharing started. The camera track's `.enabled` property is not reset to match the current `isCameraOff` state. Result: if a user turns off camera, then shares screen, then stops sharing, the camera resumes active (visible to the remote peer) even though `isCameraOff` is still `true` in state. The local UI correctly shows the "Camera off" icon but the remote peer sees live camera video.

**Fix:**
```typescript
const stopScreenShare = useCallback((): void => {
  const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
  const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')

  if (videoSender && cameraTrack) {
    // Preserve camera-off state: if user had camera off before sharing, restore that state
    cameraTrack.enabled = !isCameraOffRef.current  // need a ref mirror of isCameraOff
    void videoSender.replaceTrack(cameraTrack)
  }

  screenTrackRef.current?.stop()
  screenTrackRef.current = null
  setIsScreenSharing(false)
}, [])
```

Add a `isCameraOffRef` that mirrors `isCameraOff` state, following the same pattern used for `peerUsernameRef` and `stopScreenShareRef`.

---

### WR-02: `stopScreenShare` via `onended` fires after teardown — `replaceTrack` on closed connection is an unhandled rejection

**File:** `frontend/src/contexts/CallContext.tsx:244-245`

**Issue:** When `teardown()` is called (e.g., hang-up, ICE failure), it stops the screen track synchronously at line 273 (`screenTrackRef.current?.stop()`). Calling `.stop()` on a track fires the `onended` event. The `onended` handler is `() => stopScreenShareRef.current()`, which at that moment contains the current `stopScreenShare` function. `stopScreenShare` then calls `pcRef.current?.getSenders()` — but `teardown` set `pcRef.current = null` at line 277 **after** stopping tracks. Due to synchronous execution order (line 273 `stop()` → fires `onended` synchronously or microtask → `stopScreenShare` reads `pcRef.current`), the timing depends on whether `onended` fires synchronously or asynchronously. In browsers, `onended` is typically queued as a task, not microtask — so `pcRef.current` will likely already be null when `onended` runs post-teardown. In that case `videoSender` will be `undefined` and `replaceTrack` is never called. However `screenTrackRef.current?.stop()` at line 189 inside `stopScreenShare` will be called on an already-stopped track (idempotent, safe). The `void videoSender.replaceTrack(cameraTrack)` at line 186 is guarded, so no crash. The real risk: if `onended` fires synchronously (some browsers/environments), the order could leave `screenTrack.stop()` called twice and a `replaceTrack` attempted on a closing peer connection, producing an unhandled rejection via the `void` cast.

**Fix:** Clear `screenTrack.onended` before calling `.stop()` inside `teardown`:
```typescript
// In teardown, before line 273:
if (screenTrackRef.current) {
  screenTrackRef.current.onended = null  // prevent onended → stopScreenShare loop
  screenTrackRef.current.stop()
  screenTrackRef.current = null
}
```

---

### WR-03: `stopScreenShare` silently no-ops when `cameraTrack` is falsy — video sender left with dead track

**File:** `frontend/src/contexts/CallContext.tsx:185-187`

**Issue:** The guard `if (videoSender && cameraTrack)` means that if `localStreamRef.current` is null or has no video tracks (audio-only call where screen sharing was somehow initiated — guarded by the `videoSender` check in `startScreenShare`, but `localStreamRef` could theoretically be cleared by a race), the `replaceTrack` call is skipped entirely. `isScreenSharing` is still set to `false` (line 191) and the screen track is stopped (line 189), but the video sender is left with the stopped screen track as its current track. The remote peer loses all video with no recovery path.

This is a defense-in-depth issue: the `startScreenShare` guard at line 232-236 prevents reaching this state in normal flow, but `cameraTrack` could become unavailable if the camera device is disconnected mid-call while screen sharing is active.

**Fix:** Add a fallback `replaceTrack(null)` when `cameraTrack` is absent but a video sender exists:
```typescript
if (videoSender) {
  void videoSender.replaceTrack(cameraTrack ?? null)
}
```

---

### WR-04: `mockMediaStream.getTracks()` returns only the audio track — test behavior diverges from production

**File:** `frontend/src/test/setup.ts:80-84`

**Issue:** The shared `mockMediaStream` fixture defines `getTracks` returning `[mockAudioTrack]` (line 81), not `[mockAudioTrack, mockVideoTrack]`. In production, `getUserMedia({video:true, audio:true})` returns a stream with both tracks, and `startCall` calls `stream.getTracks().forEach((t) => pc.addTrack(t, stream))` — so two tracks are added to the peer connection. In tests, only `mockAudioTrack` is passed to `addTrack`. The `getSenders()` mock in `MockRTCPeerConnection` always returns a sender with `track: mockVideoTrack` — this sender was never established via `addTrack`. Tests for `stopScreenShare` calling `replaceTrack(mockVideoTrack)` pass because the mock sender's track kind matches, but the test does not verify that `pc.addTrack` was called with the video track at all. If `startScreenShare` were changed to look for senders by matching `localStreamRef` video tracks instead of by kind, the tests would continue to pass while the production code broke.

**Fix:** Update `mockMediaStream.getTracks` to include both tracks:
```typescript
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockAudioTrack, mockVideoTrack]),
  getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
}
```

---

### WR-05: `getLocalStream` first `catch` block swallows audio-permission errors with misleading toast

**File:** `frontend/src/contexts/CallContext.tsx:477-489`

**Issue:** The first `try` block requests `{video:true, audio:true}`. If the user has denied microphone permission but camera is available, `getUserMedia` throws a `NotAllowedError`. This error is caught by the first `catch` (line 481), and the code shows a "No camera found — audio only" toast, then retries with `{video:false, audio:true}`. The audio-only retry will then throw `NotAllowedError` again, and the second `catch` shows "Cannot access microphone". The user first sees a misleading "No camera found" toast followed immediately by "Cannot access microphone". Additionally, if camera is available but overheated/busy (`NotReadableError`), this too hits the "No camera found" branch.

**Fix:** Inspect the error name before deciding the fallback path:
```typescript
const getLocalStream = useCallback(async (): Promise<MediaStream | null> => {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  } catch (err) {
    const errName = (err as { name?: string }).name
    // Only fall back to audio-only for device-not-found errors
    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      try {
        addToast('No camera found — audio only', '...')
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      } catch {
        addToast('Cannot access microphone', '...')
        return null
      }
    }
    // Permission denied or device error — don't attempt audio-only with a wrong message
    addToast('Cannot access microphone or camera', '...')
    return null
  }
}, [addToast])
```

---

### WR-06: Camera button `aria-pressed` is semantically incorrect when screen sharing disables the button

**File:** `frontend/src/pages/CallPage.tsx:191`

**Issue:** When `isScreenSharing` is true, the camera button is `disabled` and `aria-disabled={true}`. However `aria-pressed={isCameraOff}` is still applied. If `isCameraOff` is `false` (user never turned off camera before sharing), the disabled button has `aria-pressed="false"` — an assistive technology user reading a pressed-state toggle that is disabled with `aria-pressed="false"` receives ambiguous information. The correct pattern for a button that is temporarily unavailable (not in a pressed/unpressed state context) is to omit `aria-pressed` or set it to `undefined` when `aria-disabled` is true.

**Fix:**
```tsx
<Button
  aria-pressed={isScreenSharing ? undefined : isCameraOff}
  aria-disabled={!hasVideoTracks || isScreenSharing}
  disabled={!hasVideoTracks || isScreenSharing}
  ...
>
```

---

## Info

### IN-01: `CallContextWithScreenShare` type alias is redundant — bypasses type system for properties already in the interface

**File:** `frontend/src/test/CallContext.test.tsx:775-779`

**Issue:** `isScreenSharing`, `startScreenShare`, and `stopScreenShare` are declared in the exported `CallContextValue` interface (lines 41-43 of `CallContext.tsx`) and therefore already present on `ReturnType<typeof useCall>`. The `CallContextWithScreenShare` type alias and all the `as unknown as CallContextWithScreenShare` casts are unnecessary and suppress TypeScript's ability to catch mismatches between the context interface and test assertions.

**Fix:** Remove the type alias and casts. Access `result.current.isScreenSharing`, `result.current.startScreenShare()`, and `result.current.stopScreenShare()` directly without any cast.

---

### IN-02: `console.warn` for unknown signal types leaks implementation details to browser console in production

**File:** `frontend/src/contexts/CallContext.tsx:433`

**Issue:** `console.warn('[CallContext] Unknown signal type:', msg.type)` and `console.error('[CallContext] Signal handler error:', err)` at line 438 will print to the browser console in production builds. `msg.type` could contain user-controlled input (the signal type is forwarded from backend but originates from the sending client). While this is not an injection risk in a `console.warn` call, it is a minor information disclosure and violates standard production logging hygiene.

**Fix:** Gate behind a dev-mode check or remove. Vite exposes `import.meta.env.DEV` for this purpose:
```typescript
if (import.meta.env.DEV) {
  console.warn('[CallContext] Unknown signal type:', msg.type)
}
```

---

### IN-03: `eslint-disable-next-line react-hooks/exhaustive-deps` on cleanup effect — documents a known pitfall but hides future regressions

**File:** `frontend/src/pages/CallPage.tsx:97`

**Issue:** The unmount cleanup effect at lines 93-98 intentionally omits `hangUp` from its dependency array with an eslint-disable comment. This is the correct pattern when the intent is "run once on unmount." However, if `hangUp` were ever changed to close over mutable state (rather than reading refs), the disable comment would silently hide the bug. The comment on line 91-92 explains the reasoning, which is good, but the disable suppresses any future lint warning if the implementation of `hangUp` changes.

**Fix:** No code change required, but consider using a stable ref pattern consistent with the rest of the codebase instead of a lint suppression:
```typescript
const hangUpRef = useRef(hangUp)
useEffect(() => { hangUpRef.current = hangUp }, [hangUp])
useEffect(() => { return () => hangUpRef.current() }, [])
```
This makes the intent explicit without a lint suppression.

---

_Reviewed: 2026-05-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
