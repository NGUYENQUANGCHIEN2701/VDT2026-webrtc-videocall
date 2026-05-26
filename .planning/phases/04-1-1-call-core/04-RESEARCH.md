# Phase 4: 1-1 Call Core - Research

**Researched:** 2026-05-27
**Domain:** WebRTC P2P (RTCPeerConnection, getUserMedia), STOMP signaling integration, React Context + refs patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New `CallContext` (separate concern from `WebSocketContext`). `CallContext` imports `useWebSocket()` internally to send signals via `publish()`. `WebSocketContext` stays focused on transport + presence.
- **D-02:** `CallContext` exposes: `{ localStream, remoteStream, callStatus, peerUsername, startCall, acceptCall, rejectCall, hangUp }`. `RTCPeerConnection` is NOT exposed — kept private inside `CallContext`.
- **D-03:** `callStatus` type: `'idle' | 'calling' | 'ringing' | 'connected' | 'ended'`
- **D-04:** Provider order in `main.tsx`: `<BrowserRouter><AuthProvider><WebSocketProvider><CallProvider><App/></CallProvider></WebSocketProvider></AuthProvider>`. `BrowserRouter` moved to `main.tsx` (out of `App.tsx`) so `CallProvider` can use `useNavigate()` internally. `App.tsx` becomes a pure routes component.
- **D-05:** `CallContext` subscribes to `/user/queue/signal` when STOMP client activates. Signal handler dispatches by `type`: `call-request` → ringing, `call-accept` → connected, `call-decline` → teardown, `call-end` → teardown, `offer` → setRemoteDescription, `answer` → setRemoteDescription, `ice-candidate` → addIceCandidate.
- **D-06:** `<IncomingCallModal />` rendered as overlay in `App.tsx` (reads `callStatus === 'ringing'` from `useCall()`).
- **D-07:** Navigation to `/call` route: `acceptCall()` inside `CallContext` calls `navigate('/call')` via `useNavigate()`.
- **D-08:** Simple teardown strategy — no `restartIce()`. ICE failure → stop all `MediaStream` tracks, call `peerConnection.close()`, set `callStatus = 'ended'`, show "Connection lost" message, then reset to `'idle'`.
- **D-09:** Distinguish ICE states: `'disconnected'` → `setTimeout(teardown, 2000)` (browser may self-recover); `'failed'` → teardown immediately.
- **D-10:** Web Audio API — synthesized beep, no audio file. `AudioContext` → `OscillatorNode` (800 Hz, sine wave) with `GainNode` envelope, beep every 2s.
- **D-11:** `useRingtone()` custom hook used inside `IncomingCallModal`. Starts on mount, stops and closes `AudioContext` on unmount.

### Claude's Discretion

- **STUN config:** `{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }`
- **Call timeout (CALL-07):** Frontend `setTimeout(30_000)` on caller side. On timeout: send `{ type: 'call-end', to: peerUsername }` and return to idle. Callee receives `call-end` and dismisses with "No answer".
- **Offer/answer collision:** "Caller is impolite, callee is polite" — caller always creates offer, callee always creates answer.
- **MediaStream acquisition:** `getUserMedia({ video: true, audio: true })` called in `startCall()` (caller) and `acceptCall()` (callee) before offer/answer exchange.

### Deferred Ideas (OUT OF SCOPE)

- Mic/camera toggle buttons — Phase 5
- Call duration timer + connection status indicator — Phase 5
- Self-view picture-in-picture with drag — Phase 5 (Phase 4 has static fixed-position preview only)
- `restartIce()` reconnection — Phase 5
- Toast notification system upgrade to shadcn Sonner — Phase 5 if needed
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CALL-01 | User can initiate a video call to any online user from the user list | `startCall(username)` in CallContext; wire UserListPage Call button |
| CALL-02 | Callee receives incoming call notification (modal, caller name, Accept/Reject, ringtone) | IncomingCallModal + useRingtone hook; Web Audio API beep pattern |
| CALL-03 | User can accept or reject an incoming call | `acceptCall()` / `rejectCall()` in CallContext; signal `call-accept` / `call-decline` |
| CALL-04 | After acceptance, WebRTC P2P video+audio connection established | Full offer/answer + ICE candidate exchange via CallContext; track event wires remoteStream |
| CALL-07 | Unanswered calls auto-cancel after ~30s with "No answer" notification | 30s `setTimeout` on caller; send `call-end` signal on timeout; toast on callee side |
| CALL-08 | Either party can cancel before connection established | `hangUp()` sends `call-end` signal; teardown runs on both sides |
| UI-03 | 1-1 video call screen stable with local/remote video and call controls bar | CallPage with `<video>` refs wired to `localStream`/`remoteStream`; hang-up button |
</phase_requirements>

---

## Summary

Phase 4 is a pure-frontend WebRTC implementation. The backend `SignalController` is already complete — it relays messages from `/app/signal` to `/user/queue/signal` for the target user. The frontend needs four new artifacts: `CallContext` (all WebRTC and signaling logic), `IncomingCallModal` (overlay component), `CallPage` (video call screen at `/call`), and wired Call buttons in `UserListPage`.

The central implementation challenge is that `RTCPeerConnection` is a mutable browser object that does not fit naturally into React's rendering model. Event listeners on the peer connection capture stale closures if placed in `useState`, and the connection object must be held in a `useRef` to survive re-renders without triggering them. Compounding this, React 19 StrictMode (confirmed active in `main.tsx`) mounts+unmounts+remounts every component in development, which creates a double peer connection unless a guard ref protects the initialization path.

