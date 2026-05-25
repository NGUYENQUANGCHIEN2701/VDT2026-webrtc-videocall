# Architecture

**Domain:** WebRTC video call voi Spring Boot signaling server
**Du an:** VDT-WebRTC — Viettel Digital Talent internship deliverable
**Nghien cuu:** 2026-05-24
**Do tin cay:** HIGH (MDN + Spring docs chinh thong)

---

## Phan tach thanh phan

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React)                         │
│  Auth Layer │ Signaling Client (STOMP) │ WebRTC Layer           │
│             │                          │ (RTCPeerConnection,    │
│             │                          │  MediaStream,          │
│             │                          │  MediaRecorder,        │
│             │                          │  getDisplayMedia)      │
└─────────────────────┬───────────────────────────────────────────┘
    REST (HTTP/JSON)   │   WebSocket (STOMP over raw WS)
───────────────────────┤────────────────────────────────────────────
┌─────────────────────┴───────────────────────────────────────────┐
│                    Spring Boot Backend                           │
│  AuthController  │  SignalingController  │  JwtChannelInterceptor│
│  UserController  │  PresenceService      │  WebSocketConfig      │
│  ───────────────────────────────────────────────────────────    │
│                      Service + JPA Layer                         │
└─────────────────────────────┬───────────────────────────────────┘
                               │
                        PostgreSQL
                    users, refresh_tokens
```

Media streams chay P2P giua browsers — signaling server khong dong cham media. STUN (`stun.l.google.com:19302`) chi duoc browser ICE agent su dung.

---

## WebSocket Message Protocol

Tat ca message la JSON gui den `/app/signal`. Server doc `to`, gan `from` tu JWT principal, route den `/user/{to}/queue/signal`.

### Client → Server (`/app/signal`)

| `type` | Payload chinh | Mo ta |
|--------|--------------------|-------------|
| `call-request` | `to, from` | Caller ring callee |
| `call-accept` | `to, from` | Callee accept |
| `call-reject` | `to, from` | Callee reject |
| `offer` | `to, from, sdp` | SDP offer tu caller (sau accept) |
| `answer` | `to, from, sdp` | SDP answer tu callee |
| `ice-candidate` | `to, from, candidate` | Trickled ICE candidate (2 chieu) |
| `hangup` | `to, from` | Mot ben ket thuc call |
| `group-call-init` | `to[], roomId` | Initiator moi group |
| `group-call-join` | `roomId, from` | Joiner thong bao tham gia |
| `group-call-leave` | `roomId, from` | Peer thong bao roi |

### Server → Tat ca (`/topic/presence`)

| `type` | Trigger | Payload |
|--------|---------|---------|
| `user-online` | `SessionConnectedEvent` | `{ username }` |
| `user-offline` | `SessionDisconnectEvent` | `{ username }` |

---

## Data Flow (Vong doi cuoc goi)

### Phase 0 — Bootstrap (REST)
```
Browser ─── POST /api/auth/login ──► Spring Boot ──► PostgreSQL
        ◄── { jwt }
```

### Phase 1 — WebSocket Connect
```
Browser ─── WS upgrade /ws ──────► Spring Boot
        ─── STOMP CONNECT ──────►  (JwtChannelInterceptor validate JWT, set principal)
        ◄── STOMP CONNECTED
        ─── SUBSCRIBE /topic/presence
        ─── SUBSCRIBE /user/queue/signal
            ◄── broadcast user-online to all subscribers
```

### Phase 2 — Call Initiation
```
Caller ─── { type:"call-request", to:callee } ──► Server ──► Callee /queue/signal
Callee ─── { type:"call-accept", to:caller } ──► Server ──► Caller /queue/signal
```

### Phase 3 — SDP + ICE (server chi relay)
```
Caller: createOffer → setLocalDescription → send { type:"offer", sdp }
Server: route den callee
Callee: setRemoteDescription → getUserMedia → createAnswer → setLocalDescription → send { type:"answer", sdp }
Server: route den caller
Caller: setRemoteDescription
Ca hai: ICE trickling → { type:"ice-candidate" } route 2 chieu
Ket noi P2P thiet lap → media chay browser-to-browser
```

### Phase 4 — Hangup
```
Mot ben ─── { type:"hangup" } ──► Server ──► Ben kia
Ca hai: peerConnection.close(), tracks.stop()
```

---

## Database Schema

```sql
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,     -- BCrypt hash
    created_at TIMESTAMP DEFAULT NOW()
);

