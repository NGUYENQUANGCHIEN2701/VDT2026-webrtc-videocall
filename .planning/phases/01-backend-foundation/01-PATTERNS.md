# Phase 1: Backend Foundation - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 19 (all new — greenfield codebase)
**Analogs found:** 0 / 19 — no source code exists yet; all patterns sourced from RESEARCH.md

> **Greenfield note:** The `backend/` and `frontend/` directories do not exist. This phase creates
> the first code. Every pattern below is sourced from RESEARCH.md code examples and official
> Spring Boot / JJWT documentation. These patterns become the project baseline for all future phases.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `backend/pom.xml` | config | — | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/VdtApplication.java` | config | — | No analog — greenfield | n/a |
| `backend/src/main/resources/application.yml` | config | — | No analog — greenfield | n/a |
| `backend/src/main/resources/db/migration/V1__init_schema.sql` | migration | batch | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/UserStatus.java` | model | — | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/User.java` | model | CRUD | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/UserRepository.java` | model | CRUD | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/ErrorResponse.java` | utility | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` | middleware | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/SecurityConfig.java` | config | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java` | model | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/LoginRequest.java` | model | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` | model | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/JwtService.java` | service | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` | middleware | request-response | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/AuthService.java` | service | CRUD | No analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/AuthController.java` | controller | request-response | No analog — greenfield | n/a |
| `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` | test | request-response | No analog — greenfield | n/a |
| `backend/src/test/java/com/vdt/FlywayMigrationTest.java` | test | batch | No analog — greenfield | n/a |
| `backend/src/test/resources/application-test.yml` | config | — | No analog — greenfield | n/a |
| `backend/Dockerfile` | config | — | No analog — greenfield | n/a |

---

## Creation Order (Dependency Graph)

Tasks must be created in this order to satisfy compile-time and runtime dependencies:

```
Wave 1 — Project scaffold (no Java deps)
  backend/pom.xml
  backend/src/main/resources/application.yml
  backend/src/main/resources/db/migration/V1__init_schema.sql
  backend/src/main/java/com/vdt/VdtApplication.java
  backend/Dockerfile

Wave 2 — Domain model (no inter-class deps within this wave)
  backend/src/main/java/com/vdt/user/UserStatus.java
  backend/src/main/java/com/vdt/user/User.java         (depends on UserStatus)
  backend/src/main/java/com/vdt/user/UserRepository.java  (depends on User)

Wave 3 — Common infrastructure
  backend/src/main/java/com/vdt/common/ErrorResponse.java
  backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java  (depends on ErrorResponse)
  backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java
  backend/src/main/java/com/vdt/auth/dto/LoginRequest.java
  backend/src/main/java/com/vdt/auth/dto/AuthResponse.java

Wave 4 — Auth service layer
  backend/src/main/java/com/vdt/auth/JwtService.java   (depends on application.yml jwt.secret)
  backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java  (depends on JwtService, UserRepository)
  backend/src/main/java/com/vdt/common/SecurityConfig.java  (depends on JwtAuthenticationFilter)
  backend/src/main/java/com/vdt/auth/AuthService.java   (depends on UserRepository, JwtService)

Wave 5 — Controller
  backend/src/main/java/com/vdt/auth/AuthController.java  (depends on AuthService)

Wave 6 — Tests
  backend/src/test/resources/application-test.yml
  backend/src/test/java/com/vdt/auth/AuthControllerTest.java
  backend/src/test/java/com/vdt/FlywayMigrationTest.java
```

---

## Pattern Assignments

### `backend/pom.xml` (config)

**Analog:** RESEARCH.md §Standard Stack — Installation pom.xml snippets

**Full pom.xml dependency block** (RESEARCH.md lines 123–206):
```xml
<!-- Parent — sets BOM for all Spring versions -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.13</version>
    <relativePath/>
</parent>

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

<!-- CRITICAL: flyway-database-postgresql REQUIRED for Flyway 10.x + PostgreSQL.
     Missing this causes UnsupportedDatabaseException at startup. -->
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

**Critical notes:**
- `java.version` targets 17 even though JDK 25 is installed — broadest compatibility (RESEARCH.md Open Question 1)
- `jjwt.version` MUST be in `<properties>` since JJWT is not in the Spring Boot BOM
- `flyway-database-postgresql` has no `<version>` tag — it IS managed by the Spring Boot BOM

---

### `backend/src/main/resources/application.yml` (config)

**Analog:** RESEARCH.md §Pattern 7 — application.yml Configuration (lines 572–605)

**Full configuration** (RESEARCH.md lines 574–605):
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
    baseline-on-migrate: false

jwt:
  secret: ${JWT_SECRET:default-dev-secret-change-in-prod-must-be-32-chars-min}
  expiration-ms: 86400000         # 24 hours (D-06)

server:
  port: 8080
```

