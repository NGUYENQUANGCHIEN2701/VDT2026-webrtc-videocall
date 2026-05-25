---
phase: 01-backend-foundation
plan: 03
type: execute
wave: 3
depends_on:
  - 01-01
  - 01-02
files_modified:
  - backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java
  - backend/src/main/java/com/vdt/auth/dto/LoginRequest.java
  - backend/src/main/java/com/vdt/auth/dto/AuthResponse.java
  - backend/src/main/java/com/vdt/auth/AuthService.java
  - backend/src/main/java/com/vdt/auth/AuthController.java
  - backend/src/main/java/com/vdt/user/UserController.java
  - backend/src/test/java/com/vdt/auth/AuthControllerTest.java
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
tags:
  - rest-controller
  - jwt
  - spring-security
  - integration-test

must_haves:
  truths:
    - "POST /api/auth/register with valid username (3-50 chars, [a-zA-Z0-9_]) and password (≥6 chars) returns 201 and a JWT in the response body"
    - "POST /api/auth/register with duplicate username returns 409 with body { error: USERNAME_TAKEN, message: ... }"
    - "POST /api/auth/register with username failing validation returns 400 with body { error: VALIDATION_ERROR, ... }"
    - "POST /api/auth/login with valid credentials returns 200 and a JWT; user.status flips to ONLINE"
    - "POST /api/auth/login with wrong password returns 401 with body { error: INVALID_CREDENTIALS, ... }"
    - "POST /api/auth/logout with valid Bearer token returns 200 and sets user.status = OFFLINE in PostgreSQL"
    - "GET /api/users/me without an Authorization header returns 401"
    - "GET /api/users/me with a valid Bearer token returns 200 and JSON containing the authenticated username"
  artifacts:
    - path: backend/src/main/java/com/vdt/auth/AuthController.java
      provides: REST endpoints for register/login/logout
      contains: '@RequestMapping("/api/auth")'
    - path: backend/src/main/java/com/vdt/user/UserController.java
      provides: GET /api/users/me protected endpoint (AUTH-04 demonstration)
      contains: '"/api/users/me"'
    - path: backend/src/main/java/com/vdt/auth/AuthService.java
      provides: register/login/logout business logic
      contains: "passwordEncoder.encode"
    - path: backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java
      provides: validated registration payload (3-50 chars, alphanumeric+underscore, password ≥6)
      contains: '@Pattern(regexp = "^[a-zA-Z0-9_]+$"'
    - path: backend/src/test/java/com/vdt/auth/AuthControllerTest.java
      provides: 8 integration tests covering all phase requirement test rows from RESEARCH.md
      contains: "@SpringBootTest"
  key_links:
    - from: backend/src/main/java/com/vdt/auth/AuthController.java
      to: backend/src/main/java/com/vdt/auth/AuthService.java
      via: constructor injection via Lombok @RequiredArgsConstructor
      pattern: "private final AuthService"
    - from: backend/src/main/java/com/vdt/auth/AuthService.java
      to: backend/src/main/java/com/vdt/user/UserRepository.java
      via: "userRepository.existsByUsername / findByUsername / save"
      pattern: "userRepository\\."
    - from: backend/src/main/java/com/vdt/auth/AuthService.java
      to: backend/src/main/java/com/vdt/auth/JwtService.java
      via: "jwtService.generateToken(username) issues HS256 JWT for register and login"
      pattern: "jwtService\\.generateToken"
    - from: backend/src/main/java/com/vdt/auth/AuthService.java
      to: AuthenticationManager bean
      via: "authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(...)) for login flow"
      pattern: "authenticationManager\\.authenticate"
---

<objective>
Ket noi ba auth endpoints (register/login/logout) va protected GET /api/users/me de chung minh AUTH-04 end-to-end. Sau plan nay, 7 Walking Skeleton steps (SKELETON.md) pass va 6 success criteria tu ROADMAP.md co the quan sat.

Muc dich: Dong Phase 1 boi API surface cho user. AuthControllerTest bao phu tat ca requirement (AUTH-01 happy + 409 + 400; AUTH-02 happy + 401; AUTH-03 status flip; AUTH-04 protected endpoint co/khong token). Day la bo test deliverable cho INFRA-01 phan backend.

