# Phase 1: Backend Foundation - Research

**Nghien cuu:** 2026-05-25
**Domain:** Spring Boot 3.3.x REST API, JWT Authentication, PostgreSQL, Flyway
**Do tin cay:** HIGH

---

<user_constraints>
## User Constraints (tu CONTEXT.md)

### Locked Decisions

- **D-01:** Build tool: Maven (pom.xml)
- **D-02:** Repository layout: Monorepo — `backend/` va `frontend/` o root
- **D-03:** Java package organization: Feature-based. Root package `com.vdt` voi sub-packages: `com.vdt.auth`, `com.vdt.user`, `com.vdt.common`
- **D-04:** Logout strategy: Client-side only. `POST /api/auth/logout` set OFFLINE, JWT khong blacklist
- **D-05:** Phase 1 logout chi set `status = OFFLINE`. Khong WebSocket event
- **D-06:** JWT lifespan: 24 hours. Khong refresh token trong Phase 1
- **D-07:** JWT secret: `jwt.secret: ${JWT_SECRET:default-dev-secret-change-in-prod}` trong application.yml
- **D-08:** JWT algorithm: HS256 qua JJWT 0.12.6
- **D-09:** Login identifier: username (unique, required). Khong email trong Phase 1
- **D-10:** Users table fields: `display_name VARCHAR(100)`, `status ENUM('ONLINE','OFFLINE')`, `created_at TIMESTAMPTZ`, `password_hash VARCHAR(255)`
- **D-11:** `display_name` mac dinh = `username`
- **D-12:** PostgreSQL ENUM type: `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE')` trong V1 migration

### Claude's Discretion

- BCrypt work factor: default Spring Security (10 rounds)
- HTTP port: 8080
- CORS: cho phep tat ca origins cho local dev (`*`)
- Username validation: 3–50 chars, alphanumeric + underscore, unique
- Password minimum: 6 chars
- Error response format: `{ "error": "...", "message": "..." }` voi 400/401/409/500

### Deferred Ideas (OUT OF SCOPE)

- Refresh token support (AUTH-V2-01)
- Email field on user
- Token blacklist / server-side revocation
- WebSocket presence broadcasts on logout (Phase 2)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Mo ta | Research Support |
|----|-------------|------------------|
| AUTH-01 | User co the dang ky tai khoan moi voi username va password | Spring Security BCrypt, JPA User entity, `/api/auth/register` endpoint |
| AUTH-02 | User co the dang nhap va nhan JWT token | JJWT 0.12.6 token generation, DaoAuthenticationProvider, `/api/auth/login` |
| AUTH-03 | User co the dang xuat; session invalid va user OFFLINE | Client-side logout + set `status=OFFLINE`, khong blacklist |
| AUTH-04 | JWT dung de authenticate REST API va WebSocket | OncePerRequestFilter cho REST; Phase 2 cho STOMP ChannelInterceptor |
| INFRA-01 | Full source code (backend + frontend) | Maven project structure trong `backend/`, Phase 1 tao backend skeleton |
| INFRA-03 | Database migration scripts (Flyway) | V1__init_schema.sql tao users table voi PostgreSQL ENUM |

</phase_requirements>

---

## Summary

Phase 1 deliver Spring Boot 3.3.x REST API cho register/login (JWT) va logout (set OFFLINE). Stack: Maven, Java 17+, Spring Boot 3.3.13, JJWT 0.12.6, PostgreSQL 16, Flyway, Lombok. Chua co frontend.

Hai diem ky thuat quan trong:
1) JJWT 0.12.x API thay doi so voi 0.11.x — `parserBuilder().setSigningKey().parseClaimsJws()` da deprecate; dung `Jwts.parser().verifyWith(key).build().parseSignedClaims(jws)`.
2) Spring Boot 3.3.x dung Flyway 10.x can dependency `flyway-database-postgresql` rieng. Thieu se bi `UnsupportedDatabaseException`.

**Khuyen nghi chinh:** Dung Spring Initializr tao project base (Web, Security, Data JPA, Flyway, Lombok, PostgreSQL Driver), sau do them JJWT explicit version (khong nam trong BOM).

---

## Architectural Responsibility Map

| Capability | Tier chinh | Tier phu | Ly do |
|------------|-----------|---------|------|
| User registration | API / Backend | Database | Validate uniqueness, BCrypt hash, luu JPA |
| Login / JWT issuance | API / Backend | Database | Auth credentials, DaoAuthenticationProvider, phat JWT |
| JWT validation | API / Backend (filter) | — | OncePerRequestFilter chan tat ca request |
| Logout / status update | API / Backend | Database | Set `status=OFFLINE`, khong blacklist |
| Schema creation | Database / Storage | — | Flyway migration chay startup tao schema |
| Error response format | API / Backend | — | @RestControllerAdvice tra JSON shape thong nhat |

