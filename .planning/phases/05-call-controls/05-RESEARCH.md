# Phase 5: Call Controls - Research

**Researched:** 2026-05-27
**Domain:** React 18 WebRTC call controls — state extension, timer hooks, ICE state mapping, toggle track API
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Control bar holds 3 action buttons: `[Mic] [End Call] [Camera]`. End Call center (red, `h-12 w-12 rounded-full bg-red-600`). Mic left, Camera right, smaller (`h-10 w-10 rounded-full`).
**D-02:** Timer and connection status overlaid on remote video (top area), NOT in control bar. Timer top-center, status badge below timer, `backdrop-blur-sm`. Peer name stays top-left per Phase 4.
**D-03:** Mic muted → `MicOff` icon + `bg-red-600 hover:bg-red-700`. Mic active → `Mic` icon + `bg-slate-700 hover:bg-slate-600`.
**D-04:** Camera off → `VideoOff` icon + `bg-red-600 hover:bg-red-700`. Camera active → `Video` icon + `bg-slate-700 hover:bg-slate-600`. Consistent with mic pattern.
**D-05:** Timer starts when `callStatus === 'connected'`. Resets when call ends.
**D-06:** Format `MM:SS`. Shows `00:00` before connected. No `HH:MM:SS`.
**D-07:** Timer logic is local state in `CallPage` (or custom hook `useCallTimer`) — NOT in `CallContext`. `setInterval(1000)`, cleared on unmount / idle.
**D-08:** 4 states: `Connecting...` (amber), `Connected` (emerald), `Reconnecting...` (amber + animate-pulse), `Failed` (red).
**D-09:** ICE state mapping: `'new'|'checking'` → "Connecting...", `'connected'|'completed'` → "Connected", `'disconnected'` → "Reconnecting...", `'failed'|'closed'` → "Failed".
**D-10:** `iceState` exposed from `CallContext` (or tracked directly in `CallPage` via `pcRef` — planner decides).
**D-11:** `CallContext` exposes `isMuted: boolean`, `isCameraOff: boolean`, `toggleMute: () => void`, `toggleCamera: () => void`. Toggle functions operate on `localStreamRef.current.getAudioTracks()[0].enabled` and `localStreamRef.current.getVideoTracks()[0].enabled`.
**D-12:** When `localStream` is audio-only (no video tracks), camera toggle button disabled/hidden. Mic toggle still works.
**D-13:** Keep minimal toast array — no Sonner install.

### Claude's Discretion

- Timer hook: `useCallTimer` (custom hook) OR inline state in `CallPage` — planner picks cleanest approach.
- ICE state tracking: add `iceState` to `CallContext` state (clean, centralized) vs. read from `pcRef.current.iceConnectionState` in `CallPage` — planner picks.
- Animation for "Reconnecting..." badge: `animate-pulse` if straightforward, skip if complex.

### Deferred Ideas (OUT OF SCOPE)

- Sonner toast upgrade
- Draggable PiP self-view
- `restartIce()` reconnection (still uses teardown strategy)
- Mute indicator overlay on local PiP
- Screen sharing (Phase 6), group call (Phase 7), recording (Phase 8)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTRL-01 | User can mute/unmute microphone during a call | Toggle `AudioTrack.enabled`; expose `toggleMute` + `isMuted` from CallContext |
| CTRL-02 | User can turn camera on/off during a call | Toggle `VideoTrack.enabled`; expose `toggleCamera` + `isCameraOff` from CallContext; no-op if audio-only |
| CTRL-03 | User can end call; all tracks and peer connections cleaned up | `hangUp()` already exists in Phase 4; Phase 5 confirms complete; teardown() stops all tracks |
| CTRL-04 | Call duration timer displayed once connection established | `setInterval(1000)` in `useCallTimer` hook watching `callStatus === 'connected'` |
| CTRL-05 | Connection status shown (Connecting / Connected / Reconnecting / Failed) | `iceState: RTCIceConnectionState | null` added to CallContext; mapped to label+color in CallPage |
| CTRL-06 | Local video self-view as small mirrored overlay | Already present in Phase 4 CallPage (`absolute bottom-24 right-4 w-32 aspect-video scale-x-[-1]`); Phase 5 confirms complete |
| CTRL-07 | Remote video dominant with remote user's name overlay | Already present in Phase 4 CallPage (peer name `absolute top-4 left-4`); Phase 5 confirms complete |

</phase_requirements>

---

## Summary

