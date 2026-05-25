# Yeu cau: VDT-WebRTC

**Dinh nghia:** 2026-05-24
**Gia tri cot loi:** Hai nguoi dung tren cung mang LAN co the thuc hien cuoc goi video/audio realtime on dinh, bat dau tu login den ket noi WebRTC thanh cong trong vai giay.

## Yeu cau v1

### Xac thuc

- [ ] **AUTH-01**: User co the dang ky tai khoan moi voi username va password
- [ ] **AUTH-02**: User co the dang nhap bang username/password va nhan JWT token
- [ ] **AUTH-03**: User co the dang xuat; session bi invalid va user duoc danh dau offline
- [ ] **AUTH-04**: JWT duoc dung de authenticate ca REST API va WebSocket connections

### Hien dien online

- [ ] **PRES-01**: User co the xem danh sach realtime cac user dang online (auto-update khi join/leave khong can reload)
- [ ] **PRES-02**: Trang thai online/offline tu dong cap nhat khi user login, logout, hoac disconnect

### Video Call Cot Loi (1-1)

- [ ] **CALL-01**: User co the khoi tao video call toi bat ky user online nao tu danh sach
- [ ] **CALL-02**: Nguoi nhan nhan thong bao incoming call (modal voi ten nguoi goi, nut Accept va Reject, co nhac chuong)
- [ ] **CALL-03**: User co the accept hoac reject incoming call
- [ ] **CALL-04**: Sau khi accept, WebRTC P2P video + audio connection duoc thiet lap giua hai peer
- [ ] **CALL-05**: Signaling thuc hien qua WebSocket (STOMP) trao doi SDP offer/answer va ICE candidates
- [ ] **CALL-06**: Dung Google public STUN server de resolve ICE candidates
- [ ] **CALL-07**: Cuoc goi khong duoc tra loi tu dong huy sau ~30 giay voi thong bao "No answer"
- [ ] **CALL-08**: Mot trong hai ben co the huy cuoc goi truoc khi ket noi duoc thiet lap

### Dieu khien cuoc goi & UX

- [ ] **CTRL-01**: User co the mute/unmute microphone trong cuoc goi
- [ ] **CTRL-02**: User co the bat/tat camera trong cuoc goi
- [ ] **CTRL-03**: User co the ket thuc cuoc goi bat ky luc nao; tat ca track va peer connection duoc cleanup
- [ ] **CTRL-04**: Hien thi timer thoi luong cuoc goi sau khi ket noi
- [ ] **CTRL-05**: Hien thi trang thai ket noi trong cuoc goi (Connecting... / Connected / Reconnecting... / Failed)
- [ ] **CTRL-06**: Local video self-view hien thi nho dang overlay (picture-in-picture, mirrored)
- [ ] **CTRL-07**: Remote video hien thi la view chinh toan man hinh voi overlay ten nguoi dung

### Man hinh UI

- [ ] **UI-01**: Man hinh Login/Register hoat dong va duoc style
- [ ] **UI-02**: Man hinh danh sach user online hien thi user dang ket noi voi nut goi
- [ ] **UI-03**: Man hinh video call 1-1 on dinh voi local/remote video va call controls

### Chia se man hinh

- [ ] **SCRN-01**: User co the chia se man hinh trong cuoc goi 1-1 hoac group
- [ ] **SCRN-02**: Chia se man hinh thay the video track qua `sender.replaceTrack()` (khong renegotiation toan bo)
- [ ] **SCRN-03**: User co the dung chia se man hinh va chuyen lai camera
- [ ] **SCRN-04**: Remote peer thay stream chia se man hinh ma khong can hanh dong them

### Group Call (Mesh P2P)

- [ ] **GRP-01**: User co the khoi tao group call bang cach moi nhieu user online (3-5 participants)
- [ ] **GRP-02**: Moi participant thiet lap ket noi P2P truc tiep voi tat ca participant khac (mesh topology)
- [ ] **GRP-03**: Participant moi co the tham gia group call dang dien ra va ket noi toi tat ca thanh vien hien co
- [ ] **GRP-04**: Participant roi group call duoc loai bo on dinh khong anh huong cac ket noi con lai
- [ ] **GRP-05**: UI group call hien thi tat ca video stream theo luoi dong

### Recording

