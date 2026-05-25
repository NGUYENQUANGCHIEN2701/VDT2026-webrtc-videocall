---
phase: 01-backend-foundation
plan: 02
subsystem: backend-security
tags:
  - spring-security
  - jwt
  - jjwt-0.12.x
  - filter-chain
  - authentication

dependency_graph:
  requires:
    - 01-01  # User entity, UserRepository, application.yml with jwt.secret
  provides:
    - JwtService (JWT issuance and parsing)
    - JwtAuthenticationFilter (Bearer token validation on every request)
    - CustomUserDetailsService (Spring Security UserDetails bridge)
    - SecurityFilterChain bean (stateless JWT auth, CSRF disabled)
    - PasswordEncoder bean (BCrypt)
    - AuthenticationManager bean (DaoAuthenticationProvider)
    - CorsConfigurationSource bean
    - ErrorResponse record
    - UsernameAlreadyExistsException
    - GlobalExceptionHandler (400/401/409/500 JSON mapping)
  affects:
    - 01-03  # AuthController/AuthService injects PasswordEncoder, AuthenticationManager, JwtService defined here

tech_stack:
  added: []
  patterns:
    - JJWT 0.12.x API (Jwts.parser().verifyWith / parseSignedClaims / getPayload)
    - Spring Security 6 SecurityFilterChain (not WebSecurityConfigurerAdapter)
    - OncePerRequestFilter for JWT Bearer token extraction
    - DaoAuthenticationProvider no-arg constructor + setUserDetailsService() (Spring Security 6.3.x)

key_files:
  created:
    - backend/src/main/java/com/vdt/auth/JwtService.java
    - backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java
    - backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java
    - backend/src/main/java/com/vdt/common/SecurityConfig.java
    - backend/src/main/java/com/vdt/common/ErrorResponse.java
    - backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java
    - backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java
  modified:
    - backend/pom.xml  # Added maven-compiler-plugin annotationProcessorPaths for Lombok

decisions:
  - "DaoAuthenticationProvider(UserDetailsService) constructor does not exist in Spring Security 6.3.x; use no-arg ctor + setUserDetailsService() instead"
  - "Added maven-compiler-plugin annotationProcessorPaths for Lombok to fix cross-compilation-unit getter resolution (getUsername/getPasswordHash on User entity)"
  - "/ws/** pre-permitted in SecurityFilterChain per RESEARCH.md Pitfall 7 for Phase 2 STOMP WebSocket"
  - "CustomUserDetailsService uses FQN org.springframework.security.core.userdetails.User.builder() to avoid clash with com.vdt.user.User"

metrics:
  duration: "~12 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 1
---

# Phase 01 Plan 02: Spring Security JWT Filter Chain Summary

**One-liner:** Stateless JWT SecurityFilterChain with JJWT 0.12.x pipeline (JwtService, JwtAuthFilter, CustomUserDetailsService) and GlobalExceptionHandler returning structured ErrorResponse JSON.

## What Was Built

### Task 1: JWT Authentication Pipeline Beans

Three Spring beans forming the JWT authentication pipeline:

**`JwtService`** — generates and parses HS256 JWTs using exclusively the JJWT 0.12.x API:
- `Jwts.builder().subject().issuedAt().expiration().signWith(getSigningKey()).compact()`
- `Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload()`
- `Keys.hmacShaKeyFor(jwtSecret.getBytes(UTF_8))` enforces the ≥256-bit key requirement
- Secret and expiry wired from `application.yml` via `@Value("${jwt.secret}")` and `@Value("${jwt.expiration-ms:86400000}")`

**`JwtAuthenticationFilter`** — `OncePerRequestFilter` that:
- Extracts Bearer token from `Authorization` header via `authHeader.substring(7)`
- Calls `jwtService.extractUsername(token)` then loads `UserDetails`
- Sets `SecurityContextHolder` authentication when token is valid and not expired
- Catches `JwtException` silently (Spring Security returns 401 if endpoint is protected)

**`CustomUserDetailsService`** — bridges `UserRepository` to Spring Security:
- `userRepository.findByUsername(username).orElseThrow(UsernameNotFoundException::new)`
- Returns `org.springframework.security.core.userdetails.User.builder()` (FQN to avoid name clash with `com.vdt.user.User`)

### Task 2: SecurityConfig + Error Handling Infrastructure

**`SecurityConfig`** — Spring Security 6 `SecurityFilterChain` bean:
- CSRF disabled (`csrf -> csrf.disable()`) per stateless JWT requirement
- Session management: `STATELESS`
- Permitted paths: `/api/auth/register`, `/api/auth/login`, `/ws/**` (Phase 2 WebSocket reservation per Pitfall 7)
- All other paths: `.anyRequest().authenticated()`
- `JwtAuthenticationFilter` registered before `UsernamePasswordAuthenticationFilter`
- `BCryptPasswordEncoder` (strength 10), `DaoAuthenticationProvider`, `ProviderManager`
- `CorsConfigurationSource` with `setAllowedOriginPatterns(List.of("*"))` for local dev

