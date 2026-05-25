# Phase 1: Backend Foundation - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Gioi han Phase

Spring Boot 3.3.x REST API voi JWT authentication va PostgreSQL schema. Server nhan dang ky, validate login, phat JWT access token, va danh dau user offline khi logout. Flyway migration scripts tao versioned schema. Khong co WebSocket, khong signaling, khong frontend — phase nay ket thuc khi auth REST API hoat dong va test duoc qua HTTP client.

</domain>

<decisions>
## Quyet dinh trien khai

### Build Tool & Project Structure
- **D-01:** Build tool: **Maven** (pom.xml). Chuan cho Spring Boot deliverables; nguoi cham bai quen.
- **D-02:** Repository layout: **Monorepo** — `backend/` va `frontend/` o root. Mot Docker Compose chay ca stack.
- **D-03:** Java package organization: **Feature-based**. Root package `com.vdt` voi sub-packages theo feature: `com.vdt.auth`, `com.vdt.user`, `com.vdt.common`. Moi feature so huu controller, service, repo.

### Logout & Token Invalidation
- **D-04:** Logout strategy: **Client-side only**. `POST /api/auth/logout` set status OFFLINE trong DB va tra 200. JWT khong blacklist — client xoa token. Token con hop le den het han nhung khong con client giu. Phu hop LAN demo.
- **D-05:** Presence coupling: Phase 1 logout chi set `status = OFFLINE` trong DB. WebSocket presence broadcast la Phase 2 — Phase 1 KHONG phat WebSocket event.

### JWT Configuration
- **D-06:** Access token lifespan: **24 hours**. Giu dang nhap xuyen suot demo. Khong refresh token trong Phase 1.
- **D-07:** Signing secret storage: Default trong `application.yml`; co the override qua env `JWT_SECRET`. Docker Compose set env. Pattern: `jwt.secret: ${JWT_SECRET:default-dev-secret-change-in-prod}`.
- **D-08:** JWT algorithm: HS256 (HMAC-SHA256) qua JJWT 0.12.6. Chuan cho use case nay.

### User Database Schema
- **D-09:** Login identifier: **username** (unique, required). Khong co email trong Phase 1.
- **D-10:** Them cac field vao `users` table:
  - `display_name VARCHAR(100)` — mac dinh bang username. Never null.
  - `status ENUM('ONLINE','OFFLINE')` — mac dinh `OFFLINE`. Set `ONLINE` khi login, `OFFLINE` khi logout/disconnect. Phase 2 doc field nay cho presence.
  - `created_at TIMESTAMP WITH TIME ZONE` — set khi INSERT, khong update.
  - `password_hash VARCHAR(255)` — BCrypt encoded.
- **D-11:** `display_name` mac dinh bang `username` khi register — khong can null handling ve sau.
- **D-12:** PostgreSQL ENUM type: tao trong Flyway V1 `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE')`.

### Claude's Discretion
- BCrypt work factor: default Spring Security (10 rounds)
- HTTP port: 8080 (Spring Boot default)
- CORS: cho phep tat ca origins cho local dev (`*`)
- Username validation: 3–50 chars, alphanumeric + underscore, unique
- Password minimum: 6 chars (hop ly cho demo)
- Error response format: `{ "error": "...", "message": "..." }` voi HTTP 400/401/409/500

</decisions>

<canonical_refs>
## Canonical References

**Cac agent phai doc truoc khi planning/implement.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — Yeu cau v1 day du; Phase 1 bao gom AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-01, INFRA-03
- `.planning/PROJECT.md` — Core value, constraints, key decisions log

### Phase Success Criteria (tu ROADMAP.md)
1. POST `/api/auth/register` voi username + password → success response
2. POST `/api/auth/login` → JWT token hop le trong response body
3. Request co JWT → vao protected endpoint khong bi 401
4. Logout → user OFFLINE trong DB
5. Flyway migration scripts ton tai va chay tu dong khi startup

### Technology References
- `CLAUDE.md` §Technology Stack — Full version table (Spring Boot 3.3.x, JJWT 0.12.6, PostgreSQL 16, Flyway, Lombok)
- `CLAUDE.md` §Authentication — JWT Pattern section
- Spring Boot dependency BOM: versions cho cac Spring dependencies
- JJWT 0.12.6 API: dung `Jwts.parser().verifyWith(key)` (0.12.x API moi — khong dung `setSigningKey`)

</canonical_refs>

<code_context>
## Code Context

### Reusable Assets
- Khong co — codebase chua co gi. Phase nay tao pattern dau tien.

### Established Patterns
- Chua co. Pattern dat ra o day se la baseline cho cac phase sau.

### Integration Points
- `users.status` set o day duoc Phase 2 doc cho presence service
- JWT token phat o day duoc Phase 2 STOMP `ChannelInterceptor` validate
- `display_name` duoc Phase 3 hien thi trong user list va Phase 4 incoming call modal

</code_context>

<specifics>
## Specific Ideas

- Khong co tham chieu UI — Phase 1 khong co frontend (ROADMAP.md "UI hint: no")
- Ky vong assessor: Flyway migration ro rang `V1__init_schema.sql` tao `users` table voi day du fields
- Docker Compose o Phase 8, nhung backend `Dockerfile` scaffolded o Phase 1 can production-ready

</specifics>

<deferred>
## Deferred Ideas

- Refresh token support — scope v2 (AUTH-V2-01)
- Email field — khong can trong v1; them neu can trong v2
- Token blacklist / server-side revocation — khong can cho LAN demo; xem lai neu public
- WebSocket presence broadcasts on logout — trach nhiem Phase 2

</deferred>

---

*Phase: 1-Backend Foundation*
*Context gathered: 2026-05-25*