Output:
- DTOs: RegisterRequest (validation), LoginRequest, AuthResponse (token wrapper)
- AuthService: register (BCrypt + save + JWT), login (authenticate + set ONLINE + JWT), logout (set OFFLINE per D-04)
- AuthController: POST /api/auth/{register,login,logout}
- UserController: GET /api/users/me (tra { username, displayName, status } tu SecurityContext)
- AuthControllerTest: 8 tests bao phu RESEARCH.md §Validation Architecture
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/01-backend-foundation/01-CONTEXT.md
@.planning/phases/01-backend-foundation/01-RESEARCH.md
@.planning/phases/01-backend-foundation/01-PATTERNS.md
@.planning/phases/01-backend-foundation/01-SKELETON.md
@.planning/phases/01-backend-foundation/01-01-SUMMARY.md
@.planning/phases/01-backend-foundation/01-02-SUMMARY.md
@backend/src/main/java/com/vdt/user/User.java
@backend/src/main/java/com/vdt/user/UserRepository.java
@backend/src/main/java/com/vdt/auth/JwtService.java
@backend/src/main/java/com/vdt/common/SecurityConfig.java
@backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java
@backend/src/test/resources/application-test.yml
@backend/src/test/resources/db/migration/h2/V1__init_schema.sql
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: DTOs + AuthService + AuthController + UserController</name>
  <files>
    backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java,
    backend/src/main/java/com/vdt/auth/dto/LoginRequest.java,
    backend/src/main/java/com/vdt/auth/dto/AuthResponse.java,
    backend/src/main/java/com/vdt/auth/AuthService.java,
    backend/src/main/java/com/vdt/auth/AuthController.java,
    backend/src/main/java/com/vdt/user/UserController.java
  </files>
  <read_first>
    backend/src/main/java/com/vdt/auth/JwtService.java,
    backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java,
    backend/src/main/java/com/vdt/common/SecurityConfig.java,
    backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java,
    backend/src/main/java/com/vdt/user/User.java,
    backend/src/main/java/com/vdt/user/UserRepository.java,
    .planning/phases/01-backend-foundation/01-CONTEXT.md,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Tao auth endpoint surface thuc hien AUTH-01..AUTH-04. Validation: username 3-50 alphanumeric+underscore, password >=6. Ap dung D-04 (logout client-side, chi update DB), D-05 (khong WebSocket event), D-11 (display_name default = username).

    backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java — theo PATTERNS.md. Record:
    ```
    public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username may only contain letters, numbers, and underscores")
        String username,

        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
        String password
    ) {}
    ```

    backend/src/main/java/com/vdt/auth/dto/LoginRequest.java — `public record LoginRequest(@NotBlank String username, @NotBlank String password) {}`.

    backend/src/main/java/com/vdt/auth/dto/AuthResponse.java — `public record AuthResponse(String token) {}`.

    backend/src/main/java/com/vdt/auth/AuthService.java — theo PATTERNS.md. Yeu cau:
    - @Service @RequiredArgsConstructor
    - fields: UserRepository, PasswordEncoder, AuthenticationManager, JwtService
    - register: check existsByUsername -> throw UsernameAlreadyExistsException; build User (password hash, displayName=username, status OFFLINE); save; generate token; return AuthResponse
    - login: authenticationManager.authenticate(...); set user status ONLINE; generate token
    - logout: set user status OFFLINE (khong blacklist)

    backend/src/main/java/com/vdt/auth/AuthController.java — theo PATTERNS.md. Yeu cau:
    - @RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
    - @PostMapping("/register") -> 201 Created
    - @PostMapping("/login") -> 200 OK
    - @PostMapping("/logout") -> 200 OK

    backend/src/main/java/com/vdt/user/UserController.java — AUTH-04 protected endpoint. Yeu cau:
    - @RestController @RequestMapping("/api/users")
    - @GetMapping("/me") tra Map { username, displayName, status } cho authenticated user

    Anti-patterns: khong luu plaintext password; khong validate JWT trong controller; khong blacklist JWT.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q -DskipTests compile</automated>
  </verify>
  <acceptance_criteria>
    - RegisterRequest co `@Pattern(regexp = "^[a-zA-Z0-9_]+$")`.
    - RegisterRequest co `@Size(min = 3, max = 50)` va `@Size(min = 6)`.
    - LoginRequest la record voi @NotBlank.
    - AuthResponse la record `String token`.
    - AuthService co `passwordEncoder.encode(request.password())`.
    - AuthService throw UsernameAlreadyExistsException khi duplicate.
    - AuthService co `authenticationManager.authenticate(new UsernamePasswordAuthenticationToken`.
    - AuthService set status ONLINE va OFFLINE.
    - AuthService generate token cho register va login.
    - AuthController co @RequestMapping("/api/auth") va 3 PostMapping.
    - AuthController register tra 201 (HttpStatus.CREATED).
    - UserController co GET /api/users/me.
    - `cd backend && ./mvnw -q -DskipTests compile` exit 0.
  </acceptance_criteria>
  <done>4 endpoints compile; AuthService day du; khong luu plaintext password; khong blacklist JWT.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: AuthControllerTest (8 integration tests covering AUTH-01..AUTH-04)</name>
  <files>
    backend/src/test/java/com/vdt/auth/AuthControllerTest.java
  </files>
  <read_first>
    backend/src/main/java/com/vdt/auth/AuthController.java,
    backend/src/main/java/com/vdt/auth/AuthService.java,
    backend/src/main/java/com/vdt/user/UserController.java,
    backend/src/main/java/com/vdt/user/UserRepository.java,
    backend/src/test/resources/application-test.yml,
    backend/src/test/resources/db/migration/h2/V1__init_schema.sql,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Implement AuthControllerTest bao phu moi dong RESEARCH.md §Validation Architecture (Phase Requirements → Test Map). 8 @Test methods, chay tren H2 (@ActiveProfiles("test")). Dung MockMvc.

    backend/src/test/java/com/vdt/auth/AuthControllerTest.java — package com.vdt.auth. Theo PATTERNS.md. Header:
    - @SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
    - Autowired MockMvc, ObjectMapper, UserRepository
    - @BeforeEach userRepository.deleteAll()

    8 @Test methods (ten giong RESEARCH.md):
    1. `testRegisterSuccess`
    2. `testRegisterDuplicateUsername`
    3. `testRegisterInvalidUsername`
    4. `testLoginSuccess`
    5. `testLoginWrongPassword`
    6. `testLogoutSetsOffline`
    7. `testProtectedEndpointWithJwt`
    8. `testProtectedEndpointNoToken`

    Yeu cau behavior nhu RESEARCH.md (201/409/400/200/401, status ONLINE/OFFLINE, jwt co 3 phan, jsonPath...).

    Helper method: `registerUser(username, password)` tra token.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q test -Dtest=AuthControllerTest</automated>
  </verify>
  <acceptance_criteria>
    - AuthControllerTest co @SpringBootTest, @AutoConfigureMockMvc, @ActiveProfiles("test").
    - Co du 8 @Test methods voi ten chinh xac.
    - Co status().isCreated/isConflict/isBadRequest/isOk/isUnauthorized.
    - Co UserStatus.OFFLINE va UserStatus.ONLINE.
    - @BeforeEach goi userRepository.deleteAll().
    - `./mvnw -q test -Dtest=AuthControllerTest` exit 0.
    - `./mvnw -q test` exit 0.
  </acceptance_criteria>
  <done>AuthControllerTest 8 tests pass tren H2; full test suite xanh.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Walking Skeleton smoke verification (end-of-phase human-check)</name>
  <files>(no file modifications)</files>
  <read_first>
    .planning/phases/01-backend-foundation/01-SKELETON.md
  </read_first>
  <what-built>
    Backend Phase 1 hoan tat: Spring Boot 3.3.13 voi PostgreSQL persistence, Flyway V1 migration, JWT (HS256, JJWT 0.12.6) auth, 3 auth endpoints (register/login/logout), va 1 protected endpoint (GET /api/users/me). Tat ca AUTH-01..AUTH-04 + INFRA-03 duoc test H2.
    Checkpoint nay verify Walking Skeleton (01-SKELETON.md) tren PostgreSQL 16 that, khong chi H2.
  </what-built>
  <how-to-verify>
    Chay 12 buoc tu `.planning/phases/01-backend-foundation/01-SKELETON.md`:

    1. Start PostgreSQL:
       `docker run -d --name vdt-postgres -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`

    2. Start app: `cd backend && ./mvnw spring-boot:run`
       Expected: log "Started VdtApplication"; khong UnsupportedDatabaseException; co log Flyway apply V1.

    3. Verify schema:
       - `psql -h localhost -U postgres -d vdt_webrtc -c "\dT user_status"`
       - `psql -h localhost -U postgres -d vdt_webrtc -c "\d users"`

    4. Register user:
       `curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' -i | head -1`
       Expected: `HTTP/1.1 201 Created` + body co token.

    5. Verify DB row:
       `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT username, status FROM users WHERE username='alice';"`
       Expected: `alice | OFFLINE`.

    6. Login:
       `TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' | jq -r .token); echo $TOKEN`
       Expected: JWT khong rong (3 phan).

    7. Verify ONLINE:
       `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` → `ONLINE`.

    8. Protected endpoint khong token:
       `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/users/me` → `401`.

    9. Protected endpoint co token:
       `curl -s -X GET http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"`
       Expected: 200, body co "username":"alice".

    10. Logout:
        `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/logout -H "Authorization: Bearer $TOKEN"` → `200`.

    11. Verify OFFLINE:
        `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` → `OFFLINE`.

    12. Cleanup: tat `./mvnw spring-boot:run`; `docker stop vdt-postgres && docker rm vdt-postgres`.

    Tat ca 12 buoc phai pass de approve.
  </how-to-verify>
  <resume-signal>Go "approved" neu 12 buoc pass, hoac mo ta buoc loi va output.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Mo ta |
