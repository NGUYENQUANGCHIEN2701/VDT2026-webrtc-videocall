---
phase: 02-websocket-infrastructure
verified: 2026-05-25T18:30:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 02: WebSocket Infrastructure — Báo cáo Xác minh

**Phase Goal:** The backend can relay signaling messages between clients and broadcast realtime presence so clients know who is online
**Verified:** 2026-05-25T18:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                                  | Status     | Bằng chứng                                                                                                     |
|----|----------------------------------------------------------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------------|
| 1  | (SC1) Client xác thực STOMP CONNECT với JWT hợp lệ được chấp nhận; JWT không hợp lệ bị từ chối                                         | VERIFIED  | `WebSocketIntegrationTest#testConnectWithValidJwt` PASS, `#testConnectWithInvalidJwt` PASS — surefire XML xác nhận 2/2, 0 failure |
| 2  | (SC2) Khi user kết nối, mọi client đang subscribe `/topic/presence` nhận được PresenceDTO có username của người mới vào                 | VERIFIED  | `PresenceBroadcastTest#testPresenceBroadcastOnConnect` PASS — assertThat(frame.getOnlineUsers()).contains("alice") trong test |
| 3  | (SC3) Khi user ngắt kết nối, các client khác nhận presence update loại bỏ user đó trong vài giây                                        | VERIFIED  | `PresenceBroadcastTest#testPresenceBroadcastOnDisconnect` PASS — assertThat(frame.getOnlineUsers()).doesNotContain("alice") |
| 4  | (SC4) Signaling message gửi tới `/app/signal` được route tới private queue đúng người dùng bằng JWT principal làm sender identity        | VERIFIED  | `SignalRelayTest#testSignalMessageDelivered` + `#testSignalFromOverwritten` PASS — 2/2, 0 failure              |
| 5  | DB status = ONLINE sau khi connect; OFFLINE sau khi session cuối cùng ngắt kết nối (PRES-02)                                           | VERIFIED  | `PresenceEventListener.onConnect`: `u.setStatus(UserStatus.ONLINE)` + save; `onDisconnect`: guard `!isUserOnline(username)` trước khi OFFLINE write — code đọc trực tiếp |
| 6  | Duplicate SessionDisconnectEvent không gây duplicate broadcast hoặc flapping DB write (idempotency)                                      | VERIFIED  | `PresenceService.removeSession()` dùng `ConcurrentHashMap.remove()` (idempotent); disconnect guard `!presenceService.isUserOnline(username)` trước mọi OFFLINE write |
| 7  | Client-supplied `from` field trong SignalMessage bị server overwrite với `principal.getName()` trước khi relay (spoof prevention)        | VERIFIED  | `SignalController.handleSignal()` dòng 68: `message.setFrom(principal.getName())` — `SignalRelayTest#testSignalFromOverwritten` assert `received.getFrom().isEqualTo("alice")` |
| 8  | CALL-06 (Google STUN) không cần backend implementation — `payload` field là opaque, không bị parse/log/modify                           | VERIFIED  | `SignalController` không có code parse payload; grep `log.*payload` trong non-comment lines trả về 0 |
| 9  | Phase 1 test baseline (11 test) không bị regression                                                                                    | VERIFIED  | Surefire reports: AuthControllerTest (8 pass), FlywayMigrationTest (3 pass) — tổng 11, 0 failures |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact                                                                 | Cung cấp                                                          | Status    | Chi tiết                                                       |
|--------------------------------------------------------------------------|-------------------------------------------------------------------|-----------|----------------------------------------------------------------|
| `backend/pom.xml`                                                        | spring-boot-starter-websocket dependency                          | VERIFIED  | Dòng 47 xác nhận `spring-boot-starter-websocket` không có `<version>` |
| `backend/src/main/java/com/vdt/websocket/WebSocketConfig.java`           | STOMP broker + /ws endpoint + prefixes                            | VERIFIED  | `@EnableWebSocketMessageBroker`, `/ws`, `/topic`, `/queue`, `/app`, `/user` — tất cả có mặt; KHÔNG có `.withSockJS()` |
| `backend/src/main/java/com/vdt/websocket/WebSocketAuthInterceptorConfig.java` | @Order(HIGHEST_PRECEDENCE+99) wires JwtChannelInterceptor    | VERIFIED  | `@Order(Ordered.HIGHEST_PRECEDENCE + 99)`, `registration.interceptors(jwtChannelInterceptor)` |
| `backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java`     | preSend() validates Bearer JWT on CONNECT, sets accessor.setUser() | VERIFIED  | `StompCommand.CONNECT`, `accessor.setUser(authToken)`, `IllegalArgumentException` cho invalid JWT |
| `backend/src/main/java/com/vdt/websocket/PresenceService.java`           | Thread-safe sessionId -> username registry (ConcurrentHashMap)   | VERIFIED  | `ConcurrentHashMap<String,String> sessions`, addSession/removeSession/isUserOnline/getOnlineUsers |
| `backend/src/main/java/com/vdt/websocket/PresenceEventListener.java`     | @EventListener cho SessionConnectedEvent và SessionDisconnectEvent | VERIFIED  | 2 `@EventListener` methods, `convertAndSend("/topic/presence", ...)`, UserStatus.ONLINE/OFFLINE |
| `backend/src/main/java/com/vdt/websocket/dto/PresenceDTO.java`           | Broadcast payload `{ List<String> onlineUsers }`                  | VERIFIED  | `@Data @NoArgsConstructor @AllArgsConstructor`, field `onlineUsers` |
| `backend/src/main/java/com/vdt/websocket/SignalController.java`          | @MessageMapping("/signal") overrides from, relays via convertAndSendToUser | VERIFIED | `@MessageMapping("/signal")`, `message.setFrom(principal.getName())`, `convertAndSendToUser(message.getTo(), "/queue/signal", message)` |
| `backend/src/main/java/com/vdt/websocket/dto/SignalMessage.java`         | Wire DTO với to/type/payload/from fields                          | VERIFIED  | `@Data @NoArgsConstructor @AllArgsConstructor`, 4 fields String; `from` documented là server-overwritten |
| `backend/src/test/java/com/vdt/websocket/WebSocketIntegrationTest.java`  | 2 real GREEN tests: valid JWT, invalid JWT                        | VERIFIED  | Surefire: tests=2, errors=0, skipped=0, failures=0 |
| `backend/src/test/java/com/vdt/websocket/PresenceBroadcastTest.java`     | 2 GREEN tests: broadcast on connect/disconnect                    | VERIFIED  | Surefire: tests=2, errors=0, skipped=0, failures=0 |
| `backend/src/test/java/com/vdt/websocket/SignalRelayTest.java`           | 2 GREEN tests: signal delivery + spoof prevention                 | VERIFIED  | Surefire: tests=2, errors=0, skipped=0, failures=0 |

