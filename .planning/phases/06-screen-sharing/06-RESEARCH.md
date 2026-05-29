# Phase 6: Screen Sharing — Research

**Researched:** 2026-05-29
**Domain:** Browser Screen Capture API (`getDisplayMedia`), WebRTC `sender.replaceTrack()`, React/TypeScript frontend extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Control bar expands to 4 buttons: `[Mic] [Share] [End Call] [Camera]`. Share sits second from left.
- **D-02:** Share button size: `h-10 w-10 rounded-full` — inherits Mic/Camera pattern.
- **D-03:** Single toggle. Idle: `bg-slate-700 hover:bg-slate-600` + `Monitor` icon. Active: `bg-emerald-600 hover:bg-emerald-700` + `MonitorOff` icon.
- **D-04:** Local PiP keeps `localStream` (camera feed) unchanged during screen share — does NOT switch to screen.
- **D-05:** Camera button disabled (`opacity-50 cursor-not-allowed`) when `isScreenSharing === true`. Re-enables when stop sharing.
- **D-06:** `screenTrack.onended` fires when user hits browser native "Stop sharing" → calls `stopScreenShare()` → `replaceTrack(cameraTrack)` → `isScreenSharing = false`.
- **D-07:** Add `isScreenSharing: boolean`, `startScreenShare: () => Promise<void>`, `stopScreenShare: () => void` to `CallContextValue`.
- **D-08:** `teardown()` must stop screen track if active, reset `isScreenSharing = false`.

### Claude's Discretion

- Screen sender reference: find via `pcRef.current.getSenders().find(s => s.track?.kind === 'video')` — planner chooses local variable vs `screenSenderRef`.
- `getDisplayMedia` constraints: `{ video: true }` (browser default picker).
- Icons: `Monitor` / `MonitorOff` from lucide-react — verify import; fallback `MonitorPlay` / `MonitorX` / `Share2`.

### Deferred Ideas (OUT OF SCOPE)

- Screen sharing in group call (Phase 7)
- Annotation / whiteboard overlay (COLLAB-03, v2)
- Screen preview thumbnail in local PiP (D-04 decision against)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRN-01 | User can share screen during an active 1-1 call | `getDisplayMedia()` browser API — native, no library. Button in control bar. |
| SCRN-02 | Screen sharing replaces video track via `sender.replaceTrack()` (no full renegotiation) | `RTCRtpSender.replaceTrack()` allows mid-call track swap without SDP renegotiation. Confirmed by MDN. |
| SCRN-03 | User can stop screen sharing and switch back to camera | `replaceTrack(cameraTrack)` in `stopScreenShare()`, plus `screenTrack.onended` handler for native stop button. |
| SCRN-04 | Remote peer sees screen share stream automatically | `replaceTrack()` updates the sender's active track — remote `ontrack` fired earlier; the `<video>` just replays what the sender pushes. No extra signal needed. |
</phase_requirements>

---

## Summary

Phase 6 is a pure frontend extension with no backend changes, no new packages, and no signaling modifications. The core technique — `RTCRtpSender.replaceTrack()` — swaps the live video track in an active `RTCPeerConnection` without triggering a new SDP offer/answer cycle. The remote peer's video element automatically shows the new track because the RTP stream updates in place.

The implementation adds three items to `CallContext`: `isScreenSharing` state, `startScreenShare()` (calls `getDisplayMedia`, finds the video sender, replaces track, sets `onended` handler), and `stopScreenShare()` (restores camera track, stops screen track, resets state). `teardown()` gets a four-line extension to clean up any active screen track. `CallPage` gets one new button and one updated `disabled` condition.

All icons (`Monitor`, `MonitorOff`) are confirmed present in the installed `lucide-react@1.16.0`. All component patterns follow the existing `isMuted`/`toggleMute` precedent established in Phase 5. The test infrastructure in `setup.ts` needs a `getDisplayMedia` mock added (parallel to the existing `getUserMedia` mock) — this is the only Wave 0 gap.