**Critical notes:**
- `ddl-auto: validate` — Flyway owns schema; Hibernate only validates. NEVER use `create` or `update`.
- JWT secret default is ≥32 chars to satisfy JJWT HS256 minimum key size (RESEARCH.md Pitfall 6)
- `${JWT_SECRET:default-dev-...}` pattern satisfies D-07: overridable via env var

---

### `backend/src/main/resources/db/migration/V1__init_schema.sql` (migration, batch)

**Analog:** RESEARCH.md §Pattern 5 — Flyway V1 Migration (lines 506–525)

**Full migration SQL** (RESEARCH.md lines 508–525):
```sql
-- File: src/main/resources/db/migration/V1__init_schema.sql
-- Naming convention: V{version}__{description}.sql (double underscore required by Flyway)

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

**Critical notes:**
- `CREATE TYPE user_status` MUST come before `CREATE TABLE users` — PostgreSQL requires the type to exist before the column that uses it
- `BIGSERIAL` for auto-increment primary key (PostgreSQL idiom)
- `TIMESTAMPTZ` is PostgreSQL alias for `TIMESTAMP WITH TIME ZONE` — satisfies D-10

---

### `backend/src/main/java/com/vdt/VdtApplication.java` (config)

**Pattern:** Standard Spring Boot entry point — no analog needed.

```java
package com.vdt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VdtApplication {
    public static void main(String[] args) {
        SpringApplication.run(VdtApplication.class, args);
    }
}
```

---

### `backend/src/main/java/com/vdt/user/UserStatus.java` (model)

**Analog:** RESEARCH.md §Pattern 6 — JPA Entity Mapping (lines 533–534)

```java
package com.vdt.user;

public enum UserStatus {
    ONLINE,
    OFFLINE
}
```

**Note:** Simple enum — no annotations needed. The JPA mapping annotation (`@Enumerated`) lives on the `User` entity field.

---

### `backend/src/main/java/com/vdt/user/User.java` (model, CRUD)

**Analog:** RESEARCH.md §Pattern 6 — JPA Entity Mapping for PostgreSQL ENUM (lines 531–569)

**Full entity pattern** (RESEARCH.md lines 538–569):
```java
package com.vdt.user;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
        if (displayName == null || displayName.isBlank()) displayName = username;  // D-11
    }
}
```

**Critical notes:**
- `@Column(columnDefinition = "user_status")` is MANDATORY. Without it, Hibernate sends VARCHAR which PostgreSQL rejects: "column is of type user_status but expression is of type character varying" (RESEARCH.md Pitfall 3)
- `@PrePersist` handles D-11: display_name defaults to username
- `UserDetails` is NOT implemented on this entity — a separate `CustomUserDetailsService` wraps it (cleaner separation)

---

### `backend/src/main/java/com/vdt/user/UserRepository.java` (model, CRUD)

**Analog:** RESEARCH.md §Code Examples — AuthService uses `userRepository.existsByUsername()` and `userRepository.findByUsername()`

```java
package com.vdt.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
}
```

**Note:** Spring Data JPA generates the SQL automatically from method names — no `@Query` needed for these simple lookups.

---

### `backend/src/main/java/com/vdt/common/ErrorResponse.java` (utility, request-response)

**Analog:** CONTEXT.md §Claude's Discretion — error response format `{ "error": "...", "message": "..." }`

```java
package com.vdt.common;

