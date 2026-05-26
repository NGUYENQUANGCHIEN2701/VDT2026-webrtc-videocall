---
phase: "03-react-auth-user-list"
plan: "02"
subsystem: "frontend-auth"
tags:
  - react
  - auth
  - form
  - tdd
  - shadcn
  - vitest
  - msw
dependency_graph:
  requires:
    - "03-01 (Vite scaffold, AuthContext, WebSocketContext, api.ts, MSW server)"
    - "Phase 1 backend at localhost:8080 (for human-verify checkpoint)"
  provides:
    - "AuthPage.tsx — functional Login/Register tabbed card per UI-SPEC §5"
    - "7 AuthPage component tests — UI-01 coverage complete"
    - "MSW handlers updated to absolute URLs (fix for Axios baseURL)"
  affects:
    - "03-03-PLAN.md — UserListPage builds on the STOMP connection initiated here"
    - "Human-verify checkpoint (Task 2) — confirms UI-SPEC §5 visual contract against live backend"
tech_stack:
  added:
    - "lucide-react (installed — missing from Plan 01 scaffold; shadcn did not auto-install in non-interactive mode)"
  patterns:
    - "TDD: RED (7 failing tests) → GREEN (AuthPage implementation) cycle"
    - "MSW handlers use absolute URLs (http://localhost:8080/...) to match Axios baseURL in msw/node"
    - "useWebSocket() mocked in tests via vi.mock to isolate STOMP from component tests"
    - "useNavigate mocked via vi.mock('react-router-dom') to capture navigation calls"
    - "Client-side validation before API call — no network request on invalid input"
    - "API error mapping: 401 → invalidCredentials, 409 → usernameTaken, 5xx → serverError"
    - "JWT decoded via jwtDecode(token).sub for username — fallback to '' on decode failure"
key_files:
  created: []
  modified:
    - "frontend/src/pages/AuthPage.tsx"
    - "frontend/src/test/AuthPage.test.tsx"
    - "frontend/src/test/mocks/handlers.ts"
    - "frontend/package.json"
    - "frontend/package-lock.json"
decisions:
  - "MSW handlers updated from relative paths (/api/auth/login) to absolute URLs (http://localhost:8080/api/auth/login) — MSW v2 node interceptor requires full URLs to match Axios requests with baseURL configured"
  - "lucide-react installed as dependency — was missing from Plan 01 non-interactive shadcn scaffold; required for Loader2 and Video icons in AuthPage"
  - "WebSocketProvider mock via vi.mock isolates STOMP connect from unit tests — mockConnect spy asserts connect(token) called exactly once on successful auth"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-05-26"
  tests_passing: 12
  tests_todo: 4
  build_status: "passing"
---

# Phase 03 Plan 02: AuthPage Login/Register Implementation Summary

AuthPage implemented as a fully functional tabbed Login/Register card per UI-SPEC §5. 7 component tests pass (TDD RED→GREEN). Build clean. Human-verify checkpoint (Task 2) presented — awaiting user approval against live backend.

## What Was Built

### Task 1: AuthPage Implementation (TDD)

**RED phase (commit 3763cec):** Wrote 7 failing tests in `AuthPage.test.tsx`:
1. Login success stores token + calls connect(token) + navigates to /users
2. 401 shows Alert with 'Invalid username or password'
3. 409 (register) shows Alert with 'Username already taken. Please choose another.'
4. Submit button shows Loader2 spinner + 'Signing in...' while loading
5. Register passwords mismatch shows inline error, no network request
6. Username min-length (< 3 chars) shows inline error, no network request
7. Successful login triggers WebSocketContext.connect(token) once

All 7 failed against the stub `<div><h1>Auth</h1></div>`.

