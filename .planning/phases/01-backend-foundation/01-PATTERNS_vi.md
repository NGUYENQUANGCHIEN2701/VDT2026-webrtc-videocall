# Phase 1: Backend Foundation - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 19 (tat ca moi — greenfield)
**Analogs found:** 0 / 19 — chua co source code; toan bo pattern lay tu RESEARCH.md

> **Ghi chu greenfield:** `backend/` va `frontend/` chua ton tai. Phase nay tao code dau tien.
> Moi pattern ben duoi lay tu RESEARCH.md va docs chinh thong. Cac pattern nay la baseline cho cac phase sau.

---

## Phan loai file

| File moi | Vai tro | Data Flow | Analog gan nhat | Chat luong match |
|----------|--------|----------|------------------|------------------|
| `backend/pom.xml` | config | — | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/VdtApplication.java` | config | — | Khong co analog — greenfield | n/a |
| `backend/src/main/resources/application.yml` | config | — | Khong co analog — greenfield | n/a |
| `backend/src/main/resources/db/migration/V1__init_schema.sql` | migration | batch | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/UserStatus.java` | model | — | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/User.java` | model | CRUD | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/user/UserRepository.java` | model | CRUD | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/ErrorResponse.java` | utility | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` | middleware | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/common/SecurityConfig.java` | config | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java` | model | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/LoginRequest.java` | model | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` | model | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/JwtService.java` | service | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` | middleware | request-response | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/AuthService.java` | service | CRUD | Khong co analog — greenfield | n/a |
| `backend/src/main/java/com/vdt/auth/AuthController.java` | controller | request-response | Khong co analog — greenfield | n/a |
| `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` | test | request-response | Khong co analog — greenfield | n/a |
| `backend/src/test/java/com/vdt/FlywayMigrationTest.java` | test | batch | Khong co analog — greenfield | n/a |
| `backend/src/test/resources/application-test.yml` | config | — | Khong co analog — greenfield | n/a |
| `backend/Dockerfile` | config | — | Khong co analog — greenfield | n/a |

---

## Thu tu tao (Dependency Graph)

Tasks phai duoc tao theo thu tu nay de dap ung dependencies:

```
Wave 1 — Project scaffold (khong co Java deps)
  backend/pom.xml
  backend/src/main/resources/application.yml
  backend/src/main/resources/db/migration/V1__init_schema.sql
  backend/src/main/java/com/vdt/VdtApplication.java
  backend/Dockerfile

Wave 2 — Domain model (khong co dependency giua cac class trong wave)
  backend/src/main/java/com/vdt/user/UserStatus.java
  backend/src/main/java/com/vdt/user/User.java         (phu thuoc UserStatus)
  backend/src/main/java/com/vdt/user/UserRepository.java  (phu thuoc User)

Wave 3 — Common infrastructure
  backend/src/main/java/com/vdt/common/ErrorResponse.java
  backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java  (phu thuoc ErrorResponse)
  backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java
  backend/src/main/java/com/vdt/auth/dto/LoginRequest.java
  backend/src/main/java/com/vdt/auth/dto/AuthResponse.java

Wave 4 — Auth service layer
  backend/src/main/java/com/vdt/auth/JwtService.java   (phu thuoc application.yml jwt.secret)
  backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java  (phu thuoc JwtService, UserRepository)
  backend/src/main/java/com/vdt/common/SecurityConfig.java  (phu thuoc JwtAuthenticationFilter)
  backend/src/main/java/com/vdt/auth/AuthService.java   (phu thuoc UserRepository, JwtService)

Wave 5 — Controller
  backend/src/main/java/com/vdt/auth/AuthController.java  (phu thuoc AuthService)

Wave 6 — Tests
  backend/src/test/resources/application-test.yml
  backend/src/test/java/com/vdt/auth/AuthControllerTest.java
  backend/src/test/java/com/vdt/FlywayMigrationTest.java