ICE candidate buffering is the most common silent failure in WebRTC signaling implementations: candidates arrive via the signal channel before `setRemoteDescription()` has been called, and adding them to a peer connection without a remote description throws an error or silently fails. The fix is a pending-candidate buffer array that is drained immediately after `setRemoteDescription()` resolves.

The project uses React 19.2.6 (not 18 as stated in CLAUDE.md — actual installed version is 19.2.6, confirmed from `package.json`). React 19's StrictMode behavior is identical to React 18's for `useEffect` double-invocation. No API differences affect this phase.

**Primary recommendation:** Hold `RTCPeerConnection` exclusively in a `useRef`. All signal handler state reads must go through refs (never closed-over `useState` values). Buffer ICE candidates in a `useRef` array until `setRemoteDescription` resolves. Gate the `useEffect` that creates the peer connection with a guard ref to survive StrictMode's double-mount.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WebRTC P2P connection | Browser (CallContext) | — | RTCPeerConnection is a browser API; all SDP/ICE logic lives in the client |
| Signaling relay | Backend (SignalController) | — | Already built; STOMP `convertAndSendToUser` routes to `/user/queue/signal` |
| Signal subscription | Browser (CallContext) | — | `useWebSocket().subscribe('/user/queue/signal', ...)` inside `onConnect` effect |
| Call state management | Browser (CallContext) | — | `callStatus`, `peerUsername`, `localStream`, `remoteStream` as React state |
| Incoming call UI | Browser (IncomingCallModal) | — | Reads `callStatus === 'ringing'` from CallContext; rendered in App.tsx |
| Video rendering | Browser (CallPage) | — | `<video>` element `srcObject` wired to streams via `useRef` |
| Ringtone synthesis | Browser (useRingtone hook) | — | Web Audio API; no server involvement |
| Auth identity | Backend (JwtChannelInterceptor) | — | Server overwrites `from` field with authenticated principal before relay |

---

## Standard Stack

### Core — All Already Installed

| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.6 | UI framework | Project standard; hooks match RTCPeerConnection lifecycle |
| @stomp/stompjs | 7.3.0 | STOMP WebSocket client | Already in use; `publish` / `subscribe` wrappers in `WebSocketContext` |
| react-router-dom | 6.30.3 | Routing + `useNavigate` | `CallProvider` needs `useNavigate()` for D-07 |
| lucide-react | 1.16.0 | Icon library | `PhoneOff`, `Phone`, `Loader2`, `Users` needed in Phase 4 UI |
| shadcn/ui (Button, Avatar, Skeleton) | installed | UI components | Already installed; IncomingCallModal uses Button + Avatar |

### Supporting — Browser Native APIs (No Install Required)

| API | Version | Purpose | When to Use |
|-----|---------|---------|-------------|
| `RTCPeerConnection` | Browser native | WebRTC P2P video/audio | Core of Phase 4 — create in `startCall()` / `acceptCall()` |
| `navigator.mediaDevices.getUserMedia` | Browser native | Acquire camera + mic stream | Before offer/answer exchange in both caller and callee paths |
| `AudioContext` + `OscillatorNode` + `GainNode` | Browser native | Synthesized ringtone | Inside `useRingtone()` hook on IncomingCallModal mount |
| `RTCSessionDescription` | Browser native | Wrap SDP offer/answer | Used with `setLocalDescription` / `setRemoteDescription` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `RTCPeerConnection` (native) | `simple-peer` library | simple-peer adds 50KB bundle and wraps APIs you already need to understand for Phase 5 screen sharing; native is clearer for debugging |
| Web Audio API (synthesized) | Audio file `.mp3` | Audio file adds binary to git; Web Audio API is zero-dependency and agreed in D-10/D-11 |
| Manual ICE candidate buffering | Perfect Negotiation spec (RFC 8829) | Full Perfect Negotiation adds complexity; D-04 context already decided "caller impolite, callee polite" lite version |

**No new packages to install.** Phase 4 is entirely native browser APIs + already-installed dependencies.

---

## Package Legitimacy Audit

Phase 4 installs no new external packages. All capabilities use:
- Browser-native WebRTC APIs (`RTCPeerConnection`, `getUserMedia`, Web Audio API)
- Already-installed project dependencies (`@stomp/stompjs`, `react-router-dom`, `lucide-react`, shadcn components)

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
UserListPage              CallContext                  SignalController (Backend)
     │                        │                               │
     │──startCall(user)───────►│                               │
     │                        │──getUserMedia()               │
     │                        │◄──localStream                 │
     │                        │──new RTCPeerConnection()      │
     │                        │──addTrack(tracks)             │
     │                        │──publish('/app/signal',       │
     │                        │    {type:'call-request',      │
     │                        │     to: user})────────────────►│
     │                        │                               │──convertAndSendToUser()──►Callee
     │  callStatus='calling'  │                               │
     │◄───────────────────────│                               │
                                                              │
Callee receives on /user/queue/signal:                        │
     │                        │◄──{type:'call-request'}───────│
     │◄──callStatus='ringing'─│                               │
     │                        │                               │
IncomingCallModal            │                               │
     │──acceptCall()──────────►│                               │
     │                        │──getUserMedia()               │
     │                        │◄──localStream                 │
     │                        │──new RTCPeerConnection()      │
     │                        │──publish('call-accept')───────►│──────────────────────►Caller
     │                        │──createAnswer() (after offer) │
                                                              │
Caller receives 'call-accept':                                │
     │◄──{type:'call-accept'}─│◄──────────────────────────────│
     │                        │──createOffer()                │
     │                        │──setLocalDescription(offer)   │
     │                        │──publish({type:'offer',       │
     │                        │           payload: sdp})──────►│──────────────────────►Callee
     │                        │                               │
