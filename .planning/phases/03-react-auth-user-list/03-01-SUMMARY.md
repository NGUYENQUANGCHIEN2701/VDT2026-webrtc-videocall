---
phase: "03-react-auth-user-list"
plan: "01"
subsystem: "frontend-scaffold"
tags:
  - react
  - vite
  - typescript
  - tailwind
  - shadcn
  - vitest
  - msw
  - scaffold
dependency_graph:
  requires:
    - "02-backend-websocket-presence (backend REST + STOMP endpoints at localhost:8080)"
  provides:
    - "frontend/ Vite React-TS project — all subsequent Phase 3 plans build on this scaffold"
    - "AuthContext — auth state provider for all Phase 3+ components"
    - "WebSocketContext — STOMP client provider for Phase 3+ pages"
    - "ProtectedRoute — route guard for all protected pages"
    - "Axios api.ts instance — all REST calls in Phase 3+ use this"
  affects:
    - "03-02-PLAN.md — AuthPage implementation plugs into AuthContext + api.ts stubs created here"
    - "03-03-PLAN.md — UserListPage implementation plugs into WebSocketContext + stubs created here"
tech_stack:
  added:
    - "react@19.2.6 (Vite template scaffolded React 19; RESEARCH.md noted 18 but 19 is compatible)"
    - "vite@8.0.12 + @vitejs/plugin-react@6.0.1"
    - "react-router-dom@6.30.3"
    - "@stomp/stompjs@7.3.0"
    - "axios@1.16.1"
    - "jwt-decode@4.0.0"
    - "tailwindcss@3.4.19 + postcss@8.5.15 + autoprefixer@10.5.0"
    - "shadcn@2.3.0 CLI (pinned for Tailwind v3 compatibility)"
    - "vitest@4.1.7 + @testing-library/react@16.3.2 + @testing-library/jest-dom@6.9.1"
    - "msw@2.14.6"
    - "class-variance-authority@0.7.1 + clsx@2.1.1 + tailwind-merge@3.6.0 + tailwindcss-animate@1.0.7"
  patterns:
    - "AuthContext: useReducer with initState from localStorage via jwtDecode"
    - "Axios interceptor: reads localStorage['vdt_token'] on every request (not React state)"
    - "WebSocketContext: STOMP subscribe inside onConnect callback (avoids Pitfall 2)"
    - "ProtectedRoute: Navigate to /login when token is falsy"
    - "TDD: RED (test) → GREEN (implement) commit sequence"
key_files:
  created:
    - "frontend/package.json"
    - "frontend/vite.config.ts"
    - "frontend/tailwind.config.js"
    - "frontend/postcss.config.js"
    - "frontend/tsconfig.json"
    - "frontend/tsconfig.app.json"
    - "frontend/index.html"
    - "frontend/components.json"
    - "frontend/src/index.css"
    - "frontend/src/vite-env.d.ts"
    - "frontend/src/lib/utils.ts"
    - "frontend/src/lib/api.ts"
    - "frontend/src/contexts/AuthContext.tsx"
    - "frontend/src/contexts/WebSocketContext.tsx"
    - "frontend/src/components/ProtectedRoute.tsx"
    - "frontend/src/components/ui/tabs.tsx"
    - "frontend/src/components/ui/input.tsx"
    - "frontend/src/components/ui/label.tsx"
    - "frontend/src/components/ui/button.tsx"
    - "frontend/src/components/ui/alert.tsx"
    - "frontend/src/components/ui/avatar.tsx"
    - "frontend/src/components/ui/skeleton.tsx"
    - "frontend/src/pages/AuthPage.tsx"
    - "frontend/src/pages/UserListPage.tsx"
    - "frontend/src/App.tsx"
    - "frontend/src/main.tsx"
    - "frontend/src/test/setup.ts"
    - "frontend/src/test/mocks/handlers.ts"
    - "frontend/src/test/mocks/server.ts"
    - "frontend/src/test/AuthContext.test.tsx"
    - "frontend/src/test/AuthPage.test.tsx"
    - "frontend/src/test/UserListPage.test.tsx"
  modified: []
