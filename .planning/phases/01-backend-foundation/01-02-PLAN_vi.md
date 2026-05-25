---
phase: 01-backend-foundation
plan: 02
type: execute
wave: 2
depends_on:
  - 01-01
files_modified:
  - backend/src/main/java/com/vdt/auth/JwtService.java
  - backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java
  - backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java
  - backend/src/main/java/com/vdt/common/ErrorResponse.java
  - backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java
  - backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java
  - backend/src/main/java/com/vdt/common/SecurityConfig.java
autonomous: true
requirements:
  - AUTH-04
tags:
  - spring-security
  - jwt
  - jjwt
  - filter-chain

must_haves:
  truths:
    - "Spring Security filter chain loads successfully at boot (no BeanCreationException)"
    - "JwtAuthenticationFilter is registered before UsernamePasswordAuthenticationFilter"
    - "/api/auth/register and /api/auth/login are reachable without authentication; /ws/** is permitted for Phase 2 (pre-permit per Pitfall 7); all other endpoints require JWT"
    - "JwtService generates and parses HS256 tokens using JJWT 0.12.x API exclusively (verifyWith / parseSignedClaims / getPayload)"
    - "CustomUserDetailsService.loadUserByUsername returns Spring Security UserDetails built from User entity"
  artifacts:
    - path: backend/src/main/java/com/vdt/common/SecurityConfig.java
      provides: SecurityFilterChain bean, PasswordEncoder bean, AuthenticationManager bean, CorsConfigurationSource bean
      contains: "SecurityFilterChain"
    - path: backend/src/main/java/com/vdt/auth/JwtService.java
      provides: JWT issuance and parsing with JJWT 0.12.x API
      contains: "Jwts.parser().verifyWith"
    - path: backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java
      provides: OncePerRequestFilter that authenticates Bearer tokens
      contains: "extends OncePerRequestFilter"
    - path: backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java
      provides: UserDetailsService bridging UserRepository to Spring Security
      contains: "implements UserDetailsService"
    - path: backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java
      provides: @RestControllerAdvice mapping exceptions to ErrorResponse JSON
      contains: "@RestControllerAdvice"
  key_links:
    - from: backend/src/main/java/com/vdt/common/SecurityConfig.java
      to: backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java
      via: ".addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)"
      pattern: "addFilterBefore\\(jwtAuthFilter"
    - from: backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java
      to: backend/src/main/java/com/vdt/auth/JwtService.java
      via: "filter calls jwtService.extractUsername(token) and jwtService.isTokenExpired(token)"
      pattern: "jwtService\\.extractUsername"
    - from: backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java
      to: backend/src/main/java/com/vdt/user/UserRepository.java
      via: "userRepository.findByUsername(...).orElseThrow(UsernameNotFoundException::new)"
      pattern: "userRepository\\.findByUsername"
    - from: backend/src/main/java/com/vdt/common/SecurityConfig.java
      to: future Phase 2 WebSocket
      via: ".requestMatchers(\"/ws/**\").permitAll() reserves the path for STOMP CONNECT auth via ChannelInterceptor (RESEARCH.md Pitfall 7)"
      pattern: '/ws/\\*\\*'
---

<objective>
Ket noi Spring Security filter chain cho JWT authentication stateless. Sau plan nay, app boot voi SecurityFilterChain day du, JwtService dung JJWT 0.12.x API, va JwtAuthenticationFilter xac thuc Bearer token moi request. Chua co auth endpoints — Plan 03 se them. Thuc hien AUTH-04 infrastructure (JWT validation cho REST; Phase 2 mo rong cho WebSocket).

Muc dich: Tao backbone security de AuthController (Plan 03) dung. Plan 03 inject AuthenticationManager, JwtService, PasswordEncoder tao o day.

