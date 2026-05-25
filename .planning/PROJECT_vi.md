# VDT-WebRTC

## Du an la gi

Ung dung video call realtime cho phep nguoi dung thuc hien cuoc goi video/audio 1-1 theo mo hinh peer-to-peer su dung WebRTC. Nguoi dung dang ky, dang nhap, xem danh sach nguoi dung online va goi truc tiep — tat ca thong qua trinh duyet, khong can cai dat them gi. Day la bai deliverable cho chuong trinh Viettel Digital Talent (VDT), yeu cau source code day du, database script, tai lieu setup va demo hoat dong thuc te.

## Gia tri cot loi

Hai nguoi dung tren cung mang LAN co the thuc hien cuoc goi video/audio realtime on dinh, bat dau tu login den ket noi WebRTC thanh cong trong vong vai giay.

## Yeu cau

### Da kiem chung

(Chua co — can ship de validate)

### Dang hoat dong

**Xac thuc & Quan ly nguoi dung**
- [ ] User dang ky tai khoan voi username/password
- [ ] User dang nhap va nhan JWT token
- [ ] JWT dung de authenticate WebSocket connection va REST API
- [ ] Trang thai online/offline tu dong cap nhat khi login/logout/disconnect

**Video Call Cot Loi (1-1)**
- [ ] Danh sach user online hien thi realtime (cap nhat khi co nguoi join/leave)
- [ ] User co the goi video cho mot user online khac
- [ ] User duoc goi nhan thong bao incoming call va co the accept/reject
- [ ] WebRTC P2P connection duoc thiet lap sau khi accept (video + audio)
- [ ] Signaling qua WebSocket: trao doi SDP offer/answer va ICE candidates
- [ ] STUN server (Google public) de resolve ICE candidates tren LAN
- [ ] User co the ket thuc cuoc goi bat ky luc nao
- [ ] Giao dien login screen hoat dong on dinh
- [ ] Giao dien danh sach user hoat dong on dinh
- [ ] Giao dien video call screen hoat dong on dinh

**Tinh nang nang cao (de diem cao)**
- [ ] Screen sharing: chia se man hinh trong cuoc goi (thay the hoac kem webcam)
- [ ] Group call: goi nhom 3+ nguoi theo mo hinh mesh (peer-to-peer giua cac cap)
- [ ] Recording: ghi lai cuoc goi bang MediaRecorder API, luu file xuong may

**Deliverables**
- [ ] Source code day du (backend Spring Boot + frontend React)
- [ ] Database script (PostgreSQL schema + seed data)
- [ ] Tai lieu setup (README voi huong dan chay local/LAN)
- [ ] Docker Compose de chay toan bo stack bang mot lenh

### Ngoai pham vi

- TURN server / relay — Demo tren LAN, STUN du de resolve ICE candidates
- Mobile app (iOS/Android) — Chi web browser
- File sharing trong cuoc goi — Khong co trong yeu cau
- Cloud deployment / production scaling — Local/LAN demo
- End-to-end encryption (DTLS/SRTP tu trien khai) — WebRTC tu lo, khong can custom
- SFU/MCU architecture cho group call — Dung mesh P2P de tranh do phuc tap ha tang

## Boi canh

- **Moi truong demo:** Local / LAN — khong can TURN server, Google STUN la du
- **Tech stack da quyet dinh:** Spring Boot (Java) + React + PostgreSQL + JWT + WebSocket
- **Deadline:** Hon 1 thang — du thoi gian xay dung ca core lan advanced features
- **Muc tieu diem so cao:** Ca 3 advanced features (screen sharing, group call, recording) nam trong scope
- **WebSocket signaling:** Spring WebSocket (STOMP over SockJS) hoac raw WebSocket — can quyet dinh o phase planning
- **Group call topology:** Mesh P2P (moi participant ket noi truc tiep voi nhau), phu hop nhom nho 3-5 nguoi, tranh can SFU server

## Rang buoc

- **Tech stack:** Spring Boot (Java) + React + PostgreSQL — da quyet dinh, khong thay doi
- **Transport:** WebRTC cho media stream, WebSocket cho signaling — yeu cau ky thuat bai
- **Network:** Demo tren LAN/localhost — khong can TURN relay
- **Deliverable format:** Source code + DB script + docs + demo — bat buoc de hoan thanh bai
- **Timeline:** 1+ thang — du de build toan bo features, khong can cut scope

## Quyet dinh then chot

| Quyet dinh | Ly do | Ket qua |
|----------|-----------|---------|
| Spring Boot backend | Yeu cau Java, quen thuoc voi VDT stack | — Pending |
| React frontend | Component model phu hop voi call state phuc tap | — Pending |
| PostgreSQL | Relational, tot cho user/session management | — Pending |
| JWT authentication | Stateless, de authenticate WebSocket connection | — Pending |
| Mesh topology cho group call | Tranh can SFU server, phu hop nhom nho | — Pending |
| Google STUN (stun.l.google.com) | Public, mien phi, du cho LAN demo | — Pending |
| MediaRecorder API cho recording | Browser native, khong can server-side processing | — Pending |

---

## Tien hoa

Tai lieu nay se duoc cap nhat o cac moc chuyen phase va milestone.

**Sau moi lan chuyen phase** (qua `/gsd-transition`):
1. Yeu cau bi invalid? → Chuyen sang Out of Scope va ghi ly do
2. Yeu cau da validate? → Chuyen sang Validated kem tham chieu phase
3. Co yeu cau moi? → Them vao Active
4. Co quyet dinh moi? → Ghi vao Key Decisions
5. Muc "Du an la gi" con chinh xac? → Cap nhat neu thay doi

**Sau moi milestone** (qua `/gsd-complete-milestone`):
1. Review toan bo cac muc
2. Kiem tra Core Value — con la uu tien dung?
3. Audit Out of Scope — ly do con hop le?
4. Cap nhat Context theo trang thai hien tai

---
*Cap nhat lan cuoi: 2026-05-24 sau khi khoi tao*