---

### Key Link Verification

| From                                              | To                             | Via                                         | Status    | Chi tiết                                                                  |
|---------------------------------------------------|--------------------------------|---------------------------------------------|-----------|---------------------------------------------------------------------------|
| `WebSocketAuthInterceptorConfig.configureClientInboundChannel()` | `JwtChannelInterceptor` | `registration.interceptors(jwtChannelInterceptor)` | WIRED | Dòng 29-31 của WebSocketAuthInterceptorConfig.java |
| `JwtChannelInterceptor.preSend()`                 | `JwtService` (Phase 1)         | `jwtService.extractUsername()` + `isTokenExpired()` | WIRED | Dòng 51-53 của JwtChannelInterceptor.java |
| `WebSocketConfig`                                 | Spring STOMP broker            | `@EnableWebSocketMessageBroker`             | WIRED     | Annotation có mặt tại dòng 20 của WebSocketConfig.java |
| `PresenceEventListener.onConnect`                 | `PresenceService.addSession`   | constructor injection                       | WIRED     | Dòng 60: `presenceService.addSession(sessionId, username)` |
| `PresenceEventListener.broadcastPresence`         | `SimpMessagingTemplate`        | `convertAndSend("/topic/presence", presenceDTO)` | WIRED | Dòng 114: `messagingTemplate.convertAndSend("/topic/presence", new PresenceDTO(onlineUsers))` |
| `PresenceEventListener`                           | `UserRepository`               | `findByUsername + save with UserStatus`     | WIRED     | Dòng 63-66 (ONLINE), 92-95 (OFFLINE) |
| `SignalController.handleSignal`                   | `SimpMessagingTemplate.convertAndSendToUser` | `(message.getTo(), "/queue/signal", message)` | WIRED | Dòng 79 của SignalController.java; destination là RELATIVE không có prefix `/user/` |
| `SignalController.handleSignal`                   | `Principal` (từ JwtChannelInterceptor) | `message.setFrom(principal.getName())`  | WIRED     | Dòng 68 của SignalController.java |

---

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable    | Source                                      | Produces Real Data | Status   |
|---------------------------|------------------|---------------------------------------------|--------------------|----------|
| `PresenceEventListener`   | `onlineUsers`    | `presenceService.getOnlineUsers()` — stream từ ConcurrentHashMap.values() | Có — registry thực tế từ session events | FLOWING |
| `PresenceEventListener`   | `User.status`    | `userRepository.findByUsername()` + `.save()` | Có — real JPA write tới H2/PostgreSQL | FLOWING |
| `SignalController`        | `message`        | `@Payload SignalMessage` deserialized từ STOMP frame | Có — client-supplied payload relay | FLOWING |

---

### Behavioral Spot-Checks

Không thể chạy Maven trực tiếp qua bash trên Windows vì file `mvnw` là script Unix và `mvnw.cmd` có vấn đề syntax trong shell hiện tại. Tuy nhiên, surefire XML reports trong `target/surefire-reports/` xác nhận lần chạy cuối cùng (timestamp `2026-05-25T17:59:31`):