---

## Standard Stack

### Core

| Library | Phien ban | Muc dich | Ly do |
|---------|---------|---------|-----|
| Spring Boot | 3.3.13 | Application framework | Patch moi nhat dong 3.3.x (EOL Jun 2025 — chap nhan cho demo) |
| Spring Web MVC | (BOM managed ~6.1.x) | REST controllers | Qua `spring-boot-starter-web` |
| Spring Security | (BOM managed ~6.3.x) | JWT filter chain, auth | Qua `spring-boot-starter-security` |
| Spring Data JPA | (BOM managed) | ORM / repository | Qua `spring-boot-starter-data-jpa` |
| JJWT | 0.12.6 | JWT create/parse/validate | KHONG nam trong BOM — phai khai bao explicit |
| Flyway | (BOM managed ~10.10.x) | Database migrations | Qua `spring-boot-starter-flyway` |
| flyway-database-postgresql | (BOM managed) | PostgreSQL support cho Flyway 10.x | BAT BUOC |
| PostgreSQL JDBC | (BOM managed ~42.7.x) | DB connectivity | `org.postgresql:postgresql` |
| Lombok | (BOM managed) | Giam boilerplate | `optional: true` |
| HikariCP | (BOM managed) | Connection pooling | Mac dinh cua Spring Boot |

### Supporting

| Library | Phien ban | Muc dich | Khi nao dung |
|---------|---------|---------|-----------|
| Spring Boot Test | (BOM managed) | Integration tests | `@SpringBootTest` |
| spring-security-test | (BOM managed) | Security-aware test mocking | `@WithMockUser`, MockMvc |

### Alternatives Considered

| Thay cho | Co the dung | Tradeoff |
|---------|------------|---------|
| JJWT 0.12.6 | Spring Security OAuth2 Resource Server | Can IdP ben ngoai — overkill |
| JJWT 0.12.6 | auth0 java-jwt | JJWT pho bien trong Spring Boot tutorials |
| Flyway | Liquibase | Liquibase can XML/YAML; Flyway SQL don gian cho deliverable |
| `ddl-auto=update` | Flyway | `ddl-auto=update` khong tao migration file — fail INFRA-03 |

**Installation (pom.xml snippets):**
```xml
<!-- Parent -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.13</version>
    <relativePath/>
</parent>

<!-- Properties -->
<properties>
    <java.version>17</java.version>
    <jjwt.version>0.12.6</jjwt.version>
</properties>

<!-- Spring Boot Starters (versions managed by BOM) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>

<!-- PostgreSQL -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Flyway PostgreSQL module — REQUIRED -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>

<!-- Lombok -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>

<!-- JJWT — NOT in BOM; explicit version -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>${jjwt.version}</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>

<!-- Test -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## Package Legitimacy Audit

> Cac package nay la Maven (Java), khong phai PyPI. slopcheck tra [SLOP] do lech he sinh thai. Da xac minh qua Maven Central va GitHub chinh thuc.

| Package | Registry | Tuoi | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| io.jsonwebtoken:jjwt-api | Maven Central | ~9 nam | Nhieu trieu | github.com/jwtk/jjwt | N/A | Approved |
| io.jsonwebtoken:jjwt-impl | Maven Central | ~9 nam | Nhieu trieu | github.com/jwtk/jjwt | N/A | Approved |
| io.jsonwebtoken:jjwt-jackson | Maven Central | ~9 nam | Nhieu trieu | github.com/jwtk/jjwt | N/A | Approved |
| org.flywaydb:flyway-database-postgresql | Maven Central | ~2 nam | Trieu/thang | github.com/flyway/flyway | N/A | Approved |

**Packages removed do slopcheck [SLOP]:** none
**Packages flagged [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
HTTP Client (curl / Postman / future React)
        |
        v
[Spring Web MVC — DispatcherServlet]
        |
        |--- /api/auth/register (PUBLIC)
        |--- /api/auth/login    (PUBLIC)
        |--- /api/auth/logout   (REQUIRES JWT)
        |--- /api/**            (REQUIRES JWT)
        |
[Spring Security Filter Chain]
        |
        +-- JwtAuthenticationFilter (OncePerRequestFilter)
        |       Extracts Bearer token from Authorization header
        |       Validates with JJWT Jwts.parser().verifyWith(key)
        |       Loads UserDetails from DB
        |       Sets SecurityContextHolder authentication
        |
        +-- CSRF: DISABLED (stateless API)
        +-- Session: STATELESS
        +-- CORS: permit all origins
        |
[AuthController]          [Protected Controllers (future)]
        |
[AuthService]
        |-- register() --> BCrypt hash password --> save User (status=OFFLINE)
        |-- login()    --> DaoAuthenticationProvider.authenticate()
        |                  --> UserDetailsService.loadUserByUsername()
        |                  --> JJWT Jwts.builder().subject().expiration().signWith()
        |-- logout()   --> update User.status = OFFLINE
        |
[UserRepository (JPA)]
        |
[PostgreSQL 16]
        |
        +-- Flyway V1__init_schema.sql runs at startup
            CREATE TYPE user_status AS ENUM ('ONLINE','OFFLINE')
            CREATE TABLE users (...)
```

