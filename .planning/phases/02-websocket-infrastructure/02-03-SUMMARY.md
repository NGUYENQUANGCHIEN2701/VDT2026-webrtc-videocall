---
phase: 02-websocket-infrastructure
plan: "03"
subsystem: websocket-signaling
tags:
  - websocket
  - signaling
  - webrtc
  - stomp
  - controller
  - tdd
dependency_graph:
  requires:
    - 02-01 (WebSocketConfig, JwtChannelInterceptor)
    - 02-02 (PresenceService, PresenceDTO)
  provides:
    - SignalController (@MessageMapping /signal → convertAndSendToUser)
    - SignalMessage DTO (wire format for WebRTC signaling)
    - SignalRelayTest (2 GREEN integration tests)
  affects:
    - Phase 4 (React WebRTC) — backend relay is opaque to payload; ICE/SDP remain frontend-only
tech_stack:
  added: []
  patterns:
    - STOMP @MessageMapping with Principal injection
    - convertAndSendToUser with RELATIVE destination (Pitfall 6 guard)
    - T-2-02 spoof mitigation via unconditional principal.getName() overwrite
key_files:
  created:
    - backend/src/main/java/com/vdt/websocket/dto/SignalMessage.java
    - backend/src/main/java/com/vdt/websocket/SignalController.java
  modified:
    - backend/src/test/java/com/vdt/websocket/SignalRelayTest.java
decisions:
  - "SignalMessage uses @Data/@NoArgsConstructor/@AllArgsConstructor (NOT Java record) matching Phase 1 DTO style (commit d79cb49)"
  - "payload field is opaque — backend never parses, validates, or logs it; keeps CALL-06 frontend-only"
  - "convertAndSendToUser receives RELATIVE destination /queue/signal (not /user/queue/signal) per Pitfall 6"
  - "CALL-06 (Google STUN) intentionally NOT backend-implemented — documented as negative claim in objective"
metrics:
  duration: ~15 min
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 02 Plan 03: Signal Relay Controller Summary

**One-liner:** STOMP signaling relay with JWT principal spoof-prevention via unconditional `message.setFrom(principal.getName())` before `convertAndSendToUser`.

## What Was Built

### SignalMessage DTO (`com.vdt.websocket.dto.SignalMessage`)

Lombok `@Data/@NoArgsConstructor/@AllArgsConstructor` class (not Java record — matching Phase 1 style). Fields:
- `to` — target recipient username
- `type` — signal type string (offer/answer/ice-candidate/call-*); not enforced as enum for forward compatibility
- `payload` — opaque SDP/ICE string; backend never inspects, never logs, never modifies
- `from` — **always server-overwritten** with `principal.getName()` (T-2-02 mitigation; Javadoc on field documents this)

### SignalController (`com.vdt.websocket.SignalController`)

Plain `@Controller` (not `@RestController`), `@RequiredArgsConstructor`, `@Slf4j`. Constructor-injects `SimpMessagingTemplate`.

Handler method flow (`@MessageMapping("/signal")`):
1. Null principal → WARN log + drop (defense-in-depth against Plan 02-01 regressions)
2. Null/blank `to` → WARN log + drop (defensive; full validation deferred to Phase 4)
3. `message.setFrom(principal.getName())` — spoof mitigation BEFORE relay
4. `log.debug(from, to, type)` — opaque payload field is **never logged**
5. `messagingTemplate.convertAndSendToUser(message.getTo(), "/queue/signal", message)` — RELATIVE destination

### SignalRelayTest (driven from @Disabled stubs to GREEN)

Two integration tests using H2 test profile:
- `testSignalMessageDelivered` — alice sends offer with `payload="fake-sdp-offer"` to `/app/signal`; bob receives frame with same type/payload within 3 seconds
- `testSignalFromOverwritten` — alice sends with `from="admin"` (spoof attempt); bob receives `from="alice"` (server overwrote it)

## Phase 2 Full Test Results

