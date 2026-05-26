---
phase: 4
slug: 1-1-call-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 + @testing-library/react 16.3.2 + msw 2.14.6 |
| **Config file** | `frontend/vite.config.ts` (test block: `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`) |
| **Quick run command** | `npm test -- --run --reporter=verbose` (from `frontend/`) |
| **Full suite command** | `npm test -- --run` (from `frontend/`) |
| **Estimated runtime** | ~2–5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=verbose`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-W0-01 | Wave 0 test stubs | 0 | CALL-01,02,03,04,07,08,UI-03 | — | N/A | unit scaffold | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 04-01-01 | CallContext | 1 | CALL-01 | T-signal-spoof | `startCall(self)` is a no-op (self-call guard) | unit | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-02 | CallContext | 1 | CALL-02 | — | `callStatus='ringing'` set when `call-request` received | unit | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-03 | CallContext | 1 | CALL-03 | — | `rejectCall()` sends `call-decline` signal | unit | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-04 | CallContext | 1 | CALL-04 | — | `offer` handler calls `setRemoteDescription` + drains ICE buffer | unit (mock RTCPeerConnection) | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-05 | CallContext | 1 | CALL-07 | — | 30s timeout sends `call-end` and resets state | unit (fake timers) | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-06 | CallContext | 1 | CALL-08 | — | `hangUp()` sends `call-end` and calls teardown | unit | `npm test -- --run src/test/CallContext.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-01 | IncomingCallModal | 2 | CALL-02 | — | Modal renders when `callStatus === 'ringing'` | unit | `npm test -- --run src/test/IncomingCallModal.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-02 | IncomingCallModal | 2 | CALL-03 | — | Accept/Reject buttons trigger correct handlers | unit | `npm test -- --run src/test/IncomingCallModal.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-01 | CallPage | 3 | UI-03 | — | Video elements render with correct aria-labels | unit | `npm test -- --run src/test/CallPage.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-02 | CallPage | 3 | UI-03 | — | End call button has `aria-label="End call"` | unit | `npm test -- --run src/test/CallPage.test.tsx` | ❌ W0 | ⬜ pending |
| 04-04-01 | UserListPage wire | 4 | CALL-01 | — | Call button onClick calls `startCall(username)` | unit | `npm test -- --run src/test/UserListPage.test.tsx` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/test/CallContext.test.tsx` — stubs for CALL-01, CALL-02, CALL-03, CALL-04, CALL-07, CALL-08 (mock RTCPeerConnection via `vi.stubGlobal`)
- [ ] `frontend/src/test/IncomingCallModal.test.tsx` — stubs for CALL-02 modal UI, Accept/Reject
- [ ] `frontend/src/test/CallPage.test.tsx` — stubs for UI-03 video elements, hang-up button

*Existing infrastructure (`frontend/src/test/mocks/handlers.ts`, `server.ts`) already in place from Phase 3 — reuse as-is.*

**RTCPeerConnection mock pattern** (must be established in Wave 0):
```typescript
const MockPeerConnection = vi.fn().mockImplementation(() => ({
  addTrack: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  onicecandidate: null,
  ontrack: null,
  oniceconnectionstatechange: null,
  iceConnectionState: 'new',
}))
vi.stubGlobal('RTCPeerConnection', MockPeerConnection)
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two browser tabs can complete a full WebRTC video call | CALL-04 | RTCPeerConnection requires real browser ICE negotiation; jsdom cannot simulate | Open two tabs (two different users), initiate call, accept, verify both see video |
| Ringtone audible on incoming call | CALL-02 | Web Audio API (AudioContext) not available in jsdom | Trigger incoming call; confirm ringtone beeps at ~800Hz |
| Camera/mic indicator clears after call ends | CALL-08, CTRL-03 | Hardware indicator state not visible to test framework | End call; verify browser tab shows no active camera/mic indicator |
| ICE connection survives brief tab switch (2s grace window) | CALL-04 | `iceConnectionState` transitions require real network | Switch tab for <2s; verify call resumes; switch tab for >2s; verify teardown |
| Remote video audio is not muted (remote peer heard) | CALL-04 | Autoplay policy for unmuted video varies by browser | Accept call; confirm remote audio is audible without additional user action |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