|----------|-------------|
| Client HTTP POST → AuthController | Tat ca auth endpoints nhan JSON tu client; @Valid + GlobalExceptionHandler la perimeter validate |
| Plaintext password → BCryptPasswordEncoder.encode | Password duoc hash truoc khi luu DB; khong luu raw trong log/DB |
| AuthenticationManager.authenticate → DaoAuthenticationProvider → CustomUserDetailsService | Duong kiem tra credential; sai -> BadCredentialsException -> 401 |
| Bearer token → SecurityContextHolder principal → /api/users/me | Identity tu JWT duoc su dung trong controller |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-16 | Information Disclosure | Password stored in plaintext | mitigate | AuthService.register goi passwordEncoder.encode truoc khi save. ASVS V2.4. |
| T-01-17 | Tampering / Spoofing | SQL injection qua username | mitigate | Spring Data JPA query co tham so. ASVS V5.3. |
| T-01-18 | Tampering | Mass-assignment khi register | mitigate | RegisterRequest chi co username/password; khong the inject status/id/createdAt. ASVS V5.1. |
| T-01-19 | Information Disclosure | Username enumeration qua 409 vs 400 | accept | LAN demo chap nhan; UX tot hon. ASVS V2.2. |
| T-01-20 | Spoofing | Password yeu (>=6) | accept | Demo LAN; hardening de lai v2. ASVS V2.1. |
| T-01-21 | Denial of Service | Brute-force login | accept | Khong rate limit Phase 1; LAN demo. ASVS V2.2. |
| T-01-22 | Repudiation | Logout khong co blacklist | accept | D-04 client-side logout. ASVS V7.2. |
| T-01-23 | Information Disclosure | /api/users/me lo thong tin nguoi khac | accept | Endpoint chi tra user hien tai. ASVS V4.2. |
| T-01-24 | Tampering | Validation bypass neu thieu @Valid | mitigate | AuthController dung @Valid; MethodArgumentNotValidException → 400. ASVS V5.1. |
</threat_model>