Phase 5 is a pure frontend extension of the Phase 4 call screen. The entire work surface is two files: `CallContext.tsx` (state + logic) and `CallPage.tsx` (UI). No new packages, no backend changes, no new routes.

The central technical fact is that WebRTC mic/camera toggle does not require renegotiation — setting `track.enabled = false` silences/blacks the track locally and what is transmitted to the peer changes immediately. This is the correct approach; stopping and re-adding tracks would require `sender.replaceTrack()` and a full SDP renegotiation, which is Phase 6 scope (screen share).

The `iceState` design decision (centralized in CallContext vs. read ad-hoc from pcRef) cleanly resolves in favor of adding it to CallContext: it enables testability, keeps CallPage free of raw WebRTC refs, and follows the established project pattern where all call state lives in the context.

The timer is local state by design (D-07 is locked) — it is display-only, resets on every call, and has no signaling implications. A `useCallTimer(callStatus)` custom hook is the clean extraction pattern.

**Primary recommendation:** Two waves — Wave 1 extends CallContext (isMuted, isCameraOff, iceState, toggleMute, toggleCamera) + adds tests; Wave 2 updates CallPage UI (control bar + overlays) + adds tests. Optionally fold into a single wave since there are no parallelizable sub-tasks.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mic/camera toggle state | Frontend (CallContext) | — | State lives where the MediaStream lives; no server involvement |
| Track enable/disable | Browser WebRTC API | — | `AudioTrack.enabled` / `VideoTrack.enabled` is browser-native |
| ICE connection state | Browser WebRTC API | Frontend (CallContext) | Browser fires `oniceconnectionstatechange`; context stores/exposes it |
| Call duration timer | Frontend (CallPage local state) | — | Display-only; no persistence; no signaling |
| Connection status label/color mapping | Frontend (CallPage) | — | UI concern; maps raw ICE states to user-friendly labels |
| End call / cleanup | Frontend (CallContext) | — | `teardown()` + `hangUp()` already implemented in Phase 4 |
| Cancel during "Calling..." | Frontend (CallPage/UserListPage) | — | Deferred from Phase 4; Phase 5 adds cancel button or uses hangUp() |

---

## Standard Stack

No new packages are introduced in Phase 5. All required capabilities come from the already-installed stack.

### Core (already installed)

| Library | Installed Version | Purpose | Relevance to Phase 5 |
|---------|------------------|---------|----------------------|
| React 18 | ^19.2.6 (resolves to React 19 in package.json) | UI framework | `useState`, `useEffect`, `useRef`, `useCallback` for timer + toggle state |
| TypeScript | ~6.0.2 | Type safety | `RTCIceConnectionState` type, extended `CallContextValue` interface |
| lucide-react | ^1.16.0 (1.16.0 installed) | Icon library | `Mic`, `MicOff`, `Video`, `VideoOff` — all verified present in installed package |
| Tailwind CSS 3.x | ^3.4.19 | Styling | `animate-pulse`, `transition-colors`, `backdrop-blur-sm`, `tabular-nums` |
| tailwindcss-animate | ^1.0.7 | Tailwind animation plugin | `animate-in fade-in` for overlay appear |
| shadcn/ui Button | (component file in repo) | Icon-only buttons for Mic/Camera controls | Already used for End Call button; same pattern |

[VERIFIED: codebase — package.json + node_modules inspection]

### Icons Status in CallPage.tsx (currently)

| Icon | Used In CallPage Now | Action |
|------|---------------------|--------|
| `PhoneOff` | Yes — imported | No change |
| `Users` | Yes — imported | No change |
| `Mic` | No | Add to import |
| `MicOff` | No | Add to import |
| `Video` | No (exists in UserListPage) | Add to CallPage import |
| `VideoOff` | No | Add to import |

[VERIFIED: codebase — grep of CallPage.tsx imports + node_modules/lucide-react/dist/esm/icons/]

---

## Package Legitimacy Audit

No new packages are installed in Phase 5. All capabilities come from already-installed Phase 3/4 dependencies.