**Primary recommendation:** Follow the `isMuted`/`toggleMute` pattern exactly. One `useRef` for the screen track (`screenTrackRef`), one `useState` for `isScreenSharing`, two `useCallback` functions. Four lines added to `teardown()`. One button added to `CallPage`. One `disabled` condition updated on the camera button.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Screen capture (picker UI) | Browser / Client | — | `getDisplayMedia()` is a browser Web API; no server involvement |
| Track replacement on sender | Browser / Client (WebRTC) | — | `RTCRtpSender.replaceTrack()` operates on the local peer connection object; no signaling needed |
| Remote view update | Browser / Client (WebRTC) | — | RTP stream updates in-place on the receiver side automatically; remote `<video>` rerenders via existing `ontrack` binding |
| `isScreenSharing` state | Frontend (React Context) | — | Lives in `CallContext` alongside `isMuted`/`isCameraOff` — consistent pattern |
| Share button UI | Frontend (CallPage component) | — | New button in control bar, same tier as existing Mic/Camera buttons |
| Error toasts | Frontend (CallContext) | — | `addToast()` already exists; screen share errors reuse it |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version (installed) | Purpose | Why Standard |
|---------|--------------------|---------|----|
| `navigator.mediaDevices.getDisplayMedia` | Browser Web API | Capture screen/window/tab | Built into all modern browsers; no library needed |
| `RTCRtpSender.replaceTrack()` | Browser WebRTC API | Swap live video track without renegotiation | Standard WebRTC API; already used via `pcRef.current` |
| `lucide-react` | `^1.16.0` (installed) | `Monitor` + `MonitorOff` icons | Already project dependency; icons verified present |
| React `useState` / `useRef` / `useCallback` | React 18 (installed) | State, ref, memoized functions | Existing pattern in `CallContext.tsx` |
| shadcn `Button` | (installed) | Share button component | Already used for Mic/Camera/End Call buttons |
| Tailwind CSS | `^3.4.19` (installed) | `bg-emerald-600`, `opacity-50 cursor-not-allowed` classes | Already project dependency |

### No New Packages Required

Phase 6 installs zero new npm packages. All capabilities are browser-native or already installed.
[VERIFIED: codebase `frontend/package.json`]

---

## Package Legitimacy Audit

> Not applicable — Phase 6 installs no external packages. Screen Capture API (`navigator.mediaDevices.getDisplayMedia`) is a browser Web API with no npm dependency.

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks Share button
        │
        ▼