Callee receives 'offer':                                      │
     │                        │──setRemoteDescription(offer)  │
     │                        │──drain ICE buffer             │
     │                        │──createAnswer()               │
     │                        │──setLocalDescription(answer)  │
     │                        │──publish({type:'answer'})─────►│──────────────────────►Caller
     │                        │                               │
Caller receives 'answer':                                     │
     │                        │──setRemoteDescription(answer) │
     │                        │──drain ICE buffer             │
     │                        │                               │
ICE candidates (both sides, trickle):                         │
     │                        │──icecandidate event ──────────►│──────────────────────►Peer
     │                        │◄──{type:'ice-candidate'}──────│◄──────────────────────Peer
     │                        │──addIceCandidate()            │
     │                        │                               │
     │                        │──track event ◄────────────────│ (when ICE connected)
     │                        │──remoteStream = event.streams[0]
     │                        │──callStatus='connected'       │
     │                        │──navigate('/call')            │
CallPage
     │──localVideoRef.srcObject = localStream
     │──remoteVideoRef.srcObject = remoteStream
```

### Recommended Project Structure

```
frontend/src/
├── contexts/
│   ├── AuthContext.tsx          # existing
│   ├── WebSocketContext.tsx     # existing
│   └── CallContext.tsx          # NEW — all WebRTC + signal dispatch logic
├── hooks/
│   └── useRingtone.ts           # NEW — Web Audio API synthesized beep
├── components/
│   ├── ProtectedRoute.tsx       # existing
│   └── IncomingCallModal.tsx    # NEW — overlay, reads callStatus==='ringing'
├── pages/
│   ├── AuthPage.tsx             # existing
│   ├── UserListPage.tsx         # MODIFIED — wire startCall, callStatus-aware buttons
│   └── CallPage.tsx             # NEW — video call screen at /call route
└── App.tsx                      # MODIFIED — move BrowserRouter out, add /call route,
                                 #   render <IncomingCallModal />, render toasts
```

### Pattern 1: RTCPeerConnection in a useRef (Stale Closure Prevention)

**What:** Hold `RTCPeerConnection` in a `useRef`, not `useState`. Event handlers that read peer connection state must use `pcRef.current` not closed-over values.

**When to use:** Everywhere in `CallContext` that touches the peer connection object.

```typescript
// Source: MDN RTCPeerConnection + React StrictMode docs
const pcRef = useRef<RTCPeerConnection | null>(null)
const localStreamRef = useRef<MediaStream | null>(null)
const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([])
const remoteDescSetRef = useRef(false)
const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// CORRECT: event handler reads from ref, never from closed-over state
function createPeerConnection(config: RTCConfiguration) {
  const pc = new RTCPeerConnection(config)

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      // publish reads peerUsernameRef.current to avoid stale closure
      publishSignal({ type: 'ice-candidate', to: peerUsernameRef.current!, payload: JSON.stringify(event.candidate) })
    }
  }

  pc.ontrack = (event) => {
    setRemoteStream(event.streams[0])
  }

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState
    if (state === 'disconnected') {
      teardownTimerRef.current = setTimeout(teardown, 2000)   // D-09
    } else if (state === 'failed') {
      clearTimeout(teardownTimerRef.current ?? undefined)
      teardown()                                               // D-09
    } else if (state === 'connected' || state === 'completed') {
      clearTimeout(teardownTimerRef.current ?? undefined)      // cancel grace window if recovered
      setCallStatus('connected')
    }
  }

  return pc
}
```

### Pattern 2: ICE Candidate Buffering (Trickle ICE Race Condition)

**What:** Incoming `ice-candidate` signals may arrive before `setRemoteDescription()` has been called. Buffer them in a ref array and drain after remote description is set.

**When to use:** In the `ice-candidate` signal handler and after every `setRemoteDescription()` call.

```typescript
// Source: MDN addIceCandidate + WebRTC connectivity docs
// In the signal handler for 'ice-candidate':
case 'ice-candidate': {
  const candidate = new RTCIceCandidate(JSON.parse(msg.payload))
  if (!remoteDescSetRef.current) {
    iceCandidateBufferRef.current.push(candidate)
  } else {
    pcRef.current?.addIceCandidate(candidate)
  }
  break
}