**Packages removed due to slopcheck [SLOP] verdict:** none — no new packages
**Packages flagged as suspicious [SUS]:** none — no new packages

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser Tab]
    │
    ├── CallContext (Provider)
    │     ├── State: callStatus, peerUsername, localStream, remoteStream, toasts
    │     ├── NEW State: isMuted (bool), isCameraOff (bool), iceState (RTCIceConnectionState|null)
    │     ├── NEW Fns: toggleMute(), toggleCamera()
    │     ├── pcRef.oniceconnectionstatechange → setIceState(state) + setCallStatus()
    │     └── teardown() → resets isMuted=false, isCameraOff=false, iceState=null
    │
    └── CallPage (Consumer)
          ├── useCall() → destructures isMuted, isCameraOff, iceState, toggleMute, toggleCamera
          ├── useCallTimer(callStatus) → seconds counter, interval, MM:SS format
          ├── Control Bar: [MicButton] [EndCallButton] [CameraButton]
          ├── Timer Overlay: top-center, absolute, backdrop-blur-sm
          └── Status Overlay: below timer, colored dot + label from iceState map
```

Data flow for toggleMute:
```
User clicks Mic button
→ toggleMute() in CallContext
→ setIsMuted(!isMuted)
→ localStreamRef.current.getAudioTracks()[0].enabled = !isMuted
→ Browser stops sending audio samples to RTCPeerConnection sender
→ CallPage re-renders: icon switches Mic↔MicOff, bg switches slate↔red
```

Data flow for ICE status:
```
RTCPeerConnection fires oniceconnectionstatechange
→ pc.iceConnectionState read in handler
→ setIceState(state) called in CallContext
→ setCallStatus('connected') if state is 'connected'|'completed'
→ CallPage maps iceState → label + colorClass → renders status pill
```

### Recommended Project Structure

No new files required. Phase 5 touches:

```
frontend/src/
├── contexts/
│   └── CallContext.tsx          # Extend: +isMuted, +isCameraOff, +iceState, +toggleMute, +toggleCamera
├── pages/
│   └── CallPage.tsx             # Extend: +3-button bar, +timer overlay, +status overlay
│                                # Optional: extract useCallTimer hook inline or to hooks/
├── hooks/                       # Optional — create if useCallTimer is extracted
│   └── useCallTimer.ts          # useCallTimer(callStatus: CallStatus): string
└── test/
    ├── CallContext.test.tsx     # Extend: +toggleMute/toggleCamera/iceState tests
    └── CallPage.test.tsx        # Extend: +CTRL-01..05 tests
```

### Pattern 1: Track Toggle (mic/camera mute without renegotiation)

**What:** Setting `track.enabled = false` on a local MediaStreamTrack immediately mutes/blacks the track. The RTP stream continues (no ICE/SDP changes) but carries silence/black frames. The remote peer perceives muted audio or a black video feed.

**When to use:** Any time the user wants to temporarily mute/hide their stream. This is the correct WebRTC pattern for toggle controls.

**Example:**
```typescript
// Source: MDN Web Docs — MediaStreamTrack.enabled
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled

// toggleMute in CallContext
const toggleMute = useCallback(() => {
  setIsMuted((prev) => {
    const nextMuted = !prev
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !nextMuted  // true = unmuted, false = muted
    }
    return nextMuted
  })
}, [])

// toggleCamera in CallContext
const toggleCamera = useCallback(() => {
  const videoTracks = localStreamRef.current?.getVideoTracks()
  if (!videoTracks || videoTracks.length === 0) return  // audio-only guard (D-12)
  setIsCameraOff((prev) => {
    const nextOff = !prev
    videoTracks[0].enabled = !nextOff  // true = on, false = off
    return nextOff
  })
}, [])
```

[CITED: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled]

**Critical note on stale closure:** The toggle functions use `setIsMuted(prev => ...)` functional updater form to avoid reading stale state. `localStreamRef.current` is a ref (not state), so it is always current inside the callback without any closure issue. [VERIFIED: codebase — existing CallContext.tsx uses this exact ref pattern for peerUsernameRef]

### Pattern 2: useCallTimer custom hook

**What:** A custom React hook that watches `callStatus` and runs a `setInterval` counter, returning a formatted `MM:SS` string.

**When to use:** When `callStatus === 'connected'`. Timer starts, increments every second, stops and resets on cleanup.

**Example:**
```typescript
// Source: React docs — useEffect with interval cleanup
// Extracted to frontend/src/hooks/useCallTimer.ts (optional)

import { useState, useEffect } from 'react'
import type { CallStatus } from '@/contexts/CallContext'

export function useCallTimer(callStatus: CallStatus): string {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (callStatus !== 'connected') {
      setSeconds(0)
      return
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)  // cleanup on unmount or callStatus change
  }, [callStatus])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