startScreenShare() [CallContext]
        │
        ├─► navigator.mediaDevices.getDisplayMedia({ video: true })
        │         │
        │         ├─ User cancels → catch → addToast("Screen sharing cancelled") → return
        │         └─ Permission denied → catch → addToast("Screen sharing unavailable") → return
        │
        ▼ screenTrack acquired
        │
        ├─► pcRef.current.getSenders().find(s => s.track?.kind === 'video') → videoSender
        │
        ├─► videoSender.replaceTrack(screenTrack)
        │         │
        │         └─► [Remote peer's video element shows screen automatically via RTP update]
        │
        ├─► screenTrackRef.current = screenTrack
        ├─► setIsScreenSharing(true)
        │
        └─► screenTrack.onended = () => stopScreenShare()
                  │
                  └─► [Browser native "Stop sharing" button triggers this]

User clicks Stop Sharing (or browser native stop)
        │
        ▼
stopScreenShare() [CallContext]
        │
        ├─► videoSender.replaceTrack(localStreamRef.current.getVideoTracks()[0])
        │         └─► [Remote peer's video returns to camera feed]
        ├─► screenTrackRef.current?.stop()
        ├─► screenTrackRef.current = null
        └─► setIsScreenSharing(false)

teardown() — extended for Phase 6
        │
        ├─► [existing steps 1-4]
        └─► screenTrackRef.current?.stop()
            screenTrackRef.current = null
            setIsScreenSharing(false)
```

### Recommended Project Structure

No new files needed. Two existing files are modified:

```
frontend/src/
├── contexts/
│   └── CallContext.tsx        ← extend: isScreenSharing, startScreenShare, stopScreenShare, screenTrackRef, teardown extension
└── pages/
    └── CallPage.tsx           ← extend: Share button (new), Camera disabled condition (updated), COPY additions
```

### Pattern 1: `replaceTrack()` — Mid-Call Track Swap (No Renegotiation)

**What:** `RTCRtpSender.replaceTrack(newTrack)` replaces the track being sent on an existing sender without creating a new SDP offer/answer cycle. The remote peer's receiver continues playing — the content just changes.

**When to use:** Switching camera ↔ screen, switching camera devices, toggling virtual backgrounds. Any scenario where the track format (codec, resolution) does not change in a way that breaks the existing negotiated parameters. [ASSUMED] For resolution changes between screen share and camera, browsers handle the RTP stream adaptation internally.

**Key constraint:** `replaceTrack()` requires the sender to have a track of the same kind. The video sender already exists from `pc.addTrack(videoTrack, stream)` during `startCall`/`acceptCall`. [VERIFIED: MDN Web Docs — RTCRtpSender.replaceTrack()]

```typescript
// Source: MDN Web Docs — RTCRtpSender.replaceTrack()
// Pattern used in startScreenShare():
const videoSender = pcRef.current!
  .getSenders()
  .find(s => s.track?.kind === 'video')

if (videoSender) {
  await videoSender.replaceTrack(screenTrack)
}
```

### Pattern 2: `getDisplayMedia()` — Screen Capture with Error Handling

**What:** `navigator.mediaDevices.getDisplayMedia({ video: true })` opens the browser's native screen picker. User selects a screen, window, or tab. Returns a `MediaStream` with one video track. The audio track is NOT automatically included with `{ video: true }`.

**Error cases:**
- User clicks "Cancel" in picker → Promise rejects with `NotAllowedError` (name: "NotAllowedError")
- System denies permission → also `NotAllowedError`
- API not supported → `TypeError`

```typescript
// Source: MDN Web Docs — MediaDevices.getDisplayMedia()
try {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
  const screenTrack = screenStream.getVideoTracks()[0]
  // ... replaceTrack, set onended, setIsScreenSharing(true)
} catch (err) {
  if (err instanceof Error && err.name === 'NotAllowedError') {
    // User cancelled the picker — this is the common path
    addToast('Screen sharing cancelled', 'bg-slate-800 border border-slate-700 text-slate-400')
  } else {
    addToast('Screen sharing unavailable', 'bg-slate-800 border border-amber-600/40 text-amber-400')
  }
  // isScreenSharing remains false — no state to reset
}
```

**Important:** The user can also click "Cancel" in the browser picker, which rejects with `NotAllowedError`. This is **not** an error — it's the normal cancel path. The UI-SPEC distinguishes the two toasts: cancel → slate toast, permission denied → amber toast. Both use `NotAllowedError` name but the user experience differs. [ASSUMED] Whether "Cancel" vs "permission denied" both produce `NotAllowedError` may vary by browser — the current distinction in UI-SPEC is a best-effort UX choice; treating all `NotAllowedError` cases as "Screen sharing cancelled" is an acceptable simplification.

### Pattern 3: `screenTrack.onended` — Native Stop Button Integration

**What:** The browser displays a floating "Stop sharing" notification bar when `getDisplayMedia` is active. When the user clicks it, the screen track's `ended` event fires. Attaching `onended` inside `startScreenShare()` (not via `addEventListener`) is the simplest approach — only one handler needed.

```typescript
// Source: MDN Web Docs — MediaStreamTrack: ended event
screenTrack.onended = () => {
  stopScreenShare()
}
```

**Critical:** `stopScreenShare()` must be stable (defined with `useCallback`) or accessed via a ref, otherwise `onended` captures a stale closure. Since `stopScreenShare` is defined with `useCallback`, attaching it directly to `onended` after it is defined is safe — as long as `onended` is attached inside `startScreenShare` which is also `useCallback` and therefore sees the current `stopScreenShare` reference.

**Safer pattern (recommended):** Use a `stopScreenShareRef` to mirror the latest `stopScreenShare` function, then in `startScreenShare`:

```typescript
screenTrack.onended = () => stopScreenShareRef.current?.()
```

This eliminates any stale closure risk entirely. [ASSUMED] Whether the simpler direct attachment is safe depends on React's `useCallback` dependency stability; the ref pattern is unambiguously correct.

### Pattern 4: `screenTrackRef` for Teardown Tracking

**What:** Store the active screen track in a `useRef` so `teardown()` can stop it without depending on React state (which may be stale in the teardown callback).

```typescript
const screenTrackRef = useRef<MediaStreamTrack | null>(null)

// In startScreenShare():
screenTrackRef.current = screenTrack

// In teardown() — added after step 2:
screenTrackRef.current?.stop()
screenTrackRef.current = null
setIsScreenSharing(false)
```

This follows the exact same pattern as `localStreamRef` used in the existing teardown sequence. [VERIFIED: codebase `CallContext.tsx` lines 176-208]

### Pattern 5: Sender Reference — Local Variable vs `screenSenderRef`

**What:** The video sender must be retrieved both in `startScreenShare()` (to call `replaceTrack(screenTrack)`) and in `stopScreenShare()` (to call `replaceTrack(cameraTrack)`).

**Two approaches:**

Option A — Retrieve on each call (no ref):
```typescript
// In both startScreenShare and stopScreenShare:
const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
```
Simple. Works because `getSenders()` is synchronous and always returns the current senders list. The sender object itself persists in the peer connection. [ASSUMED] Confirmed as valid approach in MDN examples.

Option B — Store in `screenSenderRef`:
```typescript
const screenSenderRef = useRef<RTCRtpSender | null>(null)
// In startScreenShare: screenSenderRef.current = videoSender
// In stopScreenShare: screenSenderRef.current?.replaceTrack(cameraTrack)
```
Slightly more explicit but adds a ref.

**Recommendation (Claude's Discretion):** Option A. Calling `getSenders().find()` twice is negligible overhead; avoids an extra ref. The planner may choose Option B if they prefer explicitness.

### Anti-Patterns to Avoid

- **Modifying `localStream` during screen share:** `startScreenShare()` must call `sender.replaceTrack(screenTrack)` on the `RTCPeerConnection` sender ONLY. `localStream` state and `localStreamRef` must remain untouched — this is what keeps the PiP showing the camera (D-04). Never call `setLocalStream(screenStream)`.
- **Using `addTrack()` instead of `replaceTrack()`:** `addTrack()` would add a new sender and trigger SDP renegotiation (SCRN-02 explicitly forbids this). Always use `replaceTrack()` on the existing sender.
- **Forgetting `screenTrack.stop()` in `stopScreenShare()`:** Stopping the screen track releases the browser's screen capture session (removes the "Stop sharing" overlay). Without this, the browser may keep capturing unnecessarily.
- **Attaching `onended` before `replaceTrack()` succeeds:** Set `onended` and `screenTrackRef.current` only after `await videoSender.replaceTrack(screenTrack)` resolves. If `replaceTrack` throws, the track should not be tracked as active.
- **Calling `startScreenShare()` when `pcRef.current` is null:** Add a guard: if no active peer connection, return early. This prevents errors if the button is somehow clicked before a call is established (unlikely in practice, since the button only appears on `CallPage`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen capture picker UI | Custom screen selector | `navigator.mediaDevices.getDisplayMedia()` | Browser provides native picker with system-level permissions; custom UI cannot access OS screen list |
| Track swap without renegotiation | Re-offer SDP after track change | `RTCRtpSender.replaceTrack()` | Full renegotiation adds 500ms+ roundtrip, visible video freeze; `replaceTrack()` is seamless |
| "Stop sharing" detection | Poll `track.readyState` | `screenTrack.onended` event | Browser fires `ended` event synchronously when native stop is clicked; polling wastes CPU |

**Key insight:** `replaceTrack()` exists precisely to solve "swap media source mid-call" without the overhead of renegotiation. Using it is the industry standard (Google Meet, Teams, Jitsi all use this technique).

---

## Common Pitfalls

### Pitfall 1: Stale Closure in `screenTrack.onended`

**What goes wrong:** `stopScreenShare` is referenced inside `startScreenShare` when `onended` is set. If `stopScreenShare` is recreated (new reference from `useCallback`) between when `onended` is set and when the event fires, the handler closes over a stale function that may have missing state.

**Why it happens:** React `useCallback` returns a new function reference when any dependency changes. The `onended` handler captures the reference at assignment time.

**How to avoid:** Mirror `stopScreenShare` into a ref (`stopScreenShareRef`) and use the ref in the handler:
```typescript
const stopScreenShareRef = useRef(stopScreenShare)
useEffect(() => { stopScreenShareRef.current = stopScreenShare }, [stopScreenShare])
// then: screenTrack.onended = () => stopScreenShareRef.current()
```
This is the same pattern already used for `handleSignal` → `handleSignalRef` in `CallContext.tsx` (lines 361-364). [VERIFIED: codebase `CallContext.tsx` lines 361-364]

### Pitfall 2: `replaceTrack()` Fails When Peer Connection Is Closed

**What goes wrong:** If the call ends (teardown) while `getDisplayMedia` is awaiting, `pcRef.current` may be null by the time `replaceTrack()` is called. This causes a null-dereference crash.

**Why it happens:** `getDisplayMedia` is async and may take several seconds if the user is slow in the picker.

**How to avoid:** After `await getDisplayMedia()` resolves, check `pcRef.current` is still non-null before proceeding:
```typescript
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
if (!pcRef.current) {
  screenStream.getTracks().forEach(t => t.stop())
  return
}
```

**Warning signs:** `TypeError: Cannot read properties of null (reading 'getSenders')` in console.

### Pitfall 3: Camera Button Disabled State Not Cleaned Up on Teardown

**What goes wrong:** If a user is sharing their screen and the call drops (remote hang-up, ICE failure), `isScreenSharing` stays `true` if `teardown()` does not reset it. On the next call, the camera button starts in a disabled state.

**Why it happens:** Forgetting the D-08 teardown extension.

**How to avoid:** D-08 mandates `setIsScreenSharing(false)` in `teardown()`. The implementation must include this reset. [VERIFIED: 06-CONTEXT.md D-08]

### Pitfall 4: `getDisplayMedia` Not Available in Insecure Context

**What goes wrong:** `navigator.mediaDevices.getDisplayMedia` is `undefined` on `http://` origins (non-localhost) — `TypeError: Cannot read properties of undefined`.

**Why it happens:** Screen Capture API requires a secure context (HTTPS or localhost).

**How to avoid:** The project targets LAN/localhost (CLAUDE.md constraint), so `http://localhost` satisfies the requirement. No action needed. If the demo ever runs on a non-localhost LAN IP over `http://`, screen sharing will fail. [ASSUMED] Whether LAN IPs like `192.168.x.x` over HTTP support `getDisplayMedia` varies by browser and version — typically they do NOT. The project should demo via `localhost`.

**Warning signs:** `TypeError` when clicking Share button on a non-localhost URL.

### Pitfall 5: `isScreenSharing` State vs Sender Track Kind Check

**What goes wrong:** Using `sender.track?.kind === 'video'` to find the video sender assumes the sender has a track. After `stopScreenShare()` calls `replaceTrack(cameraTrack)`, the sender's track kind is still `'video'` — this is fine. But if the call starts audio-only (no camera, fallback path in `getLocalStream()`), there is no video sender at all.

**Why it happens:** `getLocalStream()` falls back to audio-only if no camera is found. `getSenders()` will return only an audio sender.

**How to avoid:** In `startScreenShare()`, check that `videoSender` was found before calling `replaceTrack`. If not found (audio-only call), show a toast "Screen sharing requires a video connection" and return. The Share button is never disabled in advance (UI-SPEC: "The Share button is never disabled"), so the error handling happens at click-time.

---

## Code Examples

Verified patterns from official sources and codebase:

### Complete `startScreenShare` Implementation

```typescript
// Source: MDN getDisplayMedia + existing CallContext.tsx patterns
const stopScreenShareRef = useRef<() => void>(() => {})

const startScreenShare = useCallback(async (): Promise<void> => {
  // Guard: no active peer connection
  if (!pcRef.current) return

  let screenTrack: MediaStreamTrack | null = null
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    screenTrack = screenStream.getVideoTracks()[0]
  } catch (err) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      addToast('Screen sharing cancelled', 'bg-slate-800 border border-slate-700 text-slate-400')
    } else {
      addToast('Screen sharing unavailable', 'bg-slate-800 border border-amber-600/40 text-amber-400')
    }
    return
  }

  // Guard: call may have ended while user was in the picker
  if (!pcRef.current) {
    screenTrack.stop()
    return
  }

  const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
  if (!videoSender) {
    screenTrack.stop()
    return
  }

  await videoSender.replaceTrack(screenTrack)
  screenTrackRef.current = screenTrack
  setIsScreenSharing(true)

  // onended fires when user clicks browser native "Stop sharing"
  screenTrack.onended = () => stopScreenShareRef.current()
}, [addToast])
```

### Complete `stopScreenShare` Implementation

```typescript
// Source: existing CallContext.tsx toggleCamera pattern
const stopScreenShare = useCallback((): void => {
  const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
  const videoSender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')

  if (videoSender && cameraTrack) {
    void videoSender.replaceTrack(cameraTrack)
  }

  screenTrackRef.current?.stop()
  screenTrackRef.current = null
  setIsScreenSharing(false)
}, [])
```

### Teardown Extension (D-08)

```typescript
// Source: existing teardown() in CallContext.tsx — add after step 2
// 2.5 — Phase 6: stop screen track if active
screenTrackRef.current?.stop()
screenTrackRef.current = null
setIsScreenSharing(false)
```

### Share Button in CallPage

```tsx
// Source: existing Mic button pattern in CallPage.tsx (lines 151-158)
<Button
  className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
    isScreenSharing
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-slate-700 hover:bg-slate-600'
  }`}
  aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
  aria-pressed={isScreenSharing}
  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
>
  {isScreenSharing ? <MonitorOff className="size-4" /> : <Monitor className="size-4" />}
</Button>
```

### Updated Camera Button Disabled Condition

```tsx
// Source: CallPage.tsx lines 170-179 — update disabled prop
// Before (Phase 5):  disabled={!hasVideoTracks}
// After (Phase 6):   disabled={!hasVideoTracks || isScreenSharing}
<Button
  className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
    !hasVideoTracks || isScreenSharing
      ? 'bg-slate-700 opacity-50 cursor-not-allowed'
      : isCameraOff
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-slate-700 hover:bg-slate-600'
  }`}
  aria-label={
    !hasVideoTracks
      ? COPY.cameraUnavailableLabel
      : isScreenSharing
        ? COPY.cameraDisabledSharingLabel   // new COPY entry
        : isCameraOff
          ? COPY.cameraOnLabel
          : COPY.cameraOffLabel
  }
  aria-pressed={isCameraOff}
  aria-disabled={!hasVideoTracks || isScreenSharing}
  disabled={!hasVideoTracks || isScreenSharing}
  onClick={toggleCamera}
>
  {isCameraOff || !hasVideoTracks ? <VideoOff className="size-4" /> : <Video className="size-4" />}
</Button>
```

