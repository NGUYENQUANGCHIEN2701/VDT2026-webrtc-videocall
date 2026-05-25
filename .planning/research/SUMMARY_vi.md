# Tong hop nghien cuu -- VDT-WebRTC

**Tong hop:** 2026-05-24
**Du an:** WebRTC Video Call App (Spring Boot + React + PostgreSQL)
**Do tin cay:** HIGH cho ca 4 nhom nghien cuu

---

## Stack

Stack de xuat la Spring Boot 3.3.x (LTS) + React 18 + PostgreSQL 16, STOMP tren WebSocket native cho signaling va JJWT 0.12.6 cho JWT auth. Frontend dung Vite 5.x thay CRA (da deprecated), va @stomp/stompjs 7.x ket noi truc tiep khong can SockJS (SockJS la legacy, khong can tren LAN). Auth flow qua JwtChannelInterceptor tren STOMP CONNECT frame -- khong phai HTTP upgrade header (browser khong the set custom headers khi upgrade WebSocket). Spring Security, Spring Data JPA, Flyway, Lombok duoc quan ly boi Boot BOM tru JJWT (phai pin 0.12.6). Frontend state dung React Context + useReducer -- khong can Redux.

**Cac quyet dinh version chinh:**
- Spring Boot: 3.3.x (LTS, khong dung 4.0.x — giam rui ro deadline)
- JJWT: 0.12.6 — khai bao ro, dung verifyWith() thay setSigningKey() deprecated
- React: 18.x (hooks phu hop lifecycle WebRTC)
- Vite: 5.x (CRA deprecated)
- @stomp/stompjs: 7.x, WebSocket native, khong SockJS
- PostgreSQL: 16 (Alpine image cho Docker)
- ICE: Google public STUN (stun.l.google.com:19302) — mien phi, du cho LAN, khong can TURN

---

## Tieu chuan bat buoc (Table Stakes)

Cac tinh nang bat buoc. Thieu bat ky muc nao se lam demo hong:

- **Dang ky + dang nhap:** Username/password, JWT tra ve khi login, luu trong memory hoac sessionStorage
- **Danh sach user online (realtime):** WebSocket presence broadcast qua /topic/presence; auto-update join/leave khong can reload
- **Thong bao incoming call:** Modal fullscreen voi ten nguoi goi, Accept (xanh) va Reject (do), co nhac chuong loop
- **Accept / Reject call:** Reject gui call-reject; caller thay Call declined; auto-reject user-busy neu callee dang call
- **Mute mic / Camera toggle:** Toggle audioTrack.enabled / videoTrack.enabled; nut hien thi trang thai; avatar khi camera off
- **End call button:** Luon hien, mau do, cleanup tat ca tracks va dong RTCPeerConnection
- **Local video self-view:** Overlay nho (goc duoi phai, ~20% width), mirrored CSS scaleX(-1)
- **Remote video full-screen dominant:** video autoPlay playsInline day man hinh; avatar placeholder khi remote camera off
- **Connection status indicator:** Calling, Connecting, Connected (cham xanh + timer), Reconnecting
- **Call duration timer:** Bat dau dem khi connectionState la connected
- **Error state handling:** Thong bao de hieu cho ICE failure, getUserMedia denied, disconnect dot ngot

---

## Diem khac biet (Differentiators)

Ba tinh nang nang cao giup demo an diem — tat ca deu trong scope:

### Screen Sharing
Dung navigator.mediaDevices.getDisplayMedia({ video: true }), sau do sender.replaceTrack(screenTrack) de swap video sender khong can renegotiation. Khi user stop sharing (hoac native stop button), sender.replaceTrack(cameraTrack) de khoi phuc. Co the gui hint signal (screen-share-start / screen-share-stop) de remote update UI. Can Perfect Negotiation pattern de tranh glare khi replaceTrack.

### Group Call (Mesh P2P)
Duy tri Map peerId → RTCPeerConnection (moi peer 1 connection). Voi N participants: N*(N-1)/2 connections; moi peer upload N-1 streams. Phu hop 3-5 nguoi tren LAN. Khi D join, A/B/C tao connection moi va gui offer; D nhan 3 offers va gui 3 answers. Spring Boot chi relay, khong can room state. UI dung CSS Grid tu 1 tile len 2x2/3-cot khi join.

### Recording (Local Download)
Tao MediaRecorder tren composite MediaStream (local + remote tracks). Gom chunks dataavailable moi 1s (giam memory). Khi stop: tao Blob, tao object URL, auto download filename call-timestamp.webm. Kiem tra MediaRecorder.isTypeSupported() cho codec fallback (vp9,opus -> video/webm -> video/mp4). Khong can server.

---

## Kien truc

