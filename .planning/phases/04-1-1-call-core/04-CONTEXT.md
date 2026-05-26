# Phase 4: 1-1 Call Core - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build WebRTC P2P video call end-to-end — pure frontend + WebRTC logic. Phase 4 adds: `CallContext` (call state management + signal dispatch), `IncomingCallModal` global overlay, `CallPage` with local + remote video streams, and call initiation from UserListPage ("Call" button wired up).

Backend `SignalController` and `SignalMessage` DTO from Phase 2 already relay messages — no backend changes needed. Phase 4 is complete when two browser tabs can initiate, accept, see/hear each other, and end a call.

**Not in Phase 4:** mic/camera toggles, duration timer, connection status indicator, self-view overlay (Phase 5); screen sharing (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Call State Architecture
- **D-01:** New `CallContext` (separate concern from `WebSocketContext`). `CallContext` imports `useWebSocket()` internally to send signals via `publish()`. `WebSocketContext` stays focused on transport + presence.
- **D-02:** `CallContext` exposes: `{ localStream, remoteStream, callStatus, peerUsername, startCall, acceptCall, rejectCall, hangUp }`. `RTCPeerConnection` is NOT exposed — kept private inside `CallContext`.
- **D-03:** `callStatus` type: `'idle' | 'calling' | 'ringing' | 'connected' | 'ended'`
  - `idle` — default, no active call
  - `calling` — current user initiated outgoing call, waiting for answer
  - `ringing` — incoming call received, waiting for user to accept/reject
  - `connected` — WebRTC P2P connection established, both peers on call
  - `ended` — call just ended (transient; resets to `idle` after cleanup)
- **D-04:** Provider order in `main.tsx`: `<BrowserRouter><AuthProvider><WebSocketProvider><CallProvider><App/></CallProvider></WebSocketProvider></AuthProvider>`. `BrowserRouter` moved to `main.tsx` (out of `App.tsx`) so `CallProvider` can use `useNavigate()` internally. `App.tsx` becomes a pure routes component.

### Incoming Call Subscription
- **D-05:** `CallContext` subscribes to `/user/queue/signal` when STOMP client activates. Signal handler dispatches by `type`:
  - `call-request` → set `callStatus='ringing'`, store `peerUsername` from `from` field
  - `call-accept` → callee accepted — create answer, set `callStatus='connected'`
  - `call-decline` → callee rejected — teardown, show "Call declined" briefly
  - `call-end` → remote hung up — teardown, return to idle
  - `offer` → set remote description (RTCSessionDescription)
  - `answer` → set remote description
  - `ice-candidate` → add ICE candidate to RTCPeerConnection
- **D-06:** `<IncomingCallModal />` rendered as overlay in `App.tsx` (reads `callStatus === 'ringing'` from `useCall()`). Visible from any protected page — UserListPage does not need to know about call state.
- **D-07:** Navigation to `/call` route: `acceptCall()` inside `CallContext` calls `navigate('/call')` via `useNavigate()` (works because `CallProvider` is inside `BrowserRouter` per D-04).

### ICE Failure Recovery
- **D-08:** Simple teardown strategy — no `restartIce()` in Phase 4. ICE failure → stop all `MediaStream` tracks, call `peerConnection.close()`, set `callStatus = 'ended'`, show "Connection lost" message, then reset to `'idle'`.
- **D-09:** Distinguish ICE states: `'disconnected'` → `setTimeout(teardown, 2000)` (browser may self-recover in transient glitch); `'failed'` → teardown immediately. Cancel the timeout if state recovers before 2s.

### Ringtone
- **D-10:** Web Audio API — synthesized beep, no audio file in repo. Pattern: `AudioContext` → `OscillatorNode` (800 Hz, sine wave) with `GainNode` envelope, beep pattern repeats every 2s using `setTimeout`.
- **D-11:** `useRingtone()` custom hook used inside `IncomingCallModal`. Starts oscillator on hook mount, stops and closes `AudioContext` on unmount. No state needed in `CallContext`.

### Claude's Discretion
- **STUN config:** `{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }` — already decided in PROJECT.md
- **Call timeout (CALL-07):** Frontend `setTimeout(30_000)` on the caller side. On timeout: caller sends `{ type: 'call-end', to: peerUsername }` signal and returns to idle. Callee receives `call-end` and dismisses ringing state with "No answer" message.
- **Offer/answer collision:** Use simple "caller is impolite, callee is polite" (RFC 8829 perfect negotiation lite). Caller always creates offer; callee always creates answer. No simultaneous-call scenario in Phase 4.
- **MediaStream acquisition:** `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` called in `startCall()` (caller) and `acceptCall()` (callee) before offer/answer exchange.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual & Design Contract (Phase 3)
- `.planning/phases/03-react-auth-user-list/03-UI-SPEC.md` — Locked dark emerald theme: color palette, spacing scale, typography, component styles. Phase 4 UI MUST follow this spec.
- `.planning/phases/03-react-auth-user-list/03-CONTEXT.md` — D-02 (router structure), D-04 (AuthContext), D-08/D-09/D-10/D-11 (WebSocketContext connect/subscribe patterns)

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 4 covers CALL-01, CALL-02, CALL-03, CALL-04, CALL-07, CALL-08, UI-03
- `.planning/ROADMAP.md` — Phase 4 success criteria (§Phase 4 section — 6 criteria)

### Backend Integration (already built — read before planning)
- `backend/src/main/java/com/vdt/websocket/dto/SignalMessage.java` — Wire DTO: `{ to, type, from, payload }`. `from` is always overwritten server-side.
- `backend/src/main/java/com/vdt/websocket/SignalController.java` — Routes `/app/signal` messages to `/user/queue/reply` of the target user
- `backend/src/main/java/com/vdt/websocket/WebSocketConfig.java` — STOMP endpoint `/ws`, user prefix `/user`, app prefix `/app`

### Existing Frontend Code
- `frontend/src/contexts/WebSocketContext.tsx` — `subscribe(destination, callback)` and `publish(destination, body)` already exposed. `client` state available for detecting STOMP readiness. `CallContext` uses these to subscribe + send signals.
- `frontend/src/pages/UserListPage.tsx` — `UserRow` component has `onClick={() => { /* TODO Phase 4 */ }}` stub on Call button — Phase 4 wires this to `startCall(user)` from `useCall()`.
- `frontend/src/App.tsx` — Current router lives here. D-04 requires moving `<BrowserRouter>` to `main.tsx` and making App a pure routes component.

### Project Constraints
- `CLAUDE.md` §Technology Stack — React 18, @stomp/stompjs 7.x (no SockJS), Axios 1.x, React Context API
- `CLAUDE.md` §ICE / STUN Configuration — Google public STUN only; no TURN

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WebSocketContext.publish(destination, body)` — send signal messages: `publish('/app/signal', JSON.stringify({ to, type, payload }))`
- `WebSocketContext.subscribe(destination, callback)` — subscribe to `/user/queue/signal` for incoming signals
- `WebSocketContext.client` — check `client !== null && client.connected` to know when to subscribe in CallContext
- shadcn/ui `Button`, `Avatar`, `Skeleton` — already installed and themed; use in CallPage and IncomingCallModal
- `frontend/src/lib/api.ts` — Axios instance; not needed for WebRTC/signaling but available for any REST calls

### Established Patterns
- Context pattern: `createContext` + `Provider` + exported `useX()` hook with null-check — follow exactly as in `AuthContext.tsx` and `WebSocketContext.tsx`
- Subscription inside `onConnect` callback — RESEARCH Pitfall 2 (already documented in WebSocketContext). `CallContext` MUST subscribe inside a `useEffect` that watches the `client` becoming active, NOT during render.
- Self-filter pattern: Phase 3 filters `onlineUsers` with `u !== username`. Same pattern needed: don't show "Call" button next to own username (already implemented).

### Integration Points
- `UserListPage.tsx` `UserRow` → `startCall(user)` from `useCall()` — wire the TODO stub
- `App.tsx` → add `/call` route: `<Route path="/call" element={<ProtectedRoute><CallPage /></ProtectedRoute>} />`
- `App.tsx` → render `<IncomingCallModal />` outside `<Routes>` so it overlays any route
- `main.tsx` → move `<BrowserRouter>` here, wrap around `<AuthProvider><WebSocketProvider><CallProvider>`

</code_context>

<specifics>
## Specific Ideas

- `callStatus` enum drives UI: `ringing` → render `IncomingCallModal`; `calling` → show outgoing call indicator on UserListPage (optional); `connected` → navigate to `/call`; `ended` → show brief toast then reset
- IncomingCallModal: dark card overlay (bg-slate-900, border-slate-700 — matching Phase 3 UI-SPEC card style), caller username, Avatar with initial, Accept button (emerald-500), Reject button (ghost/destructive)
- `useRingtone()` 800Hz sine wave beep: on for 0.3s, off for 1.7s, repeat. Stop on unmount to avoid AudioContext leak.
- ICE disconnected 2s grace window: `let teardownTimer: ReturnType<typeof setTimeout>`. On `'disconnected'`: `teardownTimer = setTimeout(teardown, 2000)`. On `'connected'` recovery: `clearTimeout(teardownTimer)`.

</specifics>

<deferred>
## Deferred Ideas

- Mic/camera toggle buttons — Phase 5 (CTRL-01, CTRL-02)
- Call duration timer + connection status indicator — Phase 5 (CTRL-04, CTRL-05)
- Self-view picture-in-picture overlay — Phase 5 (CTRL-06, CTRL-07)
- `restartIce()` reconnection on disconnect — Phase 5 if needed; Phase 4 does simple teardown
- Toast notification system (was mentioned as potentially needed in Phase 3 deferred) — Phase 4 can add a minimal one for "Call declined" / "Connection lost" / "No answer" messages if needed during implementation

</deferred>

---

*Phase: 04-1-1-call-core*
*Context gathered: 2026-05-27*