```

---

## Pattern Assignments

### `backend/pom.xml` (config)

**Analog:** RESEARCH.md §Standard Stack — pom.xml snippets

**Dependency block day du** (RESEARCH.md lines 123–206):
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

**Ghi chu quan trong:**
- `java.version` target 17 du ngay ca khi JDK 25 cai dat
- `jjwt.version` bat buoc trong `<properties>` vi JJWT khong nam trong BOM
- `flyway-database-postgresql` khong co `<version>` (BOM quan ly)

---

### `backend/src/main/resources/application.yml` (config)

**Analog:** RESEARCH.md §Pattern 7 — application.yml (lines 572–605)

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

**Ghi chu quan trong:**
- `ddl-auto: validate` — Flyway quan ly schema; KHONG `create`/`update`
- JWT secret default >=32 chars de vuot qua yeu cau HS256
- `${JWT_SECRET:...}` dap ung D-07

---

### `backend/src/main/resources/db/migration/V1__init_schema.sql` (migration, batch)

**Analog:** RESEARCH.md §Pattern 5 — Flyway V1 Migration (lines 506–525)

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

**Ghi chu quan trong:**
- `CREATE TYPE user_status` phai dat truoc `CREATE TABLE users`
- `BIGSERIAL` la idiom PostgreSQL cho auto-increment
- `TIMESTAMPTZ` = `TIMESTAMP WITH TIME ZONE`

---

### `backend/src/main/java/com/vdt/VdtApplication.java` (config)

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

```java
package com.vdt.user;

public enum UserStatus {
    ONLINE,
    OFFLINE
}
```

---

### `backend/src/main/java/com/vdt/user/User.java` (model, CRUD)

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

---

### `backend/src/main/java/com/vdt/user/UserRepository.java` (model, CRUD)

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

---

### `backend/src/main/java/com/vdt/common/ErrorResponse.java` (utility)

```java
package com.vdt.common;

public record ErrorResponse(String error, String message) {
    // Jackson serialize thanh { "error": "...", "message": "..." }
}
```

---

### `backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` (middleware)

```java
package com.vdt.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

**Note:** `UsernameAlreadyExistsException` la RuntimeException custom (com.vdt.common hoac com.vdt.auth). Nem trong `AuthService.register()` khi duplicate username.

---

### `backend/src/main/java/com/vdt/common/SecurityConfig.java` (config, request-response)

**Analog:** RESEARCH.md §Pattern 3 — Spring Security 6 SecurityFilterChain (lines 373–447)

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
        config.setAllowedOriginPatterns(List.of("*"));  // permit all for local dev
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
- KHONG dung `WebSecurityConfigurerAdapter` — bi remove trong Spring Security 6
- `.requestMatchers("/ws/**").permitAll()` them truoc cho Phase 2
- CSRF phai disable cho JWT stateless

---

### `backend/src/main/java/com/vdt/auth/dto/RegisterRequest.java` (model)

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

---

### `backend/src/main/java/com/vdt/auth/dto/LoginRequest.java` (model)

```java
package com.vdt.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String username,
    @NotBlank String password
) {}
```

---

### `backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` (model)

```java
package com.vdt.auth.dto;

public record AuthResponse(String token) {}
```

---

### `backend/src/main/java/com/vdt/auth/JwtService.java` (service)

**Token creation pattern:**
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
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
}

public String generateToken(String username) {
    return Jwts.builder()
        .subject(username)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
        .signWith(getSigningKey())
        .compact();
}
```

**Token parsing pattern:**
```java
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

public Claims extractAllClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
}

public String extractUsername(String token) {
    return extractAllClaims(token).getSubject();
}

public boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
}
```

**Ghi chu quan trong — JJWT 0.12.x vs 0.11.x:**

| API cu 0.11.x — KHONG DUNG | API moi 0.12.x — DUNG |
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

### `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` (middleware)

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
            // Token khong hop le/het han — bo qua; Security tra 401 neu endpoint can auth
        }
        filterChain.doFilter(request, response);
    }
}
```

---

### `backend/src/main/java/com/vdt/auth/AuthService.java` (service, CRUD)

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
            .displayName(request.username())  // D-11
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
        userRepository.findByUsername(request.username())
            .ifPresent(u -> {
                u.setStatus(UserStatus.ONLINE);
                userRepository.save(u);
            });
        String token = jwtService.generateToken(request.username());
        return new AuthResponse(token);
    }

    public void logout(String username) {
        userRepository.findByUsername(username)
            .ifPresent(u -> {
                u.setStatus(UserStatus.OFFLINE);
                userRepository.save(u);
            });
    }
}
```

**CustomUserDetailsService:**
```java
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

