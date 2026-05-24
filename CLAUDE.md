<!-- GSD:project-start source:PROJECT.md -->
## Project

**VDT-WebRTC**

Ứng dụng video call realtime cho phép người dùng thực hiện cuộc gọi video/audio 1-1 theo mô hình peer-to-peer sử dụng WebRTC. Người dùng đăng ký, đăng nhập, xem danh sách người dùng online và gọi trực tiếp — tất cả thông qua trình duyệt, không cần cài đặt thêm gì. Đây là bài deliverable cho chương trình Viettel Digital Talent (VDT), yêu cầu source code đầy đủ, database script, tài liệu setup và demo hoạt động thực tế.

**Core Value:** Hai người dùng trên cùng mạng LAN có thể thực hiện cuộc gọi video/audio realtime ổn định, bắt đầu từ login đến kết nối WebRTC thành công trong vòng vài giây.

### Constraints

- **Tech stack:** Spring Boot (Java) + React + PostgreSQL — đã quyết định, không thay đổi
- **Transport:** WebRTC cho media stream, WebSocket cho signaling — yêu cầu kỹ thuật bài
- **Network:** Demo trên LAN/localhost — không cần TURN relay
- **Deliverable format:** Source code + DB script + docs + demo — bắt buộc để hoàn thành bài
- **Timeline:** 1+ tháng — đủ để build toàn bộ features, không cần cut scope
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Backend — Spring Boot (Java)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Spring Boot | 3.3.x (LTS) | Application framework | Stable LTS line; lower risk than 4.0.x for a deadline project |
| Spring Web MVC | (managed by Boot) | REST API endpoints | Included in spring-boot-starter-web |
| Spring WebSocket + STOMP | (managed by Boot) | Signaling layer | spring-boot-starter-websocket; STOMP user-destinations handle per-user routing |
| Spring Security | (managed by Boot) | Auth filter chain | Secures REST endpoints and WebSocket connections |
| Spring Data JPA + Hibernate | (managed by Boot) | ORM / database access | HikariCP connection pool included by default |
| PostgreSQL JDBC Driver | 42.7.x (managed by Boot) | PostgreSQL connectivity | Managed by Spring Boot BOM |
| JJWT (io.jsonwebtoken) | 0.12.6 | JWT create/parse/validate | NOT managed by Spring Boot BOM — declare version explicitly |
| Lombok | (managed by Boot) | Boilerplate reduction | @Data, @Builder, @RequiredArgsConstructor |
| Flyway | (managed by Boot) | Database migrations | Versioned SQL = required deliverable database script |
### Frontend — React
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x | UI framework | Hooks map perfectly to WebRTC lifecycle management |
| Vite | 5.x | Build tool / dev server | CRA is officially deprecated; Vite is the current standard |
| @stomp/stompjs | 7.x | STOMP WebSocket client | Connects directly over native WebSocket — no SockJS needed |
| Axios | 1.x | HTTP REST client | Interceptors for attaching JWT Authorization header |
| React Context API | (built-in) | Call/auth state management | useContext + useReducer covers all state needs; Redux unnecessary |
### Database — PostgreSQL
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16 | Users, sessions; relational model fits auth data |
| HikariCP | (managed by Boot) | Connection pooling — Spring Boot default |
| Flyway | (managed by Boot) | Schema migrations — produces the deliverable database script |
## WebSocket Signaling — STOMP Decision
| Aspect | STOMP over WebSocket | Raw WebSocket |
|--------|---------------------|---------------|
| User-targeted messages | Built-in: `convertAndSendToUser()` | Must build session registry manually |
| Spring controller routing | `@MessageMapping`, `@SubscribeMapping` | Manual frame parsing |
| JWT auth integration | `ChannelInterceptor` on CONNECT frame | Must parse every raw message |
| SockJS needed? | No — native WebSocket is universal | N/A |
## Authentication — JWT Pattern
## ICE / STUN Configuration
## Screen Sharing (Browser Native)
## Recording (Browser Native MediaRecorder)
## Group Call — Mesh (No Additional Library)
## Infrastructure — Docker Compose
## CORS Configuration
## Alternatives Considered
| Category | Recommended | Why Not Alternative |
|----------|-------------|-------------------|
| WebSocket protocol | STOMP | Raw WS requires DIY session registry and routing |
| SockJS | Not used | Legacy; all 2025 browsers support native WebSocket |
| JWT library | JJWT 0.12.x | OAuth2 resource server expects external IdP — overkill |
| State management | Context + useReducer | Redux/Zustand unnecessary for this scope |
| Build tool | Vite 5.x | CRA is officially deprecated by React team |
| Recording | MediaRecorder (native) | RecordRTC adds bundle weight unnecessarily |
| Schema management | Flyway | `ddl-auto=update` produces no migration files for deliverable |
## Sources
- Spring STOMP documentation (HIGH): Spring Framework Reference
- Spring token-based WebSocket auth (HIGH): Spring Framework Reference
- Spring Boot dependency BOM (HIGH): Spring Boot Appendix
- MDN WebRTC API (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- JJWT 0.12.x: verify latest at https://github.com/jwtk/jjwt/releases
- @stomp/stompjs: verify latest at https://www.npmjs.com/package/@stomp/stompjs
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