decisions:
  - "Used React 19 (Vite template default) instead of React 18 — React 19 is backward-compatible with React 18 APIs used in this project; shadcn@2.3.0 installed with --force flag to bypass React 19 peer dep warning"
  - "shadcn init ran partially (stopped at React 19 prompt); manually installed class-variance-authority, clsx, tailwind-merge, tailwindcss-animate and created src/lib/utils.ts"
  - "vite.config.ts imports defineConfig from vitest/config (not vite) to enable test: block typing in TypeScript 6.0"
  - "TypeScript 6.0 verbatimModuleSyntax requires 'import type' for ReactNode, IMessage, StompSubscription"
  - "tsconfig.app.json ignoreDeprecations: '6.0' needed for baseUrl deprecation warning in TS 6.0"
metrics:
  duration: "~35 minutes"
  completed_date: "2026-05-26"
  tests_passing: 6
  tests_todo: 8
  build_status: "passing"
---

# Phase 03 Plan 01: Frontend Scaffold Summary

Vite + React + TypeScript project bootstrapped with Tailwind v3, shadcn@2.3.0, all runtime dependencies, test infrastructure, and core wiring (AuthContext, WebSocketContext, ProtectedRoute, Axios instance, App router, main entry). Build exits 0, test suite exits 0 with 6 passing + 8 todo.

## What Was Built

### Scaffold (Task 1)

Created the entire `frontend/` project from scratch using `npm create vite@latest --template react-ts`. Installed all dependencies per the research document:

**Runtime:** react-router-dom@6.30.3, @stomp/stompjs@7.3.0, axios@1.16.1, jwt-decode@4.0.0

**UI layer:** tailwindcss@3.4.19, shadcn@2.3.0 (7 components: tabs, input, label, button, alert, avatar, skeleton)

**Testing:** vitest@4.1.7, @testing-library/react@16.3.2, @testing-library/jest-dom@6.9.1, msw@2.14.6

Config files written per 03-PATTERNS.md verbatim: vite.config.ts (@ alias + /api + /ws proxy + jsdom test env), tailwind.config.js (content globs + #10B981 emerald accent), index.css (Tailwind v3 @tailwind directives + UI-SPEC §4 CSS variable override), tsconfig paths.

### Core Wiring (Task 2 — TDD)

**api.ts:** Axios instance with baseURL=http://localhost:8080 and request interceptor reading `localStorage['vdt_token']` (not React state — avoids closure staleness per CONTEXT.md D-05 discretion).

**AuthContext.tsx:** useReducer with LOGIN/LOGOUT actions. `initState` reads localStorage synchronously on mount and decodes JWT `sub` claim via `jwtDecode`. Malformed tokens are removed from localStorage. `useAuth()` throws if used outside AuthProvider.

**WebSocketContext.tsx:** STOMP Client with brokerURL=`ws://localhost:8080/ws`, connectHeaders Authorization, reconnectDelay=5000. Subscription to `/topic/presence` is inside `onConnect` callback (per RESEARCH Pitfall 2 — not after activate()). Provides `{ client, onlineUsers, isLoading, connect, disconnect, subscribe, publish }`.

**ProtectedRoute.tsx:** Reads `useAuth().token`, returns `<Navigate to="/login" replace />` when falsy.

**App.tsx:** BrowserRouter with 3 routes: `/login` → AuthPage, `/users` → ProtectedRoute > UserListPage, `/` → token-aware Navigate.

**main.tsx:** `<AuthProvider><WebSocketProvider><App /></WebSocketProvider></AuthProvider>` — AuthProvider wraps WebSocketProvider so the latter can read auth context later.

### Test Infrastructure

- `test/setup.ts`: vitest + @testing-library/jest-dom cleanup
- `test/mocks/handlers.ts`: MSW handlers for /api/auth/login, /api/auth/register, /api/auth/logout
- `test/mocks/server.ts`: msw/node setupServer
- `test/AuthContext.test.tsx`: 4 real tests (initState empty, initState restore, LOGIN dispatch, LOGOUT dispatch)
- `test/AuthPage.test.tsx`: 1 placeholder + 4 it.todo for Plan 02
- `test/UserListPage.test.tsx`: 1 placeholder + 4 it.todo for Plan 03

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `frontend/src/pages/AuthPage.tsx` | `<div><h1>Auth</h1></div>` | Full login/register UI implemented in Plan 02 |
| `frontend/src/pages/UserListPage.tsx` | `<div><h1>Users</h1></div>` | Full user list UI implemented in Plan 03 |

These stubs are intentional — Plan 01 is the scaffold wave, Plans 02 and 03 implement the user-visible features.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] React 19 installed instead of React 18**
- **Found during:** Task 1
- **Issue:** `npm create vite@latest` scaffolded React 19.2.6 — RESEARCH.md listed React 18.3.1 as the expected version. The Vite template version determines the React version installed.
- **Fix:** React 19 is backward-compatible with React 18 APIs used in this project. shadcn@2.3.0 was installed with `--force` (via `echo "" | npx shadcn@2.3.0 init`) to bypass the React 19 peer dependency warning. All functionality works correctly.
- **Files modified:** `frontend/package.json` (react@19.2.6)

