---
phase: 3
slug: react-auth-user-list
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `frontend/vite.config.ts` (vitest config co-located) |
| **Quick run command** | `npm run test --prefix frontend -- --run` |
| **Full suite command** | `npm run test --prefix frontend -- --run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --prefix frontend -- --run`
- **After every plan wave:** Run `npm run test --prefix frontend -- --run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Scaffold | Wave 0 | 0 | UI-01, UI-02 | — | N/A | build | `npm run build --prefix frontend` | ❌ W0 | ⬜ pending |
| AuthContext | Wave 1 | 1 | UI-01 | T-3-01 | JWT stored in localStorage only, cleared on logout | unit | `npm run test --prefix frontend -- --run` | ❌ W0 | ⬜ pending |
| AuthPage | Wave 1 | 1 | UI-01 | T-3-01 | Form does not expose token in DOM | component | `npm run test --prefix frontend -- --run` | ❌ W0 | ⬜ pending |
| WebSocketContext | Wave 2 | 2 | UI-02 | T-3-02 | STOMP CONNECT only after auth; token not logged | integration | manual | N/A | ⬜ pending |
| UserListPage | Wave 2 | 2 | UI-02 | — | N/A | component | `npm run test --prefix frontend -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/contexts/__tests__/AuthContext.test.tsx` — stubs for auth state: login, logout, token restore
- [ ] `frontend/src/pages/__tests__/AuthPage.test.tsx` — stubs for form render, tab switching
- [ ] `frontend/src/pages/__tests__/UserListPage.test.tsx` — stubs for user list render
- [ ] `frontend/vitest.setup.ts` — jsdom setup, @testing-library/jest-dom matchers
- [ ] Vitest + @testing-library/react install — Wave 0 task installs if not in scaffold

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Second browser tab auto-updates user list | UI-02 SC-3 | Requires two live STOMP connections | Open two tabs, log in on each, verify first tab list updates |
| Logout removes user from other tabs' lists | UI-02 SC-4 | Requires live backend + STOMP | Log out in one tab, verify name disappears in other tab within 5s |
| STOMP CONNECT rejected with invalid JWT | Security | Requires live backend | Use browser console to connect with bad token, verify 401 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