### New COPY Entry Required

```typescript
// Add to COPY const in CallPage.tsx:
cameraDisabledSharingLabel: 'Camera disabled while sharing',
```

### lucide-react Icon Import Update

```typescript
// Before (CallPage.tsx line 10):
import { Users, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
// After:
import { Users, PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from 'lucide-react'
```

`Monitor` and `MonitorOff` are confirmed available in `lucide-react@1.16.0` (installed version). [VERIFIED: 06-UI-SPEC.md §6 "YES — lucide-react 1.16 ✓"]

### `getDisplayMedia` Mock for Tests

```typescript
// Add to frontend/src/test/setup.ts — parallel to existing getUserMedia mock
export const mockScreenTrack = { stop: vi.fn(), onended: null as (() => void) | null, kind: 'video' }
const mockScreenStream = {
  getTracks: vi.fn().mockReturnValue([mockScreenTrack]),
  getVideoTracks: vi.fn().mockReturnValue([mockScreenTrack]),
}

// Add to the vi.stubGlobal('navigator', ...) block:
vi.stubGlobal('navigator', {
  ...globalThis.navigator,
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
    getDisplayMedia: vi.fn().mockResolvedValue(mockScreenStream), // NEW
  },
})
```

Also need `getSenders()` on `MockRTCPeerConnection` in `setup.ts`:

