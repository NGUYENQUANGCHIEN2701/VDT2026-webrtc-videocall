---
phase: 01-backend-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/pom.xml
  - backend/mvnw
  - backend/mvnw.cmd
  - backend/.mvn/wrapper/maven-wrapper.properties
  - backend/src/main/java/com/vdt/VdtApplication.java
  - backend/src/main/resources/application.yml
  - backend/src/main/resources/db/migration/V1__init_schema.sql
  - backend/src/main/java/com/vdt/user/UserStatus.java
  - backend/src/main/java/com/vdt/user/User.java
  - backend/src/main/java/com/vdt/user/UserRepository.java
  - backend/Dockerfile
  - backend/.gitignore
  - backend/src/test/resources/application-test.yml
  - backend/src/test/resources/db/migration/h2/V1__init_schema.sql
  - backend/src/test/java/com/vdt/FlywayMigrationTest.java
autonomous: true
requirements:
  - INFRA-01
  - INFRA-03
tags:
  - spring-boot
  - flyway
  - postgresql
  - jpa
  - maven

must_haves:
  truths:
    - "./mvnw spring-boot:run starts Spring Boot on port 8080 without errors when PostgreSQL is reachable"
    - "Flyway runs V1__init_schema.sql at startup and the users table + user_status ENUM exist in PostgreSQL"
    - "User JPA entity round-trips to PostgreSQL with status=OFFLINE default (no Hibernate type cast errors)"
    - "FlywayMigrationTest passes against H2 test datasource"
  artifacts:
    - path: backend/pom.xml
      provides: Maven build with Spring Boot 3.3.13, JJWT 0.12.6, flyway-database-postgresql, Lombok
      contains: "<artifactId>flyway-database-postgresql</artifactId>"
    - path: backend/src/main/resources/db/migration/V1__init_schema.sql
      provides: Versioned schema for users table (INFRA-03 deliverable)
      contains: "CREATE TYPE user_status AS ENUM"
    - path: backend/src/main/java/com/vdt/user/User.java
      provides: JPA entity with PostgreSQL ENUM mapping
      contains: 'columnDefinition = "user_status"'
    - path: backend/src/main/java/com/vdt/user/UserRepository.java
      provides: Spring Data JPA repository with findByUsername/existsByUsername
      contains: "findByUsername"
    - path: backend/src/main/resources/application.yml
      provides: Datasource, Flyway, JWT config (no Hibernate ddl-auto=create)
      contains: "ddl-auto: validate"
    - path: backend/Dockerfile
      provides: Multi-stage Spring Boot container (reused by Phase 8 Docker Compose)
      contains: "eclipse-temurin:17-jre-jammy"
  key_links:
    - from: backend/src/main/java/com/vdt/user/User.java
      to: backend/src/main/resources/db/migration/V1__init_schema.sql
      via: "@Column(columnDefinition = \"user_status\") maps Java enum to PostgreSQL user_status ENUM type"
      pattern: 'columnDefinition\s*=\s*"user_status"'
    - from: backend/pom.xml
      to: Flyway 10.x PostgreSQL support
      via: explicit flyway-database-postgresql dependency (BOM-managed version)
      pattern: "flyway-database-postgresql"
    - from: backend/src/main/resources/application.yml
      to: backend/src/main/resources/db/migration/V1__init_schema.sql
      via: "spring.flyway.locations=classpath:db/migration triggers V1 migration"
      pattern: "classpath:db/migration"
---

<objective>
Scaffold du an Spring Boot 3.3.13 backend va thiet lap persistence layer PostgreSQL. Sau plan nay, `./mvnw spring-boot:run` tu `backend/` boot app, Flyway apply V1 tao `users` table voi `user_status` ENUM, va `User` entity round-trip qua `UserRepository`. Thuc hien D-01 (Maven), D-02 (monorepo backend/), D-03 (feature packages), D-09/D-10/D-11/D-12 (users schema + display_name default), dap ung INFRA-01 (backend skeleton) va INFRA-03 (Flyway migration deliverable).

Muc dich: Tao nen tang cho cac plan va phase sau. Plan 02/03 import `com.vdt.user.User` va `com.vdt.user.UserRepository`, va can `application.yml` JWT config.

