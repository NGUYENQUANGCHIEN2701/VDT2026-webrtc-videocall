# Domain Pitfalls: WebRTC + Spring Boot Signaling

**Domain:** WebRTC video call application with Spring Boot signaling server
**Researched:** 2026-05-24
**Sources:** MDN Web Docs (WebRTC API, RTCPeerConnection, getUserMedia, MediaRecorder, Screen Capture API, Perfect Negotiation), Spring Framework reference docs (WebSocket STOMP authentication, security, performance, user destinations, interceptors)

---

## Critical Pitfalls

Mistakes that cause full demo failures, silent broken connections, or multi-week debugging spirals.

---

### C1: ICE Candidates Added Before Remote Description Is Set

**What goes wrong:** `addIceCandidate()` is called on a candidate that arrives before `setRemoteDescription()` has completed. The call silently fails or throws a DOM exception. Connection hangs in `checking` state indefinitely.

**Why it happens:** The signaling server may deliver ICE candidates very quickly after delivering the SDP. If candidates and the SDP handler are wired independently without coordination, candidates are applied before remote description is set.

**Consequences:** Call appears to connect on UI (WebSocket signaling succeeds) but no media arrives. `InvalidStateError: Cannot add ICE candidate when there is no remote SDP`. Intermittent — sometimes works if STUN takes long enough.

**Prevention:** Implement an ICE candidate queue on the receiver:
```javascript
let pendingCandidates = [];
let remoteDescriptionSet = false;

async function handleRemoteDescription(sdp) {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  remoteDescriptionSet = true;
  for (const c of pendingCandidates) {
    await pc.addIceCandidate(new RTCIceCandidate(c));
  }
  pendingCandidates = [];
}

function handleIceCandidate(candidate) {
  if (remoteDescriptionSet) {
    pc.addIceCandidate(new RTCIceCandidate(candidate));
  } else {
    pendingCandidates.push(candidate);
  }
}
```

**Phase:** Core Video Call (1-1) — surfaces immediately during first end-to-end call test.

---

### C2: SDP Offer/Answer Roles Confused (Local vs Remote Description)

**What goes wrong:** The caller sets the received answer as `setLocalDescription()` instead of `setRemoteDescription()`. `signalingState` enters an illegal state and connection never reaches `stable`.

**Why it happens:** "Local" = SDP you created. "Remote" = SDP you received. The rule is consistent regardless of caller/callee role.

**Prevention:**
```
Caller:  createOffer() → setLocalDescription(offer) → send offer
Callee:  receive offer → setRemoteDescription(offer) → createAnswer() → setLocalDescription(answer) → send answer
Caller:  receive answer → setRemoteDescription(answer)   ← now stable
```

**Detection:** `signalingState` stuck on `have-local-offer` on callee. `InvalidStateError` on description-setting calls.

**Phase:** Core Video Call (1-1) — surfaces in initial SDP exchange.

---

### C3: Spring WebSocket JWT Auth Applied at Wrong Layer

**What goes wrong:** JWT passed in HTTP `Authorization` header during WebSocket upgrade. Browsers cannot set custom headers on WebSocket handshakes — the token is never received; Spring returns 401.

**Prevention:** Two-layer strategy:
1. At handshake: pass JWT as query parameter (`ws://host/ws?token=<jwt>`) via `HandshakeInterceptor`
2. At STOMP layer: `ChannelInterceptor` on CONNECT frame:
```java
registration.interceptors(new ChannelInterceptor() {
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor
            .getAccessor(message, StompHeaderAccessor.class);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            accessor.setUser(jwtService.getPrincipal(token));
        }
        return message;
    }
});
```
Register the interceptor with `@Order(Ordered.HIGHEST_PRECEDENCE + 99)`.

**Detection:** HTTP 401 on WebSocket handshake, or `STOMP ERROR: Access Denied` after CONNECT.

**Phase:** Authentication & User Management — critical before any WebSocket signaling works.

---

### C4: CORS Misconfiguration Blocks WebSocket Handshake or REST Preflight

**What goes wrong:** Browser sends preflight OPTIONS for REST or upgrade for WebSocket. Spring returns no CORS headers. Browser blocks the connection.

**Why it happens:** CORS must be configured at three locations: REST endpoints, Spring Security filter, and WebSocket endpoint. Configuring only one breaks the others.

**Prevention:**
- Spring Security level: `.cors(cors -> cors.configurationSource(corsSource))`
- WebSocket endpoint: `setAllowedOriginPatterns("http://localhost:3000")` — use `setAllowedOriginPatterns`, not `setAllowedOrigins("*")` when credentials are involved
- Do NOT rely on `@CrossOrigin` alone when Spring Security is active