**GREEN phase (commit beb8f6c):** Implemented `frontend/src/pages/AuthPage.tsx` (358 lines):
- Layout: `min-h-screen flex items-center justify-center bg-slate-950` wrapper; `w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-8` card
- Logo block: `<Video className="size-8 text-emerald-400" />` + `VDT-WebRTC` heading
- shadcn `Tabs` with defaultValue='login', `TabsList bg-slate-800 grid grid-cols-2`
- Login tab: Username / Password inputs with `aria-describedby` error linkage; submit button 'Sign In' / 'Signing in...' with `<Loader2 className="animate-spin mr-2 h-4 w-4" />`
- Register tab: Username / Password / Confirm Password inputs; submit 'Create Account' / 'Creating account...'
- Client-side validation before API call (min-length, required, passwords mismatch)
- `api.post('/api/auth/login'|'/api/auth/register')` → on success: `jwtDecode(token).sub` → `dispatch({ type: 'LOGIN', token, username })` → `connect(token)` → `navigate('/users', { replace: true })`
- Error mapping: 401 → `'Invalid username or password'`; 409 → `'Username already taken. Please choose another.'`; 5xx/network → `'Something went wrong. Please try again.'`
- shadcn `Alert variant="destructive"` with `role="alert"` at top of card for API errors
- Inline field errors: `<p className="text-xs text-red-400 mt-1">` below offending field
- Security: no `dangerouslySetInnerHTML`, no `sockjs`, no credentials in console.log, form values in controlled inputs only

### Task 2: Human-Verify Checkpoint

AWAITING USER VERIFICATION — see checkpoint details below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lucide-react not installed**
- **Found during:** Task 1 GREEN phase — `AuthPage.tsx` imports `Loader2` and `Video` from `lucide-react`
- **Issue:** `lucide-react` was not in `package.json` dependencies. Plan 01's non-interactive shadcn scaffold did not auto-install it (it normally ships with shadcn but wasn't added during the piped init).
- **Fix:** `npm install lucide-react` — well-established package from lucide-icons org (confirmed in RESEARCH.md package audit).
- **Files modified:** `frontend/package.json`, `frontend/package-lock.json`

**2. [Rule 1 - Bug] MSW handlers used relative paths incompatible with Axios baseURL**
- **Found during:** Task 1 GREEN phase — 5/7 tests failed with "unhandled request" MSW warning despite server.listen() being called
- **Issue:** `handlers.ts` defined handlers as `http.post('/api/auth/login', ...)` (relative paths). MSW v2 node interceptor requires absolute URLs when Axios is configured with `baseURL: 'http://localhost:8080'`. The requests were sent to `http://localhost:8080/api/auth/login` and not matched.
- **Fix:** Updated `handlers.ts` to use `http://localhost:8080/api/auth/login` (and `/register`, `/logout`). Updated test-level `server.use(...)` overrides to use the same `API_BASE` constant.
- **Files modified:** `frontend/src/test/mocks/handlers.ts`, `frontend/src/test/AuthPage.test.tsx`
- **Impact:** `AuthContext.test.tsx` unaffected (does not use MSW server for API calls). Full regression suite still green.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED — 7 failing tests | `3763cec` | PASSED |
| GREEN — implementation passes all 7 | `beb8f6c` | PASSED |
| REFACTOR | Not needed | N/A |

## Known Stubs

None — AuthPage is fully implemented.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced beyond what is declared in the plan's threat_model. The component:
- Uses React controlled inputs (no innerHTML — T-3-08 mitigated)
- Never logs credentials (T-3-07 mitigated)
- Token only in response body, localStorage, AuthContext, STOMP connectHeaders (T-3-09 mitigated)
- Button disabled while isLoading prevents double-submission (T-3-12 mitigated)

## Self-Check: PENDING (checkpoint not yet approved)

Task 1 artifacts verified:

- [x] `frontend/src/pages/AuthPage.tsx` exists, 358 lines (> 150)
- [x] All required imports present (Tabs, Input, Button, Alert, Loader2, jwtDecode, useAuth, useWebSocket, useNavigate, api.post)
- [x] All required copy strings present (Sign In, Create Account, Signing in..., Creating account..., Invalid username or password, Username already taken..., Passwords do not match, Username must be at least 3 characters)
- [x] `connect(token)` present in handleAuthSuccess
- [x] `navigate('/users', { replace: true })` present
- [x] 0 `it.todo(` entries; 7 `it(` entries in AuthPage.test.tsx
- [x] `npm run test -- --run AuthPage` exits 0, 7 passing
- [x] `npm run test -- --run` exits 0 (12 passing, 4 todo — no regressions)
- [x] `npm run build` exits 0

Task 2 (human-verify): AWAITING USER APPROVAL

Commits:
- `3763cec`: test(03-02): add failing tests for AuthPage UI-01
- `beb8f6c`: feat(03-02): implement AuthPage with Login/Register + 7 passing tests