Output:
- Maven project (pom.xml + mvnw wrapper) compile duoc tren JDK 17 bytecode
- VdtApplication.java entry point
- application.yml voi datasource PostgreSQL, Flyway, JWT secret default, server port 8080
- Flyway V1__init_schema.sql tao user_status ENUM + users table + idx_users_username
- User entity (map PostgreSQL ENUM), UserStatus enum, UserRepository
- Multi-stage Dockerfile (tai su dung o Phase 8)
- H2 test datasource + migration H2 + FlywayMigrationTest
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-backend-foundation/01-CONTEXT.md
@.planning/phases/01-backend-foundation/01-RESEARCH.md
@.planning/phases/01-backend-foundation/01-PATTERNS.md
@.planning/phases/01-backend-foundation/01-SKELETON.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Maven project scaffold (pom.xml + mvnw wrapper + Dockerfile + .gitignore)</name>
  <files>
    backend/pom.xml,
    backend/mvnw,
    backend/mvnw.cmd,
    backend/.mvn/wrapper/maven-wrapper.properties,
    backend/Dockerfile,
    backend/.gitignore,
    backend/src/main/java/com/vdt/VdtApplication.java
  </files>
  <read_first>
    .planning/phases/01-backend-foundation/01-CONTEXT.md,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md,
    CLAUDE.md
  </read_first>
  <action>
    Tao skeleton Maven project duoi backend/ theo D-01 (Maven) va D-02 (monorepo backend/ o root).

    pom.xml — viet POM day du theo PATTERNS.md "backend/pom.xml" (RESEARCH.md §Standard Stack). Bat buoc:
    - parent: org.springframework.boot:spring-boot-starter-parent version 3.3.13 (relativePath rong)
    - groupId: com.vdt; artifactId: vdt-backend; version: 0.1.0-SNAPSHOT; packaging: jar
    - properties: java.version=17, jjwt.version=0.12.6
    - dependencies (BOM-managed, khong ghi version): spring-boot-starter-web, spring-boot-starter-security, spring-boot-starter-data-jpa, spring-boot-starter-flyway, org.postgresql:postgresql (scope=runtime), org.flywaydb:flyway-database-postgresql (BAT BUOC cho Flyway 10.x), org.projectlombok:lombok (optional=true)
    - dependencies (explicit ${jjwt.version}): io.jsonwebtoken:jjwt-api, jjwt-impl (scope=runtime), jjwt-jackson (scope=runtime)
    - test dependencies (BOM-managed, scope=test): spring-boot-starter-test, spring-security-test, com.h2database:h2
    - build/plugins: spring-boot-maven-plugin (BOM-managed)

    Tao Maven Wrapper (mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.properties) target Maven 3.9.x. He thong khong co Maven CLI — wrapper la bat buoc. Co the copy tu Spring Initializr. Set executable cho mvnw (git chmod +x).

    backend/src/main/java/com/vdt/VdtApplication.java — package com.vdt; @SpringBootApplication class VdtApplication voi main goi SpringApplication.run.

    backend/Dockerfile — multi-stage Dockerfile theo PATTERNS.md "backend/Dockerfile". Stage 1: `FROM eclipse-temurin:17-jdk-jammy AS builder`, WORKDIR /opt/app, COPY .mvn + mvnw + pom.xml, RUN `./mvnw dependency:go-offline -q`, COPY src/, RUN `./mvnw clean package -DskipTests -q`. Stage 2: `FROM eclipse-temurin:17-jre-jammy`, WORKDIR /opt/app, EXPOSE 8080, tao non-root user appuser/appgroup, USER appuser, COPY jar tu builder, ENTRYPOINT. Dockerfile nay tai su dung o Phase 8 docker-compose.

    backend/.gitignore — exclude `target/`, `.idea/`, `*.iml`, `.vscode/`, `.DS_Store`, `*.log`. KHONG exclude `.mvn/wrapper/maven-wrapper.properties`.

    Anti-patterns cam (PATTERNS.md §Anti-Patterns): khong dung WebSecurityConfigurerAdapter, khong import SignatureAlgorithm, khong dung `ddl-auto=create|update`, khong thieu flyway-database-postgresql.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q -DskipTests compile</automated>
  </verify>
  <acceptance_criteria>
    - File backend/pom.xml co chuoi `<groupId>io.jsonwebtoken</groupId>`.
    - File backend/pom.xml co `<artifactId>flyway-database-postgresql</artifactId>`.
    - File backend/pom.xml co `<version>3.3.13</version>` trong `<parent>`.
    - File backend/pom.xml co `<java.version>17</java.version>`.
    - File backend/pom.xml co `<jjwt.version>0.12.6</jjwt.version>`.
    - File backend/pom.xml co `<artifactId>spring-boot-starter-security</artifactId>` va `<artifactId>spring-boot-starter-data-jpa</artifactId>` va `<artifactId>spring-boot-starter-flyway</artifactId>` va `<artifactId>spring-boot-starter-web</artifactId>`.
    - File backend/pom.xml co `<artifactId>h2</artifactId>` voi `<scope>test</scope>`.
    - File backend/mvnw ton tai va khong rong.
    - File backend/.mvn/wrapper/maven-wrapper.properties co `distributionUrl=` tham chieu maven 3.9+.
    - File backend/src/main/java/com/vdt/VdtApplication.java co `@SpringBootApplication` va `SpringApplication.run(VdtApplication.class, args)`.
    - File backend/Dockerfile co `FROM eclipse-temurin:17-jdk-jammy AS builder` va `FROM eclipse-temurin:17-jre-jammy`.
    - File backend/Dockerfile co `USER appuser`.
    - `cd backend && ./mvnw -q -DskipTests compile` exit 0.
  </acceptance_criteria>
  <done>Maven project scaffold on dinh; `./mvnw compile` thanh cong; Dockerfile hop le.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: application.yml + Flyway V1 migration + User domain model</name>
  <files>
    backend/src/main/resources/application.yml,
    backend/src/main/resources/db/migration/V1__init_schema.sql,
    backend/src/main/java/com/vdt/user/UserStatus.java,
    backend/src/main/java/com/vdt/user/User.java,
    backend/src/main/java/com/vdt/user/UserRepository.java
  </files>
  <read_first>
    backend/pom.xml,
    .planning/phases/01-backend-foundation/01-CONTEXT.md,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Cau hinh persistence va dinh nghia domain model users. Thuc hien D-07 (jwt.secret qua env var voi default), D-09 (username la login), D-10 (fields), D-11 (display_name default), D-12 (PostgreSQL ENUM).

    backend/src/main/resources/application.yml — viet dung block tu PATTERNS.md "application.yml". Key bat buoc:
    - spring.datasource.url: `jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:vdt_webrtc}`
    - spring.datasource.username: `${DB_USER:postgres}`
    - spring.datasource.password: `${DB_PASS:postgres}`
    - spring.datasource.driver-class-name: `org.postgresql.Driver`
    - spring.datasource.hikari.maximum-pool-size: 10, connection-timeout: 20000
    - spring.jpa.hibernate.ddl-auto: `validate` (Flyway quan ly schema — KHONG `create`/`update`)
    - spring.jpa.show-sql: false
    - spring.jpa.properties.hibernate.dialect: `org.hibernate.dialect.PostgreSQLDialect`
    - spring.flyway.enabled: true; locations: `classpath:db/migration`; baseline-on-migrate: false
    - jwt.secret: `${JWT_SECRET:default-dev-secret-change-in-prod-must-be-32-chars-min}` (>=32 chars)
    - jwt.expiration-ms: 86400000 (24h)
    - server.port: 8080

    backend/src/main/resources/db/migration/V1__init_schema.sql — viet dung SQL tu PATTERNS.md. Bat buoc:
    - Bat dau voi `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE');`
    - Tao `users` table voi columns: `id BIGSERIAL PRIMARY KEY`, `username VARCHAR(50) NOT NULL UNIQUE`, `password_hash VARCHAR(255) NOT NULL`, `display_name VARCHAR(100) NOT NULL`, `status user_status NOT NULL DEFAULT 'OFFLINE'`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - Tao `CREATE UNIQUE INDEX idx_users_username ON users (username);`
    - Ten file `V1__init_schema.sql` (2 dau gach duoi)

    backend/src/main/java/com/vdt/user/UserStatus.java — enum `ONLINE`, `OFFLINE`.

    backend/src/main/java/com/vdt/user/User.java — JPA entity theo PATTERNS.md. Yeu cau:
    - Lombok @Data @Builder @NoArgsConstructor @AllArgsConstructor
    - @Entity @Table(name = "users")
    - id @Id @GeneratedValue(IDENTITY)
    - username @Column(nullable=false, unique=true, length=50)
    - passwordHash @Column(name="password_hash", nullable=false)
    - displayName @Column(name="display_name", nullable=false, length=100)
    - status `UserStatus status = UserStatus.OFFLINE` voi @Enumerated(EnumType.STRING) va @Column(columnDefinition = "user_status", nullable=false)
    - createdAt OffsetDateTime @Column(name="created_at", nullable=false, updatable=false)
    - @PrePersist onCreate set createdAt neu null va set displayName = username neu null/blank

    backend/src/main/java/com/vdt/user/UserRepository.java — `JpaRepository<User, Long>` voi `findByUsername` va `existsByUsername`.

    Anti-patterns: KHONG `ddl-auto: create|update`, KHONG chi @Enumerated ma thieu `columnDefinition`, KHONG hardcode JWT secret, KHONG import `SignatureAlgorithm`.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q -DskipTests compile</automated>
  </verify>
  <acceptance_criteria>
    - application.yml co `ddl-auto: validate`.
    - application.yml co `${JWT_SECRET:default-dev-secret-change-in-prod-must-be-32-chars-min}`.
    - application.yml co `expiration-ms: 86400000`.
    - application.yml co `locations: classpath:db/migration`.
    - V1__init_schema.sql co `CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE')`.
    - V1__init_schema.sql co `CREATE TABLE users` va day du 6 columns.
    - V1__init_schema.sql co `CREATE UNIQUE INDEX idx_users_username`.
    - UserStatus co ONLINE va OFFLINE.
    - User.java co `columnDefinition = "user_status"`.
    - User.java co `@PrePersist` va set displayName = username neu null/blank.
    - User.java co `@Enumerated(EnumType.STRING)`.
    - UserRepository co `findByUsername` va `existsByUsername`.
    - `cd backend && ./mvnw -q -DskipTests compile` exit 0.
    - Grep gate: `grep -v '^#' backend/src/main/resources/application.yml | grep -c 'ddl-auto: create\|ddl-auto: update'` = 0.
  </acceptance_criteria>
  <done>Persistence stack xong; entity compile; V1 migration SQL hop le; application.yml khong co `ddl-auto: create|update`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: H2 test datasource + FlywayMigrationTest (Wave 0 test scaffold)</name>
  <files>
    backend/src/test/resources/application-test.yml,
    backend/src/test/resources/db/migration/h2/V1__init_schema.sql,
    backend/src/test/java/com/vdt/FlywayMigrationTest.java
  </files>
  <read_first>
    backend/pom.xml,
    backend/src/main/resources/application.yml,
    backend/src/main/resources/db/migration/V1__init_schema.sql,
    backend/src/main/java/com/vdt/user/User.java,
    .planning/phases/01-backend-foundation/01-RESEARCH.md,
    .planning/phases/01-backend-foundation/01-PATTERNS.md
  </read_first>
  <action>
    Tao H2 test infrastructure theo RESEARCH.md §Validation Architecture Wave 0. H2 khong ho tro PostgreSQL ENUM, can migration rieng.

    backend/src/test/resources/application-test.yml — theo PATTERNS.md "application-test.yml":
    - spring.datasource.url: `jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL`
    - spring.datasource.driver-class-name: `org.h2.Driver`
    - spring.datasource.username: `sa`; password rong
    - spring.jpa.hibernate.ddl-auto: `none`
    - spring.jpa.database-platform: `org.hibernate.dialect.H2Dialect`
    - spring.flyway.enabled: true; locations: `classpath:db/migration/h2`
    - jwt.secret: `test-secret-key-for-unit-tests-minimum-32-chars`
    - jwt.expiration-ms: 3600000

    backend/src/test/resources/db/migration/h2/V1__init_schema.sql — ban H2 compatible, KHONG `CREATE TYPE`. Dung:
    - `CREATE TABLE users ( id BIGINT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, display_name VARCHAR(100) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP );`
    - `CREATE UNIQUE INDEX idx_users_username ON users (username);`

    Note: H2 se bo qua `columnDefinition = "user_status"`; @Enumerated(EnumType.STRING) gui string nen test ok.

    backend/src/test/java/com/vdt/FlywayMigrationTest.java — JUnit 5 + @SpringBootTest. Cau truc:
    - package com.vdt
    - @SpringBootTest @ActiveProfiles("test")
    - Autowired JdbcTemplate
    - testSchemaCreated: query information_schema.tables cho table_name = 'USERS' (H2 uppercase)
    - testUsersTableHasExpectedColumns: query information_schema.columns va assert co USERNAME, PASSWORD_HASH, DISPLAY_NAME, STATUS, CREATED_AT, ID (case-insensitive)
    - testUsernameUniqueIndexExists: query information_schema.indexes va assert count > 0

    Tat ca tests dung AssertJ `assertThat(...)`.
  </action>
  <verify>
    <automated>cd backend && ./mvnw -q test -Dtest=FlywayMigrationTest</automated>
  </verify>
  <acceptance_criteria>
    - application-test.yml co `jdbc:h2:mem:testdb`.
    - application-test.yml co `locations: classpath:db/migration/h2`.
    - application-test.yml co jwt.secret >= 32 chars.
    - H2 V1 migration KHONG co `CREATE TYPE`.
    - H2 V1 migration co `CREATE TABLE users` va `idx_users_username`.
    - FlywayMigrationTest co `@SpringBootTest` va `@ActiveProfiles("test")`.
    - FlywayMigrationTest co 3 @Test methods: `testSchemaCreated`, `testUsersTableHasExpectedColumns`, `testUsernameUniqueIndexExists`.
  </acceptance_criteria>
  <done>H2 test infra xong; migration va tests hoat dong voi H2.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Mo ta |
