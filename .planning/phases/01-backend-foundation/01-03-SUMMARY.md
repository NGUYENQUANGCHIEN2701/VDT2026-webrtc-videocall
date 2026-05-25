---
phase: 01-backend-foundation
plan: 03
subsystem: auth-api
tags:
  - rest-controller
  - jwt
  - spring-security
  - integration-test
  - auth-endpoints

dependency_graph:
  requires:
    - 01-01  # User entity, UserRepository, Flyway migration
    - 01-02  # JwtService, SecurityConfig, AuthenticationManager, PasswordEncoder
  provides:
    - RegisterRequest / LoginRequest / AuthResponse DTOs (with Jakarta Bean Validation)
    - AuthService: register/login/logout business logic
    - AuthController: POST /api/auth/{register,login,logout}
    - UserController: GET /api/users/me
    - AuthControllerTest: 8 integration tests covering AUTH-01..AUTH-04
  affects:
    - 01-SKELETON  # All 12 skeleton steps now executable against PostgreSQL

tech_stack:
  added:
    - spring-boot-starter-validation (jakarta.validation — was missing from pom.xml, Rule 3 fix)
  patterns:
    - Java record DTOs with Jakarta Bean Validation constraints (@NotBlank @Size @Pattern)
    - AuthService delegating authentication to AuthenticationManager (no manual password check)
    - Spring Security AuthenticationEntryPoint returning 401 for unauthenticated requests
    - H2Dialect override in application-test.yml to avoid Hibernate 6.5 RETURNING clause issue

key_files:
  created:
    - backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java
    - backend/src/main/java/com/vdt/auth/dto/LoginRequest.java
    - backend/src/main/java/com/vdt/auth/dto/AuthResponse.java
    - backend/src/main/java/com/vdt/auth/AuthService.java
    - backend/src/main/java/com/vdt/auth/AuthController.java
    - backend/src/main/java/com/vdt/user/UserController.java
    - backend/src/test/java/com/vdt/auth/AuthControllerTest.java
  modified:
    - backend/pom.xml  # Added spring-boot-starter-validation
    - backend/src/main/java/com/vdt/common/SecurityConfig.java  # Added AuthenticationEntryPoint (401)
    - backend/src/test/resources/application-test.yml  # Added H2Dialect override + NON_KEYWORDS=RETURNING

key-decisions:
  - "spring-boot-starter-validation added to pom.xml — jakarta.validation package was not on classpath despite spring-boot-starter-web being present (web does not transitively include validation starter)"
  - "SecurityConfig.unauthorizedEntryPoint() configured to return HTTP 401 — Spring Security default for unauthenticated requests is 403 AccessDenied; AUTH-04 requires 401"
  - "application-test.yml overrides spring.jpa.properties.hibernate.dialect=H2Dialect — main application.yml sets PostgreSQLDialect explicitly via properties block, which takes precedence over database-platform; Hibernate 6.5 with PostgreSQL dialect generates RETURNING clause that H2 2.2.224 rejects"
  - "NON_KEYWORDS=RETURNING added to H2 URL in application-test.yml as belt-and-suspenders alongside H2Dialect override"

metrics:
  duration: ~25 minutes
  completed: 2026-05-25
  tasks_completed: 2
  tasks_total: 3
  files_created: 7
  files_modified: 3
---

# Phase 01 Plan 03: Auth Endpoints + AuthControllerTest Summary

**One-liner:** Three auth endpoints (register/login/logout) + GET /api/users/me implemented with AuthService, DTOs with Jakarta Bean Validation, and 8 integration tests covering all AUTH-01..AUTH-04 requirements — full suite of 11 tests passes against H2.

## What Was Built

### Task 1: DTOs + AuthService + AuthController + UserController

**DTOs** (Java records with Jakarta Bean Validation):

- `RegisterRequest` — `@NotBlank @Size(min=3, max=50) @Pattern(regexp="^[a-zA-Z0-9_]+$")` on username; `@NotBlank @Size(min=6)` on password
- `LoginRequest` — `@NotBlank` on both username and password
- `AuthResponse` — single field `token` (JWT string)

