# VDT-WebRTC

Ứng dụng video call realtime peer-to-peer sử dụng WebRTC, xây dựng bằng Spring Boot + React + PostgreSQL. Bài deliverable cho chương trình **Viettel Digital Talent (VDT)**.

---

## Tính năng

### Đã hoàn thành

- **Xác thực người dùng** — Đăng ký, đăng nhập, JWT stateless authentication
- **Trạng thái online/offline realtime** — Tự động cập nhật khi user kết nối / ngắt kết nối, không cần polling
- **Danh sách người dùng online** — Hiển thị live qua WebSocket, cập nhật tức thì khi có người join/leave
- **Signaling relay** — Server chuyển tiếp SDP offer/answer và ICE candidates giữa các peer qua STOMP
- **Giao diện đăng nhập / đăng ký** — Tabbed UI, validation, error handling
- **Giao diện danh sách người dùng** — Live presence rows, self-filter, empty state, logout

### Đang triển khai

- **1-1 Video Call** — WebRTC P2P connection, incoming call modal, accept/reject, ringtone, 30s timeout *(Phase 4 — đang xử lý)*

### Kế hoạch tiếp theo

- **Call Controls** — Mute mic, toggle camera, end call, duration timer, connection status *(Phase 5)*
- **Screen Sharing** — Chia sẻ màn hình trong cuộc gọi bằng `getDisplayMedia()` *(Phase 6)*
- **Group Call (Mesh)** — Gọi nhóm 3–5 người, kiến trúc mesh P2P *(Phase 7)*
- **Recording** — Ghi lại cuộc gọi bằng `MediaRecorder API`, download `.webm` *(Phase 8)*
- **Docker Compose** — Chạy toàn bộ stack bằng một lệnh *(Phase 8)*

---

## Tech Stack

### Backend
| Thành phần | Phiên bản | Vai trò |
|---|---|---|
| Spring Boot | 3.3.13 | Application framework |
| Spring Security | (managed) | JWT filter chain, endpoint protection |
| Spring WebSocket + STOMP | (managed) | Signaling relay, presence broadcast |
| Spring Data JPA + Hibernate | (managed) | ORM, database access |
| PostgreSQL JDBC | (managed) | Database driver |
| Flyway | (managed) | Schema migrations |
| JJWT | 0.12.x | JWT generate / validate |
| Lombok | (managed) | Boilerplate reduction |

### Frontend
| Thành phần | Phiên bản | Vai trò |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Vite | 8.x | Build tool / dev server |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui (Radix UI) | — | Component library |
| @stomp/stompjs | 7.x | STOMP WebSocket client |
| Axios | 1.x | HTTP REST client + JWT interceptor |
| React Router | 6.x | Client-side routing |

### Database & Infrastructure
| Thành phần | Phiên bản | Vai trò |
|---|---|---|
| PostgreSQL | 16 | Primary database |
| HikariCP | (managed) | Connection pooling |

---

## Mô hình hoạt động

Hệ thống hoạt động theo 3 giai đoạn nối tiếp nhau:

### Giai đoạn 1 — Xác thực (REST + JWT)

```
Client                          Spring Boot                    PostgreSQL
  │                                  │                              │
  ├─ POST /api/auth/register ────────►│                              │
  │   { username, password }         ├─ BCrypt hash password ───────►│
  │                                  │◄─ INSERT users row ───────────┤
  │◄─ 201 Created ───────────────────┤                              │
  │                                  │                              │
  ├─ POST /api/auth/login ───────────►│                              │
  │   { username, password }         ├─ SELECT + verify hash ────────►│
  │                                  │◄─ User found ─────────────────┤
  │                                  ├─ UPDATE status = ONLINE ──────►│
  │                                  ├─ generate JWT (HS256, 24h)    │
  │◄─ { token, username } ───────────┤                              │
  │                                  │                              │
```

Client lưu JWT vào memory (không localStorage). Mọi request REST sau đó đều gửi kèm header `Authorization: Bearer <token>`. `JwtAuthenticationFilter` intercept và xác thực token trước khi request đến controller.

### Giai đoạn 2 — Kết nối WebSocket và theo dõi presence

