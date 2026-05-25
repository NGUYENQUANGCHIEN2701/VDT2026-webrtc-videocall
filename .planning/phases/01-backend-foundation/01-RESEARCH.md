# Phase 1: Backend Foundation - Research

**Researched:** 2026-05-25
**Domain:** Spring Boot 3.3.x REST API, JWT Authentication, PostgreSQL, Flyway
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build tool: Maven (pom.xml)
- **D-02:** Repository layout: Monorepo — `backend/` and `frontend/` directories at project root
- **D-03:** Java package organization: Feature-based. Root package `com.vdt` with sub-packages per feature: `com.vdt.auth`, `com.vdt.user`, `com.vdt.common`
- **D-04:** Logout strategy: Client-side only. `POST /api/auth/logout` sets user status to OFFLINE, returns 200. JWT not blacklisted.
- **D-05:** Phase 1 logout sets `status = OFFLINE` only. No WebSocket events from Phase 1.
- **D-06:** JWT lifespan: 24 hours. No refresh token in Phase 1.
- **D-07:** JWT secret: `jwt.secret: ${JWT_SECRET:default-dev-secret-change-in-prod}` in application.yml
- **D-08:** JWT algorithm: HS256 via JJWT 0.12.6
- **D-09:** Login identifier: username (unique, required). No email field in Phase 1.
- **D-10:** Additional `users` table fields: `display_name VARCHAR(100)`, `status ENUM('ONLINE','OFFLINE')`, `created_at TIMESTAMP WITH TIME ZONE`, `password_hash VARCHAR(255)`
- **D-11:** `display_name` defaults to `username` at registration
- **D-12:** PostgreSQL ENUM type: `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE')` in V1 migration

### Claude's Discretion

- BCrypt work factor: standard Spring Security default (10 rounds)
- HTTP port: 8080
- CORS: permit all origins for local dev (`*`)
- Username validation: 3–50 chars, alphanumeric + underscore, unique
- Password minimum: 6 characters
- Error response format: `{ "error": "...", "message": "..." }` with appropriate HTTP status codes (400/401/409/500)

### Deferred Ideas (OUT OF SCOPE)

- Refresh token support (AUTH-V2-01)
- Email field on user
- Token blacklist / server-side revocation
- WebSocket presence broadcasts on logout (Phase 2)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can register a new account with username and password | Spring Security BCrypt, JPA User entity, `/api/auth/register` endpoint |
| AUTH-02 | User can log in with username/password and receive a JWT token | JJWT 0.12.6 token generation, DaoAuthenticationProvider, `/api/auth/login` endpoint |
| AUTH-03 | User can log out; session is invalidated and user marked offline | Client-side logout + server sets `status=OFFLINE`, no token blacklist needed |
| AUTH-04 | JWT is used to authenticate both REST API calls and WebSocket connections | OncePerRequestFilter JWT filter for REST; Phase 2 extends to STOMP ChannelInterceptor |
| INFRA-01 | Full source code delivered (Spring Boot backend + React frontend) | Maven project structure in `backend/`, Phase 1 creates the full backend skeleton |
| INFRA-03 | Database migration scripts (Flyway) provide the versioned SQL schema | Flyway V1__init_schema.sql creating users table with PostgreSQL ENUM type |

</phase_requirements>

---

## Summary

Phase 1 delivers a Spring Boot 3.3.x REST API that handles user registration, login (returning a JWT), JWT-authenticated access to protected endpoints, and logout (marking users offline). The tech stack is fully locked: Maven, Java 17+, Spring Boot 3.3.13, JJWT 0.12.6, PostgreSQL 16, Flyway, Lombok. No frontend is produced in this phase.

The most critical technical precision required is in two areas. First, JJWT 0.12.x introduced a breaking API change from 0.11.x — the old `parserBuilder().setSigningKey().build().parseClaimsJws()` pattern is deprecated and replaced by `Jwts.parser().verifyWith(key).build().parseSignedClaims(jws)`. Every tutorial written before mid-2023 shows the old API. Second, Spring Boot 3.3.x bundles Flyway 10.x which requires an explicit `flyway-database-postgresql` dependency separate from `flyway-core` — Spring Initializr adds this automatically when both PostgreSQL Driver and Flyway Migration are selected, but hand-written pom.xml files often miss it.

The Walking Skeleton for this phase is: `mvn spring-boot:run` starts successfully, connects to PostgreSQL, runs the Flyway migration, and three HTTP calls work — register a user, login to get a JWT, access a protected endpoint with that JWT.