// Helper called after EVERY setRemoteDescription():
async function drainIceCandidateBuffer() {
  remoteDescSetRef.current = true
  for (const candidate of iceCandidateBufferRef.current) {
    await pcRef.current?.addIceCandidate(candidate)
  }
  iceCandidateBufferRef.current = []
}
```

### Pattern 3: STOMP Subscription Timing in CallContext

**What:** Subscribe to `/user/queue/signal` inside a `useEffect` that watches `client` becoming connected, NOT during render and NOT in the WebSocketContext `onConnect` callback (which is a different component's closure).

**When to use:** In `CallContext` — mirrors the pattern already used in `WebSocketContext.tsx` for presence subscription.

```typescript
// Source: WebSocketContext.tsx existing pattern (Phase 3)
// CallContext subscription:
useEffect(() => {
  if (!client?.connected) return

  const sub = subscribe('/user/queue/signal', (frame: IMessage) => {
    const msg = JSON.parse(frame.body) as SignalMessage
    handleSignal(msg)      // handleSignal reads refs, not state — no stale closure
  })

  return () => {
    sub?.unsubscribe()
  }
}, [client])   // re-runs when client becomes connected (or null on disconnect)
```

**Critical note:** The `subscribe` function from `WebSocketContext` calls `client?.subscribe(...)` — it returns `undefined` if `client` is null. The guard `if (!client?.connected) return` prevents subscribing when the client is disconnecting. The dependency must be `[client]` (the Client object reference), not `[client?.connected]` (a boolean that Vitest mocks might not reflect).

### Pattern 4: Call Teardown Sequence (Order Matters)

**What:** Teardown must stop tracks before closing the peer connection, and reset all refs before updating state (to prevent race conditions where re-renders trigger another teardown).

**When to use:** In `teardown()`, called from hangUp(), `call-end` signal handler, `call-decline` handler, ICE failure, and timeout.

```typescript
// Source: MDN MediaStream.getTracks() + RTCPeerConnection.close()
function teardown() {
  // 1. Cancel any pending timers first
  clearTimeout(teardownTimerRef.current ?? undefined)
  clearTimeout(callTimeoutRef.current ?? undefined)

  // 2. Stop all media tracks (releases camera/mic indicator)
  localStreamRef.current?.getTracks().forEach(track => track.stop())
  localStreamRef.current = null

  // 3. Close peer connection (fires no more events after close())
  pcRef.current?.close()
  pcRef.current = null

  // 4. Reset candidate buffer + flag
  iceCandidateBufferRef.current = []
  remoteDescSetRef.current = false

  // 5. Update React state LAST (after all refs are clean)
  setLocalStream(null)
  setRemoteStream(null)
  setPeerUsername(null)
  setCallStatus('ended')   // transitions to 'idle' after brief delay for toast
}
```

### Pattern 5: StrictMode Guard for RTCPeerConnection Creation

**What:** React 19 StrictMode (confirmed in `main.tsx`) runs `mount → cleanup → mount` in development. Without a guard, two `RTCPeerConnection` instances are created and the second one has no tracks. Use a guard ref that is set on first creation and checked before creating again.

**When to use:** In the `useEffect` that initializes `CallContext` subscriptions.

```typescript
// Source: React StrictMode docs (react.dev/reference/react/StrictMode)
// The RTCPeerConnection is NOT created in a useEffect — it is created imperatively
// inside startCall() and acceptCall() functions, which are triggered by user gestures.
// User gesture functions do NOT run twice in StrictMode — only useEffect setup/cleanup runs twice.
// Therefore: no StrictMode guard needed for RTCPeerConnection creation itself.
// The STOMP subscription useEffect needs proper cleanup (sub?.unsubscribe()) — already shown in Pattern 3.
```

**Important insight:** `RTCPeerConnection` is created inside `startCall()` and `acceptCall()` (event handler functions called on user click), not inside `useEffect`. Functions called by user gestures are NOT double-invoked by StrictMode. Only the subscription `useEffect` cleanup matters for StrictMode safety.

### Pattern 6: useRingtone Hook (Web Audio API Beep)

**What:** Synthesized ringtone using Web Audio API. Per D-10/D-11: 800 Hz sine wave, on 0.3s / off 1.7s, repeating.

**When to use:** Inside `IncomingCallModal` — mount starts beep, unmount stops and closes AudioContext.

```typescript
// Source: MDN Web Audio API docs
export function useRingtone() {
  useEffect(() => {
    let audioCtx: AudioContext | null = null
    let stopped = false
    let timeoutId: ReturnType<typeof setTimeout>

    function beep() {
      if (stopped || !audioCtx) return
      // New oscillator for each beep (oscillators cannot be restarted)
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      const now = audioCtx.currentTime
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
      // Schedule next beep: 0.3s on + 1.7s off = 2s cycle
      timeoutId = setTimeout(beep, 2000)
    }

    // AudioContext must be created in response to user gesture.
    // IncomingCallModal mounts after user interaction (either a STOMP message during
    // an active session — the STOMP CONNECT was a user-gesture-triggered action).
    // Chrome autoplay policy: AudioContext starts suspended if no prior user gesture.
    // Resume immediately to handle suspended state.
    audioCtx = new AudioContext()
    audioCtx.resume().then(() => {
      beep()
    })

    return () => {
      stopped = true
      clearTimeout(timeoutId)
      audioCtx?.close()
      audioCtx = null
    }
  }, [])
}
```

**AudioContext autoplay caveat:** Chrome's autoplay policy suspends `AudioContext` created without a prior user gesture. In this app, the incoming call arrives while the user is already interacting (they logged in and are on the UserListPage — the STOMP connection was established through user action). Call `audioCtx.resume()` immediately after creation to handle any suspended state. [ASSUMED: resume() will succeed because STOMP connection implies prior user engagement — but Chrome's policy is opaque and may still block in some scenarios. If ringtone is silent in testing, test `audioCtx.state` after `resume()` resolves.]

### Anti-Patterns to Avoid

- **Storing RTCPeerConnection in useState:** Causes re-renders on every state change, which breaks event listeners. Use `useRef` exclusively.
- **Reading state in ICE/track event handlers:** Closures capture stale state. Read `pcRef.current`, `peerUsernameRef.current`, etc. from refs.
- **Calling `addIceCandidate()` before `setRemoteDescription()`:** Throws `InvalidStateError` or silently fails. Always buffer.
- **Not stopping MediaStream tracks on cleanup:** Camera/mic indicator stays lit in the browser tab. Always call `track.stop()` in teardown.
- **Using `addStream()` instead of `addTrack()`:** `addStream()` is deprecated. Use `stream.getTracks().forEach(track => pc.addTrack(track, stream))`.
- **Setting `video.srcObject` via `useState`:** React re-renders cause `srcObject` to be reset. Use `videoRef.current.srcObject = stream` directly in a `useEffect` that watches the stream state.
- **Subscribing to STOMP outside `onConnect` / client-ready effect:** Messages sent before subscription are missed. The WebSocketContext already handles `onConnect` for presence; CallContext must similarly guard on `client?.connected`.
- **Not sending `call-end` signal before calling teardown locally:** The remote peer will never know the call ended and will remain in `calling`/`connected` state indefinitely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SDP offer/answer | Custom SDP parsing | `RTCPeerConnection.createOffer()` / `createAnswer()` | SDP is 100+ line binary format; browser handles codec negotiation |
| ICE connectivity | Manual STUN queries | `RTCPeerConnection` with `iceServers` config | ICE state machine is specified in RFC 8445; browser implements it |
| Camera/mic access | `navigator.mediaDevices` | Already the right API — don't abstract further | getUserMedia is the standard; adding an abstraction adds maintenance surface |
| Audio tone generation | MP3 file in repo | Web Audio API OscillatorNode | D-10 decision; no binary assets in git |
| WebSocket routing to specific user | DIY session registry | STOMP `convertAndSendToUser()` on backend | Already built in Phase 2; server owns the routing |

**Key insight:** WebRTC's RTCPeerConnection is itself "the library" — it implements ICE, DTLS, SRTP. The only hand-rolled piece is the signaling layer, which is already handled by the STOMP backend.

---

## Common Pitfalls

### Pitfall 1: ICE Candidate Race (Silent Failure)
**What goes wrong:** `addIceCandidate()` throws `InvalidStateError` or silently discards the candidate when called before `setRemoteDescription()`.
**Why it happens:** Trickle ICE means candidates arrive immediately after the offer/answer signal, often before the handler has time to call `setRemoteDescription()`. This is especially common on fast LAN connections.
**How to avoid:** Maintain `iceCandidateBufferRef` array. Drain it immediately after every `setRemoteDescription()` resolves. Set `remoteDescSetRef.current = true` as the gate.
**Warning signs:** Connection never reaches `connected` state; `iceConnectionState` stays at `checking` indefinitely; console shows `InvalidStateError: Failed to execute 'addIceCandidate'`.

### Pitfall 2: Stale peerUsername in Signal Handler
**What goes wrong:** The STOMP signal handler captures `peerUsername` (React state) in its closure at subscription time. If the state hasn't been set yet (e.g., handler fires immediately), `peerUsername` is `null`.
**Why it happens:** React state updates are asynchronous; the `useEffect` subscription callback closes over the state value at effect creation time, not at call time.
**How to avoid:** Mirror `peerUsername` to `peerUsernameRef` via a sync effect: `useEffect(() => { peerUsernameRef.current = peerUsername }, [peerUsername])`. In the signal handler, read `peerUsernameRef.current`.
**Warning signs:** ICE candidate signals are sent with `to: null`; signal never reaches remote peer.

### Pitfall 3: Video Element srcObject Assignment in React
**What goes wrong:** Setting `videoElement.srcObject = stream` inside a state change triggers a re-render, which resets the video element's DOM state.
**Why it happens:** React reconciles the DOM on every render; if the video element is re-created, its `srcObject` is lost even though the stream ref is still valid.
**How to avoid:** Always assign `srcObject` via a `useRef` to the video element, inside a `useEffect` that depends on the stream state:
```typescript
const remoteVideoRef = useRef<HTMLVideoElement>(null)
useEffect(() => {
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = remoteStream
  }
}, [remoteStream])
```
**Warning signs:** Black video element; stream exists in state but video doesn't play; audio heard but no video.

### Pitfall 4: RTCPeerConnection Not Closed on Component Unmount
**What goes wrong:** Navigating away from `/call` without calling `pc.close()` leaves the peer connection open, consuming bandwidth and ICE resources. The remote peer sees the connection as still alive.
**Why it happens:** CallPage unmounts but `teardown()` in CallContext was never called.
**How to avoid:** In CallPage's `useEffect` cleanup (or a `beforeunload` event if needed), call `hangUp()` from `useCall()`. Alternatively, detect navigation away from `/call` in a `useEffect` on `location.pathname`.
**Warning signs:** Camera indicator stays lit after navigating away; remote user still sees "Connected" state.

### Pitfall 5: MediaStream Tracks Not Stopped After Teardown
**What goes wrong:** The browser camera/microphone hardware indicator remains active after the call ends.
**Why it happens:** `peerConnection.close()` does not stop `MediaStream` tracks. Tracks must be explicitly stopped.
**How to avoid:** In `teardown()`, always call `localStreamRef.current?.getTracks().forEach(t => t.stop())` BEFORE `pc.close()`.
**Warning signs:** Browser shows camera/mic indicator is active on UserListPage after call ends.

### Pitfall 6: Double Signal on Caller When Callee Sends `call-accept`
**What goes wrong:** In the designed flow (D-05), when callee sends `call-accept`, the caller creates the offer. But if the caller also creates the peer connection eagerly in `startCall()` and then creates the offer in the `call-accept` handler, the order must be: (1) `call-accept` arrives, (2) `createOffer()`, (3) signal `offer`, (4) wait for `answer`. Creating the offer before the callee is ready results in an offer that arrives before the callee's peer connection exists.
**Why it happens:** Misunderstanding the signaling sequence — caller must NOT create the offer until `call-accept` is received.
**How to avoid:** In `startCall()`, do NOT call `createOffer()`. Only: `getUserMedia()`, `createPeerConnection()`, `addTrack()`, signal `call-request`. Create offer ONLY in the `call-accept` signal handler.
**Warning signs:** Callee receives `offer` signal before they have accepted the call; ICE state machine breaks.

### Pitfall 7: AudioContext Suspended / Silent Ringtone
**What goes wrong:** The ringtone in `useRingtone()` is completely silent. No error thrown.
**Why it happens:** Chrome creates `AudioContext` in `suspended` state if no recent user gesture preceded it. The oscillator starts but `AudioContext.state === 'suspended'` means no audio is produced.
**How to avoid:** Always call `audioCtx.resume()` after creating the context, and start the beep in the `.then()` callback. Log `audioCtx.state` in development to confirm `'running'`.
**Warning signs:** `audioCtx.state` is `'suspended'` even after `resume()` is called; incoming call is completely silent.

### Pitfall 8: STOMP subscription on `/user/queue/signal` vs `/user/queue/reply`
**What goes wrong:** Subscribing to the wrong destination means signals are never received.
**Why it happens:** The backend `SignalController` calls `convertAndSendToUser(message.getTo(), "/queue/signal", message)`. Spring's UserDestinationMessageHandler resolves this to `/user/{username}/queue/signal`. The client must subscribe to `/user/queue/signal` (without the username prefix — Spring adds it automatically for the authenticated user).
**How to avoid:** Subscribe to `/user/queue/signal` exactly. Verify in backend logs with DEBUG level: look for `Signal from X to Y type=offer` log lines.
**Warning signs:** No incoming signals ever received; `call-request` never triggers `callStatus='ringing'`.

---

## Code Examples

### Signaling Sequence: startCall() Path
```typescript
// Source: webrtc.org/getting-started/peer-connections + MDN getUserMedia
// Called when user clicks "Call" button for a specific user

