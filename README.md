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

## Kiến trúc hệ thống

```
Browser (React)
    │
    ├─ HTTP REST (JWT)──────────► Spring Boot
    │                              ├── AuthController   /api/auth/*
    │                              ├── UserController   /api/users/*
    │                              ├── Spring Security  JwtAuthenticationFilter
    │                              └── PostgreSQL       users table
    │
    └─ WebSocket/STOMP ──────────► Spring Boot
                                   ├── JwtChannelInterceptor  (auth CONNECT frame)
                                   ├── PresenceEventListener  (online/offline events)
                                   ├── PresenceService        (in-memory session map)
                                   ├── SignalController       /app/signal → relay
                                   └── Simple Message Broker
                                       ├── /topic/presence    (broadcast)
                                       └── /user/queue/signal (private queue)
```

**WebRTC signaling flow:**

```
Alice                    Server (relay)                Bob
  │                           │                          │
  ├─ SDP offer → /app/signal ─►│                          │
  │                           ├─ /user/queue/signal ──────►│
  │                           │◄─ SDP answer ─────────────┤
  │◄─ /user/queue/signal ──────┤                          │
  │         (ICE candidates trao đổi tương tự)            │
  │                           │                          │
  │◄══════════ WebRTC P2P — media stream trực tiếp ══════►│
  │                (server không tham gia vào media)      │
```

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
