# Cac bay ro ro: WebRTC + Spring Boot Signaling

**Domain:** WebRTC video call app voi Spring Boot signaling server
**Nghien cuu:** 2026-05-24
**Nguon:** MDN Web Docs (WebRTC API, RTCPeerConnection, getUserMedia, MediaRecorder, Screen Capture API, Perfect Negotiation), Spring Framework reference (WebSocket STOMP auth, security, performance, user destinations, interceptors)

---

## Bay nghiem trong

Loi co the lam demo hong, ket noi am tham bi vo, hoac debug keo dai.

---

### C1: Them ICE Candidate truoc khi set Remote Description

**Van de:** `addIceCandidate()` duoc goi truoc khi `setRemoteDescription()` hoan tat. Call treo o `checking` hoac nem DOM exception.

**Nguyen nhan:** ICE candidates co the den rat nhanh sau SDP. Neu xu ly doc lap khong dong bo, candidates se duoc add truoc khi remote description set xong.

**Hau qua:** UI co ve da ket noi, nhung khong co media. Loi `InvalidStateError: Cannot add ICE candidate when there is no remote SDP`. Thinh thoang moi bi.

**Phong tranh:** Queue ICE candidates o ben nhan:
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

**Phase:** Core Video Call (1-1) — xuat hien ngay khi test end-to-end.

---

### C2: Nham vai SDP Offer/Answer (Local vs Remote)

**Van de:** Caller set SDP answer vao `setLocalDescription()` thay vi `setRemoteDescription()`. `signalingState` vao trang thai sai, ket noi khong on dinh.

**Nguyen nhan:** Quy tac: "Local" la SDP ban tao ra, "Remote" la SDP nhan duoc — bat ke vai caller/callee.

**Phong tranh:**
```
Caller:  createOffer() → setLocalDescription(offer) → send offer
Callee:  receive offer → setRemoteDescription(offer) → createAnswer() → setLocalDescription(answer) → send answer
Caller:  receive answer → setRemoteDescription(answer)   ← on dinh
```

**Cach nhan biet:** `signalingState` bi ket o `have-local-offer` tren callee, hoac `InvalidStateError` khi set description.

**Phase:** Core Video Call (1-1) — ngay lan dau trao doi SDP.

---

### C3: JWT WebSocket Auth ap dung sai layer

**Van de:** JWT gui trong HTTP `Authorization` header khi WebSocket upgrade. Browser khong cho set custom header tren handshake, token khong den duoc, Spring tra 401.

**Phong tranh:** Chien luoc 2 tang:
1. Handshake: gui JWT trong query param (`ws://host/ws?token=<jwt>`) qua `HandshakeInterceptor`
2. STOMP: `ChannelInterceptor` tren CONNECT frame:
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
Dang ky interceptor voi `@Order(Ordered.HIGHEST_PRECEDENCE + 99)`.

**Cach nhan biet:** HTTP 401 tren WebSocket handshake, hoac `STOMP ERROR: Access Denied` sau CONNECT.

**Phase:** Authentication & User Management — phai dung truoc khi signaling hoat dong.

---

### C4: CORS cau hinh sai chan WebSocket/REST

**Van de:** Browser gui preflight OPTIONS hoac WebSocket upgrade bi chan do thieu CORS headers.

**Nguyen nhan:** CORS phai cau hinh o 3 noi: REST endpoints, Spring Security filter, va WebSocket endpoint. Chi mot noi se lam cac noi khac fail.

**Phong tranh:**
- Spring Security: `.cors(cors -> cors.configurationSource(corsSource))`
- WebSocket endpoint: `setAllowedOriginPatterns("http://localhost:3000")` — dung `setAllowedOriginPatterns`, khong dung `setAllowedOrigins("*")` khi co credentials
- Khong dua vao `@CrossOrigin` khi Spring Security bat

**Cach nhan biet:** DevTools cho thay OPTIONS tra 403 hoac khong co CORS headers; WebSocket upgrade `ERR_FAILED`.

**Phase:** Authentication & User Management — loi thuong xuat hien khi frontend connect.

---

### C5: `negotiationneeded` chay nhieu lan — Glare