public record ErrorResponse(String error, String message) {
    // Java record — immutable, with auto-generated constructor, getters, equals, hashCode
    // Jackson serializes to: { "error": "...", "message": "..." }
}
```

**Note:** Java `record` is idiomatic for simple immutable value types. No Lombok needed.

---

### `backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` (middleware, request-response)

**Analog:** RESEARCH.md §Architectural Responsibility Map — `@RestControllerAdvice / @ExceptionHandler returns consistent JSON error shape`

```java
package com.vdt.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .findFirst()
            .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_ERROR", message));
    }

    // Custom exception for duplicate username (409 Conflict)
    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateUsername(UsernameAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("USERNAME_TAKEN", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

**Note:** `UsernameAlreadyExistsException` is a custom runtime exception to be defined in `com.vdt.common` or `com.vdt.auth`. It is thrown by `AuthService.register()` when a duplicate username is detected.

---

### `backend/src/main/java/com/vdt/common/SecurityConfig.java` (config, request-response)

**Analog:** RESEARCH.md §Pattern 3 — Spring Security 6 SecurityFilterChain (lines 373–447)

**Full security config** (RESEARCH.md lines 378–447):
```java
package com.vdt.common;

import com.vdt.auth.JwtAuthenticationFilter;
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
            .csrf(csrf -> csrf.disable())            // MUST disable for stateless REST (Pitfall 4)
            .cors(cors -> cors.configurationSource(corsConfigSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/ws/**").permitAll()  // Reserved for Phase 2 STOMP WebSocket (Pitfall 7)
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
        return new BCryptPasswordEncoder();  // default strength 10 (Claude's Discretion)
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
        config.setAllowedOriginPatterns(List.of("*"));  // permit all for local dev (Claude's Discretion)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

**Critical notes:**
- NEVER use `WebSecurityConfigurerAdapter` — removed in Spring Security 6 (RESEARCH.md Pitfall, State of the Art)
- `.requestMatchers("/ws/**").permitAll()` added proactively so Phase 2 can authenticate inside STOMP `ChannelInterceptor` (RESEARCH.md Pitfall 7)
- CSRF must be disabled for stateless JWT (RESEARCH.md Pitfall 4)

---

### `backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java` (model, request-response)

```java
package com.vdt.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank
    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username may only contain letters, numbers, and underscores")
    String username,

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    String password
) {}
```

**Note:** Validation constraints implement Claude's Discretion rules: username 3–50 chars, alphanumeric + underscore; password min 6 chars.

---

### `backend/src/main/java/com/vdt/auth/dto/LoginRequest.java` (model, request-response)

```java
package com.vdt.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String username,
    @NotBlank String password
) {}
```

---

### `backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` (model, request-response)

```java
package com.vdt.auth.dto;

public record AuthResponse(String token) {}
```

---

### `backend/src/main/java/com/vdt/auth/JwtService.java` (service, request-response)

**Analog:** RESEARCH.md §Pattern 1 (token creation, lines 312–343) and §Pattern 2 (token parsing, lines 345–371)

**Token creation pattern** (RESEARCH.md lines 317–342):
```java
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Value("${jwt.secret}")
private String jwtSecret;

@Value("${jwt.expiration-ms:86400000}")
private long jwtExpirationMs;

private SecretKey getSigningKey() {
    // Raw bytes from UTF-8 string; JJWT enforces ≥32 bytes for HS256
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
}

public String generateToken(String username) {
    return Jwts.builder()
        .subject(username)                              // NEW 0.12.x API: .subject() not .setSubject()
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
        .signWith(getSigningKey())                      // JJWT auto-selects HS256 from key type
        .compact();
}
```

**Token parsing pattern** (RESEARCH.md lines 350–371):
```java
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

public Claims extractAllClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())        // NEW 0.12.x API: .verifyWith() not .setSigningKey()
        .build()
        .parseSignedClaims(token)           // NEW 0.12.x API: .parseSignedClaims() not .parseClaimsJws()
        .getPayload();                      // NEW 0.12.x API: .getPayload() not .getBody()
}

public String extractUsername(String token) {
    return extractAllClaims(token).getSubject();
}

public boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
}
```

**Critical notes — JJWT 0.12.x vs 0.11.x API (RESEARCH.md Pitfall 1 and lines 716–727):**

| Old API 0.11.x — DO NOT USE | New API 0.12.x — USE THIS |
|-----------------------------|---------------------------|
| `Jwts.parserBuilder()` | `Jwts.parser()` |
| `.setSigningKey(key)` | `.verifyWith(key)` |
| `.parseClaimsJws(token)` | `.parseSignedClaims(token)` |
| `.getBody()` | `.getPayload()` |
| `.setSubject(s)` | `.subject(s)` |
| `.setIssuedAt(d)` | `.issuedAt(d)` |
| `.setExpiration(d)` | `.expiration(d)` |
| `SignatureAlgorithm.HS256` | Removed — key type drives algorithm |

---

### `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` (middleware, request-response)

**Analog:** RESEARCH.md §Pattern 4 — JwtAuthenticationFilter (lines 449–499)

**Full filter pattern** (RESEARCH.md lines 453–499):
```java
package com.vdt.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import io.jsonwebtoken.JwtException;
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
            // Invalid/expired token — continue without setting auth; Security returns 401
        }
        filterChain.doFilter(request, response);
    }
}
```

---

### `backend/src/main/java/com/vdt/auth/AuthService.java` (service, CRUD)

**Analog:** RESEARCH.md §Code Examples — AuthService register/login/logout (lines 806–853) and UserDetailsService (lines 855–876)

**Register, login, logout pattern** (RESEARCH.md lines 807–853):
```java
package com.vdt.auth;