```
Client                          Spring Boot
  │                                  │
  ├─ WebSocket Upgrade (HTTP→WS) ───►│
  │                                  │
  ├─ STOMP CONNECT                   │
  │   header: Authorization: Bearer  │
  │   <token> ───────────────────────►│
  │                                  ├─ JwtChannelInterceptor.preSend()
  │                                  │   - Đọc token từ header CONNECT
  │                                  │   - Gọi JwtService.extractUsername()
  │                                  │   - Nếu hợp lệ: gắn Principal vào session
  │                                  │   - Nếu không hợp lệ: đóng kết nối
  │◄─ STOMP CONNECTED ───────────────┤
  │                                  ├─ PresenceEventListener.onConnect()
  │                                  │   - addSession(sessionId, username)
  │                                  │   - UPDATE status = ONLINE trong DB
  │                                  │   - broadcast { onlineUsers:[...] }
  │                                  │     tới /topic/presence
  │                                  │
  ├─ SUBSCRIBE /topic/presence ─────►│  (nhận danh sách user online)
  ├─ SUBSCRIBE /user/queue/signal ──►│  (nhận signaling message)
  │                                  │
```

`PresenceService` dùng `ConcurrentHashMap<sessionId, username>` để quản lý session. Một user mở nhiều tab vẫn được tính là online; chỉ khi **tất cả** tab đóng mới broadcast OFFLINE.

### Giai đoạn 3 — Signaling WebRTC (relay qua server)

```
Alice (caller)           Server (relay only)           Bob (callee)
  │                           │                            │
  │ [click Call]              │                            │
  ├─ SEND /app/signal ───────►│                            │
  │   { type:"call-request",  │                            │
  │     to:"bob", from:"alice"│  server overwrite "from"   │
  │     (bị ignore) }         │  bằng Principal            │
  │                           ├─ convertAndSendToUser ─────►│
  │                           │   "bob", "/queue/signal"   │
  │                           │   { type:"call-request",   │
  │                           │     from:"alice" (đúng) }  │
  │                           │                            │ [modal hiện]
  │                           │◄─ SEND /app/signal ────────┤
  │                           │   { type:"call-accepted",  │
  │                           │     to:"alice" }           │
  │◄─ /user/queue/signal ─────┤                            │
  │                           │                            │
  │  [trao đổi SDP offer/answer + ICE candidates tương tự] │
  │                           │                            │
  │◄══════════ WebRTC P2P — media stream trực tiếp ════════►│
  │            (server KHÔNG tham gia vào media)           │
```

Server chỉ relay signal — không xử lý, không lưu, không decode payload. Field `from` luôn bị overwrite bằng `principal.getName()` từ JWT để tránh giả mạo danh tính.

---

## Kiến trúc hệ thống

```
Browser (React)
    │
    ├─ HTTP REST (JWT)──────────► Spring Boot
    │                              ├── AuthController      /api/auth/*
    │                              ├── UserController      /api/users/*
    │                              ├── JwtAuthFilter       (filter chain)
    │                              ├── SecurityConfig      (permit/protect rules)
    │                              └── PostgreSQL          users table
    │
    └─ WebSocket/STOMP ──────────► Spring Boot
                                   ├── JwtChannelInterceptor   (auth CONNECT)
                                   ├── PresenceEventListener   (connect/disconnect)
                                   ├── PresenceService         (session registry)
                                   ├── SignalController        /app/signal → relay
                                   └── STOMP Message Broker
                                       ├── /topic/presence     (broadcast tới tất cả)
                                       └── /user/queue/signal  (private per-user)
```

**Hai kênh truyền tải song song:**
- **REST** — Stateless, mỗi request mang JWT. Dùng cho auth và query dữ liệu.
- **WebSocket/STOMP** — Persistent connection, xác thực 1 lần lúc CONNECT. Dùng cho presence realtime và signaling.

---

## Những gì đã xây dựng

### Phase 1 — Backend Foundation

Xây dựng toàn bộ lớp backend: Spring Boot project (Maven), schema PostgreSQL qua Flyway migration, và REST API xác thực.

**Flyway migration `V1__init_schema.sql`** tạo:
- PostgreSQL custom type `user_status AS ENUM ('ONLINE', 'OFFLINE')`
- Bảng `users` với các cột: `id`, `username` (unique), `password_hash` (BCrypt), `display_name`, `status`, `created_at`

