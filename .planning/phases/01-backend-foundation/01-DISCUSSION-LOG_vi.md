# Phase 1: Backend Foundation - Discussion Log

> **Chi dung de audit.** Khong dung cho planning, research, hoac execution.
> Quy dinh nam trong CONTEXT.md — log nay luu cac phuong an da can nhac.

**Ngay:** 2026-05-25
**Phase:** 1-Backend Foundation
**Noi dung:** Build tool, Logout invalidation, JWT lifespan, User schema fields

---

## Build Tool

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Maven | Standard pom.xml; nhieu tutorial Spring Boot dung; nguoi cham quen | ✓ |
| Gradle (Kotlin DSL) | Build nhanh hon; cu phap gon; it pho bien trong deliverable | |

**Lua chon cua user:** Maven

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Monorepo | backend/ va frontend/ o root; mot Docker Compose | ✓ |
| Separate repos | Hai repo rieng; boundary ro nhung demo dong goi kho | |

**Lua chon cua user:** Monorepo

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Feature-based packages | com.vdt.auth, com.vdt.user, com.vdt.common; moi feature so huu controller+service+repo | ✓ |
| Layer-based packages | com.vdt.controller, com.vdt.service, v.v. | |

**Lua chon cua user:** Feature-based

---

## Logout Invalidation

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Client-side only | Server set offline trong DB; client xoa token; token van hop le den het han | ✓ |
| In-memory blacklist | Server giu Set<String> JTIs; moi request check HashMap | |
| Redis blacklist | Persistence qua restart; them dependency Redis; overkill cho LAN demo | |

**Lua chon cua user:** Client-side only
**Ghi chu:** AUTH-03 "session invalidated" duoc dap ung boi DB status update + client xoa token.

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Mark offline trong DB | Set users.status = OFFLINE khi logout | ✓ |
| Mark offline + broadcast | Them WebSocket presence event | |

**Lua chon cua user:** Mark offline trong DB
**Ghi chu:** Phase 2 chiu trach nhiem WebSocket broadcast; Phase 1 khong coupling signaling.

---

## JWT Lifespan

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| 24 hours | Demo khong bi het han giua chung | ✓ |
| 1 hour | Bao mat hon nhung de dang nhap lai | |
| 7 days | Tien loi toi da; qua long | |

**Lua chon cua user:** 24 hours

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| application.yml + env var override | Default trong yaml; JWT_SECRET qua env; 12-factor | ✓ |
| Hardcoded trong application.yml | Don gian; lo secret vao git | |

**Lua chon cua user:** application.yml voi env var override

---

## User Schema Fields

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| display_name | Ten hien thi; mac dinh = username; dung trong call modal | ✓ |
| email | Khong can trong v1; khong co flow verify | |
| created_at timestamp | Audit field; assessor thuong mong doi | ✓ |
| status enum (ONLINE/OFFLINE) | Can cho Phase 2 presence; nen co tu Phase 1 | ✓ |

**Lua chon cua user:** display_name + created_at + status enum (khong email)

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| Username = login identifier | Unique username cho register/login; khop AUTH-01/02 | ✓ |
| Email = login identifier | Hien dai hon nhung can email field ngoai scope v1 | |

**Lua chon cua user:** Username la login identifier

---

| Phuong an | Mo ta | Chon |
|--------|-------------|----------|
| display_name = username | Set khi register; khong null; khong can fallback | ✓ |
| Allow null, fallback frontend | Nullable; frontend fallback username | |

**Lua chon cua user:** display_name = username khi register

---

## Claude's Discretion

- BCrypt work factor: Spring Security default (10 rounds)
- HTTP port: 8080 (Spring Boot default)
- CORS: cho phep tat ca origins cho local dev
- Username validation: 3–50 chars, alphanumeric + underscore
- Password minimum: 6 chars
- Error response format: `{ "error": "...", "message": "..." }`

## Deferred Ideas

- Refresh token support → v2 scope (AUTH-V2-01)
- Email field → v2 neu them email verification
- Server-side token blacklist → khong can cho LAN demo
- WebSocket presence broadcast on logout → Phase 2
