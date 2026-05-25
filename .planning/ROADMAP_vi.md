# Roadmap: VDT-WebRTC

## Tong quan

Tam phases xay dung ung dung WebRTC video call tu backend foundation den deliverable hoan chinh co Docker va docs. Moi phase tao ra mot kha nang ro rang, co the test duoc. Bon phase dau tao ra cuoc goi 1-1 hoat dong; bon phase sau them screen sharing, group call, recording va dong goi. Moi phase chay duoc end-to-end truoc khi sang phase tiep theo.

## Cac phase

- [ ] **Phase 1: Backend Foundation** - REST API + JWT auth + database schema; server nhan register va login
- [ ] **Phase 2: WebSocket Infrastructure** - STOMP signaling relay + presence service; danh sach online cap nhat realtime
- [ ] **Phase 3: React Auth + User List** - UI Login/Register + danh sach online; user mo app va xem ai online
- [ ] **Phase 4: 1-1 Call Core** - WebRTC P2P video call end-to-end; hai user goi va thay video
- [ ] **Phase 5: Call Controls** - Mic/camera toggle, end-call, timer, status, self-view; UX control hoat dong khi call
- [ ] **Phase 6: Screen Sharing** - Chia se man hinh trong call khong renegotiate; peer thay ngay
- [ ] **Phase 7: Group Call (Mesh)** - 3-5 nguoi group call mesh P2P voi UI luoi dong
- [ ] **Phase 8: Recording + Deliverables** - Ghi cuoc goi + Docker Compose + README; project san sang nop

## Chi tiet tung phase

### Phase 1: Backend Foundation

**Muc tieu:** User co the dang ky, dang nhap, va nhan JWT token de authenticate ca REST va WebSocket
**Mode:** mvp
**Depends on:** Khong co (phase dau)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-01, INFRA-03
**Success Criteria** (dieu phai dung):

  1. User moi co the POST `/api/auth/register` voi username + password va nhan phan hoi thanh cong
  2. User da dang ky co the POST `/api/auth/login` va nhan JWT token hop le trong response body
  3. Request co JWT duoc chap nhan vao cac REST endpoint can auth khong bi 401
  4. Logout danh dau user offline (status cap nhat trong DB)
  5. Flyway migration scripts ton tai va chay tu dong khi startup, tao schema versioned

**Plans:** 3 plans
**Wave 1**

- [ ] 01-01-PLAN.md — Project scaffold (Maven, application.yml, Flyway V1, User entity/repo, Dockerfile, FlywayMigrationTest)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Security infrastructure (JwtService, JwtAuthenticationFilter, CustomUserDetailsService, SecurityConfig, GlobalExceptionHandler)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Auth endpoints (DTOs, AuthService, AuthController, GET /api/users/me, AuthControllerTest)

**UI hint:** no

### Phase 2: WebSocket Infrastructure

**Muc tieu:** Backend relay signaling giua client va broadcast presence realtime de biet ai online
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** PRES-01, PRES-02, CALL-05, CALL-06
**Success Criteria** (dieu phai dung):

  1. Client auth STOMP CONNECT bang JWT hop le duoc chap nhan; JWT sai bi tu choi
  2. Khi user connect, tat ca client khac nhan `/topic/presence` cap nhat online
  3. Khi user disconnect, tat ca client khac nhan cap nhat presence trong vai giay
  4. Message signaling gui vao `/app/signal` duoc route dung nguoi nhan thong qua JWT principal

**Plans:** TBD
**UI hint:** no

### Phase 3: React Auth + User List

**Muc tieu:** User mo app, register/login, va thay danh sach online cap nhat realtime
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** UI-01, UI-02
**Success Criteria** (dieu phai dung):

  1. Man hinh Login/Register hoat dong va duoc style; submit credentials dung se login va chuyen sang user list
  2. Man hinh user list hien thi user online voi nut goi ro rang
  3. Khi tab thu hai login, tab dau cap nhat danh sach tu dong (khong can refresh)
  4. Khi user logout, app quay ve login va ten user bien mat khoi danh sach cua nguoi khac

**Plans:** TBD
**UI hint:** yes

### Phase 4: 1-1 Call Core