**Van de:** Khi screen share hoac join group, `addTrack()` goi va `negotiationneeded` fire. Hai peer cung renegotiate dan den glare (ca hai cung `have-local-offer`).

**Phong tranh:** Implement Perfect Negotiation — phan vai polite/impolite (callee = polite, caller = impolite):
```javascript
let makingOffer = false;
const polite = /* callee la polite */;

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
    if (!polite && offerCollision) return; // impolite bo qua collision
    await pc.setRemoteDescription(description); // polite rollback tu dong
    if (description.type === 'offer') {
      await pc.setLocalDescription();
      signaler.send({ description: pc.localDescription });
    }
  }
};
```

**Cach nhan biet:** Console cho thay `createOffer` lap lai, `signalingState` dao dong, call rot khi screen share.

**Phase:** Screen Sharing va Group Call.

---

### C6: React component unmount khong dong RTCPeerConnection

**Van de:** Call screen unmount nhung `pc.close()` khong duoc goi, tracks khong stop. Camera LED van sang, call sau bi `NotReadableError: Device in use`.

**Phong tranh:**
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
Dung giong cach nay cho stream screen share — `getDisplayMedia` streams phai stop rieng.

**Phase:** Core Video Call (1-1) — quan trong de demo on dinh.

---

## Bay muc do vua

---

### M1: Spring WebSocket Disconnect khong idempotent — Presence hong

**Van de:** `SessionDisconnectEvent` co the fire nhieu lan. Xu ly khong idempotent se broadcast offline trung lap.

**Phong tranh:** Dung removeIfPresent. Key presence map theo `sessionId`, khong chi username. Su dung `@EventListener(SessionDisconnectEvent.class)`.

**Phase:** Presence.

---

### M2: `getUserMedia` khong xu ly loi — demo bi vo

**Phong tranh:**
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
Dung `ideal` constraints, khong dung `exact` de tranh `OverconstrainedError`.

**Phase:** Core Video Call (1-1).

---

### M3: Spring STOMP User Destinations sai — Signaling khong den

**Phong tranh:**
- Broker config phai co `/queue`: `enableSimpleBroker("/topic", "/queue")`
- Client subscribe `/user/queue/signal` (co prefix `/user`)
- Server goi `convertAndSendToUser(username, "/queue/signal", payload)` — khong co `/user` prefix o destination

**Phase:** Signaling.

---

### M4: Gui WebSocket dong thoi — `IllegalStateException`

**Van de:** Nhieu thread gui vao cung session, JSR-356 khong cho gui dong thoi.

**Phong tranh:**
```java
registration.setSendTimeLimit(15 * 1000).setSendBufferSizeLimit(512 * 1024);
```
Neu dung low-level API, wrap `WebSocketSession` voi `ConcurrentWebSocketSessionDecorator`.

**Phase:** Core Video Call (1-1).

---

### M5: Screen share khong replace track — Remote den man den

**Phong tranh:**
```javascript
const sender = pc.getSenders().find(s => s.track?.kind === 'video');
await sender.replaceTrack(screenTrack); // khong can renegotiation

screenTrack.onended = () => stopScreenShare();
```
`replaceTrack()` swap track khong can `negotiationneeded`.

**Phase:** Screen Sharing.

---

### M6: Group Call Mesh — ICE/SDP gan nham connection

**Van de:** ICE candidates tu peer A bi add vao connection cua peer B. Xay ra khi dung pc global cho group call.

**Phong tranh:**
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
Tat ca signaling messages can co `fromPeerId`. Khi leave: close va delete map.

**Phase:** Group Call.

---

## Bay nho

---

### N1: `iceConnectionState` `disconnected` bi coi la fatal

**Phong tranh:** Chi dong khi `failed`/`closed`. Neu `disconnected`, goi `pc.restartIce()` va doi — thuong tu phuc hoi.

---

### N2: MediaRecorder MIME type khong check — that bai am tham

**Phong tranh:**
```javascript
const mimeType = ['video/webm;codecs=vp9','video/webm','video/mp4']
  .find(t => MediaRecorder.isTypeSupported(t)) || '';
const recorder = new MediaRecorder(stream, { mimeType });
recorder.onerror = (e) => showError(`Recording error: ${e.error}`);
```
