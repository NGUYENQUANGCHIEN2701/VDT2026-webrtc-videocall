# Phase 3: React Auth + User List - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 03-react-auth-user-list
**Areas discussed:** TypeScript vs JavaScript, Routing approach, STOMP connection scope, JWT storage

---

## TypeScript vs JavaScript

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript (.tsx/.ts) | Type-safe API responses, WebRTC types, STOMP message shapes. shadcn/ui generates .tsx by default. Better IDE support for Phase 4's complex RTCPeerConnection usage. | ✓ |
| JavaScript (.jsx/.js) | Simpler, no tsconfig needed. Easier if unfamiliar with TS. shadcn/ui can still be used but adds a small config step to downgrade. | |

**User's choice:** TypeScript (.tsx/.ts)
**Notes:** No follow-up questions — decision was clear.

---

## Routing approach

| Option | Description | Selected |
|--------|-------------|----------|
| React Router DOM | URL-based routes: / → redirect to /login or /users. Phase 4 adds /call/:peerId cleanly. Browser back button works. Users can bookmark /users. | ✓ |
| Conditional rendering in App.tsx | No router needed. App.tsx shows AuthPage or UserListPage based on auth state. Simpler for 2 screens, but Phase 4 call screen becomes awkward to add. | |

**Router setup chosen:** react-router-dom v6 with BrowserRouter (confirmed in follow-up question)
**User's choice:** React Router DOM v6 with BrowserRouter
**Notes:** Selected BrowserRouter + protected route pattern. Routes: /login (auth), /users (protected user list), / (redirect based on auth).

---

## STOMP connection scope

| Option | Description | Selected |
|--------|-------------|----------|
| Global WebSocketContext | A WebSocketContext wraps the app. Connects on login (JWT in CONNECT header), disconnects on logout. Phase 4 reuses this same connection for signaling — no re-connect needed when navigating to call screen. | ✓ |
| Inside UserListPage only | STOMP client created when UserListPage mounts, destroyed on unmount. Simpler isolation, but Phase 4 needs a separate connection or prop-drilling the client down. | |

**Connection timing:** On successful login (lazy connect) — confirmed in follow-up question.
**User's choice:** Global WebSocketContext, lazy connect on login
**Notes:** Connect timing is "on login success" — not on app mount. This matches Phase 2's JwtChannelInterceptor which requires a valid JWT in CONNECT headers.

---

## JWT storage

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage | JWT survives page refresh. User stays logged in across browser restarts. Since JWT is 24h and this is a LAN demo, XSS risk is acceptable. AuthContext reads from localStorage on mount to restore session. | ✓ |
| sessionStorage | JWT cleared when the tab/browser closes. User must re-login every session. Less persistent but avoids stale tokens from sitting in storage long-term. | |

**Session restore:** Auto-restore session from localStorage on page refresh (confirmed in follow-up question).
**User's choice:** localStorage with auto-restore on mount
**Notes:** On mount, AuthContext reads localStorage. If token present, restore session and navigate to /users directly.

---

## Claude's Discretion

- JWT decode: use `jwtDecode` library to extract `sub` (username) from the token, rather than a separate `/api/users/me` call on every mount
- Error handling: inline form errors below the relevant field (no toast system in Phase 3)
- Loading states: disable submit button + spinner during API calls
- STOMP reconnect: use `@stomp/stompjs` default (5s delay) — no custom reconnect logic needed for LAN demo
- Axios interceptor reads JWT from localStorage directly (not from AuthContext React state) to avoid stale closure issues
- Vite dev proxy: `/api` and `/ws` proxied to `http://localhost:8080`

## Deferred Ideas

- Call screen, incoming call modal, ringtone → Phase 4
- Toast notification system → Phase 4 (when incoming call notifications are needed)
- Call duration timer, connection status → Phase 5
- Refresh token support → v2 (AUTH-V2-01)
- User profile / avatar → out of scope
