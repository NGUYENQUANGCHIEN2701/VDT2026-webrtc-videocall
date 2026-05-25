---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 1 — Validation Strategy

> Hop dong validation theo phase cho feedback sampling trong qua trinh thuc thi.

---

## Test Infrastructure

| Thuoc tinh | Gia tri |
|----------|-------|
| **Framework** | JUnit 5 (Jupiter) + Spring Boot Test (quan ly boi Spring Boot BOM) |
| **Config file** | `backend/src/test/resources/application-test.yml` (Wave 0 tao) |
| **Quick run command** | `mvn test -pl backend -Dtest=AuthControllerTest -q` |
| **Full suite command** | `mvn test -pl backend` |
| **Thoi gian uoc tinh** | ~30–60 giay |

---

## Sampling Rate

- **Sau moi task commit:** Chay `mvn test -pl backend -Dtest=AuthControllerTest -q`
- **Sau moi plan wave:** Chay `mvn test -pl backend`
- **Truoc `/gsd-verify-work`:** Full suite phai xanh
- **Do tre feedback toi da:** 60 giay

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| register-success | — | 1 | AUTH-01 | T-password-plaintext | BCrypt hash luu, khong bao gio luu raw | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| register-duplicate | — | 1 | AUTH-01 | — | Tra 409, khong tao duplicate row | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterDuplicateUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| register-invalid | — | 1 | AUTH-01 | — | Tra 400 cho username sai format | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterInvalidUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| login-success | — | 1 | AUTH-02 | T-jwt-weak-secret | JWT tra ve voi subject=username, expiry 24h | Integration | `mvn test -Dtest=AuthControllerTest#testLoginSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| login-wrong-password | — | 1 | AUTH-02 | T-forged-jwt | Tra 401 khi sai password | Integration | `mvn test -Dtest=AuthControllerTest#testLoginWrongPassword -pl backend -q` | ❌ W0 | ⬜ pending |
| logout-sets-offline | — | 1 | AUTH-03 | — | DB user.status = OFFLINE sau logout | Integration | `mvn test -Dtest=AuthControllerTest#testLogoutSetsOffline -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-with-jwt | — | 1 | AUTH-04 | T-missing-auth | Tra 200 voi Bearer token hop le | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointWithJwt -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-no-token | — | 1 | AUTH-04 | T-missing-auth | Tra 401 khi khong co Authorization header | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointNoToken -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-schema | — | 1 | INFRA-03 | — | users table tao dung columns | Integration | `mvn test -Dtest=FlywayMigrationTest#testSchemaCreated -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-enum | — | 1 | INFRA-03 | — | user_status ENUM ton tai trong PostgreSQL | Integration | `mvn test -Dtest=FlywayMigrationTest#testEnumTypeExists -pl backend -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` — integration tests cho AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/vdt/FlywayMigrationTest.java` — migration verification cho INFRA-03
- [ ] `backend/src/test/resources/application-test.yml` — H2 test datasource + H2 migration location

**Ghi chu ENUM PostgreSQL trong tests:** H2 khong ho tro PostgreSQL ENUM. Dung `application-test.yml` riem, set `spring.flyway.locations=classpath:db/migration/h2` tro vao migration H2 (khong `CREATE TYPE user_status AS ENUM` — dung VARCHAR). Tranh can Docker cho unit tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Vi sao manual | Huong dan |
|----------|-------------|---------------|-----------|
| App start va ket noi PostgreSQL | INFRA-01 | Can PostgreSQL container that | `docker run -d -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` sau do `./mvnw spring-boot:run -pl backend` → check log "Started VdtApplication" |
| Flyway chay V1 migration tren DB moi | INFRA-03 | Can PostgreSQL that | Sau buoc tren: check log "Successfully applied 1 migration to schema" |
| JWT auth STOMP CONNECT | AUTH-04 | Thuoc Phase 2 | Token Phase 1 phai duoc Phase 2 ChannelInterceptor chap nhan |

---

## Validation Sign-Off