import com.vdt.auth.dto.*;
import com.vdt.common.UsernameAlreadyExistsException;
import com.vdt.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        User user = User.builder()
            .username(request.username())
            .passwordHash(passwordEncoder.encode(request.password()))
            .displayName(request.username())  // D-11: display_name defaults to username
            .status(UserStatus.OFFLINE)
            .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user.getUsername());
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        // Mark user ONLINE after successful authentication
        userRepository.findByUsername(request.username())
            .ifPresent(u -> {
                u.setStatus(UserStatus.ONLINE);
                userRepository.save(u);
            });
        String token = jwtService.generateToken(request.username());
        return new AuthResponse(token);
    }

    public void logout(String username) {
        // D-04: client-side logout only — no JWT blacklist; just set status = OFFLINE
        userRepository.findByUsername(username)
            .ifPresent(u -> {
                u.setStatus(UserStatus.OFFLINE);
                userRepository.save(u);
            });
    }
}
```

**UserDetailsService pattern** (RESEARCH.md lines 858–876):
```java
// This class can live in com.vdt.auth or com.vdt.user — co-locate with AuthService
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

### `backend/src/main/java/com/vdt/auth/AuthController.java` (controller, request-response)

**Analog:** RESEARCH.md §Code Examples — Registration endpoint (lines 775–801)

**Full controller pattern** (RESEARCH.md lines 778–801):
```java
package com.vdt.auth;

import com.vdt.auth.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

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
        // D-04: JWT not blacklisted; only DB status update
        authService.logout(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
```

**Additional endpoint for AUTH-04 test (RESEARCH.md Open Question 3):**
```java
// Add to AuthController or create a UserController in com.vdt.user
@GetMapping("/api/users/me")
public ResponseEntity<?> getCurrentUser(Authentication authentication) {
    // Returns minimal user info from the security principal
    // This satisfies AUTH-04: protected endpoint returns 200 with JWT, 401 without
    String username = authentication.getName();
    return ResponseEntity.ok(Map.of("username", username));
}
```

---

### `backend/Dockerfile` (config)

**Analog:** RESEARCH.md §Pattern 8 — Docker Multi-Stage Build (lines 608–639)

**Full Dockerfile pattern** (RESEARCH.md lines 611–637):
```dockerfile
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

**Note:** The `mvnw` Maven wrapper must be generated by Spring Initializr or `mvn wrapper:wrapper`. Docker is available (v29.4.0, confirmed in RESEARCH.md §Environment Availability).

---

### `backend/src/test/resources/application-test.yml` (config)

**Analog:** RESEARCH.md §Validation Architecture — H2 test database strategy (lines 933–938)

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: none       # Flyway test migration owns schema
    database-platform: org.hibernate.dialect.H2Dialect

  flyway:
    enabled: true
    locations: classpath:db/migration/h2   # H2-compatible migration (no CREATE TYPE)

jwt:
  secret: test-secret-key-for-unit-tests-minimum-32-chars
  expiration-ms: 3600000  # 1 hour for tests
```

**Note:** A separate `src/test/resources/db/migration/h2/V1__init_schema.sql` is needed that creates the `users` table without the `CREATE TYPE user_status` statement (H2 does not support PostgreSQL native ENUM). Use `VARCHAR(20) DEFAULT 'OFFLINE'` instead of the native ENUM type for H2.

---

### `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` (test, request-response)

**Analog:** RESEARCH.md §Validation Architecture — Phase Requirements → Test Map (lines 909–920)

**Test structure pattern:**
```java
package com.vdt.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;

    @Test void testRegisterSuccess() throws Exception { /* POST /api/auth/register → 201 */ }
    @Test void testRegisterDuplicateUsername() throws Exception { /* → 409 */ }
    @Test void testRegisterInvalidUsername() throws Exception { /* → 400 */ }
    @Test void testLoginSuccess() throws Exception { /* POST /api/auth/login → 200 + token */ }
    @Test void testLoginWrongPassword() throws Exception { /* → 401 */ }
    @Test void testLogoutSetsOffline() throws Exception { /* → 200 + DB status = OFFLINE */ }
    @Test void testProtectedEndpointWithJwt() throws Exception { /* → 200 */ }
    @Test void testProtectedEndpointNoToken() throws Exception { /* → 401 */ }
}
```

