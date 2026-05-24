# Phase 1: Backend Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 1-Backend Foundation
**Areas discussed:** Build tool, Logout invalidation, JWT lifespan, User schema fields

---

## Build Tool

| Option | Description | Selected |
|--------|-------------|----------|
| Maven | Standard pom.xml; most Spring Boot tutorials use it; assessor-familiar | ✓ |
| Gradle (Kotlin DSL) | Faster incremental builds; concise syntax; less common in academic deliverables | |

**User's choice:** Maven

---

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo | backend/ and frontend/ at root; one Docker Compose | ✓ |
| Separate repos | Two distinct repos; clean boundary but friction for demo packaging | |

**User's choice:** Monorepo

---

| Option | Description | Selected |
|--------|-------------|----------|
| Feature-based packages | com.vdt.auth, com.vdt.user, com.vdt.common; each feature owns controller+service+repo | ✓ |
| Layer-based packages | com.vdt.controller, com.vdt.service, etc.; classic n-tier | |

**User's choice:** Feature-based

---

## Logout Invalidation

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side only | Server marks offline in DB; client deletes token; token valid until expiry but unheld | ✓ |
| In-memory blacklist | Server keeps Set<String> of revoked JTIs; adds HashMap lookup per request | |
| Redis blacklist | Proper persistence across restarts; adds Redis dependency; overkill for LAN demo | |

**User's choice:** Client-side only
**Notes:** AUTH-03 "session is invalidated" is satisfied by the combination of DB status update + client-side token deletion.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mark offline in DB | Set users.status = OFFLINE on logout request | ✓ |
| Mark offline + broadcast | Also push WebSocket presence event on logout | |

**User's choice:** Mark offline in DB only
**Notes:** Phase 2 owns all WebSocket broadcasts; Phase 1 should not couple to the signaling layer.

---

## JWT Lifespan

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours | Full demo session without re-auth; balanced for LAN deliverable | ✓ |
| 1 hour | Standard security practice but users prompted to re-login mid-demo | |
| 7 days | Maximum convenience; overly permissive | |

**User's choice:** 24 hours

---

| Option | Description | Selected |
|--------|-------------|----------|
| application.yml + env var override | Default in yaml; JWT_SECRET env var for Docker Compose; 12-factor pattern | ✓ |
| Hardcoded in application.yml | Simplest; leaks secret into git | |

**User's choice:** application.yml with env var override

---

## User Schema Fields

| Option | Description | Selected |
|--------|-------------|----------|
| display_name | Separate display name; defaults to username; shown in call modal | ✓ |
| email | Not required by v1 features; no verification flow | |
| created_at timestamp | Standard audit field; expected by assessors | ✓ |
| status enum (ONLINE/OFFLINE) | Required by Phase 2 presence; better to define in Phase 1 migration | ✓ |

**User's choice:** display_name + created_at + status enum (no email)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Username = login identifier | Unique username for register/login; matches AUTH-01/02 exactly | ✓ |
| Email = login identifier | More modern but requires email field out of v1 scope | |

**User's choice:** Username as login identifier

---

| Option | Description | Selected |
|--------|-------------|----------|
| display_name defaults to username | Set at registration; never null; no fallback logic needed | ✓ |
| Allow null, fallback in frontend | Nullable; frontend falls back to username | |

**User's choice:** display_name = username at registration time

---

## Claude's Discretion

- BCrypt work factor: Spring Security default (10 rounds)
- HTTP port: 8080 (Spring Boot default)
- CORS: permit all origins for local dev
- Username validation: 3–50 chars, alphanumeric + underscore
- Password minimum: 6 characters
- Error response format: `{ "error": "...", "message": "..." }`

## Deferred Ideas

- Refresh token support → v2 scope (AUTH-V2-01)
- Email field → v2 if email verification added
- Server-side token blacklist → not needed for LAN demo
- WebSocket presence broadcast on logout → Phase 2