**Primary recommendation:** Use Spring Initializr to generate the base project (selecting Web, Security, Data JPA, Flyway, Lombok, PostgreSQL Driver), then add JJWT manually with explicit version since it is NOT managed by the Spring Boot BOM.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User registration | API / Backend | Database | Validates uniqueness, BCrypt hashes password, persists user via JPA |
| Login / JWT issuance | API / Backend | Database | Authenticates credentials, DaoAuthenticationProvider, issues signed JWT |
| JWT validation on request | API / Backend (filter) | — | OncePerRequestFilter intercepts every request before controller reaches it |
| Logout / status update | API / Backend | Database | Sets `status=OFFLINE`, no client session to invalidate |
| Schema creation | Database / Storage | — | Flyway migration scripts run at startup, create `users` table and PostgreSQL ENUM |
| Error response formatting | API / Backend | — | @RestControllerAdvice / @ExceptionHandler returns consistent JSON error shape |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.3.13 | Application framework | Latest patch of 3.3.x line (EOL Jun 2025 — acceptable for demo project) [CITED: spring.io/blog/2025/06/19/spring-boot-3-3-13-available-now] |
| Spring Web MVC | (BOM managed ~6.1.x) | REST controllers | Included via `spring-boot-starter-web` |
| Spring Security | (BOM managed ~6.3.x) | JWT filter chain, auth | Included via `spring-boot-starter-security` |
| Spring Data JPA | (BOM managed) | ORM / repository layer | Included via `spring-boot-starter-data-jpa` |
| JJWT | 0.12.6 | JWT create/parse/validate | NOT in Spring Boot BOM — must declare explicitly. 0.12.x API is current stable. [CITED: github.com/jwtk/jjwt/releases] |
| Flyway | (BOM managed ~10.10.x) | Database migrations | Via `spring-boot-starter-flyway`; version managed by Boot BOM |
| flyway-database-postgresql | (BOM managed) | PostgreSQL support for Flyway 10.x | REQUIRED since Flyway 9.x extracted DB-specific support. Boot Initializr adds this automatically. [CITED: dev-solve.com/posts/4ae6b9e] |
| PostgreSQL JDBC | (BOM managed ~42.7.x) | DB connectivity | Via `org.postgresql:postgresql` |
| Lombok | (BOM managed) | Boilerplate reduction | Via `org.projectlombok:lombok` with `optional: true` |
| HikariCP | (BOM managed) | Connection pooling | Spring Boot default — no extra dependency needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Spring Boot Test | (BOM managed) | Integration tests | Use `@SpringBootTest` for endpoint verification |
| spring-security-test | (BOM managed) | Security-aware test mocking | Use `@WithMockUser`, `MockMvc` for secured endpoint tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JJWT 0.12.6 | Spring Security OAuth2 Resource Server | OAuth2 RS expects an external IdP — massive overkill for this project |
| JJWT 0.12.6 | auth0 java-jwt | JJWT is more common in Spring Boot tutorials; both are valid |
| Flyway | Liquibase | Liquibase requires XML/YAML changelogs; Flyway SQL is simpler for deliverables |
| `ddl-auto=update` | Flyway | `ddl-auto=update` produces no migration script — fails INFRA-03 requirement |

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

<!-- Flyway PostgreSQL module — REQUIRED for Flyway 10.x + PostgreSQL -->
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

<!-- JJWT — NOT in Spring Boot BOM; version MUST be explicit -->
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