**`ErrorResponse`** — Java record: `{ "error": "...", "message": "..." }` (Jackson auto-serializes)

**`UsernameAlreadyExistsException`** — `RuntimeException` for 409 Conflict responses

**`GlobalExceptionHandler`** — `@RestControllerAdvice` with four handlers:
- `MethodArgumentNotValidException` → 400 `VALIDATION_ERROR`
- `UsernameAlreadyExistsException` → 409 `USERNAME_TAKEN`
- `BadCredentialsException` → 401 `INVALID_CREDENTIALS`
- `Exception` → 500 `INTERNAL_ERROR`

## Verification Results

### Compile Gate
`./mvnw -q -DskipTests compile` — **PASSES** (exit code 0)

### Anti-Pattern Grep Gates
- JJWT 0.11.x deprecated API (`parserBuilder|setSigningKey|parseClaimsJws|getBody|SignatureAlgorithm`): **0 matches**
- `WebSecurityConfigurerAdapter`: **0 matches**

### Acceptance Criteria
All acceptance criteria from the plan verified:
- `JwtService.java` contains `Jwts.parser().verifyWith(`, `.parseSignedClaims(`, `.getPayload()`, `Jwts.builder()`, `.subject(`, `.expiration(`, `.signWith(`, `Keys.hmacShaKeyFor(jwtSecret.getBytes(`
- `JwtService.java` contains `@Value("${jwt.secret}")` and `@Value("${jwt.expiration-ms`
- `JwtAuthenticationFilter.java` contains `extends OncePerRequestFilter`, `authHeader.startsWith("Bearer ")`, `authHeader.substring(7)`, `SecurityContextHolder.getContext().setAuthentication(`, `catch (JwtException`
- `CustomUserDetailsService.java` contains `implements UserDetailsService`, `org.springframework.security.core.userdetails.User.builder()`, `userRepository.findByUsername(username)`, `orElseThrow`, `UsernameNotFoundException`
- `SecurityConfig.java` contains `@Configuration`, `@EnableWebSecurity`, `SecurityFilterChain`, `csrf -> csrf.disable()`, `SessionCreationPolicy.STATELESS`, `/api/auth/register`, `/api/auth/login`, `/ws/**`, `addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)`, `new BCryptPasswordEncoder()`, `new ProviderManager(provider)`, `CorsConfiguration`, `setAllowedOriginPatterns`
- `GlobalExceptionHandler.java` contains `@RestControllerAdvice`, all four `@ExceptionHandler` annotations, all four HTTP status codes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Lombok annotationProcessorPaths to maven-compiler-plugin**
- **Found during:** Task 1 compile verification
- **Issue:** `CustomUserDetailsService.java` called `user.getUsername()` and `user.getPasswordHash()` on the Lombok-annotated `User` entity, but javac did not resolve Lombok-generated methods during multi-file compilation. Lombok was on the classpath as an optional dependency but not configured as an explicit annotation processor.
- **Fix:** Added `<annotationProcessorPaths>` block to `maven-compiler-plugin` in `pom.xml`, explicitly declaring Lombok. This is the recommended way to configure Lombok with Maven as of Lombok 1.18.x.
- **Files modified:** `backend/pom.xml`
- **Commit:** `69ed7c8`

**2. [Rule 1 - Bug] DaoAuthenticationProvider constructor API mismatch for Spring Security 6.3.x**
- **Found during:** Task 2 compile verification
- **Issue:** The plan's PATTERNS.md specified `new DaoAuthenticationProvider(userDetailsService)` — a constructor that takes `UserDetailsService`. In Spring Security 6.3.10 (the version bundled with Spring Boot 3.3.13), `DaoAuthenticationProvider` only has a no-arg constructor and a `PasswordEncoder` constructor. There is no `UserDetailsService` constructor.
- **Fix:** Used `new DaoAuthenticationProvider()` (no-arg) followed by `provider.setUserDetailsService(userDetailsService)` and `provider.setPasswordEncoder(passwordEncoder)`. This is functionally equivalent and correct for Spring Security 6.3.x.
- **Files modified:** `backend/src/main/java/com/vdt/common/SecurityConfig.java`
- **Commit:** `37b9b2b`

## Known Stubs

None — no stub patterns, hardcoded empty values, or placeholder text found in the files created by this plan.

## Threat Flags

No new security-relevant surfaces beyond what the plan's threat model covers. All threat register items (T-01-08 through T-01-15) implemented as specified.

## Self-Check: PASSED

Files exist:
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/JwtService.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/common/SecurityConfig.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/common/ErrorResponse.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` — FOUND

Commits present:
- `69ed7c8` — feat(01-02): JWT auth pipeline beans
- `37b9b2b` — feat(01-02): SecurityConfig, ErrorResponse, UsernameAlreadyExistsException, GlobalExceptionHandler
