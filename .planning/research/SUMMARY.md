# Research Summary -- VDT-WebRTC

**Synthesized:** 2026-05-24
**Project:** WebRTC Video Call App (Spring Boot + React + PostgreSQL)
**Confidence:** HIGH across all four research areas

---

## Stack

The recommended stack is Spring Boot 3.3.x (LTS) + React 18 + PostgreSQL 16, with STOMP over native WebSocket for signaling and JJWT 0.12.6 for JWT auth. On the frontend, Vite 5.x replaces the deprecated CRA, and @stomp/stompjs 7.x connects directly without SockJS (SockJS is a legacy fallback not needed on LAN). Auth flows through a JwtChannelInterceptor on the STOMP CONNECT frame -- not on the HTTP upgrade header (browsers cannot set custom headers on WebSocket upgrades). Spring Security, Spring Data JPA, Flyway, and Lombok are all managed by the Boot BOM except JJWT, which must be pinned at 0.12.6 explicitly. Frontend state is handled by React Context + useReducer -- Redux is unnecessary for this scope.

**Key version decisions:**
- Spring Boot: 3.3.x (LTS, not 4.0.x -- lower risk for deadline project)
- JJWT: 0.12.6 -- explicit version, use verifyWith() not deprecated setSigningKey()
- React: 18.x (hooks map naturally to WebRTC lifecycle)
- Vite: 5.x (CRA officially deprecated)
- @stomp/stompjs: 7.x, native WebSocket, no SockJS
- PostgreSQL: 16 (Alpine image for Docker)
- ICE: Google public STUN (stun.l.google.com:19302) -- free, sufficient on LAN, no TURN needed

---

## Table Stakes

Must-have features -- missing any of these breaks the demo:

- **User registration + login:** Username/password, JWT returned on login, stored in memory or sessionStorage
- **Online user list (realtime):** WebSocket presence broadcast via /topic/presence; auto-updates on join/leave without page reload
- **Incoming call notification:** Full-screen modal overlay with caller name, Accept (green) and Reject (red) buttons, looping ringtone audio
- **Accept / Reject call:** Reject sends call-reject signal; caller sees Call declined; auto-reject with user-busy if callee is already in a call
- **Mute mic / Camera toggle:** Toggle audioTrack.enabled / videoTrack.enabled; buttons show current state; show placeholder avatar when camera is off
- **End call button:** Always visible, red, cleans up all tracks and closes RTCPeerConnection on both sides
- **Local video self-view:** Small overlay (bottom-right, ~20% width), mirrored with CSS transform scaleX(-1)
- **Remote video full-screen dominant:** video autoPlay playsInline fills available space; show avatar placeholder when remote camera is off
- **Connection status indicator:** Calling, Connecting, Connected (green dot + timer), Reconnecting states surfaced visually
- **Call duration timer:** Elapsed counter starts when connectionState equals connected
- **Error state handling:** Human-readable messages for ICE failure, getUserMedia denied, unexpected disconnect

---

## Differentiators

Three advanced features that elevate the demo score -- all confirmed in scope:

### Screen Sharing
Use navigator.mediaDevices.getDisplayMedia({ video: true }), then sender.replaceTrack(screenTrack) to swap the video sender without triggering a full SDP renegotiation. When the user stops sharing (via the browser native stop button or the app button), call sender.replaceTrack(cameraTrack) to restore. Send an optional hint signal (screen-share-start / screen-share-stop) so the remote peer can update its UI label. Requires the Perfect Negotiation pattern to be in place to avoid glare during track replacement.

### Group Call (Mesh P2P)
Maintain a Map of peerId to RTCPeerConnection -- one connection per remote peer. For N participants: N*(N-1)/2 total connections; each peer uploads N-1 streams. Practical for 3-5 people on LAN. When peer D joins, existing members A/B/C each create a new RTCPeerConnection for D and send offers; D receives 3 offers and sends 3 answers. Spring Boot acts as a transparent relay -- no server-side room state required. UI renders a CSS Grid that expands from 1 tile to a 2x2 or 3-column layout as participants join.

### Recording (Local Download)
Create a MediaRecorder from a composite MediaStream combining local and remote tracks. Collect dataavailable chunks every 1 second (prevents large memory buildup). On stop: assemble Blob, create an object URL, auto-trigger download with filename call-timestamp.webm. Check MediaRecorder.isTypeSupported() for codec fallback (vp9,opus -> video/webm -> video/mp4). Zero server involvement.

---

## Architecture

The system has three layers: a React browser client handling all media and signaling client logic, a Spring Boot backend acting as a stateless signaling relay, and PostgreSQL storing only users and (optionally) refresh tokens. Media streams flow P2P between browsers -- the server never touches audio or video. Presence state lives in an in-memory ConcurrentHashMap keyed by username mapped to sessionId on the backend, populated by SessionConnectedEvent and cleared by SessionDisconnectEvent. All signaling messages are JSON sent to /app/signal; the server reads the to field, stamps from from the JWT principal (set by JwtChannelInterceptor), and routes to /user/{to}/queue/signal. STUN is referenced directly by the browser ICE agent; the backend is not involved.

