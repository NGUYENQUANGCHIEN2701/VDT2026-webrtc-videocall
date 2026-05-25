---
phase: 01-backend-foundation
plan: 01
subsystem: infra
tags: [spring-boot, flyway, postgresql, jpa, maven, h2]

requires: []
provides:
  - Maven project scaffold with Spring Boot 3.3.13 parent POM
  - VdtApplication entry point
  - Flyway V1 migration creating user_status ENUM + users table
  - User JPA entity with PostgreSQL ENUM mapping
  - UserRepository with findByUsername/existsByUsername
  - H2 test datasource + H2-compatible migration
  - FlywayMigrationTest (3 tests covering schema, columns, index)
  - Multi-stage Dockerfile (eclipse-temurin:17)
affects: [01-02, 01-03, all subsequent phases]

tech-stack:
  added: [spring-boot-starter-web, spring-boot-starter-security, spring-boot-starter-data-jpa, spring-boot-starter-flyway, flyway-database-postgresql, postgresql, jjwt-api 0.12.6, jjwt-impl 0.12.6, jjwt-jackson 0.12.6, lombok, h2]
  patterns: [Flyway-owned schema (ddl-auto=validate), PostgreSQL ENUM via columnDefinition, @PrePersist for displayName default]

key-files:
  created:
    - backend/pom.xml
    - backend/mvnw / mvnw.cmd / .mvn/wrapper/maven-wrapper.properties
    - backend/src/main/java/com/vdt/VdtApplication.java
    - backend/src/main/resources/application.yml
    - backend/src/main/resources/db/migration/V1__init_schema.sql
    - backend/src/main/java/com/vdt/user/UserStatus.java
    - backend/src/main/java/com/vdt/user/User.java
    - backend/src/main/java/com/vdt/user/UserRepository.java
    - backend/Dockerfile
    - backend/src/test/resources/application-test.yml
    - backend/src/test/resources/db/migration/h2/V1__init_schema.sql
    - backend/src/test/java/com/vdt/FlywayMigrationTest.java
  modified: []

key-decisions:
  - "java.version=17 target bytecode (JDK 25 installed on host; target 17 for Docker compatibility)"
  - "flyway-database-postgresql added explicitly — required for Flyway 10.x PostgreSQL support"
  - "ddl-auto: validate — Flyway owns schema, Hibernate only validates"
  - "columnDefinition = 'user_status' on User.status — mandatory for PostgreSQL ENUM mapping"
  - "H2 test migration omits CREATE TYPE — H2 uses VARCHAR(20) for status column"
  - "JWT secret default ≥32 chars to satisfy JJWT WeakKeyException guard"

patterns-established:
  - "PostgreSQL ENUM pattern: CREATE TYPE in migration + @Enumerated(STRING) + columnDefinition on entity field"
  - "H2 test strategy: separate classpath:db/migration/h2 location with ENUM-free SQL"
  - "Maven wrapper invocation (Windows): call mvnw.cmd or java -classpath .mvn/wrapper/maven-wrapper.jar ... MavenWrapperMain"

requirements-completed:
  - INFRA-01
  - INFRA-03

duration: prior session
completed: 2026-05-25
---

# Plan 01-01: Maven Scaffold + Flyway Migration + User Domain Model

**Spring Boot 3.3.13 Maven project with PostgreSQL persistence, Flyway V1 migration creating user_status ENUM + users table, User JPA entity with PostgreSQL ENUM mapping, and FlywayMigrationTest passing against H2**

## Performance

- **Duration:** Prior session (commits 1e10293, b024157, 967e239)
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Maven project scaffold under `backend/` with Spring Boot 3.3.13 parent, JJWT 0.12.6, flyway-database-postgresql; `./mvnw compile` succeeds
- Flyway V1 migration (`V1__init_schema.sql`) creates `user_status` PostgreSQL ENUM + `users` table with 6 columns + `idx_users_username`; `application.yml` pins `ddl-auto: validate`
- H2 test datasource + H2-compatible migration (no `CREATE TYPE`) + `FlywayMigrationTest` — all 3 tests pass: schema created, columns verified, index present

## Task Commits

1. **Task 1: Maven project scaffold** — `1e10293` (feat(01-01): Maven project scaffold with pom.xml, mvnw wrapper, Dockerfile, VdtApplication)
2. **Task 2: application.yml + Flyway V1 migration + User domain model** — `b024157` (feat(01-01): application.yml, Flyway V1 migration, User JPA entity and UserRepository)
3. **Task 3: H2 test datasource + FlywayMigrationTest** — `967e239` (test(01-01): H2 test datasource, H2-compatible migration, FlywayMigrationTest (all 3 pass))

## Files Created/Modified

- `backend/pom.xml` — Spring Boot 3.3.13 parent, JJWT 0.12.6, flyway-database-postgresql, H2 test scope
- `backend/src/main/resources/application.yml` — datasource, flyway, JWT config (ddl-auto: validate)
- `backend/src/main/resources/db/migration/V1__init_schema.sql` — user_status ENUM + users table + index
- `backend/src/main/java/com/vdt/user/User.java` — JPA entity with `columnDefinition = "user_status"`, @PrePersist displayName default
- `backend/src/main/java/com/vdt/user/UserRepository.java` — findByUsername / existsByUsername
- `backend/src/main/java/com/vdt/user/UserStatus.java` — ONLINE / OFFLINE enum
- `backend/src/test/resources/application-test.yml` — H2 datasource, classpath:db/migration/h2
- `backend/src/test/resources/db/migration/h2/V1__init_schema.sql` — ENUM-free H2 schema
- `backend/src/test/java/com/vdt/FlywayMigrationTest.java` — 3 schema validation tests

## Decisions Made

- Target Java 17 bytecode (`<java.version>17</java.version>`) despite JDK 25 on host — matches eclipse-temurin:17 Docker image
- `flyway-database-postgresql` added explicitly (not BOM-managed) — required for Flyway 10.x UnsupportedDatabaseException prevention
- H2 in PostgreSQL MODE with separate migration location — no CREATE TYPE in test migration

## Deviations from Plan

None — plan executed as written. FlywayMigrationTest passes (verified 2026-05-25).

## Issues Encountered

- Windows `mvnw.cmd` invocation from PowerShell returns "syntax error" when called via `cmd /c`. Workaround: invoke Maven wrapper directly via `java -classpath .mvn/wrapper/maven-wrapper.jar -Dmaven.multiModuleProjectDirectory=. org.apache.maven.wrapper.MavenWrapperMain <args>` from the backend/ directory.

## ## Self-Check: PASSED

- `FlywayMigrationTest` — 3/3 tests pass (testSchemaCreated, testUsersTableHasExpectedColumns, testUsernameUniqueIndexExists)
- `V1__init_schema.sql` contains `CREATE TYPE user_status AS ENUM`
- `User.java` contains `columnDefinition = "user_status"`
- `application.yml` contains `ddl-auto: validate` (no create/update)
- `pom.xml` contains `flyway-database-postgresql` and `jjwt.version=0.12.6`

## Next Phase Readiness

- Plan 01-02 can proceed: `User.java`, `UserRepository.java`, `application.yml`, `pom.xml` are all in place
- Spring Security + JJWT dependencies are declared; JWT secret config is wired
- H2 test infrastructure is ready for AuthControllerTest in Plan 01-03

---
*Phase: 01-backend-foundation*
*Completed: 2026-05-25*