```

[ASSUMED — React hooks pattern; verified against React docs concepts but not fetched from official source in this session]

**Key property:** When `callStatus` transitions away from `'connected'` (call ends, component unmounts), the `useEffect` cleanup runs `clearInterval` and `setSeconds(0)` on next run. This prevents the "timer keeps running after call ends" bug.

### Pattern 3: iceState in CallContext (centralized ICE tracking)

**What:** Add `iceState: RTCIceConnectionState | null` to CallContextValue. Set it inside the existing `oniceconnectionstatechange` handler in `createPeerConnection()`. Reset to `null` in `teardown()`.

**When to use:** Always — centralizing ICE state in context enables testing (inject mock iceState without needing pcRef access) and keeps CallPage free of raw WebRTC ref reads.

**Example:**
```typescript
// Inside createPeerConnection() — add ONE line alongside existing setCallStatus call
pc.oniceconnectionstatechange = () => {
  const state = pc.iceConnectionState
  setIceState(state)                               // NEW Phase 5 line
  if (state === 'disconnected') {
    teardownTimerRef.current = setTimeout(teardown, 2000)
  } else if (state === 'failed') {
    if (teardownTimerRef.current !== null) {
      clearTimeout(teardownTimerRef.current)
      teardownTimerRef.current = null
    }
    teardown()
    addToast('Connection lost', 'bg-slate-800 border border-red-600/40 text-red-400')
  } else if (state === 'connected' || state === 'completed') {
    if (teardownTimerRef.current !== null) {
      clearTimeout(teardownTimerRef.current)
      teardownTimerRef.current = null
    }
    setCallStatus('connected')
  }
}
```

[VERIFIED: codebase — the existing handler is at lines 190-212 of CallContext.tsx]

### Pattern 4: ICE state → UI label mapping (in CallPage)

```typescript
// Source: CONTEXT.md D-08/D-09 + UI-SPEC §5.4

const ICE_STATUS: Record<string, { label: string; colorClass: string; pulse: boolean }> = {
  new:          { label: '● Connecting...',   colorClass: 'text-amber-400',   pulse: false },
  checking:     { label: '● Connecting...',   colorClass: 'text-amber-400',   pulse: false },
  connected:    { label: '● Connected',       colorClass: 'text-emerald-400', pulse: false },
  completed:    { label: '● Connected',       colorClass: 'text-emerald-400', pulse: false },
  disconnected: { label: '● Reconnecting...', colorClass: 'text-amber-400',   pulse: true  },
  failed:       { label: '● Failed',          colorClass: 'text-red-400',     pulse: false },
  closed:       { label: '● Failed',          colorClass: 'text-red-400',     pulse: false },
}