**2. [Rule 3 - Blocking] shadcn@2.3.0 init stopped at interactive prompt**
- **Found during:** Task 1
- **Issue:** `npx shadcn@2.3.0 init` paused at React 19 compatibility prompt before creating `src/lib/utils.ts` or installing runtime dependencies.
- **Fix:** Manually installed `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` via npm. Created `src/lib/utils.ts` manually with `cn()` utility. Ran `echo "" | npx shadcn@2.3.0 add <components>` to add all 7 components.
- **Files modified:** `frontend/src/lib/utils.ts` (created manually)

**3. [Rule 3 - Blocking] TypeScript 6.0 verbatimModuleSyntax requires type-only imports**
- **Found during:** Task 2 build verification
- **Issue:** TS6.0 with `verbatimModuleSyntax: true` requires `import type` for type-only symbols (`ReactNode`, `IMessage`, `StompSubscription`). Build failed with TS1484 errors.
- **Fix:** Changed to `import { ..., type ReactNode }` syntax in AuthContext.tsx and WebSocketContext.tsx.
- **Files modified:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/contexts/WebSocketContext.tsx`

**4. [Rule 3 - Blocking] TypeScript 6.0 deprecates baseUrl**
- **Found during:** Task 1 build verification
- **Issue:** TS6.0 treats `baseUrl` as deprecated and errors unless suppressed.
- **Fix:** Added `"ignoreDeprecations": "6.0"` to `tsconfig.app.json`.
- **Files modified:** `frontend/tsconfig.app.json`

**5. [Rule 3 - Blocking] vite.config.ts test block type error**
- **Found during:** Task 1 build verification
- **Issue:** TypeScript 6.0 with `defineConfig` from `vite` doesn't recognize the `test:` block (Vitest extends it). TS error 2769.
- **Fix:** Changed `import { defineConfig } from "vite"` to `import { defineConfig } from "vitest/config"` which includes the extended type with `test:` property.
- **Files modified:** `frontend/vite.config.ts`

**6. [Rule 2 - Missing Critical] shadcn init overwrote index.css with oklch variables**
- **Found during:** Task 1
- **Issue:** shadcn@2.3.0 init appended a large block of `@layer base` with oklch color values (shadcn's new-york style) that conflicted with the UI-SPEC §4 HSL CSS variable override.
- **Fix:** Restored index.css to Tailwind v3 directives + UI-SPEC §4 HSL variables only, keeping the `@layer base` block for border and body bg/text from shadcn (compatible with v3). Removed the oklch-format variables that overrode our custom values.
- **Files modified:** `frontend/src/index.css`

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED — test files created and failing | `9c9a72e` | PASSED |
| GREEN — implementation makes tests pass | `a17d4ff` | PASSED |
| REFACTOR | not needed | N/A |

## Self-Check: PASSED

All 22 key files found on disk. All 3 task commits (e4b7090, 9c9a72e, a17d4ff) verified in git history.