```typescript
// In MockRTCPeerConnection class — add alongside addTrack:
getSenders = vi.fn().mockReturnValue([
  { track: mockVideoTrack, replaceTrack: vi.fn().mockResolvedValue(undefined) }
])
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Full SDP renegotiation to switch tracks | `RTCRtpSender.replaceTrack()` | WebRTC spec (2017+), universal browser support by 2020 | Seamless mid-call track swap; no visible freeze |
| `MediaStream.removeTrack()` + `addTrack()` | `replaceTrack()` on existing sender | Same era | `removeTrack/addTrack` forces renegotiation; `replaceTrack` does not |

**Deprecated/outdated:**
- `captureStream()` on a `<canvas>` element for virtual screen sharing — outdated; real `getDisplayMedia` is now universally supported [ASSUMED].

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Whether "Cancel" vs "permission denied" in `getDisplayMedia` both produce `NotAllowedError` | Code Examples — `startScreenShare` | Minor: both cases show a toast; distinction between "cancelled" vs "unavailable" toast may not be perfectly accurate on all browsers |
| A2 | Direct `screenTrack.onended = () => stopScreenShare()` is safe if `stopScreenShare` is defined with stable `useCallback` deps | Architecture Patterns §Pattern 3 | Low: stale closure possible if deps change; mitigated by using `stopScreenShareRef` (recommended) |
| A3 | `getSenders().find()` on each call (Option A sender reference pattern) is a valid approach per MDN | Architecture Patterns §Pattern 5 | Very low: `getSenders()` is synchronous and standard; no known issues |
| A4 | LAN IPs over `http://` may not support `getDisplayMedia` in all browsers | Common Pitfalls §Pitfall 4 | Demo risk: if user opens app via IP (not localhost), screen sharing fails. Project should demo via localhost. |

