---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (Jupiter) + Spring Boot Test (managed by Spring Boot BOM) |
| **Config file** | `backend/src/test/resources/application-test.yml` (Wave 0 creates) |
| **Quick run command** | `mvn test -pl backend -Dtest=AuthControllerTest -q` |
| **Full suite command** | `mvn test -pl backend` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `mvn test -pl backend -Dtest=AuthControllerTest -q`
- **After every plan wave:** Run `mvn test -pl backend`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| register-success | — | 1 | AUTH-01 | T-password-plaintext | BCrypt hash stored, never raw | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| register-duplicate | — | 1 | AUTH-01 | — | Returns 409, no duplicate row | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterDuplicateUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| register-invalid | — | 1 | AUTH-01 | — | Returns 400 for invalid username format | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterInvalidUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| login-success | — | 1 | AUTH-02 | T-jwt-weak-secret | JWT returned with subject=username, expiry 24h | Integration | `mvn test -Dtest=AuthControllerTest#testLoginSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| login-wrong-password | — | 1 | AUTH-02 | T-forged-jwt | Returns 401 for wrong password | Integration | `mvn test -Dtest=AuthControllerTest#testLoginWrongPassword -pl backend -q` | ❌ W0 | ⬜ pending |
| logout-sets-offline | — | 1 | AUTH-03 | — | DB user.status = OFFLINE after logout | Integration | `mvn test -Dtest=AuthControllerTest#testLogoutSetsOffline -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-with-jwt | — | 1 | AUTH-04 | T-missing-auth | Returns 200 with valid Bearer token | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointWithJwt -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-no-token | — | 1 | AUTH-04 | T-missing-auth | Returns 401 without Authorization header | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointNoToken -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-schema | — | 1 | INFRA-03 | — | users table created with correct columns | Integration | `mvn test -Dtest=FlywayMigrationTest#testSchemaCreated -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-enum | — | 1 | INFRA-03 | — | user_status ENUM type exists in PostgreSQL | Integration | `mvn test -Dtest=FlywayMigrationTest#testEnumTypeExists -pl backend -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` — integration tests for AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/vdt/FlywayMigrationTest.java` — migration verification for INFRA-03
- [ ] `backend/src/test/resources/application-test.yml` — H2 test datasource + separate H2-compatible migration location

**Note on PostgreSQL ENUM in tests:** H2 does not support PostgreSQL native ENUM types. Use a separate `application-test.yml` that sets `spring.flyway.locations=classpath:db/migration/h2` pointing to an H2-compatible migration (no `CREATE TYPE user_status AS ENUM` — use VARCHAR instead). This avoids requiring Docker for unit tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Application starts and connects to PostgreSQL | INFRA-01 | Requires live PostgreSQL container | `docker run -d -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` then `./mvnw spring-boot:run -pl backend` → check startup log for "Started VdtApplication" |
| Flyway runs V1 migration on fresh DB | INFRA-03 | Requires live PostgreSQL | After above: check startup log for "Successfully applied 1 migration to schema" |
| JWT can authenticate WebSocket STOMP CONNECT | AUTH-04 | Phase 2 behavior — verify during Phase 2 | Token issued in Phase 1 must be accepted by Phase 2 ChannelInterceptor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING (❌ W0) references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