**Detection:** Browser DevTools shows OPTIONS returning 403 or no CORS headers; WebSocket upgrade shows `ERR_FAILED`.

**Phase:** Authentication & User Management — first thing that breaks when frontend connects.

---

### C5: `negotiationneeded` Fires Multiple Times — Renegotiation Loop / Glare

**What goes wrong:** During screen sharing or participant join, `addTrack()` is called and `negotiationneeded` fires. When both peers simultaneously trigger renegotiation, a glare condition occurs — both are in `have-local-offer` and neither can accept the other's offer.

**Prevention:** Implement the Perfect Negotiation pattern — assign polite/impolite roles (callee = polite, caller = impolite):
```javascript
let makingOffer = false;
const polite = /* callee is polite */;

pc.onnegotiationneeded = async () => {
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    signaler.send({ description: pc.localDescription });
  } finally {
    makingOffer = false;
  }
};

signaler.onmessage = async ({ description, candidate }) => {
  if (description) {
    const offerCollision = description.type === 'offer' &&
      (makingOffer || pc.signalingState !== 'stable');
    if (!polite && offerCollision) return; // impolite peer ignores collision
    await pc.setRemoteDescription(description); // polite peer rolls back automatically
    if (description.type === 'offer') {
      await pc.setLocalDescription();
      signaler.send({ description: pc.localDescription });
    }
  }
};
```

**Detection:** Console shows repeated `createOffer` calls. `signalingState` oscillates. Connection drops on screen share toggle.

**Phase:** Screen Sharing — also affects Group Call participant join.

---

### C6: React Component Unmount Does Not Close RTCPeerConnection

**What goes wrong:** Call screen unmounts but `pc.close()` is never called and tracks never stopped. Camera LED stays on. Next call fails with `NotReadableError: Device in use`.

**Prevention:**
```javascript
useEffect(() => {
  const pc = new RTCPeerConnection(config);
  pcRef.current = pc;

  return () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    pc.close();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };
}, []);
```
Apply same pattern for screen share streams — `getDisplayMedia` streams must be stopped separately.

**Phase:** Core Video Call (1-1) — critical for stable demo across multiple call cycles.

---

## Moderate Pitfalls

---

### M1: Spring WebSocket Disconnect Not Idempotent — Online Presence Breaks

**What goes wrong:** `SessionDisconnectEvent` fires multiple times per session. Non-idempotent handler marks user offline twice, causing duplicate broadcasts.

**Prevention:** Use `removeIfPresent` semantics. Key presence map on `sessionId`, not just username. Use `@EventListener(SessionDisconnectEvent.class)` for presence.

**Phase:** Authentication & User Management — presence feature.

---

### M2: `getUserMedia` Without Error Handling — Breaks Call Init at Demo Time

**Prevention:**
```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
} catch (err) {
  const messages = {
    NotAllowedError: 'Camera/microphone access denied. Check browser permissions.',
    NotFoundError: 'No camera or microphone found.',
    NotReadableError: 'Camera is in use by another application.',
  };
  showError(messages[err.name] || `Media error: ${err.message}`);
  return;
}
```
Use `ideal` constraints, not `exact` — `exact` throws `OverconstrainedError` on incompatible devices.

**Phase:** Core Video Call (1-1) — first functional milestone.

---

### M3: Spring STOMP User Destinations Misconfigured — Signaling Not Delivered

**Prevention:**
- Broker config must include `/queue`: `enableSimpleBroker("/topic", "/queue")`
- Client subscribes to `/user/queue/signal` (with `/user` prefix)
- Server calls `convertAndSendToUser(username, "/queue/signal", payload)` — no `/user` prefix in destination argument; Spring adds it

**Phase:** Core Video Call (1-1) — signaling phase.

---

### M4: Concurrent WebSocket Sends — `IllegalStateException` Crashes Session

**What goes wrong:** Multiple threads send to the same WebSocket session concurrently. JSR-356 prohibits concurrent sends. Session terminates.

**Prevention:**
```java
registration.setSendTimeLimit(15 * 1000).setSendBufferSizeLimit(512 * 1024);
```
Wrap raw `WebSocketSession` with `ConcurrentWebSocketSessionDecorator` if using low-level API.

**Phase:** Core Video Call (1-1) — under concurrent call activity.

---

### M5: Screen Sharing Track Not Replaced — Remote Gets Black Screen

**Prevention:**
```javascript
const sender = pc.getSenders().find(s => s.track?.kind === 'video');
await sender.replaceTrack(screenTrack); // no renegotiation needed

// Handle user stopping share via browser's native stop button
screenTrack.onended = () => stopScreenShare();
```
`replaceTrack()` swaps track without triggering `negotiationneeded`.

**Phase:** Screen Sharing — advanced feature.

---

### M6: Group Call Mesh — Wrong `RTCPeerConnection` Used for ICE/SDP