async function startCall(targetUsername: string) {
  setPeerUsername(targetUsername)
  peerUsernameRef.current = targetUsername
  setCallStatus('calling')

  // 1. Acquire local media
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  localStreamRef.current = stream
  setLocalStream(stream)

  // 2. Create peer connection and add tracks
  const pc = createPeerConnection(ICE_CONFIG)
  stream.getTracks().forEach(track => pc.addTrack(track, stream))
  pcRef.current = pc

  // 3. Signal call-request to callee (DO NOT create offer yet)
  publishSignal({ type: 'call-request', to: targetUsername, payload: '' })

  // 4. Start 30s call timeout (D-03/CALL-07)
  callTimeoutRef.current = setTimeout(() => {
    publishSignal({ type: 'call-end', to: peerUsernameRef.current!, payload: '' })
    addToast({ message: 'No answer', style: 'amber' })
    teardown()
  }, 30_000)
}
```

### Signaling Sequence: acceptCall() Path
```typescript
// Source: webrtc.org/getting-started/peer-connections
async function acceptCall() {
  const target = peerUsernameRef.current!

  // 1. Acquire local media
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  localStreamRef.current = stream
  setLocalStream(stream)

  // 2. Create peer connection and add tracks
  const pc = createPeerConnection(ICE_CONFIG)
  stream.getTracks().forEach(track => pc.addTrack(track, stream))
  pcRef.current = pc

  // 3. Signal call-accept to caller (caller will now create offer)
  publishSignal({ type: 'call-accept', to: target, payload: '' })

  // 4. Navigate to /call route (D-07)
  navigate('/call')
  setCallStatus('connected')   // optimistic — will confirm via ICE 'connected'
}
```

### Signaling Sequence: offer/answer handlers
```typescript
// Source: MDN RTCPeerConnection setLocalDescription/setRemoteDescription