|----------|-------------|
| Untrusted HTTP request → JwtAuthenticationFilter | Moi request di qua day; Bearer token phai hop le truoc khi vao SecurityContextHolder |
| JWT claims → SecurityContextHolder | Boundary quan trong ve spoofing; JJWT signature verification gate o day |
| Password input → BCryptPasswordEncoder | BCrypt muoi + work factor 10 chong rainbow/dictionary attacks |
| CORS preflight (OPTIONS) → SecurityFilterChain | CorsConfigurationSource phai xu ly truoc auth filter de cho preflight |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-08 | Spoofing | Forged JWT (weak secret) | mitigate | `Keys.hmacShaKeyFor()` ep key >=256-bit; default >=32 chars. ASVS V6.2. RESEARCH.md Security Domain row 1. |
| T-01-09 | Elevation of Privilege | JWT khong expiry / qua dai | mitigate | `.expiration(...)` bat buoc; 24h cap per D-06. ASVS V3.3. |
| T-01-10 | Tampering | CSRF tren endpoints thay doi | mitigate | `.csrf(csrf -> csrf.disable())`. JWT stateless khong co session cookie. ASVS V13.2. |
| T-01-11 | Spoofing | Thieu Authorization header | mitigate | JwtAuthenticationFilter skip; `.anyRequest().authenticated()` se tra 401. ASVS V4.1. |
| T-01-12 | Information Disclosure | Lo stack trace | mitigate | GlobalExceptionHandler tra JSON sanitized. ASVS V7.4. |
| T-01-13 | Tampering | SQL injection qua username | mitigate | Spring Data JPA su dung query co tham so. ASVS V5.3. |
| T-01-14 | Spoofing | JWT replay sau key rotation | accept | Out of Phase 1. Khong refresh token/blacklist per D-04. |
| T-01-15 | Elevation of Privilege | WebSocket bypass HTTP auth | mitigate | `.requestMatchers("/ws/**").permitAll()` de Phase 2 auth trong STOMP CONNECT. ASVS V13.5. |
</threat_model>