### `backend/src/main/java/com/vdt/auth/AuthController.java` (controller)

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
        authService.logout(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
```

**Endpoint bo sung cho AUTH-04:**
```java
@GetMapping("/api/users/me")
public ResponseEntity<?> getCurrentUser(Authentication authentication) {
    String username = authentication.getName();
    return ResponseEntity.ok(Map.of("username", username));
}
```

---

### `backend/Dockerfile` (config)

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /opt/app

# Download dependencies first
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q

# Build the application
COPY src/ ./src/
RUN ./mvnw clean package -DskipTests -q

# Stage 2: Runtime (JRE only)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /opt/app
EXPOSE 8080

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=builder /opt/app/target/*.jar ./app.jar
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
```

---

### `backend/src/test/resources/application-test.yml` (config)

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

**Note:** Can co `src/test/resources/db/migration/h2/V1__init_schema.sql` (khong `CREATE TYPE`; dung VARCHAR).

---

### `backend/src/test/java/com/vdt/auth/AuthControllerTest.java` (test)

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

### `backend/src/test/java/com/vdt/FlywayMigrationTest.java` (test)

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
**Source:** RESEARCH.md §Pattern 3 va §Pattern 4
**Apply to:** `SecurityConfig.java`, `JwtAuthenticationFilter.java`

JWT filter duoc register TRUOC `UsernamePasswordAuthenticationFilter`:
```java
.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
```

### Error Handling
**Source:** RESEARCH.md §Architectural Responsibility Map + CONTEXT.md §Claude's Discretion
**Apply to:** `GlobalExceptionHandler.java`, `AuthController.java`, `AuthService.java`

Tat ca error responses dung `ErrorResponse`: `{ "error": "ERROR_CODE", "message": "..." }`.
HTTP status: 400 (validation), 401 (auth), 409 (duplicate), 500 (generic).

### Lombok Annotations
**Source:** RESEARCH.md §Standard Stack
**Apply to:** `User.java`, `AuthController.java`, `AuthService.java`, `JwtService.java`, `JwtAuthenticationFilter.java`, `CustomUserDetailsService.java`

Dung `@RequiredArgsConstructor` cho constructor injection. Dung `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` cho JPA entity.

### Feature Package Structure
**Source:** CONTEXT.md §D-03
**Apply to:** Tat ca Java files

Package root: `com.vdt`. Feature packages:
- `com.vdt.auth` — AuthController, AuthService, JwtService, JwtAuthenticationFilter, CustomUserDetailsService, dto/
- `com.vdt.user` — User, UserStatus, UserRepository
- `com.vdt.common` — SecurityConfig, GlobalExceptionHandler, ErrorResponse, exceptions

### JJWT 0.12.x API (Khong dung 0.11.x)
**Source:** RESEARCH.md §Pattern 1, §Pattern 2, §Pitfall 1
**Apply to:** `JwtService.java`, `JwtAuthenticationFilter.java`

Luon dung: `Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload()`
Khong dung: `Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody()`

---

## No Analog Found

Tat ca file trong phase nay khong co analog trong codebase (greenfield). Tat ca pattern lay tu RESEARCH.md.

| File | Vai tro | Data Flow | Ly do |
|------|------|-----------|--------|
| Tat ca 21 files | various | various | Chua co backend/frontend source code. Phase nay tao pattern dau tien. |

---

## Anti-Patterns to Avoid (tu RESEARCH.md)

| Anti-Pattern | Ly do cam | Cach dung |
|--------------|------------|----------|
| `WebSecurityConfigurerAdapter` | Bi remove trong Spring Security 6 | `SecurityFilterChain` @Bean |
| `Jwts.parserBuilder().setSigningKey()` | Deprecated JJWT 0.12.x | `Jwts.parser().verifyWith()` |
| `ddl-auto=create` hoac `update` | Khong tao migration file; vi pham INFRA-03 | `ddl-auto=validate` + Flyway |
| Thieu `flyway-database-postgresql` | Startup fail `UnsupportedDatabaseException` | Luon include dependency |
| JWT secret ngan (< 32 chars) | JJWT nem `WeakKeyException` | Default yml >=32 chars |
| CSRF bat cho REST API | POST/PUT/DELETE bi 403 | `csrf(csrf -> csrf.disable())` |
| @Enumerated(STRING) khong `columnDefinition` | PostgreSQL tu choi cast VARCHAR → ENUM | Them `columnDefinition = "user_status"` |

---

## Metadata

**Analog search scope:** Toan bo `D:\VDT-WebRTC` repo
**Source files scanned:** 0 Java/XML source files (greenfield)
**Pattern source:** 100% tu RESEARCH.md va CONTEXT.md
**Pattern extraction date:** 2026-05-25