**Các endpoint hoạt động:**
- `POST /api/auth/register` — tạo user, hash password BCrypt
- `POST /api/auth/login` — xác thực, set ONLINE, trả JWT (HS256, sống 24h)
- `POST /api/auth/logout` — set OFFLINE, client xóa token
- `GET /api/users/me` — thông tin user hiện tại (protected)
- `GET /api/users/online` — danh sách user đang online (protected)

**Bảo mật:** `JwtAuthenticationFilter` intercept mọi request, extract username từ JWT, load `UserDetails`, set vào `SecurityContext`. Endpoint `/api/auth/**` được permit, còn lại yêu cầu JWT hợp lệ.

**Test coverage:** 11 tests (8 AuthController + 3 Flyway migration) — tất cả GREEN.

---

### Phase 2 — WebSocket Infrastructure

Xây dựng lớp realtime trên nền WebSocket: xác thực JWT cho STOMP, theo dõi presence, và relay signaling.

**`WebSocketConfig`** — cấu hình STOMP broker:
- Endpoint kết nối: `/ws` (native WebSocket, không SockJS)
- Application prefix: `/app` (client gửi lên)
- Broker prefix: `/topic`, `/queue` (server push xuống)
- User destination prefix: `/user` (private per-user queue)

**`JwtChannelInterceptor`** — bảo vệ STOMP CONNECT:
- Tái sử dụng `JwtService` từ Phase 1 (không viết lại logic JWT)
- Xác thực 1 lần tại frame CONNECT, gắn `Principal` vào session
- Mọi frame sau đó tự động có danh tính — không phải check lại

**`PresenceService` + `PresenceEventListener`**:
- `ConcurrentHashMap<sessionId, username>` — thread-safe, hỗ trợ multi-tab
- Khi connect: add session → UPDATE ONLINE → broadcast `/topic/presence`
- Khi disconnect: remove session → chỉ UPDATE OFFLINE nếu không còn session nào → broadcast
- Idempotent: duplicate disconnect event không gây flapping

**`SignalController`**:
- Nhận tại `/app/signal`, relay tới `/user/{to}/queue/signal`
- Overwrite field `from` bằng `principal.getName()` — ngăn chặn spoofing danh tính

**Test coverage:** 6 tests mới (WebSocket auth, presence broadcast, signal relay) + 11 Phase 1 không regression — tổng 17 tests GREEN.

---

### Phase 3 — React Auth + User List

Xây dựng toàn bộ frontend: Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui.

**State management bằng React Context:**
- `AuthContext` — lưu JWT, username, trạng thái login; Axios interceptor tự đính kèm token
- `WebSocketContext` — quản lý STOMP client lifecycle; reconnect khi mất kết nối
- `CallContext` — stub cho Phase 4 (WebRTC state machine)

**`AuthPage`** — tabbed Login/Register:
- Validation inline, error message từ server
- Sau login thành công: lưu token → connect WebSocket → navigate `/users`

**`UserListPage`** — danh sách user online:
- Subscribe `/topic/presence`, tự filter bản thân ra khỏi danh sách
- Update realtime khi user khác join/leave — không cần polling
- Nút "Call" cho mỗi user (wire tới Phase 4)
- Logout flow: gọi `POST /api/auth/logout` → disconnect WebSocket → về trang login

**Test coverage:** Vitest + React Testing Library, tất cả tests GREEN.

---

## Cấu trúc thư mục

```
VDT-WebRTC/
├── backend/
│   ├── src/main/java/com/vdt/
│   │   ├── auth/               # JWT, AuthController, AuthService, UserDetailsService
│   │   ├── user/               # User entity, UserRepository, UserController
│   │   ├── websocket/          # WebSocketConfig, JwtChannelInterceptor,
│   │   │                       # PresenceService, PresenceEventListener, SignalController
│   │   └── common/             # SecurityConfig, GlobalExceptionHandler
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/       # Flyway: V1__init_schema.sql
│   └── pom.xml
│
└── frontend/
    ├── src/
    │   ├── contexts/           # AuthContext, WebSocketContext, CallContext
    │   ├── pages/              # AuthPage, UserListPage, CallPage
    │   ├── components/         # IncomingCallModal, ProtectedRoute, UI components
    │   └── hooks/
    └── package.json
```