> These are Java/Maven packages on Maven Central — NOT PyPI packages. slopcheck targets PyPI and returned [SLOP] for all four due to ecosystem mismatch (Maven GAV notation `groupId:artifactId` does not exist on PyPI). This is a known false-positive pattern when Java packages are checked against the Python registry.
>
> Verification was performed via authoritative Maven Central and official project GitHub repositories instead.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| io.jsonwebtoken:jjwt-api | Maven Central | ~9 years | Multi-million cumulative | [github.com/jwtk/jjwt](https://github.com/jwtk/jjwt) | N/A (PyPI mismatch) | Approved [CITED: github.com/jwtk/jjwt] |
| io.jsonwebtoken:jjwt-impl | Maven Central | ~9 years | Multi-million cumulative | github.com/jwtk/jjwt | N/A (PyPI mismatch) | Approved [CITED: github.com/jwtk/jjwt] |
| io.jsonwebtoken:jjwt-jackson | Maven Central | ~9 years | Multi-million cumulative | github.com/jwtk/jjwt | N/A (PyPI mismatch) | Approved [CITED: github.com/jwtk/jjwt] |
| org.flywaydb:flyway-database-postgresql | Maven Central | ~2 years (split from flyway-core) | Millions/month | [github.com/flyway/flyway](https://github.com/flyway/flyway) | N/A (PyPI mismatch) | Approved [CITED: dev-solve.com/posts/4ae6b9e] |

**Packages removed due to slopcheck [SLOP] verdict:** none — all [SLOP] verdicts were ecosystem false positives.
**Packages flagged as suspicious [SUS]:** none.

*slopcheck false-positive explanation: slopcheck checks PyPI. Maven package GAV notation (`io.jsonwebtoken:jjwt-api`) does not exist on PyPI. These packages are confirmed legitimate via official GitHub repositories and Maven Central.*

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
│   │   │   │   ├── AuthService.java         # Business logic: register, login, logout
│   │   │   │   ├── JwtService.java          # JWT create/validate via JJWT 0.12.6
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
│   │   │       ├── ErrorResponse.java       # { error, message } record/class
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

### Pattern 1: JJWT 0.12.x Token Creation (NEW API)

**What:** Creating and signing a JWT using the 0.12.x API methods.
**When to use:** Always. The old 0.11.x `parserBuilder().setSigningKey()` chain is deprecated.

```java
// Source: github.com/jwtk/jjwt README (0.12.x)
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.util.Date;

@Value("${jwt.secret}")
private String jwtSecret;

private SecretKey getSigningKey() {
    // Option A: raw bytes from UTF-8 string (key MUST be ≥32 bytes for HS256)
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    // Option B: if secret is Base64-encoded
    // return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
}

public String generateToken(String username) {
    return Jwts.builder()
        .subject(username)                              // NEW: .subject() not .setSubject()
        .issuedAt(new Date())                           // NEW: .issuedAt() not .setIssuedAt()
        .expiration(new Date(System.currentTimeMillis() + 86_400_000L))  // 24h
        .signWith(getSigningKey())                      // JJWT auto-selects HS256 from key type
        .compact();
}
```

### Pattern 2: JJWT 0.12.x Token Parsing (NEW API)

**What:** Verifying and extracting claims from a JWT.
**When to use:** In `JwtAuthenticationFilter.doFilterInternal()` and anywhere claims are read.

```java
// Source: github.com/jwtk/jjwt README (0.12.x)
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;

public Claims extractAllClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())        // NEW: .verifyWith() not .setSigningKey()
        .build()
        .parseSignedClaims(token)           // NEW: .parseSignedClaims() not .parseClaimsJws()
        .getPayload();                      // NEW: .getPayload() not .getBody()
}

public String extractUsername(String token) {
    return extractAllClaims(token).getSubject();
}

public boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
}
```

### Pattern 3: Spring Security 6 SecurityFilterChain (NOT WebSecurityConfigurerAdapter)

**What:** Stateless JWT security configuration for REST API.
**When to use:** `WebSecurityConfigurerAdapter` was removed in Spring Security 6. Always use `SecurityFilterChain` bean.

```java
// Source: docs.spring.io/spring-security/reference/servlet/configuration/java.html
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())                           // MUST disable for stateless REST
            .cors(cors -> cors.configurationSource(corsConfigSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // default strength 10
    }

    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));   // permit all for local dev
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### Pattern 4: JwtAuthenticationFilter (OncePerRequestFilter)

**What:** Extracts JWT from `Authorization: Bearer <token>` header, validates it, and populates `SecurityContextHolder`.

```java
// Source: docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = authHeader.substring(7);
        try {
            String username = jwtService.extractUsername(token);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                if (!jwtService.isTokenExpired(token)) {
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            // Invalid/expired token — continue without setting auth; filter chain returns 401
        }
        filterChain.doFilter(request, response);
    }
}
```

### Pattern 5: Flyway V1 Migration — PostgreSQL ENUM and Users Table

**What:** Creating the `users` table with a native PostgreSQL ENUM type via Flyway SQL migration.

```sql
-- Source: docs.spring.io/spring-boot/how-to/data-initialization.html
-- File: src/main/resources/db/migration/V1__init_schema.sql

-- Create PostgreSQL ENUM type first (before the table that uses it)
CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE');

-- Create users table
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    status        user_status  NOT NULL DEFAULT 'OFFLINE',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast username lookup (login queries)
CREATE UNIQUE INDEX idx_users_username ON users (username);
```

### Pattern 6: JPA Entity Mapping for PostgreSQL ENUM

**What:** Mapping the `user_status` PostgreSQL ENUM to a Java enum in a JPA entity.
**Critical:** Use `@Column(columnDefinition = "user_status")` — without this, Hibernate sends VARCHAR which PostgreSQL rejects with "column is of type user_status but expression is of type character varying".

```java
// Source: tutorialpedia.org/blog/how-to-map-postgresql-enum-with-jpa-and-hibernate
import jakarta.persistence.*;

public enum UserStatus { ONLINE, OFFLINE }

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "user_status", nullable = false)  // REQUIRED for PostgreSQL ENUM
    private UserStatus status = UserStatus.OFFLINE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = java.time.OffsetDateTime.now();
        if (displayName == null || displayName.isBlank()) displayName = username;
    }
}
```

### Pattern 7: application.yml Configuration

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:vdt_webrtc}
    username: ${DB_USER:postgres}
    password: ${DB_PASS:postgres}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      connection-timeout: 20000

  jpa:
    hibernate:
      ddl-auto: validate          # Flyway owns schema; Hibernate only validates
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false    # V1 is initial migration; no baseline needed

jwt:
  secret: ${JWT_SECRET:default-dev-secret-change-in-prod-must-be-32-chars-min}
  expiration-ms: 86400000         # 24 hours

server:
  port: 8080
```