**Muc tieu:** Hai user tren cung LAN co the khoi tao, chap nhan, va hoan tat cuoc goi P2P video/audio qua trinh duyet
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** CALL-01, CALL-02, CALL-03, CALL-04, CALL-07, CALL-08, UI-03
**Success Criteria** (dieu phai dung):

  1. Click "Call" ben canh user online tao incoming call modal o ben nhan voi ten nguoi goi, Accept/Reject, va nhac chuong
  2. Accept call thiet lap ket noi P2P; ca hai ben thay va nghe nhau trong vai giay
  3. Reject call dong modal o ca hai ben; ben goi thay thong bao "Call declined"
  4. Cuoc goi khong tra loi tu dong huy sau ~30 giay; ca hai ben thay "No answer"
  5. Mot ben co the huy cuoc goi truoc khi ket noi; ca hai ben quay ve idle
  6. Man hinh video call on dinh hien thi local va remote streams dong thoi

**Plans:** TBD
**UI hint:** yes

### Phase 5: Call Controls

**Muc tieu:** Trong cuoc goi, user co day du dieu khien mic, camera, end call; hien thi ket noi va thoi luong
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07
**Success Criteria** (dieu phai dung):

  1. Nut mute tat audio; click lai bat lai; icon the hien trang thai
  2. Nut camera tat video track; click lai bat lai
  3. Nut "End call" ket thuc ket noi hai ben, dung tat ca media tracks, quay ve user list
  4. Timer thoi luong bat dau dem tu luc ket noi, luon hien thi trong call
  5. Hien thi connection status (Connecting / Connected / Reconnecting / Failed) suot vong doi call
  6. Local video la overlay nho mirrored; remote video chiem view chinh voi ten remote

**Plans:** TBD
**UI hint:** yes

### Phase 6: Screen Sharing

**Muc tieu:** Trong cuoc goi 1-1 dang hoat dong, user chia se man hinh va peer thay ngay khong can thao tac them
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** SCRN-01, SCRN-02, SCRN-03, SCRN-04
**Success Criteria** (dieu phai dung):

  1. Nut "Share Screen" xuat hien trong call; click mo native screen picker
  2. Chon screen/window, peer thay screen ngay khong drop call/renegotiation toan bo
  3. Click "Stop Sharing" (hoac nut native) khoi phuc camera view cho ca hai ben
  4. Peer thay screen share tu dong, khong can hanh dong them

**Plans:** TBD
**UI hint:** yes

### Phase 7: Group Call (Mesh)

**Muc tieu:** 3-5 user tham gia group call, moi participant thay/nghe tat ca others qua mesh P2P
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** GRP-01, GRP-02, GRP-03, GRP-04, GRP-05
**Success Criteria** (dieu phai dung):

  1. User khoi tao group call bang cach chon nhieu user online (toi da 5); tat ca nhan incoming call
  2. Khi tat ca accept, moi browser thiet lap P2P connection toi tat ca other participant (N*(N-1)/2)
  3. Participant moi tham gia group call dang dien ra thiet lap ket noi voi tat ca thanh vien hien co va xuat hien trong grid
  4. Participant roi call duoc loai bo khoi grid trong vai giay; cac ket noi con lai khong bi anh huong
  5. Tat ca video streams hien thi trong grid layout dong, tu dong dieu chinh khi join/leave

**Plans:** TBD
**UI hint:** yes

### Phase 8: Recording + Deliverables

**Muc tieu:** User co the record cuoc goi va tai ve; project chay bang mot lenh va duoc tai lieu day du
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** REC-01, REC-02, REC-03, REC-04, INFRA-02, INFRA-04
**Success Criteria** (dieu phai dung):

  1. Nut "Record" co trong call; click bat dau ghi va hien thi cham do + elapsed timer
  2. Click "Stop Recording" tai ve file `.webm` chua ca audio/video local va remote
  3. Chay `docker compose up` tu root repo khoi dong toan bo stack (PostgreSQL + Spring Boot + React) khong can cau hinh tay
  4. README huong dan prerequisites, setup, va demo LAN ro rang; nguoi moi co the lam theo

**Plans:** TBD
**UI hint:** no

## Tien do

**Thu tu thuc thi:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 0/? | Not started | - |
| 2. WebSocket Infrastructure | 0/? | Not started | - |
| 3. React Auth + User List | 0/? | Not started | - |
| 4. 1-1 Call Core | 0/? | Not started | - |
| 5. Call Controls | 0/? | Not started | - |
| 6. Screen Sharing | 0/? | Not started | - |
| 7. Group Call (Mesh) | 0/? | Not started | - |
| 8. Recording + Deliverables | 0/? | Not started | - |