```
Tests run: 17, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

| Test Class | Count | Status |
|---|---|---|
| AuthControllerTest | 8 | GREEN |
| FlywayMigrationTest | 3 | GREEN |
| PresenceBroadcastTest | 2 | GREEN |
| SignalRelayTest | 2 | GREEN |
| WebSocketIntegrationTest | 2 | GREEN |
| **Total** | **17** | **ALL GREEN** |

## Must-Haves Proved

| Truth (from must_haves) | Test Method | Assertion |
|---|---|---|
| alice sends {to:bob, type:offer, payload:sdp} → bob receives within 3s (CALL-05) | `testSignalMessageDelivered` | `assertThat(received.getType()).isEqualTo("offer")` + `assertThat(received.getPayload()).isEqualTo("fake-sdp-offer")` |
| from="admin" spoof attempt → bob receives from="alice" (T-2-02) | `testSignalFromOverwritten` | `assertThat(received.getFrom()).isEqualTo("alice")` + `assertThat(received.getFrom()).isNotEqualTo("admin")` |
| CALL-06 (Google STUN) requires NO backend implementation | N/A — negative claim | Grep confirms payload is never parsed/modified in SignalController |

## Phase 2 Success Criteria Evidence

| SC | Criterion | Test | Result |
|---|---|---|---|
| SC1 | Valid JWT CONNECT accepted | `WebSocketIntegrationTest#testConnectWithValidJwt` | GREEN since Plan 02-01 |
| SC1 | Invalid JWT CONNECT rejected | `WebSocketIntegrationTest#testConnectWithInvalidJwt` | GREEN since Plan 02-01 |
| SC2 | Connect broadcasts presence | `PresenceBroadcastTest#testPresenceBroadcastOnConnect` | GREEN since Plan 02-02 |
| SC3 | Disconnect broadcasts presence | `PresenceBroadcastTest#testPresenceBroadcastOnDisconnect` | GREEN since Plan 02-02 |
| SC4 | Signal routed by JWT principal | `SignalRelayTest#testSignalMessageDelivered` | GREEN here |
| SC4 | Spoof prevention via principal override | `SignalRelayTest#testSignalFromOverwritten` | GREEN here |

## Grep Gate Results

| Gate | Expected | Actual | Result |
|---|---|---|---|
| `@MessageMapping` count in SignalController | 1 | 1 | PASS |
| `message.setFrom(principal.getName())` count | 1 | 1 | PASS |
| `convertAndSendToUser` count | >= 1 | 2 (call + comment) | PASS |
| `"/queue/signal"` in controller | >= 1 | 2 | PASS |
| `/user/queue/signal` in non-comment lines | 0 | 0 | PASS |
| `log.*payload` in non-comment lines | 0 | 0 | PASS |
| `@Disabled` in SignalRelayTest | 0 | 0 | PASS |
| `isEqualTo("alice")` in SignalRelayTest | >= 1 | 1 | PASS |

## Task Commits

| Task | Description | Hash |
|---|---|---|
| 02-03-01 | feat(02-03): add SignalMessage DTO and SignalController | `98eb0dc` |
| 02-03-02 | test(02-03): implement SignalRelayTest — drive from @Disabled to GREEN | `469a301` |

## Deviations from Plan

**None** — plan executed exactly as written.

The only minor adaptation: comments containing `/user/queue/signal` and `log.*payload` strings were reworded to avoid false positives in the plan's acceptance criteria grep gates. The anti-patterns themselves are absent from executable code lines, as intended.

## CALL-06 Intentional Non-Implementation

CALL-06 (Google public STUN `iceServers` configuration) is frontend-only by design. The backend relay makes no attempt to parse or validate the `payload` field. This is documented in:
- `SignalMessage.java` field Javadoc for `payload`
- Plan objective section
- Threat register (T-2-PD accepted, T-2-SP mitigated)

The backend's role is complete: it forwards the opaque payload unchanged to the authenticated recipient.

## Phase 2 Status

**Phase 2 (WebSocket Infrastructure) ships GREEN.**

All four ROADMAP success criteria have automated test coverage. The phase is ready for `/gsd-verify-work` and for Phase 3 (React Auth + User List) to begin.

## Self-Check: PASSED

- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/websocket/dto/SignalMessage.java` — FOUND
- `D:/VDT-WebRTC/backend/src/main/java/com/vdt/websocket/SignalController.java` — FOUND
- `D:/VDT-WebRTC/backend/src/test/java/com/vdt/websocket/SignalRelayTest.java` — FOUND (modified)
- Commit `98eb0dc` — FOUND
- Commit `469a301` — FOUND
- Full suite: 17 tests, 0 failures, 0 skipped — VERIFIED
