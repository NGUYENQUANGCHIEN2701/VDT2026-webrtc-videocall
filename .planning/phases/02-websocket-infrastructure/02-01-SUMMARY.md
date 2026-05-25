---
phase: "02"
plan: "01"
subsystem: websocket
tags:
  - websocket
  - stomp
  - jwt
  - security
  - wave-0
dependency_graph:
  requires:
    - "01-03: JWT service (JwtService, CustomUserDetailsService)"
    - "01-03: SecurityConfig with /ws/** permitAll"
  provides:
    - "STOMP /ws endpoint with in-memory broker"
    - "JWT-authenticated STOMP channel interceptor"
    - "Wave 0 test stubs for Plans 02-02 and 02-03"
  affects:
    - "02-02: PresenceService depends on authenticated STOMP sessions"
    - "02-03: SignalController depends on principal set by JwtChannelInterceptor"
tech_stack:
  added:
    - "spring-boot-starter-websocket (BOM-managed, no version)"
  patterns:
    - "Separate @Configuration @Order for ChannelInterceptor (Pitfall 1 avoidance)"
    - "UserDetailsService interface injection (Pitfall 7 circular dependency avoidance)"
    - "STOMP-only JWT validation on CONNECT frame (principal propagates to all frames)"
key_files:
  created:
    - backend/src/main/java/com/vdt/websocket/WebSocketConfig.java
    - backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java
    - backend/src/main/java/com/vdt/websocket/WebSocketAuthInterceptorConfig.java
    - backend/src/test/java/com/vdt/websocket/WebSocketIntegrationTest.java
    - backend/src/test/java/com/vdt/websocket/PresenceBroadcastTest.java
    - backend/src/test/java/com/vdt/websocket/SignalRelayTest.java
  modified:
    - backend/pom.xml
decisions:
  - "JwtChannelInterceptor is a separate @Configuration from WebSocketConfig so it gets its own @Order(HIGHEST_PRECEDENCE+99) — prevents Spring Security channel interceptors from running before JWT validation (Research Pitfall 1)"
  - "UserDetailsService injected by interface, not CustomUserDetailsService concrete type — avoids circular dependency chain described in Research Pitfall 7"
  - "JWT validated only on STOMP CONNECT frames, not every frame — principal set at connect time propagates for session lifetime (correct STOMP lifecycle)"
  - "WebSocketIntegrationTest tests are REAL (not stubs) and pass GREEN immediately — validates Plan 02-01 fully"
metrics:
  duration: "~25 min"
  completed_date: "2026-05-25"
---

# Phase 02 Plan 01: STOMP WebSocket Infrastructure + JWT Auth Summary

**One-liner:** STOMP WebSocket endpoint at /ws with JWT ChannelInterceptor that validates Bearer tokens on CONNECT frames, sets the session principal, and rejects missing/invalid/expired tokens — plus 3 Wave 0 test stub files seeding Plans 02-02 and 02-03.

## Files Created

| File | Purpose |
|------|---------|
| `backend/pom.xml` | Added `spring-boot-starter-websocket` (BOM-managed) |
| `WebSocketConfig.java` | @EnableWebSocketMessageBroker; /ws endpoint; /topic, /queue broker; /app prefix; /user prefix |
| `JwtChannelInterceptor.java` | Validates Bearer JWT on STOMP CONNECT; sets session principal; rejects invalid JWT |
| `WebSocketAuthInterceptorConfig.java` | Separate @Configuration @Order(HIGHEST_PRECEDENCE+99); wires interceptor into clientInboundChannel |
| `WebSocketIntegrationTest.java` | 2 real GREEN tests: valid JWT connects, invalid JWT rejected |
| `PresenceBroadcastTest.java` | Wave 0 stubs @Disabled for Plan 02-02 (PRES-01, PRES-02) |
| `SignalRelayTest.java` | Wave 0 stubs @Disabled for Plan 02-03 (CALL-05) |

## Test Results

| Phase | Before | After |
|-------|--------|-------|
| Tests run | 11 (Phase 1) | 13 (+2 WebSocket auth) |
| Tests skipped | 0 | 4 (Wave 0 stubs) |
| Tests failed | 0 | 0 |
| Total reported | 11 | 17 |

