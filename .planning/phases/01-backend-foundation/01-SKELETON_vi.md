# Phase 1 Walking Skeleton

> Lat cat end-to-end mong nhat cho backend VDT-WebRTC. Moi buoc duoi day phai pass truoc khi sang Phase 2.
> Skeleton nay xac nhan toan bo stack duoc noi: Maven → Spring Boot → PostgreSQL → Flyway → REST → Spring Security → JJWT.

## Prerequisites

- JDK 17+ san sang (Java 25 LTS da cai — target bytecode Java 17 trong pom.xml).
- Docker san sang (v29.4.0) — dung chay PostgreSQL vi may khong co PostgreSQL local.
- PostgreSQL 16 container dang chay va reachable tren `localhost:5432`:
  ```
  docker run -d --name vdt-postgres -e POSTGRES_DB=vdt_webrtc -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
  ```
- Thu muc lam viec: `backend/` (tao boi Plan 01).
- `JWT_SECRET` environment variable la tuy chon (default trong application.yml la ≥32 chars theo Pitfall 6).

## Cac buoc

| Buoc | Lenh | Ket qua mong doi |
|------|---------|-----------------|
| 1 | `cd backend && ./mvnw spring-boot:run` | In banner Spring Boot, log `Started VdtApplication in N seconds`, khong co stacktrace, nghe port 8080 |
| 2 | (trong qua trinh startup) kiem tra log | Log `Flyway Community Edition ... by Redgate` va `Successfully applied 1 migration to schema "public", now at version v1 (execution time ...)`. Khong co `UnsupportedDatabaseException`. |
| 3 | `psql -h localhost -U postgres -d vdt_webrtc -c "\dT user_status"` | Hien thi ENUM `user_status`. Xac nhan ENUM duoc tao boi V1 migration. |
| 4 | `psql -h localhost -U postgres -d vdt_webrtc -c "\d users"` | Hien thi cac column `id BIGSERIAL`, `username VARCHAR(50) UNIQUE`, `password_hash VARCHAR(255)`, `display_name VARCHAR(100)`, `status user_status DEFAULT 'OFFLINE'`, `created_at TIMESTAMPTZ DEFAULT NOW()` |
| 5 | `curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' -i | head -1` | HTTP `201 Created`. Response body co truong "token". |
| 6 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT username, status FROM users WHERE username='alice';"` | Co row: `alice | OFFLINE` |
| 7 | `TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice","password":"secret123"}' | jq -r .token); echo $TOKEN` | JWT khong rong voi 3 phan base64 cach nhau boi dau cham. Login tra HTTP 200. |
| 8 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` | Status la `ONLINE` (login da flip). |
| 9 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/users/me` | `401` (khong token = unauthorized) |
| 10 | `curl -s -X GET http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"` | HTTP `200`. Body co "username":"alice". |
| 11 | `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/logout -H "Authorization: Bearer $TOKEN"` | `200` |
| 12 | `psql -h localhost -U postgres -d vdt_webrtc -c "SELECT status FROM users WHERE username='alice';"` | Status la `OFFLINE` (logout da flip). |

## Hoan thanh khi

Skeleton pass khi TAT CA cac dieu sau dung dong thoi:

1. `./mvnw spring-boot:run` trong `backend/` chay app tren port 8080 khong co stacktrace (buoc 1).
2. Flyway V1 migration chay thanh cong lan dau — `user_status` ENUM va `users` table ton tai voi day du 6 columns (buoc 2-4).
3. `POST /api/auth/register` tra 201 voi JWT, luu row `status='OFFLINE'` (buoc 5-6).
4. `POST /api/auth/login` tra 200 voi JWT, flip `status` sang `ONLINE` (buoc 7-8).
5. `GET /api/users/me` tra 401 neu khong token va 200 neu co Bearer token (buoc 9-10).
6. `POST /api/auth/logout` voi token hop le tra 200 va flip `status` ve `OFFLINE` (buoc 11-12).

Khi ca 6 dieu dung, Phase 1 da deliver AUTH-01..AUTH-04 + INFRA-03 end-to-end. INFRA-01 duoc dap ung mot phan (backend skeleton co san; frontend de lai Phase 3).
