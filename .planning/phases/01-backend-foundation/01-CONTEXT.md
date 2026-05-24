# Phase 1: Backend Foundation - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Spring Boot 3.3.x REST API with JWT authentication and PostgreSQL database schema. The server accepts user registrations, validates logins, issues JWT access tokens, and marks users offline on logout. Flyway migration scripts establish the versioned database schema. No WebSocket, no signaling, no frontend — this phase ends when the auth REST API is functional and testable via HTTP client.

</domain>

<decisions>
## Implementation Decisions

### Build Tool & Project Structure
- **D-01:** Build tool: **Maven** (pom.xml). Standard for Spring Boot Java deliverables; assessors familiar.
- **D-02:** Repository layout: **Monorepo** — `backend/` and `frontend/` directories at project root. One Docker Compose runs the full stack.
- **D-03:** Java package organization: **Feature-based**. Root package `com.vdt` with sub-packages per feature: `com.vdt.auth`, `com.vdt.user`, `com.vdt.common`. Each feature owns its own controller, service, and repository.

### Logout & Token Invalidation
- **D-04:** Logout strategy: **Client-side only**. On `POST /api/auth/logout`, the backend sets the user's status to `OFFLINE` in the database and returns 200. The JWT itself is not blacklisted — the client deletes it from storage. The token remains technically valid until expiry, but no client holds it. Correct for a LAN demo.
- **D-05:** Presence coupling: Phase 1 logout only marks `status = OFFLINE` in the DB. WebSocket presence broadcasts are Phase 2's responsibility — Phase 1 does NOT emit any WebSocket events.

### JWT Configuration
- **D-06:** Access token lifespan: **24 hours**. Keeps users logged in through a full demo session. No refresh token in Phase 1 scope.
- **D-07:** Signing secret storage: Default value in `application.yml`; overridable at runtime via `JWT_SECRET` environment variable. Docker Compose sets this env var. Pattern: `jwt.secret: ${JWT_SECRET:default-dev-secret-change-in-prod}`.
- **D-08:** JWT algorithm: HS256 (HMAC-SHA256) via JJWT 0.12.6. Standard for this use case.

### User Database Schema
- **D-09:** Login identifier: **username** (unique, required). No email field in Phase 1.
- **D-10:** Additional fields in `users` table:
  - `display_name VARCHAR(100)` — defaults to username at registration time. Never null.
  - `status ENUM('ONLINE','OFFLINE')` — defaults to `OFFLINE`. Set to `ONLINE` on login, `OFFLINE` on logout/disconnect. Phase 2 reads this field for presence.
  - `created_at TIMESTAMP WITH TIME ZONE` — set at INSERT, never updated.
  - `password_hash VARCHAR(255)` — BCrypt encoded.
- **D-11:** `display_name` defaults to the same value as `username` at registration — no null handling needed anywhere downstream.
- **D-12:** PostgreSQL ENUM type for status: defined in Flyway migration V1 as `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE')`.

### Claude's Discretion
- BCrypt work factor: standard Spring Security default (10 rounds) — no user preference specified.
- HTTP port: 8080 (Spring Boot default).
- CORS: permit all origins for local dev (`*`); tightened in Docker Compose via env var if needed.
- Username validation: 3–50 characters, alphanumeric + underscore, must be unique (DB constraint + service check).
- Password minimum: 6 characters (reasonable minimum for a demo with no email recovery).
- Error response format: `{ "error": "...", "message": "..." }` with appropriate HTTP status codes (400/401/409/500).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 1 covers AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-01, INFRA-03
- `.planning/PROJECT.md` — Core value, constraints, key decisions log

### Phase Success Criteria (from ROADMAP.md)
1. POST `/api/auth/register` with username + password → success response
2. POST `/api/auth/login` → valid JWT token in response body
3. Authenticated request with JWT → reaches protected endpoint without 401
4. Logout → user marked `OFFLINE` in database
5. Flyway migration scripts exist and run automatically on startup

### Technology References
- `CLAUDE.md` §Technology Stack — Full version table (Spring Boot 3.3.x, JJWT 0.12.6, PostgreSQL 16, Flyway, Lombok)
- `CLAUDE.md` §Authentication — JWT Pattern section
- Spring Boot Dependency BOM: managed versions for all Spring dependencies
- JJWT 0.12.6 API: use `Jwts.parser().verifyWith(key)` (new 0.12.x API — not the deprecated `setSigningKey`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — codebase is empty. This phase establishes the first patterns.

### Established Patterns
- None yet. Patterns set here (feature-based packages, Maven, error response format) become the baseline for all future phases.

### Integration Points
- `users.status` field set here is read by Phase 2's presence service
- JWT token issued here is validated by Phase 2's STOMP `ChannelInterceptor`
- `display_name` field shown in Phase 3's user list and Phase 4's incoming call modal

</code_context>

<specifics>
## Specific Ideas

- No specific UI references — Phase 1 has no frontend (per ROADMAP.md "UI hint: no")
- Assessor expectation: clean Flyway migration named `V1__init_schema.sql` creating the `users` table with all fields
- Docker Compose target: Phase 8, but the backend `Dockerfile` scaffolded in Phase 1 should be production-ready so Phase 8 only writes the compose file

</specifics>

<deferred>
## Deferred Ideas

- Refresh token support — explicitly v2 scope (AUTH-V2-01 in REQUIREMENTS.md)
- Email field on user — no email verification flow in v1; add in v2 if needed
- Token blacklist / server-side revocation — unnecessary for LAN demo; revisit if ever deployed publicly
- WebSocket presence broadcasts on logout — Phase 2 responsibility

</deferred>

---

*Phase: 1-Backend Foundation*
*Context gathered: 2026-05-25*