### Pattern 8: Docker Multi-Stage Build

**What:** Production-ready Dockerfile for Spring Boot with Maven. Phase 8 adds Docker Compose but the Dockerfile lives in Phase 1.

```dockerfile
# Source: docker.com/blog/9-tips-for-containerizing-your-spring-boot-code
# Stage 1: Build
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /opt/app

# Download dependencies first (layer cache: only re-downloads when pom.xml changes)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q

# Build the application
COPY src/ ./src/
RUN ./mvnw clean package -DskipTests -q

# Stage 2: Runtime (JRE only — smaller image ~277MB vs ~450MB for JDK)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /opt/app
EXPOSE 8080

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=builder /opt/app/target/*.jar ./app.jar
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
```

Note: The `mvnw` wrapper must be present. Generate it via Spring Initializr or `mvn wrapper:wrapper`.

### Anti-Patterns to Avoid

- **Using `WebSecurityConfigurerAdapter`:** Removed in Spring Security 6. Always use `SecurityFilterChain` bean.
- **Using old JJWT API (`parserBuilder().setSigningKey().parseClaimsJws()`):** Deprecated in 0.12.x. All tutorials before mid-2023 show the old API — do not copy them.
- **Using `ddl-auto=create` or `ddl-auto=update`:** Produces no migration file, breaks INFRA-03. Use `ddl-auto=validate` with Flyway.
- **Omitting `flyway-database-postgresql` dependency:** Flyway 10.x (bundled with Spring Boot 3.3.x) requires this module for PostgreSQL. Missing it causes `UnsupportedDatabaseException` at startup.
- **Storing JWT secret as a hardcoded string:** Must come from `${JWT_SECRET}` environment variable in production. Default value in yml is acceptable for local dev only.
- **Enabling CSRF for stateless REST API:** CSRF protection is session-based. Stateless JWT APIs must call `csrf(csrf -> csrf.disable())`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `BCryptPasswordEncoder` (Spring Security) | Bcrypt handles salt, work factor, timing attacks automatically |
| JWT creation/parsing | Custom base64 encode/decode + HMAC | JJWT 0.12.6 | Key validation, algorithm negotiation, expiry, claims parsing — all handled |
| Authentication flow | Custom credential check | `DaoAuthenticationProvider` + `AuthenticationManager` | Integrates with Spring Security event system, credential erasure, locking |
| Database connection pool | Manual JDBC pool | HikariCP (Spring Boot default) | Connection management, leak detection, health check |
| Schema migration | SQL scripts via `ddl-auto` | Flyway | `ddl-auto` produces no deliverable; Flyway scripts are the INFRA-03 deliverable |
| User lookup for JWT filter | `EntityManager` query in filter | `UserDetailsService.loadUserByUsername()` | Cache-friendly, integrates with Spring Security principal model |
| CORS headers | Manual `Access-Control-*` headers | `CorsConfigurationSource` bean | Handles preflight OPTIONS requests automatically |

**Key insight:** Spring Security handles the entire authentication pipeline. The app only needs to provide BCryptPasswordEncoder, UserDetailsService, and the JWT filter — everything else (session management, credential erasure, principal propagation) is handled by the framework.

---

## Walking Skeleton Approach

The Walking Skeleton for Phase 1 is the thinnest end-to-end slice that exercises every layer:

```
Step 1: Project scaffolding
  → Spring Initializr generates pom.xml with starters
  → Add JJWT manually (not in BOM)
  → Add flyway-database-postgresql

Step 2: Database connected
  → application.yml datasource configured
  → Flyway V1__init_schema.sql creates users table
  → `mvn spring-boot:run` starts without errors

Step 3: One open endpoint (smoke test)
  → GET /api/health → 200 (or Spring Boot Actuator /actuator/health)
  → Verifies Spring MVC is wired

Step 4: Registration works
  → POST /api/auth/register { username, password } → 201
  → BCrypt hash stored in DB, status=OFFLINE

Step 5: Login returns JWT
  → POST /api/auth/login { username, password } → 200 { token: "..." }
  → JWT is valid (parse with JJWT, subject = username)

Step 6: Protected endpoint validates JWT
  → GET /api/users/me with Authorization: Bearer <token> → 200
  → Without token → 401

Step 7: Logout marks user offline
  → POST /api/auth/logout with Authorization: Bearer <token> → 200
  → DB: users.status = 'OFFLINE'
```

Each step is a testable checkpoint. The skeleton is "walking" when all 7 steps pass.

---

## Common Pitfalls

### Pitfall 1: JJWT 0.11.x API in tutorials

**What goes wrong:** Developer copies tutorial code using `Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody()` — this compiles with 0.11.x imports but fails or produces deprecation warnings with 0.12.x.
**Why it happens:** Most tutorials (Baeldung, Medium, etc.) predate the 0.12.0 release (Oct 2023). Google returns these results prominently.
**How to avoid:** Use the method table below and always start from the 0.12.x README.
**Warning signs:** Import of `io.jsonwebtoken.SignatureAlgorithm` (removed in 0.12.x); `parserBuilder()` method name; `.getBody()` instead of `.getPayload()`.

| Old API (0.11.x) — DO NOT USE | New API (0.12.x) — USE THIS |
|-------------------------------|------------------------------|
| `Jwts.parserBuilder()` | `Jwts.parser()` |
| `.setSigningKey(key)` | `.verifyWith(key)` |
| `.parseClaimsJws(token)` | `.parseSignedClaims(token)` |
| `.getBody()` | `.getPayload()` |
| `.setSubject(s)` | `.subject(s)` |
| `.setIssuedAt(d)` | `.issuedAt(d)` |
| `.setExpiration(d)` | `.expiration(d)` |
| `SignatureAlgorithm.HS256` | Removed — key type drives algorithm |

### Pitfall 2: Missing `flyway-database-postgresql` dependency

**What goes wrong:** Application throws `UnsupportedDatabaseException: Unable to support PostgreSQL` at startup even though `spring-boot-starter-flyway` is present.
**Why it happens:** Flyway 10.x (bundled with Spring Boot 3.3.x) moved all database-specific code into separate modules. `flyway-core` alone no longer includes PostgreSQL support.
**How to avoid:** Always add `org.flywaydb:flyway-database-postgresql` (no version needed — managed by Spring Boot BOM).
**Warning signs:** Exception mentions "Unsupported Database" with the DB type in the message.

### Pitfall 3: PostgreSQL ENUM type casting error

**What goes wrong:** `ERROR: column "status" is of type user_status but expression is of type character varying`.
**Why it happens:** Without `@Column(columnDefinition = "user_status")`, Hibernate sends the enum value as a VARCHAR string, which PostgreSQL refuses to auto-cast to the native ENUM type.
**How to avoid:** Add `columnDefinition = "user_status"` to the `@Column` annotation on the `status` field in the `User` entity.
**Warning signs:** Error only occurs on INSERT/UPDATE, not on SELECT. Works fine with H2 in tests.

### Pitfall 4: CSRF not disabled for stateless REST

**What goes wrong:** POST requests (login, register, logout) return 403 Forbidden even with correct credentials.
**Why it happens:** Spring Security enables CSRF protection by default. For stateless JWT APIs, CSRF protection is not needed (no session cookies) but must be explicitly disabled.
**How to avoid:** Add `.csrf(csrf -> csrf.disable())` to `SecurityFilterChain`.
**Warning signs:** GET requests work (CSRF only blocks state-changing methods), POST/PUT/DELETE return 403 with CSRF error in response body.

### Pitfall 5: `ddl-auto=validate` fails when Flyway creates the table

**What goes wrong:** Application fails at startup with `SchemaManagementException: Schema-validation: missing table [users]` even though Flyway should have created it.
**Why it happens:** Flyway and JPA initialization order race condition when both are configured to run at startup.
**How to avoid:** Flyway runs before JPA validation by default in Spring Boot — this should not occur unless `spring.flyway.enabled=false` or the datasource URL is wrong. Verify Flyway ran by checking startup logs for `Successfully applied 1 migration`.
**Warning signs:** Error on first run with empty database; subsequent runs after tables exist succeed.

### Pitfall 6: JWT secret too short for HS256

