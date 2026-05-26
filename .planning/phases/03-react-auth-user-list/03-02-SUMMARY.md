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

patterns-established:
  - "COPY const at file top — all UI-SPEC §9 copy strings centralized; no inline magic strings"
  - "handleAuthSuccess helper — decode JWT, dispatch LOGIN, connect STOMP, navigate; shared by both login and register tabs"
  - "mapApiError(status) — HTTP status to fixed copy string; backend response body never rendered"

requirements-completed:
  - UI-01

metrics:
  duration: "~35 minutes (TDD execution + human-verify checkpoint)"
  completed_date: "2026-05-26"
  tests_passing: 12
  tests_todo: 4
  build_status: "passing"
---

# Phase 03 Plan 02: AuthPage Login/Register Implementation Summary

**AuthPage implemented as a fully functional tabbed Login/Register card per UI-SPEC §5 — 7 component tests pass, STOMP handshake verified in DevTools, human-verify checkpoint approved against live Spring Boot backend**

## Performance

- **Duration:** ~35 minutes (TDD cycle + human-verify checkpoint)
- **Started:** 2026-05-26
- **Completed:** 2026-05-26
- **Tasks:** 2 (Task 1: TDD implementation; Task 2: human-verify checkpoint — approved)
- **Files modified:** 5

## Accomplishments

- AuthPage.tsx implemented: tabbed Login/Register card per UI-SPEC §5 with all exact copy strings (UI-SPEC §9), loading states, inline field validation, and top-of-card destructive Alerts for 401/409/5xx errors
- 7 component tests converted from `it.todo` stubs to real passing tests covering: login success (token stored + connect called + navigate), 401 Alert, 409 Alert, loading spinner + disabled button, password mismatch inline error, username min-length inline error, connect(token) called once
- Human-verify checkpoint approved: all 14 verification steps passed against the live backend — visual contract per UI-SPEC §5, register/login flow, STOMP WebSocket connection confirmed in DevTools Network WS tab, keyboard navigation confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1 RED — 7 failing AuthPage tests** — `3763cec` (test)
2. **Task 1 GREEN — AuthPage implementation + 7 passing tests** — `beb8f6c` (feat)
3. **Task 2 — human-verify checkpoint (pre-approval docs commit)** — `0b8737f` (docs)

_Note: TDD tasks have RED → GREEN commits. Task 2 is a checkpoint; no code modified. Checkpoint approved by human after all 14 steps passed._

## Files Created/Modified