// Caller receives 'call-accept' — creates and sends offer
case 'call-accept': {
  clearTimeout(callTimeoutRef.current ?? undefined)   // cancel 30s timeout
  const pc = pcRef.current!
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  publishSignal({ type: 'offer', to: peerUsernameRef.current!, payload: JSON.stringify(offer) })
  navigate('/call')
  break
}

// Callee receives 'offer' — creates and sends answer
case 'offer': {
  const pc = pcRef.current!
  const offer = JSON.parse(msg.payload) as RTCSessionDescriptionInit
  await pc.setRemoteDescription(new RTCSessionDescription(offer))
  await drainIceCandidateBuffer()   // CRITICAL: drain before creating answer
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  publishSignal({ type: 'answer', to: peerUsernameRef.current!, payload: JSON.stringify(answer) })
  break
}

// Caller receives 'answer'
case 'answer': {
  const pc = pcRef.current!
  const answer = JSON.parse(msg.payload) as RTCSessionDescriptionInit
  await pc.setRemoteDescription(new RTCSessionDescription(answer))
  await drainIceCandidateBuffer()   // CRITICAL: drain buffered candidates
  break
}
```

### Video Element Wiring in CallPage
```typescript
// Source: MDN HTMLVideoElement srcObject
const localVideoRef = useRef<HTMLVideoElement>(null)
const remoteVideoRef = useRef<HTMLVideoElement>(null)
const { localStream, remoteStream } = useCall()

useEffect(() => {
  if (localVideoRef.current) localVideoRef.current.srcObject = localStream
}, [localStream])

useEffect(() => {
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
}, [remoteStream])
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `addStream()` to add media | `addTrack()` per track | Chrome 70+, 2018 | `addStream` removed from spec; use `addTrack` |
| `onaddstream` event | `ontrack` / `track` event | Chrome 70+, 2018 | `onaddstream` deprecated; `track` event is current |
| Waiting for all ICE candidates (vanilla ICE) | Trickle ICE | RFC 8840, universal since ~2017 | SDP sent immediately after `setLocalDescription`; ICE candidates sent as discovered |
| SockJS fallback for WebSocket | Native WebSocket | Modern browsers, universal 2020+ | No SockJS needed (already decided in CLAUDE.md) |
| `RTCPeerConnection.getLocalStreams()` | `getSenders()` / `getTransceivers()` | Chrome 72+ | `getLocalStreams()` removed from spec |