**What goes wrong:** `WeakKeyException: The signing key's size is X bits which is not secure enough for the HS256 algorithm. The JWT specification requires that HS256 keys MUST have a size >= 256 bits (32 bytes).`
**Why it happens:** The JWT secret from environment variable or default yml value is shorter than 32 bytes.
**How to avoid:** Ensure `JWT_SECRET` (and the default dev value in yml) is at least 32 characters long. The default in Pattern 7 above satisfies this.
**Warning signs:** Exception thrown during token generation, not parsing.

### Pitfall 7: Spring Security blocks WebSocket upgrade in Phase 2

**What goes wrong:** Phase 2 WebSocket connections rejected with 401 even though JWT is in the STOMP CONNECT frame.
**Why it happens:** Spring Security's HTTP filter chain intercepts the HTTP upgrade handshake before STOMP CONNECT is processed. The JWT is in the STOMP frame, not the HTTP header.
**How to avoid:** Phase 1 must permit the WebSocket endpoint path (e.g., `/ws/**`) in the filter chain so Phase 2 can handle authentication inside the `ChannelInterceptor` instead. Add `.requestMatchers("/ws/**").permitAll()` in Phase 1's `SecurityFilterChain`.
**Warning signs:** Only manifests in Phase 2. Document now so the planner reserves the path.

---

## Code Examples

### Registration endpoint

```java
// Source: Pattern synthesis from Spring Boot conventions
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        authService.logout(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
```

### AuthService — register and login

```java
// Source: Pattern synthesis from Spring Security + JJWT 0.12.x patterns
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        User user = User.builder()
            .username(request.getUsername())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .displayName(request.getUsername())  // D-11: defaults to username
            .status(UserStatus.OFFLINE)
            .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user.getUsername());
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        userRepository.findByUsername(request.getUsername())
            .ifPresent(u -> {
                u.setStatus(UserStatus.ONLINE);
                userRepository.save(u);
            });
        String token = jwtService.generateToken(request.getUsername());
        return new AuthResponse(token);
    }

    public void logout(String username) {
        userRepository.findByUsername(username)
            .ifPresent(u -> {
                u.setStatus(UserStatus.OFFLINE);  // D-04: only DB update, no JWT blacklist
                userRepository.save(u);
            });
    }
}
```

### UserDetailsService implementation

```java
// Source: docs.spring.io/spring-security/reference/servlet/authentication/passwords/index.html
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password(user.getPasswordHash())
            .authorities("ROLE_USER")
            .build();
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `WebSecurityConfigurerAdapter` | `SecurityFilterChain` @Bean | Spring Security 5.7 (2022), removed in 6.0 | All Spring Boot 3.x examples use the new pattern |
| `Jwts.parserBuilder().setSigningKey()` | `Jwts.parser().verifyWith()` | JJWT 0.12.0 (Oct 2023) | Tutorials before this date show wrong API |
| `spring-boot-starter-flyway` alone | + `flyway-database-postgresql` | Flyway 10.x / Spring Boot 3.3.0 (May 2024) | Missing dep causes startup failure |
| `@Column @Enumerated(STRING)` alone | + `columnDefinition = "user_status"` | Hibernate 6.x behavior with native ENUM | Type cast error on INSERT without columnDefinition |
| `ddl-auto=create/update` for schema | Flyway for schema management | Best practice (schema-as-code) | `ddl-auto` produces no deliverable for INFRA-03 |

**Deprecated/outdated:**
- `io.jsonwebtoken.SignatureAlgorithm` enum: removed in JJWT 0.12.x. Key type now determines algorithm.
- `Jwts.parserBuilder()`: deprecated in 0.12.x. Use `Jwts.parser()`.
- `WebSecurityConfigurerAdapter`: removed in Spring Security 6. Use `SecurityFilterChain` @Bean.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 (Jupiter) + Spring Boot Test (managed by Spring Boot BOM) |
| Config file | None explicit — Spring Boot Test uses `src/test/resources/application.yml` or `@TestPropertySource` |
| Quick run command | `mvn test -pl backend -Dtest=AuthControllerTest` |
| Full suite command | `mvn test -pl backend` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /api/auth/register with valid username+password returns 201 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterSuccess` | Wave 0 |
| AUTH-01 | POST /api/auth/register with duplicate username returns 409 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterDuplicateUsername` | Wave 0 |
| AUTH-01 | POST /api/auth/register with short username returns 400 | Integration | `mvn test -Dtest=AuthControllerTest#testRegisterInvalidUsername` | Wave 0 |
| AUTH-02 | POST /api/auth/login with valid credentials returns JWT token | Integration | `mvn test -Dtest=AuthControllerTest#testLoginSuccess` | Wave 0 |
| AUTH-02 | POST /api/auth/login with wrong password returns 401 | Integration | `mvn test -Dtest=AuthControllerTest#testLoginWrongPassword` | Wave 0 |
| AUTH-03 | POST /api/auth/logout updates user.status to OFFLINE in DB | Integration | `mvn test -Dtest=AuthControllerTest#testLogoutSetsOffline` | Wave 0 |
| AUTH-04 | GET protected endpoint with valid JWT returns 200 | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointWithJwt` | Wave 0 |
| AUTH-04 | GET protected endpoint without JWT returns 401 | Integration | `mvn test -Dtest=AuthControllerTest#testProtectedEndpointNoToken` | Wave 0 |
| INFRA-03 | Flyway V1__init_schema.sql creates users table with correct columns | Integration | `mvn test -Dtest=FlywayMigrationTest#testSchemaCreated` | Wave 0 |
| INFRA-03 | user_status ENUM type exists in PostgreSQL | Integration | `mvn test -Dtest=FlywayMigrationTest#testEnumTypeExists` | Wave 0 |

