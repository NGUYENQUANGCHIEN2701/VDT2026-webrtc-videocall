# Architecture

**Domain:** WebRTC video call with Spring Boot signaling server
**Project:** VDT-WebRTC — Viettel Digital Talent internship deliverable
**Researched:** 2026-05-24
**Confidence:** HIGH (MDN official docs + Spring official docs)

---

## Component Boundaries

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

Media streams flow P2P between browsers — the signaling server never touches media. STUN (`stun.l.google.com:19302`) is referenced only by the browser ICE agent.

---

## WebSocket Message Protocol

All messages are JSON sent to `/app/signal`. Server reads `to`, stamps `from` from JWT principal, routes to `/user/{to}/queue/signal`.

### Client → Server (`/app/signal`)

| `type` | Key Payload Fields | Description |
|--------|--------------------|-------------|
| `call-request` | `to, from` | Caller rings callee |
| `call-accept` | `to, from` | Callee accepts |
| `call-reject` | `to, from` | Callee rejects |
| `offer` | `to, from, sdp` | SDP offer from caller (post-accept) |
| `answer` | `to, from, sdp` | SDP answer from callee |
| `ice-candidate` | `to, from, candidate` | Trickled ICE candidate (bidirectional) |
| `hangup` | `to, from` | Either peer ends call |
| `group-call-init` | `to[], roomId` | Initiator invites group |
| `group-call-join` | `roomId, from` | Joiner signals presence |
| `group-call-leave` | `roomId, from` | Peer signals departure |

### Server → All (`/topic/presence`)

| `type` | Trigger | Payload |
|--------|---------|---------|
| `user-online` | `SessionConnectedEvent` | `{ username }` |
| `user-offline` | `SessionDisconnectEvent` | `{ username }` |

---

## Data Flow (Full Call Lifecycle)

### Phase 0 — Bootstrap (REST)
```
Browser ─── POST /api/auth/login ──► Spring Boot ──► PostgreSQL
        ◄── { jwt }
```

### Phase 1 — WebSocket Connect
```
Browser ─── WS upgrade /ws ──────► Spring Boot
        ─── STOMP CONNECT ──────►  (JwtChannelInterceptor validates JWT, sets principal)
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

### Phase 3 — SDP + ICE (server is transparent relay)
```
Caller: createOffer → setLocalDescription → send { type:"offer", sdp }
Server: routes to callee
Callee: setRemoteDescription → getUserMedia → createAnswer → setLocalDescription → send { type:"answer", sdp }
Server: routes to caller
Caller: setRemoteDescription
Both: ICE trickling begins → { type:"ice-candidate" } routed bidirectionally
P2P connection established → media flows browser-to-browser
```

### Phase 4 — Hangup
```
Either peer ─── { type:"hangup" } ──► Server ──► Other peer
Both: peerConnection.close(), tracks.stop()
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

-- Optional for token rotation
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Online presence: NOT in DB
-- Lives in ConcurrentHashMap<username, sessionId>
-- Populated by SessionConnectedEvent, cleared by SessionDisconnectEvent
```

---

## Group Call Mesh Architecture

For N participants, each maintains N-1 `RTCPeerConnection` objects (one per remote peer), stored in a `Map<username, RTCPeerConnection>`. Total connections = N*(N-1)/2. For 5 participants: 10 connections, 4 streams to upload per peer. Practical for LAN demo up to 5 users.

**Join sequence when peer D joins existing room {A, B, C}:**
1. D sends `group-call-join` with `roomId`
2. Server broadcasts to all room members
3. A, B, C each create a new `RTCPeerConnection` for D and send offers
4. D receives 3 offers, creates 3 connections, sends 3 answers
5. ICE trickling completes independently per pair

Spring Boot's role is identical to 1-1 calls — transparent relay, no room state required for routing.

---

## Browser-Side Advanced Features

### Screen Sharing
`sender.replaceTrack(screenTrack)` — no SDP renegotiation needed. Zero server involvement beyond an optional `{ type:"screen-share-start" }` hint message for the remote peer's UI indicator.

### Recording
`MediaRecorder` on a composite `new MediaStream([...localTracks, ...remoteTracks])`. Chunks collected in memory, assembled into a `.webm` blob on stop, downloaded via `<a download>`. Zero server involvement.

---

## Build Order (Hard Dependencies)

```
Phase 1: Backend Foundation
  → PostgreSQL schema, UserService (BCrypt), JwtService, AuthController, REST security filter

Phase 2: WebSocket Infrastructure
  → WebSocketConfig (STOMP broker), JwtChannelInterceptor, PresenceService,
    /api/users/online REST, /topic/presence broadcast

Phase 3: React Auth + User List
  → Login/Register forms, JWT storage, STOMP client with JWT header,
    presence subscription → live user list, basic UI shell

Phase 4: Signaling + 1-1 Call
  → SignalingController @MessageMapping("/signal"),
    SignalMessage POJO, RTCPeerConnection setup, offer/answer/ICE flow,
    CallScreen UI with local/remote video

Phase 5: Screen Sharing
  → getDisplayMedia wrapper, sender.replaceTrack(), optional hint message

Phase 6: Group Call Mesh
  → connections map (username → RTCPeerConnection), group-call-* messages,
    GroupCallScreen UI (N tiles)

Phase 7: Recording
  → MediaRecorder on composite stream, Blob download

Phase 8: Deliverables
  → Docker Compose, SQL seed script, README
```

---

## Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| WebSocket transport | Raw WebSocket (not SockJS) | SockJS fallback complexity irrelevant on LAN |
| JWT over WebSocket | `ChannelInterceptor` on STOMP CONNECT frame | Correct Spring pattern; NOT URL query param |
| JWT signing | HS256 symmetric secret | Simpler for demo; RS256 overkill |
| Presence storage | In-memory `ConcurrentHashMap` | Ephemeral by nature; DB adds no value |
| Group call topology | Mesh P2P | Avoids SFU server; works for LAN demo ≤5 peers |
| Screen sharing | `replaceTrack()` not renegotiation | No new offer/answer cycle needed |
| Recording | Browser-side MediaRecorder + local download | Zero server involvement |

---

## Open Questions for Phase Planning

- **Refresh token strategy:** Short-lived (15 min) + refresh token, or long-lived (8h) for demo simplicity?
- **Group call room persistence:** In-memory only (simpler) or DB-backed (enables reconnect)?
- **SockJS vs raw WS:** Recommend raw WS for simplicity; confirm at Phase 2 kickoff

---

## Sources

- MDN WebRTC Signaling and Video Calling (HIGH)
- MDN Perfect Negotiation Pattern (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- Spring WebSocket + STOMP documentation (HIGH)
- Spring Security + WebSocket JWT patterns (HIGH)