**Deprecated/outdated in this codebase's context:**
- `addStream()` / `removeStream()`: Removed from spec. Use `addTrack()`.
- `createOffer({ offerToReceiveAudio: 1 })` constraint syntax: Deprecated in favor of transceivers for explicit direction control. For Phase 4 simple 1-1 call, `createOffer()` with no arguments still works correctly.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AudioContext created during active STOMP session will resume successfully (no silent ringtone) | Pitfall 7, Pattern 6 | Incoming call is silent; user has no notification; call-request triggers ringing state but ringtone is mute |
| A2 | React 19 StrictMode's double-mount behavior is identical to React 18 for useEffect purposes | Summary | If React 19 changed StrictMode semantics, the subscription guard pattern may need adjustment |
| A3 | The STOMP signal subscription target `/user/queue/signal` is correct (not `/user/queue/reply`) | Pitfall 8 | Signals never arrive; call flow breaks completely |
| A4 | `event.streams[0]` is always populated in the `track` event when tracks are added via `addTrack(track, stream)` | Code Examples | If `streams` is empty, `remoteStream` is never set and remote video stays black; fallback: collect tracks manually into a new MediaStream |
| A5 | Chrome autoplay policy allows `<video autoPlay>` to play remote audio (not muted) without user gesture | UI-SPEC §9 | Remote audio is muted silently; user hears nothing; mitigation: check `video.play()` rejected promise |

**If this table were empty:** All claims verified — but A1, A3, A4, A5 each represent runtime-only behaviors that cannot be verified without a running browser + two peers.

---

## Open Questions (RESOLVED)

1. **React 19 actual version vs CLAUDE.md stated version**
   - What we know: `package.json` shows `react: ^19.2.6`. CLAUDE.md says "React 18.x".
   - What's unclear: Whether any Phase 4 React 19 behavioral changes (e.g., Actions, server-side features) affect the implementation.
   - Recommendation: No action needed. React 19's client-side hook semantics (useRef, useEffect, useState, useContext) are backward-compatible with React 18. The StrictMode double-mount behavior is identical. This discrepancy is a documentation gap in CLAUDE.md — no code impact.

2. **Signal handler async exception handling**
   - What we know: `handleSignal()` will call `pc.createOffer()`, `pc.setRemoteDescription()`, etc. — all async, all can throw.
   - What's unclear: If an error is thrown inside the signal handler (e.g., `getUserMedia` fails in `acceptCall()`), it will be an unhandled promise rejection since the STOMP callback is synchronous.
   - Recommendation: Wrap the entire `handleSignal` body in `try/catch` with a fallback `teardown()` call and a toast notification. The planner should include this as a task.

3. **peerUsername ref synchronization timing**
   - What we know: `startCall(username)` sets `peerUsername` state and `peerUsernameRef.current`. But if `call-request` arrives before `startCall` sets the ref (callee path), the callee's `peerUsername` is set from `msg.from` in the `call-request` handler.
   - What's unclear: Is there a race between the signal handler setting `peerUsernameRef.current` and subsequent signal handlers reading it?
   - Recommendation: In the callee's `call-request` handler: synchronously set `peerUsernameRef.current = msg.from` AND call `setPeerUsername(msg.from)`. This is safe because it happens in the signal callback (single JS event loop turn).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `RTCPeerConnection` | CALL-04 P2P video | Browser native | Universal in Chrome/Firefox/Edge | — (no fallback; required browser feature) |
| `navigator.mediaDevices.getUserMedia` | CALL-04 camera/mic | Browser native | Universal (HTTPS required) | Show error toast; teardown gracefully |
| `AudioContext` | CALL-02 ringtone | Browser native | Universal (may start suspended) | Silent call (ringtone optional per spec) |
| Vite dev server (HTTP) | getUserMedia security | ✓ | `http://localhost` counts as secure context | — |
| Backend Spring Boot | Signaling relay | Must be running on :8080 | Phase 2 complete | — (hard dependency) |
| PostgreSQL | User auth | Must be running | Phase 1 complete | — (hard dependency) |

**Missing dependencies with no fallback:**
- None — all required browser APIs are universally available. Backend must be running (Phase 1+2 prerequisite).

**Security context note:** `getUserMedia` requires a secure context (HTTPS or `http://localhost`). The Vite dev server runs on `http://localhost:5173` — this counts as a secure context and `getUserMedia` works without HTTPS. [VERIFIED: MDN getUserMedia docs]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 + @testing-library/react 16.3.2 + msw 2.14.6 |
| Config file | `frontend/vite.config.ts` (has `test:` block — `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`) |
| Quick run command | `npm test -- --run --reporter=verbose` (from `frontend/`) |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALL-01 | Clicking Call button calls `startCall(username)` | unit | `npm test -- --run src/test/CallContext.test.tsx` | No — Wave 0 |
| CALL-02 | IncomingCallModal renders when `callStatus === 'ringing'` | unit | `npm test -- --run src/test/IncomingCallModal.test.tsx` | No — Wave 0 |
| CALL-03 | acceptCall / rejectCall dispatch correct signals | unit | `npm test -- --run src/test/CallContext.test.tsx` | No — Wave 0 |
| CALL-04 | offer/answer/ICE signal handlers update peer connection | unit (mock RTCPeerConnection) | `npm test -- --run src/test/CallContext.test.tsx` | No — Wave 0 |
| CALL-07 | 30s timeout fires `call-end` signal | unit (fake timers) | `npm test -- --run src/test/CallContext.test.tsx` | No — Wave 0 |
| CALL-08 | hangUp sends `call-end` and calls teardown | unit | `npm test -- --run src/test/CallContext.test.tsx` | No — Wave 0 |
| UI-03 | CallPage renders video elements with correct refs | unit | `npm test -- --run src/test/CallPage.test.tsx` | No — Wave 0 |