---

## Open Questions

1. **Error type differentiation: cancel vs denied**
   - What we know: both user cancel and permission denial in `getDisplayMedia` throw `NotAllowedError` on Chromium
   - What's unclear: whether Firefox distinguishes them differently
   - Recommendation: Accept that both cases show "Screen sharing cancelled" as a safe simplification (the amber toast for "Screen sharing unavailable" can be the catch-all for non-`NotAllowedError` errors)

2. **`stopScreenShare` stale closure: direct attachment vs ref**
   - What we know: `handleSignal` already uses `handleSignalRef` pattern in `CallContext.tsx`
   - What's unclear: whether `stopScreenShare`'s `useCallback` deps are stable enough to make direct attachment safe
   - Recommendation: Follow the existing `handleSignalRef` pattern; use `stopScreenShareRef` in `onended`

---

## Environment Availability

Phase 6 is frontend-only with no external tools beyond the existing Vite dev server and Node.js runtime. All APIs are browser-native (`getDisplayMedia`, `replaceTrack`).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Vite dev server, test runner | Confirmed (project running) | (existing) | — |
| Vitest | Test suite | ✓ (in package.json) | `^4.1.7` | — |
| Browser with `getDisplayMedia` | SCRN-01 | ✓ (Chromium/Firefox — LAN demo) | N/A | — |
| `RTCRtpSender.replaceTrack` | SCRN-02 | ✓ (modern browser — same context as WebRTC call) | N/A | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.7` + `@testing-library/react` `^16.3.2` |
| Config file | `frontend/vite.config.ts` (test section, `setupFiles: './src/test/setup.ts'`) |
| Quick run command | `npm run test -- --run` (from `frontend/`) |
| Full suite command | `npm run test -- --run` (same; all test files under `src/test/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRN-01 | Share button renders with correct aria-label when idle | unit | `npm run test -- --run CallPage` | ❌ Wave 0 |
| SCRN-01 | Share button renders with "Stop sharing" label when active | unit | `npm run test -- --run CallPage` | ❌ Wave 0 |
| SCRN-01 | Clicking Share button calls `startScreenShare()` | unit | `npm run test -- --run CallPage` | ❌ Wave 0 |
| SCRN-02 | `startScreenShare()` calls `getDisplayMedia` and `replaceTrack` | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-02 | `isScreenSharing` becomes `true` after `startScreenShare()` | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-03 | `stopScreenShare()` calls `replaceTrack(cameraTrack)` and stops screen track | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-03 | `isScreenSharing` becomes `false` after `stopScreenShare()` | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-03 | `screenTrack.onended` triggers `stopScreenShare()` | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-01/D-05 | Camera button is disabled when `isScreenSharing === true` | unit | `npm run test -- --run CallPage` | ❌ Wave 0 |
| D-08 | `teardown()` resets `isScreenSharing` to `false` | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-01 | Error toast shown on `getDisplayMedia` rejection | unit | `npm run test -- --run CallContext` | ❌ Wave 0 |
| SCRN-04 | Remote peer sees screen automatically | manual only | Two-tab UAT | N/A |