- `frontend/src/pages/AuthPage.tsx` — Full Login/Register tabbed card (358 lines): Tabs, Input, Label, Button, Alert, Loader2, Video icon, jwtDecode, useAuth dispatch, useWebSocket connect, useNavigate, api.post — per UI-SPEC §5 §9 §10
- `frontend/src/test/AuthPage.test.tsx` — 7 real component tests using Vitest + RTL + MSW (0 it.todo remaining)
- `frontend/src/test/mocks/handlers.ts` — Updated to absolute URLs (http://localhost:8080/...) for MSW v2 node interceptor compatibility
- `frontend/package.json` — lucide-react added
- `frontend/package-lock.json` — lockfile updated

## Decisions Made

- **MSW absolute URLs:** Updated handlers from relative paths to `http://localhost:8080/...`. MSW v2 in Node mode requires absolute URLs when Axios is configured with a `baseURL`; relative paths silently skip matching and produce "unhandled request" warnings.
- **lucide-react install:** Not included in Plan 01 scaffold (shadcn non-interactive mode did not auto-install it). Added as explicit dependency for `Loader2` and `Video` icons required by UI-SPEC §5.
- **jwtDecode fallback:** On decode failure, dispatch LOGIN with `username = ''` — user is still authenticated; username resolved later via `/api/users/me` (Plan 03+).
- **WebSocketContext vi.mock pattern:** Mocking the entire module at test-file level gives a stable `mockConnect` spy accessible across all 7 tests without requiring a custom test provider wrapper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lucide-react not installed**
- **Found during:** Task 1 GREEN phase
- **Issue:** `lucide-react` was not in `package.json`. `AuthPage.tsx` imports `Loader2` and `Video` from it; build would fail without it.
- **Fix:** `npm install lucide-react` — well-established package from lucide-icons org (confirmed in RESEARCH.md package audit).
- **Files modified:** `frontend/package.json`, `frontend/package-lock.json`
- **Committed in:** `beb8f6c`

**2. [Rule 1 - Bug] MSW handlers used relative paths incompatible with Axios baseURL**
- **Found during:** Task 1 GREEN phase — 5/7 tests failed with "unhandled request" MSW warning despite `server.listen()` called
- **Issue:** `handlers.ts` defined handlers as `http.post('/api/auth/login', ...)` (relative). MSW v2 node interceptor requires absolute URLs when Axios has `baseURL: 'http://localhost:8080'`. Requests sent to `http://localhost:8080/api/auth/login` did not match.
- **Fix:** Updated `handlers.ts` to use absolute URLs (`http://localhost:8080/api/auth/login`, `/register`, `/logout`). Updated test-level `server.use(...)` overrides with `API_BASE` constant.
- **Files modified:** `frontend/src/test/mocks/handlers.ts`, `frontend/src/test/AuthPage.test.tsx`
- **Impact:** `AuthContext.test.tsx` unaffected (no MSW dependency). Full regression suite still green (12 passing, 4 todo).
- **Committed in:** `beb8f6c`

---

**Total deviations:** 2 auto-fixed (1 blocking — missing package; 1 bug — MSW URL mismatch)
**Impact on plan:** Both fixes necessary for tests to run. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED — 7 failing tests | `3763cec` | PASSED |
| GREEN — implementation passes all 7 | `beb8f6c` | PASSED |
| REFACTOR | Not needed | N/A |

## Known Stubs

None — AuthPage is fully implemented. The UserListPage stub (`<div><h1>Users</h1></div>`) from Plan 01 remains intentional and will be resolved in Plan 03.

## Threat Surface Scan

No new security-relevant surface introduced beyond the plan's `<threat_model>`. All six threat register items (T-3-07 through T-3-12) are mitigated:

- T-3-07 (password in DOM): `type="password"` on all password inputs; no `console.log` of credentials
- T-3-08 (XSS via username): all form values through controlled React inputs; no `dangerouslySetInnerHTML`; error messages rendered as text inside `<AlertDescription>`
- T-3-09 (JWT in network log): token only in Authorization header via interceptor, localStorage, AuthContext state, STOMP connectHeaders — never in URL or DOM
- T-3-10 (stale token): LOGIN dispatch always overwrites localStorage; `connect(token)` uses fresh argument
- T-3-11 (backend error leak): `mapApiError` maps status to fixed copy; response body never rendered
- T-3-12 (double submit DoS): submit button `disabled` while `isLoading=true`

## User Setup Required

None — no new external service configuration required for this plan.

## Next Phase Readiness

- UI-01 complete: users can register, log in, and reach `/users` (placeholder)
- Plan 03 (UserListPage) can proceed: authenticated users arrive at `/users`, WebSocket context is connected, STOMP subscription to `/topic/presence` is established
- No blockers

## Self-Check: PASSED

- [x] `frontend/src/pages/AuthPage.tsx` exists, 358 lines (> 150 minimum)
- [x] All required imports present (Tabs, Input, Button, Alert, Loader2, jwtDecode, useAuth, useWebSocket, useNavigate, api.post)
- [x] All required copy strings present (Sign In, Create Account, Signing in..., Creating account..., Invalid username or password, Username already taken..., Passwords do not match, Username must be at least 3 characters)
- [x] `connect(token)` present in handleAuthSuccess
- [x] `navigate('/users', { replace: true })` present
- [x] 0 `it.todo(` entries; 7 `it(` entries in AuthPage.test.tsx
- [x] `npm run test -- --run AuthPage` exits 0, 7 passing
- [x] `npm run test -- --run` exits 0 (12 passing, 4 todo — no regressions)
- [x] `npm run build` exits 0
- [x] Task 2 human-verify checkpoint: APPROVED by user

Commits verified in git log:
- `3763cec`: test(03-02): add failing tests for AuthPage UI-01
- `beb8f6c`: feat(03-02): implement AuthPage with Login/Register + 7 passing tests
- `0b8737f`: docs(03-02): complete AuthPage plan — 7 tests green, checkpoint awaiting approval

---
*Phase: 03-react-auth-user-list*
*Completed: 2026-05-26*