### Recommended Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/vdt/
│   │   │   ├── VdtApplication.java          # @SpringBootApplication
│   │   │   ├── auth/
│   │   │   │   ├── AuthController.java      # POST /api/auth/register, login, logout
│   │   │   │   ├── AuthService.java         # register, login, logout
│   │   │   │   ├── JwtService.java          # JWT create/validate
│   │   │   │   ├── JwtAuthenticationFilter.java  # OncePerRequestFilter
│   │   │   │   └── dto/
│   │   │   │       ├── RegisterRequest.java
│   │   │   │       ├── LoginRequest.java
│   │   │   │       └── AuthResponse.java
│   │   │   ├── user/
│   │   │   │   ├── User.java                # @Entity users table
│   │   │   │   ├── UserStatus.java          # enum ONLINE, OFFLINE
│   │   │   │   └── UserRepository.java      # JpaRepository<User, Long>
│   │   │   └── common/
│   │   │       ├── SecurityConfig.java      # SecurityFilterChain bean
│   │   │       ├── ErrorResponse.java       # { error, message } record
│   │   │       └── GlobalExceptionHandler.java  # @RestControllerAdvice
│   │   └── resources/
│   │       ├── application.yml
│   │       └── db/migration/
│   │           └── V1__init_schema.sql
│   └── test/
│       └── java/com/vdt/
│           └── auth/
│               └── AuthControllerTest.java
├── Dockerfile
└── pom.xml
```

### Pattern 1: JJWT 0.12.x Token Creation

```java
@Value("${jwt.secret}")
private String jwtSecret;

private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
}

public String generateToken(String username) {
    return Jwts.builder()
        .subject(username)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + 86_400_000L))
        .signWith(getSigningKey())
        .compact();
}
```

### Pattern 2: JJWT 0.12.x Token Parsing

```java
public Claims extractAllClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
}
```

### Pattern 3: Spring Security 6 SecurityFilterChain

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    ...
}
```

### Pattern 4: JwtAuthenticationFilter

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter { ... }
```

### Pattern 5: Flyway V1 Migration

```sql
CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE');
CREATE TABLE users (...);
```

### Pattern 6: JPA Enum Mapping

```java
@Enumerated(EnumType.STRING)
@Column(columnDefinition = "user_status", nullable = false)
private UserStatus status = UserStatus.OFFLINE;
```

### Pattern 7: application.yml

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:vdt_webrtc}
```

### Pattern 8: Docker Multi-Stage Build

```dockerfile
FROM eclipse-temurin:17-jdk-jammy AS builder
...
FROM eclipse-temurin:17-jre-jammy
```

---

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test |
| Config file | None explicit — Spring Boot Test dung `src/test/resources/application.yml` hoac `@TestPropertySource` |
| Quick run command | `mvn test -pl backend -Dtest=AuthControllerTest` |
| Full suite command | `mvn test -pl backend` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /api/auth/register valid → 201 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterSuccess` | Wave 0 |
| AUTH-01 | duplicate username → 409 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterDuplicateUsername` | Wave 0 |
| AUTH-01 | username ngan → 400 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterInvalidUsername` | Wave 0 |
| AUTH-02 | login dung → JWT | Integration | `mvn test -Dtest=AuthControllerTest#testLoginSuccess` | Wave 0 |
| AUTH-02 | login sai → 401 | Integration | `mvn test -Dtest=AuthControllerTest#testLoginWrongPassword` | Wave 0 |
| AUTH-03 | logout set OFFLINE | Integration | `mvn test -Dtest=AuthControllerTest#testLogoutSetsOffline` | Wave 0 |
| AUTH-04 | protected endpoint co JWT → 200 | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointWithJwt` | Wave 0 |
| AUTH-04 | khong JWT → 401 | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointNoToken` | Wave 0 |
| INFRA-03 | Flyway V1 tao users table | Integration | `mvn test -Dtest=FlywayMigrationTest#testSchemaCreated` | Wave 0 |
| INFRA-03 | user_status ENUM ton tai | Integration | `mvn test -Dtest=FlywayMigrationTest#testEnumTypeExists` | Wave 0 |

### Sampling Rate

