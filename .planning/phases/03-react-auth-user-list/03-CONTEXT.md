# Phase 3: React Auth + User List - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the React + TypeScript frontend from scratch in `frontend/` at the project root. Deliverables: Vite project scaffold, Login/Register UI (tabbed card per UI-SPEC), live online user list connected to the Phase 2 STOMP WebSocket backend. A user can open the browser, log in or register, and immediately see who is online — with the list updating automatically when others join or leave.

No WebRTC, no call flow, no call screen — this phase ends when the user list is live and realtime. Phase 4 adds the call logic.

</domain>

<decisions>
## Implementation Decisions

### Language & Tooling
- **D-01:** Language: **TypeScript** (.tsx/.ts throughout). Vite 5.x initialized with the `react-ts` template (`npm create vite@latest frontend -- --template react-ts`). shadcn/ui generates .tsx by default — no additional config needed.

### Routing
- **D-02:** Router: **react-router-dom v6** with `<BrowserRouter>`. Three routes at Phase 3: `/login` → AuthPage, `/users` → UserListPage (protected), `/` → redirect based on auth state.
- **D-03:** Protected route pattern: a `<ProtectedRoute>` wrapper component reads auth state from AuthContext; unauthenticated users are redirected to `/login`. Phase 4 adds `/call/:peerId` to this same router without restructuring.

### Auth State & JWT Storage
- **D-04:** Auth state: **React Context API** (`AuthContext`) with `useReducer`. Stores `{ token: string | null, username: string | null }`. Exported `useAuth()` hook for consumer components.
- **D-05:** JWT storage: **localStorage** (`key: 'vdt_token'`). Persists across page reloads and browser restarts. Acceptable for a LAN demo with 24h tokens and no sensitive data beyond the username.
- **D-06:** Session restore on mount: `AuthContext` reads from localStorage on initialization. If a token is present (no expiry-check needed — server will 401 if expired), auth state is restored and the user lands on `/users` without re-logging in.
- **D-07:** On logout: call `POST /api/auth/logout` (with JWT), then clear localStorage, reset auth state, disconnect STOMP, navigate to `/login`.

### STOMP WebSocket Connection
- **D-08:** Scope: **Global WebSocketContext** — a separate React Context wrapping the app. Provides `{ client, subscribe, publish }` to consumers via `useWebSocket()` hook.
- **D-09:** Connect timing: **lazy — on successful login only**. After `AuthContext` stores the token, it signals `WebSocketContext` to connect. The STOMP CONNECT frame includes `Authorization: Bearer {token}` in the headers, matching Phase 2's `JwtChannelInterceptor`.
- **D-10:** WebSocket endpoint: `ws://localhost:8080/ws` (native WebSocket — no SockJS, per CLAUDE.md). STOMP library: `@stomp/stompjs` 7.x directly (no `sockjs-client` dependency).
- **D-11:** Presence subscription: `WebSocketContext` subscribes to `/topic/presence` immediately after STOMP CONNECT succeeds. Callback receives `PresenceDTO: { onlineUsers: string[] }` and stores the list in WebSocketContext state for `UserListPage` to consume.
- **D-12:** Disconnect: on logout, `WebSocketContext` calls `client.deactivate()` and clears the online user list.

### Backend API Contract (exact shapes, for Axios integration)
- `POST /api/auth/register` — body: `{ username, password }` → response: `{ token: string }`
- `POST /api/auth/login` — body: `{ username, password }` → response: `{ token: string }`
- `POST /api/auth/logout` — header: `Authorization: Bearer {token}` → 200
- `GET /api/users/me` — header: `Authorization: Bearer {token}` → `{ username, displayName, status }`
- Axios base URL: `http://localhost:8080` — configured in `src/lib/api.ts` (axios instance with base URL and request interceptor that injects the JWT from localStorage).