Output:
- JwtService — tao/parse HS256 tokens dung `Jwts.parser().verifyWith(key)` (KHONG dung API 0.11.x)
- JwtAuthenticationFilter — OncePerRequestFilter extract Bearer token, set SecurityContextHolder
- CustomUserDetailsService — bridge User entity sang Spring Security UserDetails
- SecurityConfig — SecurityFilterChain bean voi CSRF disabled, session STATELESS, /api/auth/{register,login} + /ws/** permitAll, cac endpoint khac can JWT
- ErrorResponse record + UsernameAlreadyExistsException + GlobalExceptionHandler — JSON { error, message } cho 400/401/409/500
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
@.planning/phases/01-backend-foundation/01-01-SUMMARY.md
@backend/pom.xml
@backend/src/main/resources/application.yml
@backend/src/main/java/com/vdt/user/User.java
@backend/src/main/java/com/vdt/user/UserRepository.java
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: JwtService + JwtAuthenticationFilter + CustomUserDetailsService (auth infrastructure beans)</name>
  <files>
    backend/src/main/java/com/vdt/auth/JwtService.java,
    backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java,
    backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java
  </files>
  <read_first>
    backend/src/main/java/com/vdt/user/User.java,
    backend/src/main/java/com/vdt/user/UserRepository.java,
    backend/src/main/resources/application.yml,
    .planning/phases/01-backend-foundation/01-CONTEXT.md,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Tao 3 Spring beans cho pipeline JWT authentication. Tat ca JJWT calls PHAI dung 0.12.x API (D-08 + RESEARCH.md Pitfall 1). Tutorials truoc 10/2023 dung 0.11.x — KHONG copy.

    backend/src/main/java/com/vdt/auth/JwtService.java — theo PATTERNS.md "JwtService.java". Yeu cau:
    - @Service @RequiredArgsConstructor
    - @Value("${jwt.secret}") private String jwtSecret
    - @Value("${jwt.expiration-ms:86400000}") private long jwtExpirationMs
    - private SecretKey getSigningKey(): `Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8))`
    - generateToken: `Jwts.builder().subject(username).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + jwtExpirationMs)).signWith(getSigningKey()).compact()`
    - extractAllClaims: `Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload()`
    - extractUsername: `extractAllClaims(token).getSubject()`
    - isTokenExpired: `extractAllClaims(token).getExpiration().before(new Date())`
    Imports: io.jsonwebtoken.Jwts, Claims, JwtException, Keys, SecretKey, StandardCharsets, Date, @Value, @Service.
    CAM: io.jsonwebtoken.SignatureAlgorithm.

    backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java — theo PATTERNS.md. Yeu cau:
    - @Service @RequiredArgsConstructor
    - final UserRepository userRepository
    - implements UserDetailsService
    - loadUserByUsername: query userRepository.findByUsername, orElseThrow UsernameNotFoundException, return `org.springframework.security.core.userdetails.User.builder().username(...).password(...).authorities("ROLE_USER").build()`
    Use FQN `org.springframework.security.core.userdetails.User` de tranh clash voi com.vdt.user.User.

    backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java — theo PATTERNS.md. Yeu cau:
    - @Component @RequiredArgsConstructor
    - final JwtService jwtService; final UserDetailsService userDetailsService
    - extends OncePerRequestFilter
    - doFilterInternal: doc Authorization header; neu null/khong bat dau voi `Bearer ` thi filterChain.doFilter va return; substring(7) lay token; try: extractUsername; neu username != null va SecurityContextHolder chua auth, load UserDetails, check !jwtService.isTokenExpired(token), tao UsernamePasswordAuthenticationToken, set details, set SecurityContextHolder; catch JwtException -> bo qua; luon goi filterChain.doFilter cuoi.

    CAM: `parserBuilder`, `setSigningKey`, `parseClaimsJws`, `getBody`, `setSubject`, `setIssuedAt`, `setExpiration`, `SignatureAlgorithm`.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q -DskipTests compile</automated>
  </verify>
  <acceptance_criteria>
    - JwtService co `Jwts.parser().verifyWith(`.
    - JwtService co `.parseSignedClaims(`.
    - JwtService co `.getPayload()`.
    - JwtService co `Jwts.builder()` va `.subject(` va `.expiration(` va `.signWith(`.
    - JwtService co `Keys.hmacShaKeyFor(jwtSecret.getBytes(`.
    - JwtService co `@Value("${jwt.secret}")` va `@Value("${jwt.expiration-ms`.
    - JwtAuthenticationFilter co `extends OncePerRequestFilter` va `doFilterInternal`.
    - JwtAuthenticationFilter co `authHeader.startsWith("Bearer ")` va `authHeader.substring(7)`.
    - JwtAuthenticationFilter co `SecurityContextHolder.getContext().setAuthentication(`.
    - JwtAuthenticationFilter co `catch (JwtException`.
    - CustomUserDetailsService co `implements UserDetailsService` va `org.springframework.security.core.userdetails.User.builder()`.
    - CustomUserDetailsService co `userRepository.findByUsername(username)` va `orElseThrow` va `UsernameNotFoundException`.
    - Grep gate: `grep -r -E '(parserBuilder|setSigningKey|parseClaimsJws|getBody|setSubject|setIssuedAt|setExpiration|SignatureAlgorithm)' backend/src/main/java/com/vdt/auth/ | ...` = 0.
    - `cd backend && ./mvnw -q -DskipTests compile` exit 0.
  </acceptance_criteria>
  <done>Ba bean auth compile; JJWT 0.12.x API dung toan bo; CustomUserDetailsService dung dang.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: SecurityConfig + ErrorResponse + UsernameAlreadyExistsException + GlobalExceptionHandler</name>
  <files>
    backend/src/main/java/com/vdt/common/SecurityConfig.java,
    backend/src/main/java/com/vdt/common/ErrorResponse.java,
    backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java,
    backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java
  </files>
  <read_first>
    backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java,
    backend/src/main/java/com/vdt/auth/CustomUserDetailsService.java,
    backend/src/main/resources/application.yml,
    .planning/phases/01-backend-foundation/01-CONTEXT.md,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Cau hinh Spring Security filter chain va mapping exception sang JSON. Theo format `{ "error": "...", "message": "..." }` voi 400/401/409/500.

    backend/src/main/java/com/vdt/common/ErrorResponse.java — record: `public record ErrorResponse(String error, String message) {}`.

    backend/src/main/java/com/vdt/common/UsernameAlreadyExistsException.java — class extends RuntimeException voi constructor nhan String message.

    backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java — theo PATTERNS.md. Yeu cau:
    - @RestControllerAdvice
    - @ExceptionHandler(MethodArgumentNotValidException.class) → 400 VALIDATION_ERROR
    - @ExceptionHandler(UsernameAlreadyExistsException.class) → 409 USERNAME_TAKEN
    - @ExceptionHandler(BadCredentialsException.class) → 401 INVALID_CREDENTIALS
    - @ExceptionHandler(Exception.class) → 500 INTERNAL_ERROR (dat sau cung)

    backend/src/main/java/com/vdt/common/SecurityConfig.java — theo PATTERNS.md. Yeu cau:
    - @Configuration @EnableWebSecurity @RequiredArgsConstructor
    - inject JwtAuthenticationFilter + UserDetailsService
    - SecurityFilterChain: CSRF disable, CORS source, permit `/api/auth/register`, `/api/auth/login`, va `/ws/**`, cac endpoint khac can auth; session STATELESS; addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
    - PasswordEncoder: new BCryptPasswordEncoder()
    - AuthenticationManager: DaoAuthenticationProvider + ProviderManager
    - CorsConfigurationSource: allowedOriginPatterns `*`, allowedMethods GET/POST/PUT/DELETE/OPTIONS, allowedHeaders `*`, allowCredentials(true), register on `/**`

    CAM: WebSecurityConfigurerAdapter, @EnableGlobalMethodSecurity, CSRF enable. Bat buoc permit `/ws/**`.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q -DskipTests compile</automated>
  </verify>
  <acceptance_criteria>
    - ErrorResponse la record `public record ErrorResponse(String error, String message)`.
    - UsernameAlreadyExistsException extends RuntimeException voi constructor String message.
    - GlobalExceptionHandler co `@RestControllerAdvice`.
    - GlobalExceptionHandler co 4 @ExceptionHandler: MethodArgumentNotValidException, UsernameAlreadyExistsException, BadCredentialsException, Exception.
    - GlobalExceptionHandler tra HttpStatus.BAD_REQUEST, CONFLICT, UNAUTHORIZED, INTERNAL_SERVER_ERROR.
    - SecurityConfig co `@Configuration` va `@EnableWebSecurity`.
    - SecurityConfig dung `SecurityFilterChain` (khong WebSecurityConfigurerAdapter).
    - SecurityConfig co `csrf -> csrf.disable()`.
    - SecurityConfig co `SessionCreationPolicy.STATELESS`.
    - SecurityConfig permit `/api/auth/register`, `/api/auth/login`.
    - SecurityConfig permit `"/ws/**"`.
    - SecurityConfig co `.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)`.
    - SecurityConfig co `new BCryptPasswordEncoder()`.
    - SecurityConfig co `new DaoAuthenticationProvider(userDetailsService)` va `new ProviderManager(provider)`.
    - SecurityConfig co `CorsConfiguration` va `setAllowedOriginPatterns`.
    - Grep gate: `grep -c 'WebSecurityConfigurerAdapter' backend/src/main/java/com/vdt/common/SecurityConfig.java` = 0.
    - `cd backend && ./mvnw -q -DskipTests compile` exit 0.
    - (Neu co PostgreSQL) app boot khong BeanCreationException; `/api/auth/register` va `/ws/**` khong bi 401.
  </acceptance_criteria>
  <done>Security filter chain wired; app boot on dinh; khong co anti-pattern.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Mo ta |
|----------|-------------|
| Untrusted HTTP request → JwtAuthenticationFilter | Moi request di qua day; Bearer token phai hop le truoc khi set SecurityContextHolder |
| JWT claims → SecurityContextHolder | Boundary spoofing quan trong; JJWT signature verification gate |
| Password input → BCryptPasswordEncoder | BCrypt salt + work factor 10 chong rainbow/dictionary |
| CORS preflight (OPTIONS) → SecurityFilterChain | CorsConfigurationSource phai xu ly truoc auth filter de cho preflight |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-08 | Spoofing | Forged JWT (weak secret) | mitigate | `Keys.hmacShaKeyFor()` ep key >=256-bit; default >=32 chars. ASVS V6.2. |
| T-01-09 | Elevation of Privilege | JWT khong expiry / qua dai | mitigate | `.expiration(...)` bat buoc; 24h cap per D-06. ASVS V3.3. |
| T-01-10 | Tampering | CSRF tren endpoints thay doi | mitigate | `.csrf(csrf -> csrf.disable())`. JWT stateless khong co session cookie. ASVS V13.2. |
| T-01-11 | Spoofing | Thieu Authorization header | mitigate | JwtAuthenticationFilter skip; `.anyRequest().authenticated()` tra 401. ASVS V4.1. |
| T-01-12 | Information Disclosure | Lo stack trace | mitigate | GlobalExceptionHandler tra JSON sanitized. ASVS V7.4. |
| T-01-13 | Tampering | SQL injection qua username | mitigate | Spring Data JPA query co tham so. ASVS V5.3. |
| T-01-14 | Spoofing | JWT replay sau key rotation | accept | Out of Phase 1. Khong refresh token/blacklist per D-04. |
| T-01-15 | Elevation of Privilege | WebSocket bypass HTTP auth | mitigate | `/ws/**` permitAll de Phase 2 auth trong STOMP CONNECT. ASVS V13.5. |
</threat_model>

<verification>
Sau khi 2 tasks hoan thanh:

1. `cd backend && ./mvnw -q -DskipTests compile` exit 0
2. PostgreSQL chay, `./mvnw spring-boot:run` log `Started VdtApplication`, khong BeanCreationException
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/anything` → 401
4. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/register` → 404/405 (KHONG 401)
5. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ws/test` → 404 (KHONG 401)
6. Grep gate:
   - `grep -r 'parserBuilder\|setSigningKey(\|parseClaimsJws\|\.getBody()\|SignatureAlgorithm' backend/src/main/java/` → 0
   - `grep -r 'WebSecurityConfigurerAdapter' backend/src/main/java/` → 0
</verification>

<success_criteria>
- AUTH-04 infrastructure san sang: JwtService tao/parse HS256 tokens dung JJWT 0.12.x; JwtAuthenticationFilter validate Bearer token; SecurityConfig add filter dung vi tri
- 4 tinh huong loi duoc handle boi GlobalExceptionHandler (400/401/409/500)
- D-04 ton tai: khong blacklist JWT
- D-06, D-07, D-08: expiry 24h, secret tu config, HS256
- Pitfall 7: /ws/** pre-permit cho Phase 2
- App boot on dinh; curl status dung
</success_criteria>

<output>
Tao `.planning/phases/01-backend-foundation/01-02-SUMMARY.md` tom tat artifacts, ket qua smoke test, va deviations (neu co).
</output>
