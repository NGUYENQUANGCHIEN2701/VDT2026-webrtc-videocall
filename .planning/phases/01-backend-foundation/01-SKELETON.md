# Phase 1 Walking Skeleton

> Thinnest end-to-end slice for VDT-WebRTC backend. Every step below must pass before Phase 2 begins.
> This skeleton proves the full stack is wired: Maven → Spring Boot → PostgreSQL → Flyway → REST → Spring Security → JJWT.

## Prerequisites

- JDK 17+ available (Java 25 LTS is installed locally — Java 17 bytecode target in pom.xml).
- Docker available (v29.4.0) — used to run PostgreSQL since no local PostgreSQL is installed.
- PostgreSQL 16 container running and reachable on `localhost:5432`:
  ```
  docker run -d --name vdt-postgres -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
  ```
- Working directory: `backend/` (created by Plan 01).
- `JWT_SECRET` environment variable optional (default in application.yml is ≥32 chars per Pitfall 6).

## Steps

| Step | Command | Expected Result |
|------|---------|-----------------|
| 1 | `cd backend && ./mvnw spring-boot:run` | Spring Boot banner prints, log line `Started VdtApplication in N seconds`, no stacktrace, listening on port 8080 |
| 2 | (during step 1 startup) check log | Log line `Flyway Community Edition ... by Redgate` followed by `Successfully applied 1 migration to schema "public", now at version v1 (execution time ...)`. No `UnsupportedDatabaseException`. |
| 3 | `psql -h localhost -U postgres -d vdt_webrtc -c "\dT user_status"` | Lists `user_status` ENUM type. Confirms PostgreSQL ENUM was created by V1 migration. |
| 4 | `psql -h localhost -U postgres -d vdt_webrtc -c "\d users"` | Shows columns `id BIGSERIAL`, `username VARCHAR(50) UNIQUE`, `password_hash VARCHAR(255)`, `display_name VARCHAR(100)`, `status user_status DEFAULT 'OFFLINE'`, `created_at TIMESTAMPTZ DEFAULT NOW()` |
| 5 | `curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' -i \| head -1` | HTTP `201 Created`. Response body contains `"token"` JSON field. |
| 6 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT username, status FROM users WHERE username='alice';"` | Row exists: `alice \| OFFLINE` |
| 7 | `TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' \| jq -r .token); echo $TOKEN` | A non-empty JWT string with three dot-separated base64 segments. Login returns HTTP 200. |
| 8 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` | Status now `ONLINE` (login flipped it). |
| 9 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/users/me` | `401` (no token = unauthorized) |
| 10 | `curl -s -X GET http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"` | HTTP `200`. Body contains `"username":"alice"`. |
| 11 | `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/logout -H "Authorization: Bearer $TOKEN"` | `200` |
| 12 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` | Status now `OFFLINE` (logout flipped it). |

## Done When

The skeleton passes when ALL of the following are true simultaneously:

1. `./mvnw spring-boot:run` in `backend/` starts the Spring Boot app on port 8080 without a stack trace (step 1).
2. Flyway V1 migration applied successfully on first startup — `user_status` ENUM exists, `users` table exists with all 6 columns from D-10 (steps 2-4).
3. `POST /api/auth/register` returns 201 with a JWT, persists a row with `status='OFFLINE'` (steps 5-6).
4. `POST /api/auth/login` returns 200 with a valid JWT, flips `status` to `ONLINE` (steps 7-8).
5. `GET /api/users/me` returns 401 without a token and 200 with a valid Bearer token (steps 9-10).
6. `POST /api/auth/logout` with a valid token returns 200 and flips `status` back to `OFFLINE` (steps 11-12).

When all 6 success conditions hold, Phase 1 has delivered the AUTH-01..AUTH-04 + INFRA-03 capabilities end-to-end. INFRA-01 is partially satisfied (backend skeleton present; frontend deferred to Phase 3).