### Claude's Discretion
- Username decoded from JWT claims (`sub` field via `jwtDecode` library) rather than separate `/me` call on every mount — saves a network round trip. If claim decoding fails, fall back to `/api/users/me`.
- Error handling: inline form error messages (e.g., "Username already taken", "Invalid credentials") shown below the form field that caused the error. No toast system in Phase 3.
- Loading states: disable submit button and show spinner during login/register API call.
- STOMP reconnect: `@stomp/stompjs` default reconnect delay (5s) is sufficient for a LAN demo — no custom reconnect logic.
- Axios interceptor attaches JWT from localStorage (not from AuthContext state) so it works across re-renders without closure issues.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual & Interaction Contract (LOCKED — highest priority)
- `.planning/phases/03-react-auth-user-list/03-UI-SPEC.md` — Complete visual contract: dark emerald theme, shadcn/ui setup, spacing scale, typography, color palette, auth screen layout, user list layout. All visual decisions are locked here — do NOT deviate without updating this file.

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 3 covers UI-01 (Login/Register screen functional + styled) and UI-02 (online user list with call button)
- `.planning/ROADMAP.md` — Phase 3 success criteria (§Phase 3 section)

### Project Constraints & Stack
- `CLAUDE.md` §Technology Stack — Frontend table: React 18, Vite 5.x, @stomp/stompjs 7.x, Axios 1.x, React Context API (no Redux)
- `CLAUDE.md` §WebSocket Signaling — STOMP decision rationale; native WebSocket (no SockJS)
- `.planning/phases/01-backend-foundation/01-CONTEXT.md` — D-02 (monorepo layout: `frontend/` at root), D-06 (24h JWT), D-09 (username-only, no email field)

### Backend Integration (already built)
- `backend/src/main/java/com/vdt/auth/dto/AuthResponse.java` — Response shape: `{ token: string }` only (no username in response — decode from JWT sub claim)
- `backend/src/main/java/com/vdt/websocket/dto/PresenceDTO.java` — Presence payload: `{ onlineUsers: string[] }` broadcast on every connect/disconnect
- `backend/src/main/java/com/vdt/websocket/WebSocketConfig.java` — STOMP endpoint `/ws`, no SockJS, broker prefixes `/topic` and `/queue`, app prefix `/app`, user prefix `/user`
- `backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java` — Expects `Authorization: Bearer {token}` in STOMP CONNECT headers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — no frontend code exists yet. This phase establishes all React patterns.

### Established Patterns (from backend, Phase 1-2)
- JWT issued as `{ token: string }` in AuthResponse — frontend must decode username from `sub` claim (or call `/api/users/me`)
- `users.status` ENUM ('ONLINE','OFFLINE') in DB — Phase 2 manages this automatically via STOMP connect/disconnect events
- STOMP auth: JWT goes in STOMP CONNECT frame header `Authorization: Bearer {token}` (NOT the HTTP upgrade request)

### Integration Points
- AuthContext token → Axios interceptor → REST API calls with `Authorization: Bearer` header
- AuthContext token → WebSocketContext CONNECT → STOMP subscription to `/topic/presence`
- WebSocketContext `onlineUsers` list → UserListPage renders each user with a "Call" button
- Phase 4 reuses WebSocketContext for signaling: `publish({ destination: '/app/signal', body: JSON.stringify(signalMsg) })`

</code_context>

<specifics>
## Specific Ideas

- UI-SPEC is the single source of truth for all visual decisions — executor must read it before touching any component file
- Auth screen: tabbed card (Login / Register tabs), not separate routes — both tabs on the same `/login` page per UI-SPEC layout
- Online badge: emerald dot + "Online" label per UI-SPEC §6 color spec (`bg-emerald-900/30` background, `text-emerald-400` text)
- Call button: `bg-emerald-500 hover:bg-emerald-600` per UI-SPEC accent color rules
- Page background: `bg-slate-950`, card surface: `bg-slate-900`, inputs: `bg-slate-800` — all from UI-SPEC CSS variable override in `src/index.css`
- Vite dev proxy: configure in `vite.config.ts` to proxy `/api` and `/ws` to `http://localhost:8080` to avoid CORS issues in dev

</specifics>

<deferred>
## Deferred Ideas

- Call screen UI — Phase 4 scope
- Incoming call modal / ringtone — Phase 4 scope
- Call duration timer, connection status indicator — Phase 5 scope
- Refresh token / JWT auto-renewal — explicitly v2 (AUTH-V2-01 in REQUIREMENTS.md)
- Toast notification system — may be added in Phase 4 when incoming call notifications are needed
- User profile / avatar — out of scope (REQUIREMENTS.md Out of Scope table)

</deferred>

---

*Phase: 03-react-auth-user-list*
*Context gathered: 2026-05-26*