- [ ] **REC-01**: User co the bat dau ghi lai cuoc goi dang hoat dong (1-1 hoac group)
- [ ] **REC-02**: Recording ghi ca local va remote audio/video streams
- [ ] **REC-03**: User co the dung ghi; file tu dong tai ve dang `.webm`
- [ ] **REC-04**: Hien thi chi bao recording (cham do + elapsed time) trong khi ghi

### Ha tang & Deliverables

- [ ] **INFRA-01**: Day du source code (Spring Boot backend + React frontend)
- [ ] **INFRA-02**: Docker Compose cho phep chay toan bo stack bang mot lenh
- [ ] **INFRA-03**: Database migration scripts (Flyway) cung cap versioned SQL schema nhu deliverable
- [ ] **INFRA-04**: README huong dan prerequisites, setup, va demo cho moi truong LAN

---

## Yeu cau v2

### Nang cap xac thuc

- **AUTH-V2-01**: Ho tro refresh token de tu dong gia han JWT
- **AUTH-V2-02**: OAuth login (Google, GitHub)
- **AUTH-V2-03**: Two-factor authentication

### Chat luong cuoc goi & giam sat

- **QUAL-01**: Chi bao chat luong hien thi loai ICE candidate (host / srflx)
- **QUAL-02**: Phat hien active speaker trong group call (phong to tile nguoi noi to)
- **QUAL-03**: Adaptive chat luong theo bandwidth

### Hop tac

- **COLLAB-01**: Chat text trong cuoc goi qua WebRTC data channel
- **COLLAB-02**: File transfer trong cuoc goi
- **COLLAB-03**: Whiteboard / annotation khi chia se man hinh

---

## Ngoai pham vi

| Tinh nang | Ly do |
|---------|--------|
| TURN server | Demo tren LAN — STUN da du de thanh cong; TURN tang phuc tap ha tang |
| SFU / MCU cho group call | Can media server rieng (mediasoup, Janus); mesh P2P du cho ≤5 peer |
| Server-side recording storage | Local `.webm` download la du; luu server tang backend complexity |
| Cloud / internet deployment | Ngoai scope; muc tieu la LAN demo |
| Mobile responsive layout | Chi desktop browser; khong can mobile layout |
| Push notifications (FCM/APNS) | Browser WebSocket du neu app dang mo |
| Virtual backgrounds / video filters | Can WebGL/TensorFlow.js; scope bung lon |
| End-to-end encryption ngoai WebRTC mac dinh | DTLS/SRTP tu dong; khong can them |
| User profile / avatar upload | Khong co trong yeu cau; tang phuc tap luu tru |

---

## Traceability

| Yeu cau | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| PRES-01 | Phase 2 | Pending |
| PRES-02 | Phase 2 | Pending |
| CALL-01 | Phase 4 | Pending |
| CALL-02 | Phase 4 | Pending |
| CALL-03 | Phase 4 | Pending |
| CALL-04 | Phase 4 | Pending |
| CALL-05 | Phase 2 | Pending |
| CALL-06 | Phase 2 | Pending |
| CALL-07 | Phase 4 | Pending |
| CALL-08 | Phase 4 | Pending |
| CTRL-01 | Phase 5 | Pending |
| CTRL-02 | Phase 5 | Pending |
| CTRL-03 | Phase 5 | Pending |
| CTRL-04 | Phase 5 | Pending |
| CTRL-05 | Phase 5 | Pending |
| CTRL-06 | Phase 5 | Pending |
| CTRL-07 | Phase 5 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 4 | Pending |
| SCRN-01 | Phase 6 | Pending |
| SCRN-02 | Phase 6 | Pending |
| SCRN-03 | Phase 6 | Pending |
| SCRN-04 | Phase 6 | Pending |
| GRP-01 | Phase 7 | Pending |
| GRP-02 | Phase 7 | Pending |
| GRP-03 | Phase 7 | Pending |
| GRP-04 | Phase 7 | Pending |
| GRP-05 | Phase 7 | Pending |
| REC-01 | Phase 8 | Pending |
| REC-02 | Phase 8 | Pending |
| REC-03 | Phase 8 | Pending |
| REC-04 | Phase 8 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 8 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41 (roadmap complete)
- Unmapped: 0

---
*Yeu cau duoc dinh nghia: 2026-05-24*
*Cap nhat lan cuoi: 2026-05-24 sau khi tao roadmap — 41 yeu cau da duoc map vao phases 1-8*
