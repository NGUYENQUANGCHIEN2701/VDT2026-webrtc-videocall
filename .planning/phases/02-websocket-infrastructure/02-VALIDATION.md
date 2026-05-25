---
phase: 2
slug: websocket-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (Jupiter) + Spring Boot Test (managed by Spring Boot BOM) — same as Phase 1 |
| **Config file** | `backend/src/test/resources/application-test.yml` — already exists from Phase 1 |
| **Quick run command** | `./mvnw test -pl backend -q` |
| **Full suite command** | `./mvnw test -pl backend` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `./mvnw test -pl backend -q`
- **After every plan wave:** Run `./mvnw test -pl backend`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PRES-01 | T-2-01 | JWT validation in ChannelInterceptor; invalid JWT rejects STOMP CONNECT | integration | `./mvnw test -Dtest=WebSocketIntegrationTest#testConnectWithValidJwt` | Wave 0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PRES-01 | T-2-01 | Invalid JWT rejected at STOMP CONNECT | integration | `./mvnw test -Dtest=WebSocketIntegrationTest#testConnectWithInvalidJwt` | Wave 0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PRES-01 | — | N/A | integration | `./mvnw test -Dtest=PresenceBroadcastTest#testPresenceBroadcastOnConnect` | Wave 0 | ⬜ pending |
| 02-02-02 | 02 | 2 | PRES-02 | — | N/A | integration | `./mvnw test -Dtest=PresenceBroadcastTest#testPresenceBroadcastOnDisconnect` | Wave 0 | ⬜ pending |
| 02-03-01 | 03 | 3 | CALL-05 | T-2-02 | Signal `from` overwritten with JWT principal (spoof prevention) | integration | `./mvnw test -Dtest=SignalRelayTest#testSignalMessageDelivered` | Wave 0 | ⬜ pending |
| 02-03-02 | 03 | 3 | CALL-05 | T-2-02 | Client-supplied `from` cannot override JWT principal | integration | `./mvnw test -Dtest=SignalRelayTest#testSignalFromOverwritten` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/vdt/websocket/WebSocketIntegrationTest.java` — stubs for PRES-01 auth (valid/invalid JWT)
- [ ] `backend/src/test/java/com/vdt/websocket/PresenceBroadcastTest.java` — stubs for PRES-01, PRES-02 presence broadcasts
- [ ] `backend/src/test/java/com/vdt/websocket/SignalRelayTest.java` — stubs for CALL-05 signal relay and from-override

*Note: H2 test profile from Phase 1 covers WebSocket tests — no additional config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google STUN config | CALL-06 | Frontend-only config, no backend behavior | Verified in Phase 4 when ICE candidates are exchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