### Sampling Rate

- **Per task commit:** `mvn test -pl backend -Dtest=AuthControllerTest -q`
- **Per wave merge:** `mvn test -pl backend`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` — covers AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/vdt/FlywayMigrationTest.java` — covers INFRA-03
- [ ] `backend/src/test/resources/application-test.yml` — test datasource (H2 in-memory or Testcontainers)

**Note on PostgreSQL ENUM in tests:** H2 does not support PostgreSQL native ENUM types. Options:
1. Use `@TestPropertySource` to set `spring.flyway.locations=classpath:db/migration/h2` with H2-compatible migration (no CREATE TYPE)
2. Use Testcontainers with a real PostgreSQL 16 container for full-fidelity tests
Recommendation: Start with separate H2 migration for tests; add Testcontainers in a later phase if fidelity is needed.

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES | BCryptPasswordEncoder (strength 10), username uniqueness constraint |
| V3 Session Management | YES | `SessionCreationPolicy.STATELESS` — no server-side session |
| V4 Access Control | YES | `anyRequest().authenticated()` in SecurityFilterChain |
| V5 Input Validation | YES | @Valid on DTOs; username 3-50 chars, alphanumeric+underscore; password min 6 chars |
| V6 Cryptography | YES | JJWT HS256 with Keys.hmacShaKeyFor() — minimum 256-bit key enforced by JJWT |

### Known Threat Patterns for JWT + Spring Boot

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged JWT (weak secret) | Spoofing | Keys.hmacShaKeyFor() enforces ≥256-bit key; WeakKeyException thrown otherwise |
| JWT with no expiry | Elevation of Privilege | `.expiration(new Date(System.currentTimeMillis() + 86_400_000L))` mandatory |
| Password stored in plaintext | Information Disclosure | BCryptPasswordEncoder — never store raw password |
| SQL injection via username | Tampering | Spring Data JPA uses parameterized queries by default |
| CSRF on state-changing endpoints | Tampering | CSRF disabled (stateless JWT); no session cookie exploitable |
| Missing Authorization header ignored | Spoofing | JwtAuthenticationFilter skips cleanly — Spring Security returns 401 if endpoint is protected |
| JWT secret in git | Information Disclosure | `${JWT_SECRET:default-dev-...}` pattern; only default in yml, real secret via env var |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java (JDK) | Spring Boot compilation and runtime | YES | 25.0.1 LTS | — |
| Maven (mvn) | Build tool | NO | — | Use `mvnw` wrapper (generated by Initializr) |
| Docker | Container builds, Phase 8 | YES | 29.4.0 | — |
| PostgreSQL (local) | Local development without Docker | NO | — | Use Docker: `docker run -p 5432:5432 postgres:16` |

**Missing dependencies with no fallback:**
- Maven CLI (`mvn`) — use the Maven Wrapper (`./mvnw`) instead. Spring Initializr generates `mvnw` and `.mvn/wrapper/`. This is the recommended approach for Spring Boot projects anyway.

**Missing dependencies with fallback:**
- PostgreSQL local install — use Docker to run PostgreSQL: `docker run -d --name vdt-postgres -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`. Docker is available (v29.4.0).

**Java version note:** Java 25 is installed (LTS). Spring Boot 3.3.x requires Java 17+. Java 25 satisfies this requirement. Set `<java.version>17</java.version>` in pom.xml properties to target Java 17 bytecode compatibility for maximum portability.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JJWT 0.12.6 is the version to use (as specified in CONTEXT.md D-08), even though 0.13.0 is the current latest | Standard Stack | JJWT 0.13.0 has the same API as 0.12.x — low risk. 0.12.6 is explicitly locked in CONTEXT.md. |
| A2 | Spring Boot 3.3.13 is appropriate despite EOL (Jun 2025) | Standard Stack | This is a demo/deliverable project, not production. Security patches not needed. Zero risk for this use case. |
| A3 | H2 will be used for unit tests with a separate migration file (no native PostgreSQL ENUM) | Validation Architecture | If tests require full PostgreSQL fidelity, Testcontainers must be added. Deferred to phase execution. |