<verification>
Sau khi 2 task hoan thanh:

1. `cd backend && ./mvnw -q -DskipTests compile` exit 0
2. PostgreSQL chay, `cd backend && ./mvnw spring-boot:run` hien `Started VdtApplication`, khong BeanCreationException
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/anything` tra 401 (Security gate)
4. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/register` tra 404/405 (KHONG 401)
5. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ws/test` tra 404 (KHONG 401)
6. Grep gate:
   - `grep -r -E '(parserBuilder|setSigningKey|parseClaimsJws|\.getBody()|SignatureAlgorithm)' backend/src/main/java/com/vdt/auth/ | ...` tra 0
   - `grep -r 'WebSecurityConfigurerAdapter' backend/src/main/java/` tra 0
</verification>

<success_criteria>
- AUTH-04 infrastructure san sang: JwtService tao/parse token HS256 dung JJWT 0.12.x; JwtAuthenticationFilter validate Bearer token; SecurityConfig dat filter dung vi tri
- 4 tinh huong loi (validation 400, bad credentials 401, duplicate username 409, generic 500) duoc handle boi GlobalExceptionHandler
- D-04 ton tai: khong blacklist JWT
- D-06, D-07, D-08: expiry 24h, secret tu config, HS256
- Pitfall 7: /ws/** pre-permit cho Phase 2
- App boot on dinh voi full security config; curl smoke tests ra status dung
</success_criteria>

<output>
Tao `.planning/phases/01-backend-foundation/01-01-SUMMARY.md` tom tat artifacts, ket qua smoke test, va deviations (neu co).
</output>
