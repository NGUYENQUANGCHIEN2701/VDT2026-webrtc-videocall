# VDT-WebRTC

## What This Is

Ứng dụng video call realtime cho phép người dùng thực hiện cuộc gọi video/audio 1-1 theo mô hình peer-to-peer sử dụng WebRTC. Người dùng đăng ký, đăng nhập, xem danh sách người dùng online và gọi trực tiếp — tất cả thông qua trình duyệt, không cần cài đặt thêm gì. Đây là bài deliverable cho chương trình Viettel Digital Talent (VDT), yêu cầu source code đầy đủ, database script, tài liệu setup và demo hoạt động thực tế.

## Core Value

Hai người dùng trên cùng mạng LAN có thể thực hiện cuộc gọi video/audio realtime ổn định, bắt đầu từ login đến kết nối WebRTC thành công trong vòng vài giây.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication & User Management**
- [ ] User đăng ký tài khoản với username/password
- [ ] User đăng nhập và nhận JWT token
- [ ] JWT được dùng để authenticate WebSocket connection và REST API
- [ ] Trạng thái online/offline tự động cập nhật khi login/logout/disconnect

**Core Video Call (1-1)**
- [ ] Danh sách user online hiển thị realtime (cập nhật khi có người join/leave)
- [ ] User có thể gọi video cho một user online khác
- [ ] User được gọi nhận thông báo incoming call và có thể accept/reject
- [ ] WebRTC P2P connection được thiết lập sau khi accept (video + audio)
- [ ] Signaling qua WebSocket: trao đổi SDP offer/answer và ICE candidates
- [ ] STUN server (Google public) để resolve ICE candidates trên LAN
- [ ] User có thể kết thúc cuộc gọi bất kỳ lúc nào
- [ ] Giao diện login screen hoạt động ổn định
- [ ] Giao diện danh sách user hoạt động ổn định
- [ ] Giao diện video call screen hoạt động ổn định

**Advanced Features (for high score)**
- [x] Screen sharing: chia sẻ màn hình trong cuộc gọi (thay thế hoặc kèm webcam) — Validated in Phase 06
- [ ] Group call: gọi nhóm 3+ người theo mô hình mesh (peer-to-peer giữa các cặp)
- [ ] Recording: ghi lại cuộc gọi bằng MediaRecorder API, lưu file xuống máy

**Deliverables**
- [ ] Source code đầy đủ (backend Spring Boot + frontend React)
- [ ] Database script (PostgreSQL schema + seed data)
- [ ] Tài liệu setup (README với hướng dẫn chạy local/LAN)
- [ ] Docker Compose để chạy toàn bộ stack bằng một lệnh

### Out of Scope

- TURN server / relay — Demo trên LAN, STUN đủ để resolve ICE candidates
- Mobile app (iOS/Android) — Web browser only
- File sharing trong cuộc gọi — Không có trong yêu cầu
- Cloud deployment / production scaling — Local/LAN demo
- End-to-end encryption (DTLS/SRTP tự triển khai) — WebRTC tự lo, không cần custom
- SFU/MCU architecture cho group call — Dùng mesh P2P để tránh độ phức tạp hạ tầng

## Context

- **Môi trường demo:** Local / LAN — không cần TURN server, Google STUN là đủ
- **Tech stack đã quyết định:** Spring Boot (Java) + React + PostgreSQL + JWT + WebSocket
- **Deadline:** Hơn 1 tháng — đủ thời gian xây dựng cả core lẫn advanced features
- **Mục tiêu điểm số cao:** Tất cả 3 advanced features (screen sharing, group call, recording) đều nằm trong scope
- **WebSocket signaling:** Spring WebSocket (STOMP over SockJS) hoặc raw WebSocket — cần quyết định ở phase planning
- **Group call topology:** Mesh P2P (mỗi participant kết nối trực tiếp với nhau), phù hợp cho nhóm nhỏ 3-5 người, tránh cần SFU server

## Constraints

- **Tech stack:** Spring Boot (Java) + React + PostgreSQL — đã quyết định, không thay đổi
- **Transport:** WebRTC cho media stream, WebSocket cho signaling — yêu cầu kỹ thuật bài
- **Network:** Demo trên LAN/localhost — không cần TURN relay
- **Deliverable format:** Source code + DB script + docs + demo — bắt buộc để hoàn thành bài
- **Timeline:** 1+ tháng — đủ để build toàn bộ features, không cần cut scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Spring Boot backend | Yêu cầu Java, quen thuộc với VDT stack | — Pending |
| React frontend | Component model phù hợp với call state phức tạp | — Pending |
| PostgreSQL | Relational, tốt cho user/session management | — Pending |
| JWT authentication | Stateless, dễ authenticate WebSocket connection | — Pending |
| Mesh topology cho group call | Tránh cần SFU server, phù hợp nhóm nhỏ | — Pending |
| Google STUN (stun.l.google.com) | Public, miễn phí, đủ cho LAN demo | — Pending |
| MediaRecorder API cho recording | Browser native, không cần server-side processing | — Pending |

## Current State

Phase 06 (screen-sharing) complete — `startScreenShare`/`stopScreenShare` via `replaceTrack`, Share button in CallPage control bar, Camera disabled-while-sharing.

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after initialization*