-- Optional cho token rotation
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Online presence: KHONG luu DB
-- Nam trong ConcurrentHashMap<username, sessionId>
-- Populate boi SessionConnectedEvent, clear boi SessionDisconnectEvent
```

---

## Group Call Mesh Architecture

Voi N participants, moi participant duy tri N-1 `RTCPeerConnection` (mot cho moi remote peer), luu trong `Map<username, RTCPeerConnection>`. Tong ket noi = N*(N-1)/2. Voi 5 participants: 10 connections, moi peer upload 4 streams. Phu hop LAN demo toi da 5 users.

**Thu tu join khi peer D vao phong {A, B, C}:**
1. D gui `group-call-join` voi `roomId`
2. Server broadcast cho tat ca thanh vien
3. A, B, C tao `RTCPeerConnection` moi cho D va gui offers
4. D nhan 3 offers, tao 3 connections, gui 3 answers
5. ICE trickling hoan tat doc lap cho moi cap

Vai tro Spring Boot giong 1-1 calls — transparent relay, khong can room state de route.

---

## Tinh nang nang cao tren browser

### Screen Sharing
`sender.replaceTrack(screenTrack)` — khong can renegotiation. Khong can server, chi co the gui hint `{ type:"screen-share-start" }` de cap nhat UI ben remote.

### Recording
`MediaRecorder` tren composite `new MediaStream([...localTracks, ...remoteTracks])`. Gom chunks vao memory, tao `.webm` blob khi stop va download. Khong can server.

---

## Thu tu build (Hard Dependencies)

```
Phase 1: Backend Foundation
  → PostgreSQL schema, UserService (BCrypt), JwtService, AuthController, REST security filter

Phase 2: WebSocket Infrastructure
  → WebSocketConfig (STOMP broker), JwtChannelInterceptor, PresenceService,
    /api/users/online REST, /topic/presence broadcast

Phase 3: React Auth + User List
  → Login/Register forms, JWT storage, STOMP client voi JWT header,
    presence subscription → live user list, basic UI shell

Phase 4: Signaling + 1-1 Call
  → SignalingController @MessageMapping("/signal"),
    SignalMessage POJO, RTCPeerConnection setup, offer/answer/ICE flow,
    CallScreen UI voi local/remote video

Phase 5: Screen Sharing
  → getDisplayMedia wrapper, sender.replaceTrack(), optional hint message

Phase 6: Group Call Mesh
  → connections map (username → RTCPeerConnection), group-call-* messages,
    GroupCallScreen UI (N tiles)

Phase 7: Recording
  → MediaRecorder tren composite stream, Blob download

Phase 8: Deliverables
  → Docker Compose, SQL seed script, README
```

---

## Quyet dinh then chot

| Khu vuc | Quyet dinh | Ly do |
|------|----------|-----------|
| WebSocket transport | Raw WebSocket (khong SockJS) | SockJS fallback khong can tren LAN |
| JWT over WebSocket | `ChannelInterceptor` tren STOMP CONNECT frame | Pattern dung trong Spring; KHONG dung query param |
| JWT signing | HS256 symmetric secret | Don gian cho demo; RS256 la overkill |
| Presence storage | In-memory `ConcurrentHashMap` | Ephemeral; DB khong co gia tri |
| Group call topology | Mesh P2P | Tranh SFU server; phu hop LAN demo ≤5 peers |
| Screen sharing | `replaceTrack()` khong renegotiation | Khong can offer/answer moi |
| Recording | MediaRecorder tren browser + local download | Khong can server |

---

## Cau hoi mo cho phase planning

- **Refresh token strategy:** 15 phut + refresh token hay 8h cho demo?
- **Group call room persistence:** In-memory hay DB-backed (de reconnect)?
- **SockJS vs raw WS:** De xuat raw WS; can xac nhan khi Phase 2

---

## Sources

- MDN WebRTC Signaling and Video Calling (HIGH)
- MDN Perfect Negotiation Pattern (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- Spring WebSocket + STOMP documentation (HIGH)
- Spring Security + WebSocket JWT patterns (HIGH)