- **Per task commit:** `mvn test -pl backend -Dtest=AuthControllerTest -q`
- **Per wave merge:** `mvn test -pl backend`
- **Phase gate:** Full suite xanh truoc `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/vdt/auth/AuthControllerTest.java`
- [ ] `backend/src/test/java/com/vdt/FlywayMigrationTest.java`
- [ ] `backend/src/test/resources/application-test.yml`

**Note:** PostgreSQL ENUM khong ho tro trong H2. Lua chon:
1. Dung `spring.flyway.locations=classpath:db/migration/h2`
2. Dung Testcontainers PostgreSQL 16

---

## Security Domain

### ASVS Categories (Level 1)

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V2 Authentication | YES | BCryptPasswordEncoder, username unique |
| V3 Session Management | YES | `SessionCreationPolicy.STATELESS` |
| V4 Access Control | YES | `anyRequest().authenticated()` |
| V5 Input Validation | YES | @Valid; username 3-50; password min 6 |
| V6 Cryptography | YES | JJWT HS256 with Keys.hmacShaKeyFor() |

### Known Threat Patterns cho JWT + Spring Boot

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Forged JWT (weak secret) | Spoofing | Keys.hmacShaKeyFor() ep key >=256-bit |
| JWT khong expiry | Elevation of Privilege | `.expiration(...)` bat buoc |
| Password plaintext | Information Disclosure | BCryptPasswordEncoder |
| SQL injection via username | Tampering | Spring Data JPA parameterized queries |
| CSRF | Tampering | CSRF disabled (stateless JWT) |
| Missing Authorization header | Spoofing | JwtAuthenticationFilter skip; Security tra 401 |
| JWT secret trong git | Information Disclosure | `${JWT_SECRET:...}` + env var |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java (JDK) | Spring Boot compile/runtime | YES | 25.0.1 LTS | — |
| Maven (mvn) | Build tool | NO | — | Dung `mvnw` wrapper |
| Docker | Container builds, Phase 8 | YES | 29.4.0 | — |
| PostgreSQL local | Local dev | NO | — | Docker: `docker run -p 5432:5432 postgres:16` |

**Missing dependencies with no fallback:**
- Maven CLI (`mvn`) — dung Maven Wrapper `./mvnw`.

**Missing dependencies with fallback:**
- PostgreSQL local — dung Docker container.

**Java version note:** Java 25 da cai; Spring Boot 3.3.x can Java 17+. Target `<java.version>17</java.version>` de tuong thich.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JJWT 0.12.6 la version can dung du locked D-08 | Standard Stack | 0.13.0 cung API; rui ro thap |
| A2 | Spring Boot 3.3.13 du hop le du da EOL | Standard Stack | Du an demo, khong can patch; rui ro thap |
| A3 | H2 dung cho unit tests voi migration rieng | Validation Architecture | Neu can fidelity cao, them Testcontainers |

---

## Open Questions (RESOLVED)

1. **Java version target trong pom.xml**
   - Khuyen nghi: Target Java 17 de tuong thich cao
   - **RESOLVED: `<java.version>17</java.version>`**

2. **Test database strategy: H2 vs Testcontainers**
   - Khuyen nghi: H2 + migration rieng
   - **RESOLVED: H2 voi `db/migration/h2`**

3. **`/api/users/me` protected endpoint**
   - Khuyen nghi: Them endpoint nho de chung minh AUTH-04
   - **RESOLVED: Them `GET /api/users/me` trong UserController**

---

## Sources

### Primary (HIGH confidence)
- JJWT README (0.12.x): https://github.com/jwtk/jjwt
- JJWT CHANGELOG: https://github.com/jwtk/jjwt/blob/master/CHANGELOG.md
- Spring Security Java Configuration: https://docs.spring.io/spring-security/reference/servlet/configuration/java.html
- Spring Security Password Storage: https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/index.html
- Spring Security JWT Resource Server: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Spring Boot Data Initialization (Flyway): https://docs.spring.io/spring-boot/how-to/data-initialization.html
- Spring Boot 3.3.13 Release: https://spring.io/blog/2025/06/19/spring-boot-3-3-13-available-now/
- EOL status: https://endoflife.date/spring-boot
- Docker multi-stage pattern: https://www.docker.com/blog/9-tips-for-containerizing-your-spring-boot-code/

### Secondary (MEDIUM confidence)
- Flyway PostgreSQL support in Boot 3.3: https://dev-solve.com/posts/4ae6b9e
- PostgreSQL ENUM with JPA: https://www.tutorialpedia.org/blog/how-to-map-postgresql-enum-with-jpa-and-hibernate/
- JWT + Spring Security pattern: https://bootify.io/spring-security/rest-api-spring-security-with-jwt.html
- Simon Martinelli post: https://x.com/simas_ch/status/1793965273479082139

### Tertiary (LOW confidence / not used)
- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH

**Research date:** 2026-05-25
**Valid until:** 2026-08-25