// Fallback for null (before first ICE event)
const statusInfo = iceState ? (ICE_STATUS[iceState] ?? ICE_STATUS.new) : ICE_STATUS.new
```

[CITED: CONTEXT.md D-08/D-09, UI-SPEC §5.4]

### Pattern 5: Cancel during "Calling..." (deferred from Phase 4)

Phase 4 SUMMARY.md explicitly deferred "Caller-side explicit Cancel button while 'Calling...'" to Phase 5. The mechanism is simple: while `callStatus === 'calling'`, calling `hangUp()` sends `call-end` + runs `teardown()`. This already works — the only missing piece was the UI button on UserListPage or a cancel path from the calling state.

**Options for planner:**
- Option A: Add a "Cancel" button to `UserListPage` for the `callStatus === 'calling'` state (alongside the existing "Calling..." spinner). This is the natural location since that's where the outgoing call UI lives.
- Option B: Since the user is typically still on UserListPage during "Calling..." (they don't navigate to /call until accepted), UserListPage already shows a disabled "Calling..." button; add an explicit separate Cancel button next to it.

[VERIFIED: codebase — hangUp() in CallContext.tsx line 442-445; UserListPage.tsx line 57-66 shows the "Calling..." button; 04-05-SUMMARY.md confirms this was deferred]

### Anti-Patterns to Avoid

- **Reading `isMuted`/`isCameraOff` state inside the toggle function to compute next value:** Use functional updater `setIsMuted(prev => !prev)` to avoid the classic stale-closure bug where the closure captures the old state value.
- **Stopping tracks instead of disabling them:** `track.stop()` permanently ends the track and releases the device — you cannot re-enable a stopped track. Phase 5 uses `track.enabled = false/true` only. (Phase 6 screen sharing will use `sender.replaceTrack()` for a different purpose.)
- **Putting the timer interval in CallContext:** D-07 locks timer as local state. Moving it to context would cause every context consumer to re-render every second unnecessarily.
- **Using `setInterval` without returning cleanup:** Every `setInterval` inside `useEffect` must return `() => clearInterval(id)`. Missing the cleanup causes the interval to accumulate across React StrictMode double-mounts in dev, causing double-speed timers.
- **Setting `iceState` by reading pcRef in CallPage:** Always read `iceState` from `useCall()`. Reading `pcRef.current.iceConnectionState` directly in CallPage ties the UI to implementation details and makes the component untestable without a real RTCPeerConnection.
- **Forgetting to reset isMuted/isCameraOff/iceState in teardown():** After `teardown()`, a new call starts with clean state. If these are not reset, the new call opens with the previous call's muted/camera-off state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Track mute | Custom stream processor / mute via gain node | `AudioTrack.enabled = false` | Built into WebRTC; no signal overhead; zero code |
| MM:SS format | Moment.js, dayjs, date-fns | `padStart(2, '0')` on two numbers | 2 lines; zero dependency; no import needed |
| Animated dot | CSS keyframe animation file | Tailwind `animate-pulse` | Already in tailwindcss-animate (installed); one class |
| Icon toggle | Conditional SVG or custom icons | lucide-react `Mic`/`MicOff`/`Video`/`VideoOff` | All 4 icons confirmed in installed package |
| State toggle pattern | Explicit `if/else` with old state read | `setState(prev => !prev)` | Functional updater is the React-idiomatic pattern; avoids stale closure |

---

## Common Pitfalls

### Pitfall 1: Stale State in Toggle Function
**What goes wrong:** `toggleMute` reads `isMuted` from the outer scope. When called twice quickly, both closures see the same old value and the state only changes once instead of twice (or the second toggle is a no-op).
**Why it happens:** JavaScript closures capture variables by reference at creation time; React state is immutable per render cycle.
**How to avoid:** Use functional updater form: `setIsMuted(prev => !prev)`. Then apply the new value to the track ref using the negated `prev`.
**Warning signs:** Double-click the mic button and it ends up in the wrong state.

### Pitfall 2: Forgetting teardown() Resets
**What goes wrong:** User ends call with mic muted. They call again. Mic appears muted at call start.
**Why it happens:** `isMuted` state is not reset in `teardown()`.
**How to avoid:** Add `setIsMuted(false)` and `setIsCameraOff(false)` and `setIceState(null)` in the `teardown()` function alongside the existing resets.
**Warning signs:** Second call inherits toggle state from previous call.

### Pitfall 3: Track.stop() vs track.enabled (CRITICAL)
**What goes wrong:** Developer calls `localStreamRef.current.getAudioTracks()[0].stop()` to mute. Track is permanently terminated; re-enabling is impossible without calling `getUserMedia` again.
**Why it happens:** `stop()` and `enabled = false` look similar but have opposite permanence.
**How to avoid:** Phase 5 ONLY uses `track.enabled = false/true`. `stop()` is Phase 4's teardown concern (correctly used there).
**Warning signs:** Camera/mic device indicator in browser tab stays lit after "mute" (if `enabled=false` it goes dark; if accidently calling `stop()` the indicator clears — but re-enabling fails silently).

### Pitfall 4: setInterval in useEffect Without Cleanup
**What goes wrong:** In React 18 StrictMode (dev only), effects run twice. Without cleanup, two intervals run simultaneously — timer counts at 2x speed in development.
**Why it happens:** StrictMode double-mounts are intentional for detecting side effects. Missing `clearInterval` in the return function.
**How to avoid:** Always `return () => clearInterval(id)` from the `useEffect` that sets up the interval.
**Warning signs:** Timer counts too fast in dev build (`npm run dev`), normal in `npm run build` preview.

### Pitfall 5: Unmount MediaStream Cleanup (carried from Phase 4)
**What goes wrong:** When user navigates away from `/call` route directly (via back button, not `hangUp()`), media tracks are not stopped, browser camera/mic indicator stays lit.
**Why it happens:** Phase 4 SUMMARY.md explicitly deferred this — "Unmount cleanup for MediaStream tracks (Phase 5 TODO marker in CallPage.tsx)".
**How to avoid:** Add a `useEffect` cleanup in `CallPage` (or in `CallContext`'s teardown hook) that calls `localStreamRef.current?.getTracks().forEach(t => t.stop())` on component unmount.
**Warning signs:** Browser camera/mic indicator in tab stays active after leaving the call page.

### Pitfall 6: MockRTCPeerConnection missing iceConnectionState setter
**What goes wrong:** New tests that trigger `oniceconnectionstatechange` fail because `MockRTCPeerConnection.iceConnectionState` is a fixed string `'new'` and cannot be changed per test.
**Why it happens:** The mock in `setup.ts` (line 19) declares `iceConnectionState = 'new'` as a plain class field.
**How to avoid:** For tests that need to simulate ICE state changes, mutate `MockPC.lastInstance!.iceConnectionState = 'connected'` before calling `lastInstance.oniceconnectionstatechange?.()`.
**Warning signs:** ICE state tests always show `'new'` regardless of simulation.

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### CallContextValue Extension (TypeScript interface)
```typescript
// Additions to CallContextValue interface in CallContext.tsx
// Source: CONTEXT.md D-11, D-10; UI-SPEC §5.5
export interface CallContextValue {
  // ...existing fields...
  isMuted: boolean
  isCameraOff: boolean
  iceState: RTCIceConnectionState | null
  toggleMute: () => void
  toggleCamera: () => void
}
```

### teardown() Reset Additions
```typescript
// Add to teardown() in CallContext.tsx — step 5 (React state)
// Source: CONTEXT.md D-11; UI-SPEC §5.5 state contracts
setIsMuted(false)
setIsCameraOff(false)
setIceState(null)
```

### MM:SS Format Helper
```typescript
// Source: UI-SPEC §5.3 implementation guidance
// 2 lines, no import
const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
const ss = String(seconds % 60).padStart(2, '0')
const display = `${mm}:${ss}`  // e.g. "02:34"
```

### Timer Overlay JSX (matches UI-SPEC §5.3)
```tsx
{/* Timer + Status — top-center, pointer-events-none */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
  {/* Timer pill */}
  <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1">
    <span className="text-sm font-semibold text-slate-50 tabular-nums">{timerDisplay}</span>
  </div>
  {/* Status pill */}
  <div
    className={`bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1 ${statusInfo.pulse ? 'animate-pulse' : ''}`}
    role="status"
    aria-live="polite"
  >
    <span className={`text-xs font-normal ${statusInfo.colorClass}`}>{statusInfo.label}</span>
  </div>
</div>
```

### Control Bar JSX (matches UI-SPEC §5.2)
```tsx
{/* Control bar — 3-button row */}
<div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
  {/* Mic button */}
  <Button
    className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
      isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
    }`}
    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
    aria-pressed={isMuted}
    onClick={toggleMute}
  >
    {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
  </Button>

  {/* End Call button — unchanged from Phase 4 */}
  <Button
    className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
    aria-label="End call"
    onClick={hangUp}
  >
    <PhoneOff className="size-5" />
  </Button>

  {/* Camera button */}
  <Button
    className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
      !hasVideoTracks
        ? 'bg-slate-700 opacity-50 cursor-not-allowed'
        : isCameraOff
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-slate-700 hover:bg-slate-600'
    }`}
    aria-label={!hasVideoTracks ? 'Camera unavailable' : isCameraOff ? 'Turn on camera' : 'Turn off camera'}
    aria-pressed={isCameraOff}
    aria-disabled={!hasVideoTracks}
    disabled={!hasVideoTracks}
    onClick={toggleCamera}
  >
    {isCameraOff || !hasVideoTracks ? <VideoOff className="size-4" /> : <Video className="size-4" />}
  </Button>