**AuthService** — business logic for all three flows:
- `register()`: `existsByUsername` check → 409 via `UsernameAlreadyExistsException`; BCrypt hash via `passwordEncoder.encode()`; `User.builder()` with `displayName=username` (D-11); save + `jwtService.generateToken()`
- `login()`: `authenticationManager.authenticate(UsernamePasswordAuthenticationToken)` → throws `BadCredentialsException` on wrong password → 401 via `GlobalExceptionHandler`; flips user status to `ONLINE` (AUTH-03); issues JWT
- `logout()`: flips user status to `OFFLINE` (D-04); no JWT blacklist; no WebSocket events (D-05)

**AuthController** — `@RequestMapping("/api/auth")`:
- `POST /register` → 201 Created + `AuthResponse` (JWT)
- `POST /login` → 200 OK + `AuthResponse` (JWT)
- `POST /logout` → 200 OK; receives `Authentication` from SecurityContext; no JWT blacklist

**UserController** — `@RequestMapping("/api/users")`:
- `GET /me` → 200 OK with `{ username, displayName, status }`; protected by Spring Security filter chain; returns 401 without token

### Task 2: AuthControllerTest (8 integration tests, all pass)

8 `@Test` methods with `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")`, `@BeforeEach userRepository.deleteAll()` for isolation:

| Test | Requirement | HTTP | Assertion |
|------|-------------|------|-----------|
| `testRegisterSuccess` | AUTH-01 happy | POST /register → 201 | token exists; user in DB with OFFLINE status, displayName=username |
| `testRegisterDuplicateUsername` | AUTH-01 409 | POST /register (dup) → 409 | `$.error == "USERNAME_TAKEN"` |
| `testRegisterInvalidUsername` | AUTH-01 400 | POST /register (username="ab") → 400 | `$.error == "VALIDATION_ERROR"` |
| `testLoginSuccess` | AUTH-02 happy | POST /login → 200 | token has 3 dot-separated segments; DB status == ONLINE |
| `testLoginWrongPassword` | AUTH-02 401 | POST /login (wrong pass) → 401 | `$.error == "INVALID_CREDENTIALS"` |
| `testLogoutSetsOffline` | AUTH-03 | POST /logout → 200 | DB status == OFFLINE |
| `testProtectedEndpointWithJwt` | AUTH-04 happy | GET /me with token → 200 | `$.username == "alice"`, `$.displayName == "alice"`, `$.status` exists |
| `testProtectedEndpointNoToken` | AUTH-04 401 | GET /me (no token) → 401 | HTTP 401 |

**Full suite results:** 11 tests (8 AuthController + 3 FlywayMigration) — 0 failures, 0 errors.

### Task 3: Walking Skeleton Checkpoint (pending user approval)

The walking skeleton checkpoint has been presented to the user. It requires running the 12 steps from `01-SKELETON.md` against a live PostgreSQL 16 Docker container.

## Verification Results

### Compile Gate
`./mvnw -q -DskipTests compile` — PASSES (exit code 0)

### Full Test Suite
`./mvnw test` — PASSES: 11 tests, 0 failures, 0 errors, BUILD SUCCESS

| Test Class | Tests | Result |
|------------|-------|--------|
| `com.vdt.auth.AuthControllerTest` | 8 | PASS |
| `com.vdt.FlywayMigrationTest` | 3 | PASS |

### Anti-Pattern Grep Gates
- JJWT 0.11.x deprecated API: **0 matches**
- `WebSecurityConfigurerAdapter`: **0 matches**
- `ddl-auto: create/update` in application.yml: **0 matches**
- Stub patterns (TODO/FIXME/RuntimeException stub): **0 matches**

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `3c5250a` | feat(01-03): DTOs, AuthService, AuthController, UserController |
| 2 | `143d749` | test(01-03): AuthControllerTest (8 tests, all pass); fix H2 dialect + 401 entry point |
| 3 | (checkpoint — pending user approval) | Walking skeleton smoke verification |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added spring-boot-starter-validation to pom.xml**
- **Found during:** Task 1 compile verification
- **Issue:** `jakarta.validation.constraints.*` package not found. `spring-boot-starter-web` does NOT transitively include `spring-boot-starter-validation`. The plan assumed validation was available but it requires an explicit dependency.
- **Fix:** Added `<dependency>spring-boot-starter-validation</dependency>` to pom.xml (BOM-managed, no version needed).
- **Files modified:** `backend/pom.xml`
- **Commit:** `3c5250a`