<verification>
Sau khi 3 tasks xong:

1. `cd backend && ./mvnw -q test` exit 0
2. Walking Skeleton checkpoint (Task 3) duoc user approve tren PostgreSQL 16
3. Grep gate:
   - `grep -r 'parserBuilder\|setSigningKey(\|parseClaimsJws\|\.getBody()\|SignatureAlgorithm\|WebSecurityConfigurerAdapter' backend/src/main/java/` → 0
   - `grep -r 'ddl-auto: create\|ddl-auto: update' backend/src/main/resources/application.yml` → 0
   - `grep -r 'new RuntimeException.*Stub\|TODO\|FIXME' backend/src/main/java/com/vdt/auth/` → 0
4. Phase requirement coverage:
   | Requirement | Verified by |
   |-------------|-------------|
   | AUTH-01 | testRegisterSuccess + testRegisterDuplicateUsername + testRegisterInvalidUsername; SKELETON step 5 |
   | AUTH-02 | testLoginSuccess + testLoginWrongPassword; SKELETON steps 6-7 |
   | AUTH-03 | testLogoutSetsOffline; SKELETON steps 10-11 |
   | AUTH-04 | testProtectedEndpointWithJwt + testProtectedEndpointNoToken; SKELETON steps 8-9 |
   | INFRA-03 | FlywayMigrationTest (Plan 01); SKELETON steps 2-4 |
   | INFRA-01 | Partial — backend skeleton present; frontend deferred to Phase 3 |
</verification>

<success_criteria>
Phase 1 hoan thanh khi:
1. `./mvnw test` trong backend/ exit 0 voi 11+ tests pass
2. Walking Skeleton checkpoint (Task 3) duoc approve
3. 6 success criteria tu ROADMAP.md deu quan sat duoc
4. D-04, D-05, D-11 duoc tuan thu: logout client-side, khong WebSocket event, displayName = username
5. AUTH-01..AUTH-04 moi requirement co it nhat 1 test pass
</success_criteria>

<output>
Tao `.planning/phases/01-backend-foundation/01-03-SUMMARY.md` tom tat artifacts, test results, Walking Skeleton outcome, requirement coverage, deviations (neu co).
</output>