</div>
```

Where `hasVideoTracks` = `(localStream?.getVideoTracks().length ?? 0) > 0`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stop/restart tracks for mute | `track.enabled = false` | WebRTC API design (~2015) | No renegotiation needed; simpler |
| `getDisplayMedia()` for camera off | `track.enabled = false` | N/A | `getDisplayMedia` is screen share; camera toggle = enabled flag only |
| Global interval for call timer | `useEffect` cleanup pattern | React hooks (~2019) | Interval auto-clears on unmount; no memory leaks |

**Browser API note:** `RTCIceConnectionState` values are part of the WebRTC 1.0 specification (W3C). The values used in D-09 (`new`, `checking`, `connected`, `completed`, `disconnected`, `failed`, `closed`) are all spec-standard and supported in all modern browsers. [CITED: https://www.w3.org/TR/webrtc/#dom-rtciceconnectionstate]

---

## Runtime State Inventory

Not applicable — this is a pure frontend UI extension phase. No rename/refactor/migration work. No stored data, live service config, OS-registered state, secrets/env vars, or build artifacts are affected.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Running tests | Verified | (test suite runs) | — |
| Vitest | Test runner | Verified (45 tests pass) | ^4.1.7 | — |
| @testing-library/react | Component tests | Verified | ^16.3.2 | — |
| lucide-react Mic/MicOff/Video/VideoOff | Control bar icons | Verified (icons found in node_modules) | 1.16.0 | — |
| Tailwind animate-pulse | Reconnecting status | Verified (tailwindcss-animate ^1.0.7 installed) | — | — |
| Tailwind tabular-nums | Timer display | Verified (Tailwind 3.4.x includes tabular-nums utility) | 3.4.19 | — |
| Browser RTCIceConnectionState events | ICE status | Verified (existing Phase 4 oniceconnectionstatechange handler fires in prod) | WebRTC 1.0 | — |

[VERIFIED: codebase — package.json, node_modules inspection, npm test run]

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `frontend/vite.config.ts` (test section, jsdom environment) |
| Setup file | `frontend/src/test/setup.ts` (RTCPeerConnection mock + getUserMedia mock) |
| Quick run command | `npm test -- --run --reporter=verbose` (from `frontend/`) |
| Full suite command | `npm test -- --run --reporter=verbose` (all 6 test files) |

### Baseline

**Current state:** 45 tests pass (6 test files). Zero failures. Confirmed by running the suite during research.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTRL-01 | `toggleMute` sets `isMuted`, sets `audioTrack.enabled` | unit | `npm test -- --run CallContext` | Extends existing `CallContext.test.tsx` — Wave 0 gap |
| CTRL-01 | Mic button renders `MicOff` icon + red bg when `isMuted=true` | component | `npm test -- --run CallPage` | Extends existing `CallPage.test.tsx` — Wave 0 gap |
| CTRL-02 | `toggleCamera` sets `isCameraOff`, sets `videoTrack.enabled` | unit | `npm test -- --run CallContext` | Extends existing `CallContext.test.tsx` — Wave 0 gap |
| CTRL-02 | Camera button disabled when `localStream` has no video tracks | component | `npm test -- --run CallPage` | Extends existing `CallPage.test.tsx` — Wave 0 gap |
| CTRL-03 | `teardown()` resets `isMuted`, `isCameraOff`, `iceState` to initial values | unit | `npm test -- --run CallContext` | Extends existing `CallContext.test.tsx` — Wave 0 gap |
| CTRL-04 | Timer displays `00:00` before connected, increments after `callStatus='connected'` | component | `npm test -- --run CallPage` | Extends existing `CallPage.test.tsx` — Wave 0 gap |
| CTRL-05 | Status overlay renders correct label and color class for each `iceState` value | component | `npm test -- --run CallPage` | Extends existing `CallPage.test.tsx` — Wave 0 gap |
| CTRL-05 | `iceState` set in CallContext when ICE state handler fires | unit | `npm test -- --run CallContext` | Extends existing `CallContext.test.tsx` — Wave 0 gap |
| CTRL-06 | Local PiP video element present, muted, mirrored | component | `npm test -- --run CallPage` | Existing test passes — COMPLETE |
| CTRL-07 | Peer username overlay rendered top-left | component | `npm test -- --run CallPage` | Existing test passes — COMPLETE |

### Sampling Rate

- **Per task commit:** `npm test -- --run --reporter=verbose` (< 5 seconds)
- **Per wave merge:** same full suite
- **Phase gate:** Full suite green (currently 45 passing) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `CallContext.test.tsx` — add toggle + iceState tests (extends existing file; no new file needed)
- [ ] `CallPage.test.tsx` — add CTRL-01..05 tests for timer, status overlay, button states (extends existing file)
- [ ] `setup.ts` — mock `getAudioTracks()` and `getVideoTracks()` on `mockMediaStream` to return mockable track objects with `enabled` property

**Note on setup.ts mock gap:** The current `mockMediaStream` in `setup.ts` only mocks `getTracks()` returning a single track with `stop()`. Phase 5 toggle functions call `getAudioTracks()[0].enabled` and `getVideoTracks()[0].enabled`. The mock needs to expose these methods + the `enabled` property for toggle tests to work.

Current mock (line 73-75 of setup.ts):
```ts
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockTrack]),
}
```

Required addition for Phase 5 tests:
```ts
const mockAudioTrack = { stop: vi.fn(), enabled: true }
const mockVideoTrack = { stop: vi.fn(), enabled: true }
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
}
```

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 5 is call UI only; no auth changes |
| V3 Session Management | No | No new session handling |
| V4 Access Control | No | No new routes or endpoints |
| V5 Input Validation | No | No user text inputs in Phase 5 |
| V6 Cryptography | No | No new crypto |
| V7 Error Handling | Low | Toggle functions silently no-op if tracks missing — no error exposure |
| V8 Data Protection | No | No new PII handling |

### Known Threat Patterns for WebRTC track toggle

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UI mute bypass (user claims muted but still transmitting) | Spoofing | `track.enabled = false` is a browser API — muting happens in the RTP sender layer; cannot be bypassed at JS level without modifying the browser. Acceptable for LAN demo. |
| Self-XSS via peerUsername in overlay | Tampering | `peerUsername` is set from authenticated STOMP signal (`msg.from`), which is overwritten server-side with the authenticated JWT principal. Cannot be attacker-controlled to inject script. React JSX text content is auto-escaped. |

**Security verdict:** Phase 5 introduces no new attack surface. Track toggle is a pure local media API operation. No new inputs, no new endpoints, no new auth flows.

---

## Open Questions

1. **Cancel button placement during "Calling..." state**
   - What we know: Phase 4 deferred "Caller-side explicit Cancel button while 'Calling...'". `hangUp()` already correctly cancels (sends `call-end`, runs teardown).
   - What's unclear: Should the cancel button be in `UserListPage` (where the user sits during "Calling...") or should there be a transition to a separate "Calling..." overlay?
   - Recommendation: Keep it simple — add a `Cancel` button to `UserListPage` visible when `callStatus === 'calling'`, next to the existing "Calling..." spinner row. No new route or overlay needed. Planner should decide exact placement.

2. **Unmount cleanup responsibility**
   - What we know: Phase 4 SUMMARY.md left a TODO marker in `CallPage.tsx` for MediaStream unmount cleanup.
   - What's unclear: Should cleanup live in `CallPage` `useEffect` cleanup, or should `CallContext` add a provider-level cleanup effect?
   - Recommendation: Add a `useEffect` cleanup in `CallPage` that calls `hangUp()` on unmount (if `callStatus !== 'idle'`). This ensures tracks are stopped even if user navigates away via browser back button. `hangUp()` is already idempotent-safe in teardown.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useCallTimer` hook pattern with `setInterval` + `useEffect` cleanup is correct React 18 pattern | Code Examples, Pattern 2 | Low risk — standard React hooks pattern; alternative would be `useRef` for interval ID (no functional difference) |