**What goes wrong:** ICE candidates from peer A applied to connection for peer B. The single-call `pc` global reference is ported to group calls without per-peer keying.

**Prevention:**
```javascript
const peerConnections = new Map(); // peerId -> RTCPeerConnection

function getOrCreateConnection(peerId) {
  if (!peerConnections.has(peerId)) {
    const pc = new RTCPeerConnection(iceConfig);
    pc.onicecandidate = (e) => e.candidate && sendToSignaling(peerId, { candidate: e.candidate });
    pc.ontrack = (e) => renderRemoteStream(peerId, e.streams[0]);
    peerConnections.set(peerId, pc);
  }
  return peerConnections.get(peerId);
}
```
All signaling messages must carry `fromPeerId`. On leave: `peerConnections.get(id)?.close(); peerConnections.delete(id)`.

**Phase:** Group Call — advanced feature.

---

## Minor Pitfalls

---

### N1: `iceConnectionState` `disconnected` Treated as Fatal

**Prevention:** Only close on `failed`/`closed`. On `disconnected`, call `pc.restartIce()` and wait — the state often recovers.

---

### N2: MediaRecorder MIME Type Not Checked — Silent Failure on Firefox/Safari

**Prevention:**
```javascript
const mimeType = ['video/webm;codecs=vp9','video/webm','video/mp4']
  .find(t => MediaRecorder.isTypeSupported(t)) || '';
const recorder = new MediaRecorder(stream, { mimeType });
recorder.onerror = (e) => showError(`Recording error: ${e.error}`);
```

---

### N3: SockJS Client URL Mismatches Spring Endpoint Path

**Prevention:** Align `registry.addEndpoint("/ws")` with the React `brokerURL: 'ws://localhost:8080/ws'`. Do not mix SockJS and native WebSocket URLs.

---

### N4: Video Element Missing `autoPlay muted playsInline`

**Prevention:**
```jsx
<video ref={localVideoRef} autoPlay muted playsInline />
```
`muted` prevents autoplay block and echo feedback. `playsInline` required for iOS Safari. Remote video should NOT have `muted` unless intentionally silencing.

---

### N5: Spring Security CSRF Blocks WebSocket Upgrade (403)

**Prevention:** Disable CSRF only for the WebSocket endpoint:
```java
http.csrf(csrf -> csrf.ignoringRequestMatchers("/ws/**"));
```

---

## Phase-Specific Warning Summary

| Phase | Pitfall | Mitigation |
|-------|---------|------------|
| Auth & User Management | C3 — JWT at wrong layer | ChannelInterceptor on STOMP CONNECT |
| Auth & User Management | C4 — CORS blocks preflight | Configure at Spring Security level |
| Auth & User Management | N5 — CSRF blocks upgrade | `ignoringRequestMatchers("/ws/**")` |
| Auth & User Management | M1 — duplicate disconnect events | Idempotent handler keyed by sessionId |
| Core Video Call (1-1) | C1 — ICE before remote SDP | ICE candidate queue on receiver |
| Core Video Call (1-1) | C2 — SDP role confusion | Strict local/remote role clarity |
| Core Video Call (1-1) | C6 — RTCPeerConnection leak | useEffect cleanup hook |
| Core Video Call (1-1) | M2 — getUserMedia no error handling | Typed catch with user-facing messages |
| Core Video Call (1-1) | M3 — STOMP destination misconfigured | Verify broker prefix and subscription path |
| Core Video Call (1-1) | M4 — concurrent sends crash session | Send time limit + buffer size config |
| Core Video Call (1-1) | N4 — video element attributes | `autoPlay muted playsInline` on JSX |
| Core Video Call (1-1) | N1 — premature call teardown | Only close on `failed`/`closed` |
| Screen Sharing | C5 — renegotiation glare | Perfect Negotiation pattern |
| Screen Sharing | M5 — remote gets black screen | `sender.replaceTrack()`, not `addTrack()` |
| Group Call | M6 — wrong peer connection | `Map<peerId, RTCPeerConnection>` |
| Group Call | C5 — glare on participant join | Polite/impolite roles from day one |
| Recording | N2 — unsupported codec | `MediaRecorder.isTypeSupported()` check |

---

## Sources

- MDN WebRTC Signaling and Video Calling (HIGH)
- MDN RTCPeerConnection reference (HIGH)
- MDN getUserMedia reference (HIGH)
- MDN Perfect Negotiation pattern (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder reference (HIGH)
- Spring Framework Reference — STOMP Token Authentication (HIGH)
- Spring Framework Reference — STOMP User Destinations (HIGH)
- Spring Framework Reference — WebSocket Transport Configuration (HIGH)
- Spring Security Reference — WebSocket Security (HIGH)