**RTCPeerConnection mocking strategy:** jsdom (used by Vitest) does not implement `RTCPeerConnection`. Tests must either:
1. Mock `RTCPeerConnection` globally with `vi.stubGlobal('RTCPeerConnection', MockPeerConnection)` where `MockPeerConnection` is a class that tracks calls.
2. OR test at the CallContext level by mocking `startCall`, `acceptCall`, etc. and testing UI components in isolation.

**Recommended approach:** Test `CallContext` signal dispatch logic with a mock `RTCPeerConnection`. Test `IncomingCallModal` and `CallPage` with mocked `useCall()`. This follows the same pattern as `UserListPage.test.tsx` which mocks `useWebSocket()`.

### Sampling Rate
- **Per task commit:** `npm test -- --run` (full suite — fast at ~2s currently)
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/test/CallContext.test.tsx` — covers CALL-01, CALL-02 (ringing), CALL-03, CALL-04, CALL-07, CALL-08
- [ ] `frontend/src/test/IncomingCallModal.test.tsx` — covers CALL-02 (modal UI, Accept/Reject buttons)
- [ ] `frontend/src/test/CallPage.test.tsx` — covers UI-03 (video elements, hang-up button)
- [ ] `vi.stubGlobal('RTCPeerConnection', ...)` pattern needed in test setup or per-test

*(Note: `frontend/src/test/mocks/handlers.ts` and `server.ts` already exist from Phase 3 — reuse as-is)*

---

## Security Domain

### Applicable ASVS Categories (ASVS Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Indirectly | JWT carried from Phase 1+2; `CallContext` uses the already-authenticated STOMP client — no new auth surface |
| V3 Session Management | No | Session lifecycle unchanged from Phase 2 |
| V4 Access Control | Partial | Backend `SignalController` overwrites `from` with `principal.getName()` (T-2-02 spoofing mitigation already in place) |
| V5 Input Validation | Yes | SDP payload is an opaque string passed to `RTCSessionDescription` — browser validates; ICE candidate JSON parsed with `JSON.parse` + `new RTCIceCandidate()` — browser validates |
| V6 Cryptography | N/A | WebRTC mandates DTLS 1.2+ and SRTP by spec; no application-layer crypto needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Signal spoofing (fake `from` field) | Spoofing | Backend `SignalController.setFrom(principal.getName())` — already built in Phase 2 |
| SDP injection via `payload` field | Tampering | Browser validates SDP via `setRemoteDescription()`; malformed SDP throws `DOMException` — wrap in try/catch |
| ICE candidate IP leakage | Info Disclosure | LAN demo only — host candidates reveal LAN IPs. Acceptable per project scope. |
| Call to self | Edge case | Frontend self-filter already implemented in `UserListPage.tsx` (otherUsers filter); CallContext should also guard `startCall` if `targetUsername === username`. |
| Unauthenticated signal delivery | Spoofing | JwtChannelInterceptor rejects unauthenticated STOMP CONNECT frames — signals can only originate from authenticated sessions |

**Note on call-to-self guard:** UserListPage already filters `u !== username` (confirmed in `UserListPage.tsx` line 64). The `UserRow` component never shows the current user's row. CallContext should still guard `if (targetUsername === authUsername) return` as defense-in-depth, but it is not the primary enforcement point.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|------------------|
| Stack locked: Spring Boot + React + PostgreSQL | No deviation — Phase 4 is pure frontend React |
| WebRTC for media, WebSocket/STOMP for signaling | Followed — CallContext uses `publish('/app/signal')` for all signals |
| No SockJS — native WebSocket only | Already in WebSocketContext; CallContext inherits this |
| Google public STUN only, no TURN | ICE config: `{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }` |
| Demo on LAN/localhost | Host ICE candidates sufficient; no TURN needed |
| Context API + useReducer — no Redux | CallContext uses `useState` + `useReducer` pattern as in AuthContext |
| shadcn/ui official registry only | IncomingCallModal uses Button + Avatar (already installed) |
| Vite 5.x build tool | Already in use; no config changes needed for Phase 4 |

---

## Sources

### Primary (HIGH confidence)
- [MDN RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) — key methods, events, lifecycle
- [MDN iceConnectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) — all state values including disconnected/failed
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — error types, cleanup pattern
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API) — OscillatorNode, GainNode pattern
- [React StrictMode docs](https://react.dev/reference/react/StrictMode) — double-mount behavior, ref-based workaround
- [webrtc.org peer connections](https://webrtc.org/getting-started/peer-connections) — canonical caller/callee flow with code
- Backend codebase: `SignalController.java`, `SignalMessage.java`, `WebSocketConfig.java` — confirmed wire format and destination
- Frontend codebase: `WebSocketContext.tsx`, `App.tsx`, `main.tsx`, `UserListPage.tsx` — confirmed integration points

### Secondary (MEDIUM confidence)
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) — AudioContext suspended state behavior
- MDN track event documentation — `event.streams[0]` availability

### Tertiary (LOW confidence / ASSUMED)
- React 19 StrictMode identical semantics to React 18 for useEffect: [ASSUMED] based on React documentation and changelog review; no explicit React 19 StrictMode changelog entry found contradicting this.
- AudioContext resume success in active-session scenario: [ASSUMED] — runtime-only, not verifiable statically.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in `package.json`; no new installs
- Architecture: HIGH — backend wire format and destinations verified from source code
- WebRTC signaling sequence: HIGH — verified from MDN and webrtc.org canonical docs
- Pitfalls (ICE buffer, stale closure, video srcObject): HIGH — verified from MDN + React docs
- Web Audio API ringtone: HIGH — verified from MDN
- StrictMode double-mount: HIGH — verified from React docs
- AudioContext autoplay behavior: MEDIUM — Chrome-specific; may differ across browsers

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (WebRTC APIs and React hook semantics are stable; 30-day window is conservative)