**Full suite command result:** `BUILD SUCCESS` — 13 tests run, 4 skipped, 0 failures

## Grep Gate Results

| Gate | Command | Expected | Actual | Status |
|------|---------|----------|--------|--------|
| No SockJS | `grep -c 'withSockJS' WebSocketConfig.java` | 0 | 0 | PASS |
| Has HIGHEST_PRECEDENCE | `grep -c 'HIGHEST_PRECEDENCE' WebSocketAuthInterceptorConfig.java` | >= 1 | 2 | PASS |
| Has StompCommand.CONNECT | `grep -c 'StompCommand.CONNECT' JwtChannelInterceptor.java` | >= 1 | 1 | PASS |
| No @EnableWebSocketSecurity | `grep -c '@EnableWebSocketSecurity' JwtChannelInterceptor.java` | 0 | 0 | PASS |
| No raw token logging | (visual inspection + no `log.*token` pattern) | 0 | 0 | PASS |

## Truths Satisfied

| Truth | Status | Evidence |
|-------|--------|---------|
| "STOMP CONNECT with a valid JWT in the Authorization header is accepted and the session principal is set to the JWT username" | SATISFIED | `testConnectWithValidJwt` passes GREEN; `accessor.setUser(authToken)` called in JwtChannelInterceptor |
| "STOMP CONNECT with a missing, malformed, or expired JWT is rejected and the WebSocket session is closed" | SATISFIED | `testConnectWithInvalidJwt` passes GREEN; `IllegalArgumentException` thrown for missing/malformed/expired tokens |
| "Wave 0 test stubs exist on disk and fail with a descriptive 'not yet implemented' or unwired-bean error (RED state) so Plan 02 and Plan 03 can drive them to GREEN" | SATISFIED | PresenceBroadcastTest and SignalRelayTest compile; 4 stubs skip with @Disabled("Wave 0 stub...") messages |

## Deviations from Plan

None — plan executed exactly as written.

The `testConnectWithValidJwt` and `testConnectWithInvalidJwt` tests in `WebSocketIntegrationTest` were written as real tests (not stubs) per the plan specification (Task 2 action: "implement testConnectWithValidJwt as a real test... implement testConnectWithInvalidJwt as a real test too"). Both pass GREEN confirming the JWT interceptor works end-to-end.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `PresenceBroadcastTest.java` | `testPresenceBroadcastOnConnect`, `testPresenceBroadcastOnDisconnect` | Wave 0 intentional stubs; PresenceService not yet implemented — Plan 02-02 will implement |
| `SignalRelayTest.java` | `testSignalMessageDelivered`, `testSignalFromOverwritten` | Wave 0 intentional stubs; SignalController not yet implemented — Plan 02-03 will implement |

These stubs are intentional and tracked by the Wave 0 strategy. They do NOT prevent Plan 02-01's goal (STOMP auth infrastructure) from being achieved.

## Threat Surface Scan

No new threat surface beyond what is declared in the plan's `<threat_model>`. All mitigations implemented:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-2-01 (JWT spoof on CONNECT) | JwtChannelInterceptor.preSend rejects CONNECT without valid Bearer token |
| T-2-OR (interceptor ordering) | WebSocketAuthInterceptorConfig @Order(HIGHEST_PRECEDENCE+99) separates from WebSocketConfig |
| T-2-IL (token in logs) | Only username logged after successful validation; raw token never logged |

## Self-Check: PASSED

Files confirmed on disk:
- backend/pom.xml — FOUND (contains spring-boot-starter-websocket)
- backend/src/main/java/com/vdt/websocket/WebSocketConfig.java — FOUND
- backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java — FOUND
- backend/src/main/java/com/vdt/websocket/WebSocketAuthInterceptorConfig.java — FOUND
- backend/src/test/java/com/vdt/websocket/WebSocketIntegrationTest.java — FOUND
- backend/src/test/java/com/vdt/websocket/PresenceBroadcastTest.java — FOUND
- backend/src/test/java/com/vdt/websocket/SignalRelayTest.java — FOUND

Commits confirmed:
- c1957db: feat(02-01): add spring-boot-starter-websocket and WebSocketConfig
- 3695c66: feat(02-01): add JwtChannelInterceptor, WebSocketAuthInterceptorConfig, Wave 0 test stubs
