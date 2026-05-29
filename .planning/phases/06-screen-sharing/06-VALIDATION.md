---
phase: 6
slug: screen-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.7` + `@testing-library/react` `^16.3.2` |
| **Config file** | `frontend/vite.config.ts` (test section, `setupFiles: './src/test/setup.ts'`) |
| **Quick run command** | `npm run test -- --run` (from `frontend/`) |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | SCRN-01/02 | — | N/A | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | SCRN-01/02/03 | — | screen track stopped on teardown (D-08) | unit | `npm run test -- --run CallContext` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | SCRN-03 | — | N/A | unit | `npm run test -- --run CallContext` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | SCRN-01/D-05 | — | N/A | unit | `npm run test -- --run CallPage` | ❌ W0 | ⬜ pending |
| SCRN-04 | — | — | SCRN-04 | — | N/A | manual | Two-tab UAT | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/test/setup.ts` — add `getDisplayMedia` mock to `navigator.mediaDevices` stub (parallel to existing `getUserMedia` mock)
- [ ] `frontend/src/test/setup.ts` — add `getSenders()` + `replaceTrack` to `MockRTCPeerConnection` class
- [ ] `frontend/src/test/setup.ts` — export `mockScreenTrack` for SCRN-03 assertions
- [ ] `frontend/src/test/CallContext.test.tsx` — add test cases for SCRN-01 through D-08 (11 new cases)
- [ ] `frontend/src/test/CallPage.test.tsx` — add test cases for Share button rendering and Camera disabled-while-sharing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Remote peer sees screen share stream automatically | SCRN-04 | Requires two browser contexts and live WebRTC connection | Open app in two tabs on localhost; User A starts call with User B; User A clicks Share Screen; verify User B's remote video switches to screen share |
| Browser native "Stop sharing" button triggers `onended` | SCRN-03 (partial) | Requires actual `getDisplayMedia` session — can't simulate native browser UI in Vitest | Same two-tab setup; User A shares screen; click browser's native "Stop sharing" bar; verify Share button returns to idle on User A, remote video returns to camera on User B |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