He thong co 3 layer: React browser client xu ly media va signaling client logic, Spring Boot backend lam signaling relay stateless, PostgreSQL luu user va (tuy chon) refresh tokens. Media stream chay P2P giua browsers — server khong dong cham audio/video. Presence state nam trong ConcurrentHashMap keyed by username → sessionId o backend, duoc populate boi SessionConnectedEvent va cleared boi SessionDisconnectEvent. Signaling la JSON gui den /app/signal; server doc truong to, stamp from tu JWT principal (JwtChannelInterceptor), route den /user/{to}/queue/signal. STUN chi do browser ICE agent su dung; backend khong tham gia.

Call lifecycle la state machine: IDLE -> CALLING/RINGING -> CONNECTING (SDP + ICE exchange) -> IN_CALL -> ENDING -> IDLE. Cac flag mic/camera/screen-sharing/recording la orthogonal trong IN_CALL. Schema DB toi gian: users (id, username, bcrypt password, created_at) va (tuy chon) refresh_tokens table; Flyway quan ly migrations, tao deliverable SQL.

---

## Pitfalls nghiem trong

Top 5 loi co the pha demo — kem cach phong tranh:

1. **ICE candidates den truoc khi remote description set (C1):** Queue ICE candidates; chi flush sau khi setRemoteDescription() xong.

2. **JWT WebSocket auth dat sai layer (C3):** Gui JWT trong STOMP CONNECT header, khong phai HTTP upgrade header; validate trong ChannelInterceptor.

3. **CORS sai cau hinh (C4):** Can config CORS o 3 noi: Spring Security, WebSocket endpoint, va WebMvcConfigurer; @CrossOrigin khong du khi Security bat.

4. **Khong cleanup RTCPeerConnection khi component unmount (C6):** useEffect cleanup goi track.stop() va pc.close(); neu khong camera LED sang va NotReadableError.

5. **Renegotiation glare khi screen sharing / join group (C5):** Implement Perfect Negotiation tu dau; callee la polite, caller la impolite.

---

## Thu tu build

Tam phase theo dependency (output cua phase truoc can cho phase sau):

1. **Backend Foundation** -- PostgreSQL schema (Flyway), UserService (BCrypt), JwtService (JJWT 0.12.6), AuthController (/api/auth/register, /api/auth/login), REST security filter chain, CORS config
2. **WebSocket Infrastructure** -- WebSocketConfig (STOMP broker, khong SockJS), JwtChannelInterceptor tren CONNECT, PresenceService (in-memory map qua SessionConnectedEvent), /topic/presence broadcast, /api/users/online REST
3. **React Auth + User List** -- Login/Register forms, JWT storage + Axios interceptor, STOMP client voi JWT header, /topic/presence subscription → live user list UI, app shell va routing
4. **Signaling + 1-1 Call Core** -- SignalingController (@MessageMapping), SignalMessage POJO, RTCPeerConnection setup, offer/answer/ICE flow voi ICE queue, call state machine, incoming call modal + ringtone, CallScreen UI
5. **Call Controls UI** -- Mic/camera toggle, end-call, timer, status overlay, cleanup hook, getUserMedia error handling
6. **Screen Sharing** -- getDisplayMedia wrapper, sender.replaceTrack(), Perfect Negotiation pattern, hint signal, UI button state
7. **Group Call Mesh** -- Map peerId → RTCPeerConnection, group-call signaling, join sequence, CSS Grid, peer leave cleanup
8. **Recording + Deliverables** -- MediaRecorder trên composite stream, Blob download, Docker Compose (postgres + backend + frontend), Flyway seed SQL, README setup

---

## Cau hoi mo

Quyet dinh can thong nhat truoc/ trong phase planning:

- **JWT lifetime strategy:** Dai (8-24h) cho demo vs ngan (15min) + refresh token rotation
- **Group call room persistence:** In-memory (don gian) vs DB-backed (cho phep reconnect)
- **Screen sharing + webcam overlay:** Co render PiP webcam tren screen share khong
- **Active speaker detection trong group call:** Su dung RTCStatsReport de phong to nguoi noi to (optional)
- **Error recovery / reconnect logic:** Khi iceConnectionState disconnected — restartIce() hay teardown

---

## Danh gia do tin cay

| Linh vuc | Do tin cay | Ghi chu |
|------|------------|-------|
| Stack | HIGH | Tat ca nguon tu Spring va MDN chinh thong |
| Features | HIGH | Tham khao MDN; state machine bao phu edge case |
| Architecture | HIGH | Pattern khop Spring STOMP + MDN WebRTC |
| Pitfalls | HIGH | Moi pitfall co nguon MDN/Spring voi chi tiet API ro rang |

Khong co gap lon. Nghien cuu du de bat dau planning roadmap khong can loop them. Phase 7 (Group Call) la phase rui ro cao nhat va can plan chi tiet hon khi den.