---

## Hướng dẫn cài đặt và chạy

### Yêu cầu

- Java 17+
- Node.js 18+
- PostgreSQL 16 (hoặc Docker)
- Maven (hoặc dùng `./mvnw` wrapper đã có sẵn)

### 1. Cài đặt database

**Dùng Docker (khuyến nghị):**

```bash
docker run --name vdt-postgres \
  -e POSTGRES_DB=vdt_webrtc \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

**Hoặc tự tạo database:**

```sql
CREATE DATABASE vdt_webrtc;
```

Schema sẽ được Flyway tự động tạo khi backend khởi động lần đầu.

### 2. Chạy Backend

```bash
cd backend

# Với cấu hình mặc định (localhost:5432, user: postgres, pass: postgres)
./mvnw spring-boot:run

# Hoặc override qua env vars
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASS=postgres ./mvnw spring-boot:run
```

Backend chạy tại `http://localhost:8080`.

**Biến môi trường:**

| Biến | Mặc định | Mô tả |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `vdt_webrtc` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASS` | `postgres` | Database password |
| `JWT_SECRET` | *(dev default)* | JWT signing secret — **thay đổi khi deploy** |

### 3. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

### 4. Demo trên LAN

Để hai máy trong cùng mạng LAN kết nối với nhau:

1. Máy A chạy backend và frontend
2. Tìm IP LAN của máy A: `ipconfig` (Windows) hoặc `ifconfig` (Linux/Mac)
3. Máy B truy cập `http://<IP-máy-A>:5173`
4. Đăng ký tài khoản trên cả hai máy → đăng nhập → gọi nhau

> **Lưu ý:** Frontend cần biết địa chỉ backend. Nếu chạy LAN, tạo file `frontend/.env.local`:
> ```
> VITE_API_URL=http://<IP-máy-A>:8080
> VITE_WS_URL=ws://<IP-máy-A>:8080/ws
> ```

---

## REST API

### Authentication

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản | Không |
| `POST` | `/api/auth/login` | Đăng nhập, nhận JWT | Không |
| `POST` | `/api/auth/logout` | Đăng xuất, set OFFLINE | Bearer JWT |
| `GET` | `/api/users/me` | Thông tin user hiện tại | Bearer JWT |
| `GET` | `/api/users/online` | Danh sách user online | Bearer JWT |

**Ví dụ đăng nhập:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "password123"
}
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "alice"
}
```

---

## WebSocket / STOMP

**Endpoint kết nối:** `ws://localhost:8080/ws`

**Xác thực:** Gửi JWT trong header của STOMP CONNECT frame:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Subscribe

| Destination | Loại | Nội dung |
|---|---|---|
| `/topic/presence` | Broadcast | `{ "onlineUsers": ["alice", "bob"] }` |
| `/user/queue/signal` | Private | SDP offer/answer hoặc ICE candidate |

### Send

| Destination | Mô tả | Payload |
|---|---|---|
| `/app/signal` | Gửi signaling message đến user khác | `{ "type": "offer"\|"answer"\|"ice-candidate", "to": "bob", "sdp": "...", "candidate": "..." }` |

---

## Chạy Tests

```bash
# Backend tests (yêu cầu H2 in-memory — không cần PostgreSQL)
cd backend
./mvnw test

# Frontend tests
cd frontend
npm test
```

---

## Trạng thái dự án

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 1 | Backend Foundation (REST + JWT + DB) | Hoàn thành |
| 2 | WebSocket Infrastructure (STOMP + Presence + Signaling) | Hoàn thành |
| 3 | React Auth + User List UI | Hoàn thành |
| 4 | 1-1 Video Call Core (WebRTC P2P) | **Đang xử lý** |
| 5 | Call Controls (mute, camera, timer) | Chưa bắt đầu |
| 6 | Screen Sharing | Chưa bắt đầu |
| 7 | Group Call Mesh (3–5 người) | Chưa bắt đầu |
| 8 | Recording + Docker Compose + Docs | Chưa bắt đầu |

---

## Tác giả

**Nguyễn Quang Chiến** — Viettel Digital Talent 2026