| A2 | React 19 (version resolves to `react: ^19.2.6` in package.json) is fully compatible with all Phase 5 patterns | Standard Stack | Low risk — React 19 is backward-compatible with React 18 hooks patterns; no breaking changes for these patterns |

**All other claims verified against codebase or official specs in this session.**

---

## Sources

### Primary (HIGH confidence)
- Codebase: `frontend/src/contexts/CallContext.tsx` — existing teardown, localStreamRef, oniceconnectionstatechange handler [VERIFIED]
- Codebase: `frontend/src/pages/CallPage.tsx` — current UI structure, TODO markers [VERIFIED]
- Codebase: `frontend/src/test/setup.ts` — MockRTCPeerConnection, mockMediaStream shape [VERIFIED]
- Codebase: `frontend/package.json` + `node_modules/lucide-react/dist/esm/icons/` — icon availability confirmed [VERIFIED]
- Codebase: test run — 45 tests pass baseline confirmed [VERIFIED]
- `.planning/phases/05-call-controls/05-CONTEXT.md` — all locked decisions D-01 through D-13 [CITED]
- `.planning/phases/05-call-controls/05-UI-SPEC.md` — approved visual contract [CITED]
- `.planning/phases/04-1-1-call-core/04-05-SUMMARY.md` — Phase 4 deferred items [CITED]

### Secondary (MEDIUM confidence)
- MDN Web Docs — `MediaStreamTrack.enabled` — track toggle API behavior
  https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled
- W3C WebRTC 1.0 — `RTCIceConnectionState` enumeration values
  https://www.w3.org/TR/webrtc/#dom-rtciceconnectionstate

### Tertiary (LOW confidence)
- None — all claims verified at HIGH or MEDIUM level, or tagged [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — verified against installed package.json and node_modules
- Architecture: HIGH — read entire CallContext.tsx and CallPage.tsx; patterns are codebase-specific
- Pitfalls: HIGH — derived from actual code inspection (teardown, mock shape, stale closure patterns in place)
- Test gaps: HIGH — confirmed by reading setup.ts and existing test files

**Research date:** 2026-05-27
**Valid until:** This research is codebase-specific and does not expire. Re-read source files if CallContext or CallPage are modified before planning starts.