### Sampling Rate

- **Per task commit:** `npm run test -- --run` (full suite, all tests pass in ~10s)
- **Per wave merge:** `npm run test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

1. `getSenders` mock missing from `MockRTCPeerConnection` in `frontend/src/test/setup.ts` — required for `replaceTrack` tests
2. `getDisplayMedia` mock missing from `navigator.mediaDevices` stub in `setup.ts` — required for all SCRN tests
3. `mockScreenTrack` export missing from `setup.ts` — needed for SCRN-03 test assertions (track.stop called, onended handler)
4. New test cases in `frontend/src/test/CallContext.test.tsx` — SCRN-01 through D-08 (listed above)
5. New test cases in `frontend/src/test/CallPage.test.tsx` — Share button rendering, Camera disabled-while-sharing

*(All production code files exist — only test infrastructure additions required in Wave 0)*

---

## Security Domain

> `security_enforcement: true` in `.planning/config.json`. ASVS Level 1 applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Screen sharing is within an authenticated session only |
| V3 Session Management | No | No new session state |
| V4 Access Control | No | No new routes or endpoints |
| V5 Input Validation | No | `getDisplayMedia` receives no user-provided input |
| V6 Cryptography | No | DTLS/SRTP handled by browser WebRTC natively |

### Known Threat Patterns for Screen Capture

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Screen content leak to unauthorized peer | Information Disclosure | Screen share only occurs on an authenticated, established WebRTC session. No new trust boundary introduced. |
| Continued screen capture after call ends | Denial of Service (resource) | D-08 teardown extension stops screen track; `screenTrackRef.current?.stop()` releases the OS capture session |
| `getDisplayMedia` in insecure context | Elevation of Privilege | Browser enforces secure context requirement natively; `localhost` satisfies this |

No new security controls required — all threat mitigations are inherent to existing session security and the new teardown extension (D-08).

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 6 |
|-----------|------------------|
| Tech stack: React 18 + Vite 5 + Tailwind CSS 3.x | All Phase 6 code is React/TS; no deviation |
| No SockJS | Not relevant — Phase 6 has no new signaling |
| No new packages | Confirmed: Phase 6 installs zero npm packages |
| shadcn/ui for components | Share button uses existing `Button` from `@/components/ui/button` |
| Deliverable: source code + docs + demo on LAN | Phase 6 frontend code is part of the deliverable; LAN context means `localhost` |
| GSD workflow enforcement | Planning artifacts must be in sync before edits |

---

## Sources

### Primary (HIGH confidence)

- Codebase `frontend/src/contexts/CallContext.tsx` — existing patterns, refs, teardown sequence, `toggleMute`/`toggleCamera` as Phase 6 model [VERIFIED: codebase]
- Codebase `frontend/src/pages/CallPage.tsx` — existing control bar, COPY pattern, button structure [VERIFIED: codebase]
- Codebase `frontend/src/test/setup.ts` — test mock infrastructure gaps identified [VERIFIED: codebase]
- Codebase `frontend/package.json` — confirmed installed packages, lucide-react `^1.16.0` [VERIFIED: codebase]
- `06-CONTEXT.md` — all D-01 through D-08 decisions [VERIFIED: project file]
- `06-UI-SPEC.md` — icon verification, button specs, accessibility requirements [VERIFIED: project file]

### Secondary (MEDIUM confidence)

- MDN Web Docs — `RTCRtpSender.replaceTrack()`, `getDisplayMedia()`, `MediaStreamTrack: ended event` — [CITED: standard Web APIs, training knowledge confirmed by project spec]

### Tertiary (LOW confidence)

- Browser behavior for `NotAllowedError` on cancel vs permission denied — behavior described is Chromium-centric [ASSUMED]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed installed in package.json; all APIs browser-native
- Architecture: HIGH — `replaceTrack` pattern is well-established; code examples derived from existing codebase patterns
- Pitfalls: HIGH — pitfalls derived from actual code (stale closure pattern already solved in the codebase) and standard WebRTC caveats
- Test gaps: HIGH — test infrastructure read directly from `setup.ts` and existing test files

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (stable APIs — 30 days)