---

### `backend/src/test/java/com/vdt/FlywayMigrationTest.java` (test, batch)

**Analog:** RESEARCH.md §Validation Architecture — Wave 0 Gaps (lines 930–938)

```java
package com.vdt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationTest {

    @Autowired JdbcTemplate jdbcTemplate;

    @Test void testSchemaCreated() {
        // Verify users table exists with expected columns
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'",
            Integer.class);
        assertThat(count).isEqualTo(1);
    }
}
```

---

## Shared Patterns

### Authentication Filter Chain
**Source:** RESEARCH.md §Pattern 3 and §Pattern 4
**Apply to:** `SecurityConfig.java`, `JwtAuthenticationFilter.java`

The JWT filter is registered BEFORE `UsernamePasswordAuthenticationFilter` in the Spring Security chain:
```java
.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
```

### Error Handling
**Source:** RESEARCH.md §Architectural Responsibility Map + CONTEXT.md §Claude's Discretion
**Apply to:** `GlobalExceptionHandler.java`, `AuthController.java`, `AuthService.java`

All error responses use the `ErrorResponse` record: `{ "error": "ERROR_CODE", "message": "Human readable message" }`.
HTTP status mapping: 400 (validation), 401 (auth), 409 (duplicate), 500 (generic).

### Lombok Annotations
**Source:** RESEARCH.md §Standard Stack
**Apply to:** `User.java`, `AuthController.java`, `AuthService.java`, `JwtService.java`, `JwtAuthenticationFilter.java`, `CustomUserDetailsService.java`

Use `@RequiredArgsConstructor` on `@Service` and `@RestController` classes for constructor injection. Use `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` on JPA entities.

### Feature Package Structure
**Source:** CONTEXT.md §D-03
**Apply to:** All Java files

Package root is `com.vdt`. Feature packages:
- `com.vdt.auth` — AuthController, AuthService, JwtService, JwtAuthenticationFilter, CustomUserDetailsService, dto/
- `com.vdt.user` — User, UserStatus, UserRepository
- `com.vdt.common` — SecurityConfig, GlobalExceptionHandler, ErrorResponse, custom exceptions

### JJWT 0.12.x API (Never Use 0.11.x)
**Source:** RESEARCH.md §Pattern 1, §Pattern 2, §Pitfall 1
**Apply to:** `JwtService.java`, `JwtAuthenticationFilter.java`

Always: `Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload()`
Never: `Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody()`

---

## No Analog Found

All files in this phase have no analog in the codebase (greenfield). All patterns sourced from RESEARCH.md.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All 21 files listed above | various | various | No backend or frontend source code exists. This phase establishes all project patterns. |

---

## Anti-Patterns to Avoid (from RESEARCH.md)

| Anti-Pattern | Why Banned | Correct Approach |
|--------------|------------|-----------------|
| `WebSecurityConfigurerAdapter` | Removed in Spring Security 6 | `SecurityFilterChain` @Bean |
| `Jwts.parserBuilder().setSigningKey()` | Deprecated in JJWT 0.12.x | `Jwts.parser().verifyWith()` |
| `ddl-auto=create` or `update` | No migration file; breaks INFRA-03 | `ddl-auto=validate` + Flyway |
| Missing `flyway-database-postgresql` | Startup fails with `UnsupportedDatabaseException` | Always include this dep |
| Short JWT secret (< 32 chars) | JJWT throws `WeakKeyException` | Default in yml is ≥32 chars |
| CSRF enabled on REST API | POST/PUT/DELETE return 403 | `csrf(csrf -> csrf.disable())` |
| `@Column @Enumerated(STRING)` without `columnDefinition` | PostgreSQL rejects VARCHAR cast to ENUM | Add `columnDefinition = "user_status"` |

---

## Metadata

**Analog search scope:** Entire `D:\VDT-WebRTC` repository
**Source files scanned:** 0 Java/XML source files (greenfield — none exist)
**Pattern source:** 100% from RESEARCH.md (01-RESEARCH.md) and CONTEXT.md (01-CONTEXT.md)
**Pattern extraction date:** 2026-05-25