**If this table is empty:** All remaining claims were verified or cited — no additional user confirmation needed.

---

## Open Questions

1. **Java version targeting in pom.xml**
   - What we know: Java 25 is installed; Spring Boot 3.3.x requires Java 17+
   - What's unclear: Should `<java.version>` target 17 (maximum compatibility) or 21 (modern LTS) or 25 (installed version)?
   - Recommendation: Target Java 17 in pom.xml for broadest compatibility. The installed JDK 25 can compile Java 17 source. If assessor runs on JDK 17, bytecode will still work.

2. **Test database strategy: H2 vs Testcontainers**
   - What we know: PostgreSQL native ENUM types are not supported by H2
   - What's unclear: Whether the planner wants full-fidelity PostgreSQL tests in Phase 1 or deferred to later
   - Recommendation: Use H2 with a separate `V1__init_schema_h2.sql` for `src/test/resources`. This avoids requiring Docker in CI. Flag Testcontainers as a Phase 5+ concern.

3. **`/api/users/me` protected endpoint**
   - What we know: AUTH-04 requires a protected endpoint to demonstrate JWT authentication
   - What's unclear: Whether to create a minimal `/api/users/me` endpoint in Phase 1 or rely on Phase 2's user endpoints
   - Recommendation: Add a minimal `GET /api/users/me` that returns `{ username, displayName, status }` from the security principal. This satisfies AUTH-04 with a real endpoint without scope creep.

---

## Sources

### Primary (HIGH confidence)
- [JJWT GitHub README (0.12.x)](https://github.com/jwtk/jjwt) — API patterns, Maven dependencies, key generation
- [JJWT CHANGELOG.md](https://github.com/jwtk/jjwt/blob/master/CHANGELOG.md) — 0.12.x API changes from 0.11.x
- [Spring Security Java Configuration](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) — SecurityFilterChain pattern, removal of WebSecurityConfigurerAdapter
- [Spring Security Password Storage](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/index.html) — BCryptPasswordEncoder, UserDetailsService, DaoAuthenticationProvider
- [Spring Security JWT Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html) — OncePerRequestFilter pattern
- [Spring Boot Data Initialization (Flyway)](https://docs.spring.io/spring-boot/how-to/data-initialization.html) — Flyway auto-configuration, migration locations, naming convention
- [spring.io Spring Boot 3.3.13 Release](https://spring.io/blog/2025/06/19/spring-boot-3-3-13-available-now/) — Latest patch version of 3.3.x
- [endoflife.date/spring-boot](https://endoflife.date/spring-boot) — EOL status of 3.3.x
- [Docker Blog: 9 Tips for Containerizing Spring Boot](https://www.docker.com/blog/9-tips-for-containerizing-your-spring-boot-code/) — Multi-stage Dockerfile pattern, eclipse-temurin base images

### Secondary (MEDIUM confidence)
- [dev-solve.com: Flyway PostgreSQL Support in Spring Boot 3.3](https://dev-solve.com/posts/4ae6b9e) — flyway-database-postgresql requirement, verified against Spring Initializr behavior
- [tutorialpedia.org: PostgreSQL ENUM with JPA](https://www.tutorialpedia.org/blog/how-to-map-postgresql-enum-with-jpa-and-hibernate/) — @Column(columnDefinition) requirement for PostgreSQL ENUM
- [bootify.io: REST API Spring Security with JWT](https://bootify.io/spring-security/rest-api-spring-security-with-jwt.html) — SecurityFilterChain + JWT filter integration pattern
- [Simon Martinelli on X](https://x.com/simas_ch/status/1793965273479082139) — Corroborating flyway-database-postgresql requirement for Boot 3.3.0

### Tertiary (LOW confidence / not used)
- None — all research was verified against official documentation or multiple authoritative sources.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions confirmed via official release pages and Spring Boot documentation
- Architecture: HIGH — SecurityFilterChain and JJWT patterns verified against official docs and Javadoc
- Pitfalls: HIGH — flyway-database-postgresql requirement confirmed by multiple sources; JJWT API change confirmed via CHANGELOG

**Research date:** 2026-05-25
**Valid until:** 2026-08-25 (stable stack; Spring Boot 3.3.x is EOL so no new patches expected)
