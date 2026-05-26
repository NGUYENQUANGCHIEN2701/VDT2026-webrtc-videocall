# Phase 4: 1-1 Call Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 04-1-1-call-core
**Areas discussed:** Call state architecture, Incoming call subscription, ICE failure recovery, Ringtone

---

## Call State Architecture

**Q1: Where does WebRTC call state live?**

| Option | Description | Selected |
|--------|-------------|----------|
| CallContext mới | Separate context, imports useWebSocket() internally | ✓ |
| Mở rộng WebSocketContext | Add call state to existing context | |
| Custom hook useWebRTC, không context | Local state per component, no shared context | |

**Q2: What does CallContext expose?**

| Option | Description | Selected |
|--------|-------------|----------|
| Streams + status + actions | localStream, remoteStream, callStatus, peerUsername, startCall, acceptCall, rejectCall, hangUp | ✓ |
| RTCPeerConnection luôn | Expose raw peerConnection object | |
| Bạn quyết (Claude discretion) | Claude chooses API shape | |

**Q3: What are the callStatus states?**

| Option | Description | Selected |
|--------|-------------|----------|
| idle \| calling \| ringing \| connected \| ended | 5 states covering all Phase 4 success criteria | ✓ |
| idle \| calling \| connected \| ended | No explicit ringing state | |
| Bạn quyết (Claude discretion) | Claude defines state machine | |

**Q4: Where does CallProvider wrap in the component tree?**

| Option | Description | Selected |
|--------|-------------|----------|
| main.tsx, bên trong WebSocketProvider | BrowserRouter moved to main.tsx; CallProvider can useNavigate() | ✓ |
| Bên trong App.tsx, chỉ wrap protected routes | CallProvider only around UserListPage + CallPage | |

---

## Incoming Call Subscription

**Q1: Where does /user/queue/signal subscription live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Trong CallContext | Subscribes when STOMP client ready; subscription + state co-located | ✓ |
| Trong WebSocketContext | Add signal subscription alongside presence subscription | |
| Global callback: setSignalHandler() | WebSocketContext subscribes, dispatches via registered callback | |

**Q2: Where is IncomingCallModal rendered?**

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay trong App.tsx | Reads callStatus from CallContext, visible from any page | ✓ |
| Trực tiếp trong UserListPage | Modal inline in UserListPage only | |

**Q3: How does navigation to /call happen after accept?**

| Option | Description | Selected |
|--------|-------------|----------|
| acceptCall() trong CallContext gọi navigate('/call') | CallContext uses useNavigate() internally (works because BrowserRouter moved to main.tsx) | ✓ |
| IncomingCallModal tự navigate | Modal component calls navigate after acceptCall() | |

---

## ICE Failure Recovery

**Q1: ICE disconnect/fail strategy?**

| Option | Description | Selected |
|--------|-------------|----------|
| Simple teardown — hiện 'Connection lost', về idle | LAN rarely fails; teardown is sufficient for Phase 4 demo | ✓ |
| restartIce() — thử phục hồi rồi mới teardown | Attempt recovery before teardown; adds signaling complexity | |

**Q2: Treat 'disconnected' and 'failed' the same?**

| Option | Description | Selected |
|--------|-------------|----------|
| Khác nhau: disconnected chờ 2s, failed teardown ngay | Allow self-recovery window for transient disconnect | ✓ |
| Giống nhau: cả hai teardown ngay | Simplest; skip retry logic entirely | |

---

## Ringtone

**Q1: How is ringtone generated?**

| Option | Description | Selected |
|--------|-------------|----------|
| Web Audio API — synthesized beep | 800Hz oscillator, no audio file in repo | ✓ |
| HTML <audio> với file MP3/OGG | Real audio file in public/ | |
| Bỏ qua — chỉ visual notification | Doesn't satisfy ROADMAP success criteria | |

**Q2: Where does ringtone logic live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hook useRingtone(), gọi trong IncomingCallModal | Start on mount, stop on unmount; not in CallContext | ✓ |
| Trong CallContext, theo dõi callStatus | CallContext watches callStatus === 'ringing' | |

---

## Claude's Discretion

- STUN config: `stun:stun.l.google.com:19302` (already in PROJECT.md)
- Call timeout (CALL-07): Frontend `setTimeout(30_000)` on caller side; caller sends `call-end` signal on timeout
- Offer/answer collision: simple polite/impolite — caller always offers, callee always answers
- MediaStream acquisition: `getUserMedia({ video: true, audio: true })` called in `startCall()` and `acceptCall()`

## Deferred Ideas

- Mic/camera toggles → Phase 5
- Call duration timer + connection status → Phase 5
- Self-view picture-in-picture → Phase 5
- `restartIce()` reconnection → Phase 5 if needed
- Toast notification system → Phase 4 implementation decision (minimal toast for "Call declined" / "No answer")