The call lifecycle follows a clear state machine: IDLE -> CALLING/RINGING -> CONNECTING (SDP + ICE exchange) -> IN_CALL -> ENDING -> IDLE. Orthogonal boolean flags track mic, camera, screen-sharing, and recording sub-states independently within IN_CALL. The database schema is minimal: a users table (id, username, bcrypt password, created_at) and an optional refresh_tokens table; Flyway manages versioned migrations, producing the required deliverable SQL script.

---

## Critical Pitfalls

Top 5 most likely to break the demo -- with one-line prevention each:

1. **ICE candidates added before remote description is set (C1):** Queue incoming ICE candidates; flush the queue only after setRemoteDescription() resolves.

2. **Spring WebSocket JWT applied at wrong layer -- 401 on upgrade (C3):** Pass JWT in the STOMP CONNECT header, not the HTTP upgrade header; validate in a ChannelInterceptor on the CONNECT frame.

3. **CORS blocks REST preflight or WebSocket upgrade (C4):** Configure CORS at three locations -- Spring Security filter chain, WebSocket endpoint (setAllowedOriginPatterns), and WebMvcConfigurer; @CrossOrigin alone is not enough when Security is active.

4. **RTCPeerConnection and tracks not cleaned up on component unmount (C6):** useEffect cleanup must call track.stop() on all tracks and pc.close(); failure leaves the camera LED on and breaks the next call with NotReadableError.

5. **Renegotiation glare during screen sharing or group join (C5):** Implement the Perfect Negotiation pattern from day one -- assign callee as polite peer; impolite peer ignores colliding offers; polite peer rollbacks automatically.

---

## Build Order

Eight phases ordered by hard dependencies (each phase output is required by the next):

1. **Backend Foundation** -- PostgreSQL schema (Flyway), UserService (BCrypt), JwtService (JJWT 0.12.6), AuthController (/api/auth/register, /api/auth/login), REST security filter chain, CORS config
2. **WebSocket Infrastructure** -- WebSocketConfig (STOMP broker, no SockJS), JwtChannelInterceptor on CONNECT frame, PresenceService (in-memory map via SessionConnectedEvent), /topic/presence broadcast, /api/users/online REST endpoint
3. **React Auth + User List** -- Login/Register forms, JWT storage + Axios interceptor, STOMP client with JWT header, /topic/presence subscription to live user list UI, basic app shell and routing
4. **Signaling + 1-1 Call Core** -- SignalingController (@MessageMapping), SignalMessage POJO, RTCPeerConnection setup, offer/answer/ICE flow with ICE candidate queue, call state machine (IDLE -> CALLING -> CONNECTING -> IN_CALL -> IDLE), incoming call modal with ringtone, CallScreen UI with local/remote video elements
5. **Call Controls UI** -- Mic/camera toggle buttons, end-call button, call duration timer, connection status overlay, useEffect cleanup hook, getUserMedia error handling
6. **Screen Sharing** -- getDisplayMedia wrapper, sender.replaceTrack(), Perfect Negotiation pattern, optional hint signaling message, UI button state with Sharing screen label
7. **Group Call Mesh** -- Map of peerId to RTCPeerConnection, group-call signaling messages, group join sequence, N-tile CSS Grid layout (GroupCallScreen), per-peer ICE/SDP routing, peer leave cleanup
8. **Recording + Deliverables** -- MediaRecorder on composite stream with codec check, Blob download on stop, Docker Compose (postgres + backend + frontend), Flyway seed SQL script, README setup guide

---

## Open Questions

Decisions still to be made before or during phase planning:

- **JWT lifetime strategy:** Long-lived (8-24h) for demo simplicity vs. short-lived (15min) + refresh token rotation -- refresh token table is in schema but strategy is not locked
- **Group call room persistence:** In-memory only (simpler, loses state on server restart) vs. DB-backed room records (enables reconnect after brief disconnect) -- in-memory is likely sufficient for LAN demo
- **Screen sharing + webcam overlay:** Whether to render a small webcam PiP on top of the screen share feed -- adds UI complexity but strong demo moment
- **Active speaker detection in group call:** Whether to use RTCStatsReport audio levels to enlarge the loudest speaker tile -- optional polish, evaluate after mesh is working
- **Error recovery / reconnect logic:** When iceConnectionState goes disconnected -- call pc.restartIce() and wait, or tear down immediately; needs explicit decision in Phase 4

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All sources are official Spring and MDN documentation |
| Features | HIGH | MDN API references; call state machine covers all edge cases |
| Architecture | HIGH | Patterns match official Spring STOMP + MDN WebRTC guidance |
| Pitfalls | HIGH | Each pitfall sourced from MDN or Spring reference docs with specific API-level detail |

No significant gaps. Research is sufficiently complete to begin roadmap phase planning without further research loops. Phase 7 (Group Call) is the highest-risk phase and would benefit from deeper planning when reached.