| Behavior                               | Evidence                                                      | Status |
|----------------------------------------|---------------------------------------------------------------|--------|
| Valid JWT STOMP connect accepted       | WebSocketIntegrationTest: tests=2, failures=0, skipped=0      | PASS   |
| Invalid JWT STOMP connect rejected     | (trong cùng test suite trên)                                  | PASS   |
| Presence broadcast on connect          | PresenceBroadcastTest: tests=2, failures=0, skipped=0         | PASS   |
| Presence broadcast on disconnect       | (trong cùng test suite trên)                                  | PASS   |
| Signal relay delivered to recipient    | SignalRelayTest: tests=2, failures=0, skipped=0               | PASS   |
| Spoof prevention via principal override| (trong cùng test suite trên)                                  | PASS   |
| Full phase suite: 17 tests, 0 failures | 5 test classes: 8+3+2+2+2=17 tests tổng                      | PASS   |

---

### Requirements Coverage

| Requirement | Plan nguồn   | Mô tả                                                                     | Status    | Bằng chứng                                                       |
|-------------|--------------|---------------------------------------------------------------------------|-----------|------------------------------------------------------------------|
| PRES-01     | 02-01, 02-02 | User can see a realtime list of currently online users (auto-updates on join/leave without page reload) | SATISFIED | `PresenceBroadcastTest` — subscribe `/topic/presence`, assert onlineUsers list thay đổi khi connect/disconnect |
| PRES-02     | 02-02        | User's online/offline status is automatically updated when they log in, log out, or disconnect | SATISFIED | `PresenceEventListener`: `UserStatus.ONLINE` on connect, `UserStatus.OFFLINE` trên disconnect với idempotency guard |
| CALL-05     | 02-03        | Signaling via WebSocket (STOMP) exchanging SDP offer/answer and ICE candidates | SATISFIED | `SignalRelayTest#testSignalMessageDelivered` — STOMP relay hoạt động end-to-end |
| CALL-06     | 02-03        | Google public STUN server used for ICE candidate resolution               | SATISFIED (negative claim) | Backend relay là opaque với payload; không có code parse/validate payload field trong SignalController |
| AUTH-04     | 02-01        | JWT is used to authenticate both REST API calls and WebSocket connections  | SATISFIED | `WebSocketIntegrationTest` — JWT validated trên STOMP CONNECT; `JwtChannelInterceptor` tái sử dụng `JwtService` từ Phase 1 |

**Ghi chú về AUTH-04:** Requirement này được khai báo trong 02-01-PLAN nhưng REQUIREMENTS.md tracing map AUTH-04 cho Phase 1. Phase 1 đã cover phần REST. Phase 2 Plan 02-01 cover phần WebSocket. Coverage là đầy đủ — không có orphaned requirement.

---

### Anti-Patterns Found

| File                         | Pattern kiểm tra               | Kết quả                          | Severity | Impact |
|------------------------------|--------------------------------|----------------------------------|----------|--------|
| `WebSocketConfig.java`       | `.withSockJS()`               | 0 matches (chỉ có trong comment) | N/A      | None   |
| `JwtChannelInterceptor.java` | `log.*token` (raw token)      | 0 matches trong code thực thi    | N/A      | None   |
| `PresenceEventListener.java` | `@Async`                      | 0 matches trong non-comment      | N/A      | None   |
| `SignalController.java`      | `"/user/queue/signal"` prefix | 0 matches trong non-comment      | N/A      | None   |
| `SignalController.java`      | `log.*payload`                | 0 matches trong non-comment      | N/A      | None   |
| Tất cả file websocket        | TBD/FIXME/XXX                 | 0 matches                        | N/A      | None   |
| Test files                   | `@Disabled`                   | 0 annotations thực sự (chỉ có trong comment/Javadoc) | N/A | None |

**Kết quả:** Không phát hiện anti-pattern nào.

---

### Human Verification Required

Không có — tất cả behavior kiểm tra được qua automated test suite.

---

### Gaps Summary

Không có gaps. Tất cả 9 observable truths đều VERIFIED qua code inspection và surefire test reports.

---

## Tóm tắt kết quả Roadmap SC

| SC  | Tiêu chí                                              | Test Method                                           | Status   |
|-----|-------------------------------------------------------|-------------------------------------------------------|----------|
| SC1 | Valid JWT accepted; invalid JWT rejected              | `WebSocketIntegrationTest#testConnectWithValidJwt`    | VERIFIED |
| SC1 | (continued)                                           | `WebSocketIntegrationTest#testConnectWithInvalidJwt`  | VERIFIED |
| SC2 | Connect broadcasts `/topic/presence` with user online | `PresenceBroadcastTest#testPresenceBroadcastOnConnect`| VERIFIED |
| SC3 | Disconnect broadcasts presence removing user          | `PresenceBroadcastTest#testPresenceBroadcastOnDisconnect` | VERIFIED |
| SC4 | Signal routed by JWT principal                        | `SignalRelayTest#testSignalMessageDelivered`           | VERIFIED |
| SC4 | Spoof prevention via principal override               | `SignalRelayTest#testSignalFromOverwritten`            | VERIFIED |

**Tổng: 6/6 success criteria có automated test coverage; tất cả PASS.**

---

_Verified: 2026-05-25T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