**2. [Rule 1 - Bug] H2 `returning id` syntax error with Hibernate 6.5 + PostgreSQL dialect**
- **Found during:** Task 2 test run
- **Issue:** Hibernate 6.5.3.Final generates `INSERT ... RETURNING id` for PostgreSQL IDENTITY columns. The main `application.yml` sets `spring.jpa.properties.hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect` — this takes precedence over `database-platform: H2Dialect` in application-test.yml. H2 2.2.224 rejects `RETURNING` as a syntax error.
- **Fix:** Added `spring.jpa.properties.hibernate.dialect: org.hibernate.dialect.H2Dialect` to application-test.yml (overrides main yml's PostgreSQLDialect). Also added `NON_KEYWORDS=RETURNING` to H2 JDBC URL as belt-and-suspenders.
- **Files modified:** `backend/src/test/resources/application-test.yml`
- **Commit:** `143d749`

**3. [Rule 2 - Missing Critical] Added AuthenticationEntryPoint returning 401 to SecurityConfig**
- **Found during:** Task 2 test run (`testProtectedEndpointNoToken` expected 401, got 403)
- **Issue:** Spring Security default behavior for unauthenticated access to protected resources is to return 403 AccessDenied, not 401 Unauthorized. AUTH-04 requires 401 when no token is provided.
- **Fix:** Added `exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedEntryPoint()))` to SecurityFilterChain; added `unauthorizedEntryPoint()` @Bean that calls `response.sendError(SC_UNAUTHORIZED)`.
- **Files modified:** `backend/src/main/java/com/vdt/common/SecurityConfig.java`
- **Commit:** `143d749`

## Phase Requirement Coverage

| Requirement | Verified by |
|-------------|-------------|
| AUTH-01 | testRegisterSuccess + testRegisterDuplicateUsername + testRegisterInvalidUsername; SKELETON step 4-5 (pending) |
| AUTH-02 | testLoginSuccess + testLoginWrongPassword; SKELETON step 6 (pending) |
| AUTH-03 | testLogoutSetsOffline; SKELETON step 10-11 (pending) |
| AUTH-04 | testProtectedEndpointWithJwt + testProtectedEndpointNoToken; SKELETON step 8-9 (pending) |
| INFRA-03 | FlywayMigrationTest (Plan 01); SKELETON steps 2-4 (pending) |
| INFRA-01 | Partial — backend skeleton present; frontend deferred to Phase 3 |

## Known Stubs

None — all endpoints return real data from the database. No placeholder text, hardcoded empty values, or TODO stubs found in files created by this plan.

## Threat Flags

No new security-relevant surfaces beyond what the plan's threat model covers. All STRIDE threat register items (T-01-16 through T-01-24) addressed:
- T-01-16: `passwordEncoder.encode()` before save — no plaintext storage
- T-01-17: Spring Data JPA parameterized queries — no SQL injection
- T-01-18: RegisterRequest record is closed type — no mass-assignment
- T-01-24: `@RequestBody @Valid` on all mutating endpoints — validation enforced

## Self-Check: PASSED

Files exist:
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/dto/LoginRequest.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/AuthService.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/AuthController.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/user/UserController.java` — FOUND
- `D:/VDT-WebRTC/backend/src/test/java/com/vdt/auth/AuthControllerTest.java` — FOUND

Commits present:
- `3c5250a` — feat(01-03): DTOs, AuthService, AuthController, UserController
- `143d749` — test(01-03): AuthControllerTest (8 tests, all pass); fix H2 dialect + 401 entry point