- [ ] Tat ca tasks co `<automated>` verify hoac Wave 0 dependencies
- [ ] Sampling continuity: khong co 3 tasks lien tiep ma khong co automated verify
- [ ] Wave 0 bao phu tat ca MISSING (❌ W0)
- [ ] Khong co watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` trong frontmatter

**Approval:** pending
---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 1 — Validation Strategy

> Hop dong validation theo phase cho feedback sampling trong qua trinh thuc thi.

---

## Test Infrastructure

| Thuoc tinh | Gia tri |
|----------|-------|
| **Framework** | JUnit 5 (Jupiter) + Spring Boot Test (quan ly boi Spring Boot BOM) |
| **Config file** | `backend/src/test/resources/application-test.yml` (Wave 0 tao) |
| **Quick run command** | `mvn test -pl backend -Dtest=AuthControllerTest -q` |
| **Full suite command** | `mvn test -pl backend` |
| **Thoi gian uoc tinh** | ~30–60 giay |

---

## Sampling Rate

- **Sau moi task commit:** Chay `mvn test -pl backend -Dtest=AuthControllerTest -q`
- **Sau moi plan wave:** Chay `mvn test -pl backend`
- **Truoc `/gsd-verify-work`:** Full suite phai xanh
- **Do tre feedback toi da:** 60 giay

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| register-success | — | 1 | AUTH-01 | T-password-plaintext | BCrypt hash luu, khong bao gio luu raw | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| register-duplicate | — | 1 | AUTH-01 | — | Tra 409, khong tao duplicate row | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterDuplicateUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| register-invalid | — | 1 | AUTH-01 | — | Tra 400 cho username sai format | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterInvalidUsername -pl backend -q` | ❌ W0 | ⬜ pending |
| login-success | — | 1 | AUTH-02 | T-jwt-weak-secret | JWT tra ve voi subject=username, expiry 24h | Integration | `mvn test -Dtest=AuthControllerTest#testLoginSuccess -pl backend -q` | ❌ W0 | ⬜ pending |
| login-wrong-password | — | 1 | AUTH-02 | T-forged-jwt | Tra 401 khi sai password | Integration | `mvn test -Dtest=AuthControllerTest#testLoginWrongPassword -pl backend -q` | ❌ W0 | ⬜ pending |
| logout-sets-offline | — | 1 | AUTH-03 | — | DB user.status = OFFLINE sau logout | Integration | `mvn test -Dtest=AuthControllerTest#testLogoutSetsOffline -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-with-jwt | — | 1 | AUTH-04 | T-missing-auth | Tra 200 voi Bearer token hop le | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointWithJwt -pl backend -q` | ❌ W0 | ⬜ pending |
| protected-no-token | — | 1 | AUTH-04 | T-missing-auth | Tra 401 khi khong co Authorization header | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointNoToken -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-schema | — | 1 | INFRA-03 | — | users table tao dung columns | Integration | `mvn test -Dtest=FlywayMigrationTest#testSchemaCreated -pl backend -q` | ❌ W0 | ⬜ pending |
| flyway-enum | — | 1 | INFRA-03 | — | user_status ENUM ton tai trong PostgreSQL | Integration | `mvn test -Dtest=FlywayMigrationTest#testEnumTypeExists -pl backend -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` — integration tests cho AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/vdt/FlywayMigrationTest.java` — migration verification cho INFRA-03
- [ ] `backend/src/test/resources/application-test.yml` — H2 test datasource + H2 migration location

**Ghi chu ENUM PostgreSQL trong tests:** H2 khong ho tro PostgreSQL ENUM. Dung `application-test.yml` riem, set `spring.flyway.locations=classpath:db/migration/h2` tro vao migration H2 (khong `CREATE TYPE user_status AS ENUM` — dung VARCHAR). Tranh can Docker cho unit tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Vi sao manual | Huong dan |
|----------|-------------|---------------|-----------|
| App start va ket noi PostgreSQL | INFRA-01 | Can PostgreSQL container that | `docker run -d -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` sau do `./mvnw spring-boot:run -pl backend` → check log "Started VdtApplication" |
| Flyway chay V1 migration tren DB moi | INFRA-03 | Can PostgreSQL that | Sau buoc tren: check log "Successfully applied 1 migration to schema" |
| JWT auth STOMP CONNECT | AUTH-04 | Thuoc Phase 2 | Token Phase 1 phai duoc Phase 2 ChannelInterceptor chap nhan |

---

## Validation Sign-Off

- [ ] Tat ca tasks co `<automated>` verify hoac Wave 0 dependencies
- [ ] Sampling continuity: khong co 3 tasks lien tiep ma khong co automated verify
- [ ] Wave 0 bao phu tat ca MISSING (❌ W0)
- [ ] Khong co watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` trong frontmatter

**Approval:** pending
