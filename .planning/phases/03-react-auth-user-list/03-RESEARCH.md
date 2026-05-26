# Phase 3: React Auth + User List — Research

**Researched:** 2026-05-26
**Domain:** React 18 + Vite 5 + shadcn/ui + @stomp/stompjs frontend
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Language & Tooling**
- D-01: TypeScript (.tsx/.ts throughout). Vite 5.x with `react-ts` template (`npm create vite@latest frontend -- --template react-ts`). shadcn/ui generates .tsx by default.

**Routing**
- D-02: react-router-dom v6 with `<BrowserRouter>`. Three routes: `/login` → AuthPage, `/users` → UserListPage (protected), `/` → redirect based on auth state.
- D-03: `<ProtectedRoute>` wrapper reads auth state from AuthContext; unauthenticated → redirect to `/login`. Phase 4 adds `/call/:peerId` without restructuring.

**Auth State & JWT Storage**
- D-04: AuthContext with `useReducer`. State shape: `{ token: string | null, username: string | null }`. Exported `useAuth()` hook.
- D-05: JWT in localStorage, key `vdt_token`. 24h tokens, LAN demo — acceptable risk.
- D-06: Session restore on mount: read from localStorage. No expiry check needed (server 401 handles it). User lands on `/users` if token present.
- D-07: Logout: POST `/api/auth/logout` (with JWT), clear localStorage, reset auth state, disconnect STOMP, navigate to `/login`.

**STOMP WebSocket Connection**
- D-08: Global `WebSocketContext` — separate Context. Provides `{ client, subscribe, publish }` via `useWebSocket()` hook.
- D-09: Connect timing: lazy — on successful login only. STOMP CONNECT frame includes `Authorization: Bearer {token}`.
- D-10: WebSocket endpoint: `ws://localhost:8080/ws` (native WebSocket, no SockJS). Library: `@stomp/stompjs` 7.x (no sockjs-client).
- D-11: `WebSocketContext` subscribes to `/topic/presence` immediately after STOMP CONNECT. Stores `{ onlineUsers: string[] }` in context state.
- D-12: Disconnect: on logout, call `client.deactivate()` and clear online user list.

**Backend API Contract**
- `POST /api/auth/register` — body: `{ username, password }` → `{ token: string }`
- `POST /api/auth/login` — body: `{ username, password }` → `{ token: string }`
- `POST /api/auth/logout` — header: `Authorization: Bearer {token}` → 200
- `GET /api/users/me` — header: `Authorization: Bearer {token}` → `{ username, displayName, status }`
- Axios base URL: `http://localhost:8080`, configured in `src/lib/api.ts`

### Claude's Discretion
- Username decoded from JWT `sub` claim via `jwtDecode` library (not `/me` call on every mount). Fall back to `/api/users/me` if decode fails.
- Error handling: inline form error messages below offending field. No toast system in Phase 3.
- Loading states: disable submit button + spinner during API call.
- STOMP reconnect: default 5s reconnect delay — no custom reconnect logic.
- Axios interceptor reads JWT from localStorage (not AuthContext state) to avoid closure issues.

### Deferred Ideas (OUT OF SCOPE)
- Call screen UI — Phase 4
- Incoming call modal / ringtone — Phase 4
- Call duration timer, connection status indicator — Phase 5
- Refresh token / JWT auto-renewal — v2 (AUTH-V2-01)
- Toast notification system — Phase 4+
- User profile / avatar — out of scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Login/Register screen is functional and styled | shadcn/ui Tabs + Input + Button + Alert components; AuthContext + Axios; form validation patterns documented in §Common Pitfalls |
| UI-02 | Online user list screen shows connected users with call initiation button | WebSocketContext `/topic/presence` subscription; UserListPage with Avatar + Skeleton + Button; self-filter from JWT sub claim |
</phase_requirements>

---

## Summary

Phase 3 builds a greenfield React 18 + TypeScript frontend in the `frontend/` directory at the monorepo root. There is no existing frontend code — every pattern is established here and reused by Phases 4-8. The two deliverables are: (1) an Auth screen with a tabbed Login/Register card connected to the Phase 1 REST API, and (2) a live online user list screen driven by a STOMP WebSocket subscription to `/topic/presence` built in Phase 2.

The stack is fully locked: Vite 5.x + React 18 + TypeScript + shadcn/ui (Tailwind 3.x) + @stomp/stompjs 7.x + Axios 1.x + react-router-dom v6. All packages are stable, well-established, and confirmed available on npm. The integration between the frontend STOMP client and the Spring Boot JwtChannelInterceptor has a single non-obvious requirement: the JWT must go in the STOMP CONNECT frame's `connectHeaders.Authorization` field, NOT in the HTTP upgrade request — this is already designed for in CONTEXT.md D-09 and confirmed by reading the backend interceptor code.

The key planning risk is the shadcn/ui + Tailwind v3 setup sequence: the current `shadcn@latest` CLI defaults to Tailwind v4. Since the UI-SPEC locks to Tailwind CSS 3.x (with `@tailwind` directives, `tailwind.config.js`, postcss), the executor must use `shadcn@2.3.0` (the last release targeting Tailwind v3). This distinction must be explicit in every plan task that scaffolds the project.

**Primary recommendation:** Follow the locked decisions exactly. The only judgment call is whether to pin `shadcn@2.3.0` vs accept Tailwind v4 — since UI-SPEC.md explicitly says "Tailwind CSS 3.x (via shadcn init)" and the CSS variable block uses v3 syntax, use `shadcn@2.3.0`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JWT auth state storage | Browser (localStorage) | — | Client-side persistence required; 24h token; server validates on each request |
| Auth form UI & validation | Browser (React component) | — | All form logic and inline errors are client-side only |
| REST auth calls (login/register/logout) | Browser → API | — | Axios calls from React hit Spring Boot REST endpoints |
| JWT decode for username | Browser | — | `jwtDecode()` runs in-browser; no round-trip needed |
| STOMP connection & presence subscription | Browser (WebSocketContext) | API/Backend | Client owns the connection lifecycle; backend owns broadcast logic |
| Online user list state | Browser (WebSocketContext) | — | Presence payload arrives via WebSocket; stored in React context |
| ProtectedRoute redirect | Browser (React Router) | — | Reads AuthContext; no server involvement |
| HTTP request auth header injection | Browser (Axios interceptor) | — | Interceptor runs per-request in browser |

---

## Standard Stack

### Core

| Library | Version (pinned) | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| react | 18.3.1 | UI framework | Hooks map perfectly to WebRTC lifecycle; locked by CLAUDE.md |
| react-dom | 18.3.1 | DOM renderer | Paired with react |
| typescript | 5.x (via Vite template) | Type safety | CONTEXT.md D-01: TypeScript throughout |
| vite | 5.4.x | Build tool + dev server | CLAUDE.md: CRA deprecated; Vite is the current standard |
| @vitejs/plugin-react | 4.x | React Fast Refresh for Vite | Required by Vite react-ts template |
| react-router-dom | 6.30.x | Client-side routing | CONTEXT.md D-02: BrowserRouter with 3 routes |
| @stomp/stompjs | 7.3.0 | STOMP WebSocket client | CLAUDE.md: native WebSocket, no SockJS; 7.x is current |
| axios | 1.16.x | HTTP REST client | CLAUDE.md: interceptors for JWT injection |
| jwt-decode | 4.0.0 | Decode JWT sub claim | CONTEXT.md (Claude's Discretion): avoid /me call on mount |

### UI Layer

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 3.4.x | Utility CSS | shadcn/ui v3 requires Tailwind 3; UI-SPEC uses v3 syntax |
| postcss | 8.x | CSS processing | Required by Tailwind v3 |
| autoprefixer | 10.x | CSS vendor prefixing | Required by Tailwind v3 postcss pipeline |
| shadcn/ui CLI | @2.3.0 | Component scaffolding | Last version targeting Tailwind v3; `npx shadcn@2.3.0` |
| lucide-react | 0.x (installed by shadcn) | Icon library | Ships with shadcn; UI-SPEC §7 icons: Video, Phone, LogOut, Users, Loader2 |
| @types/node | 22.x | Node types for path.resolve | Required for vite.config.ts path alias |

### Testing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.x | Test runner | Vite-native; replaces Jest for Vite projects |
| @testing-library/react | 16.x | Component rendering tests | DOM-based component integration tests |
| @testing-library/jest-dom | 6.x | DOM matchers (toBeInTheDocument) | Custom assertions for rendered DOM |
| @testing-library/user-event | 14.x | Simulates user interactions | Type/click simulation in tests |
| jsdom | 25.x | DOM environment for vitest | `environment: 'jsdom'` in vite.config.ts test block |
| msw | 2.x | API mocking | Mock Axios calls without real backend in unit tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn@2.3.0 + Tailwind v3 | shadcn@latest + Tailwind v4 | v4 uses `@import "tailwindcss"` syntax; CSS variable block in UI-SPEC uses v3 format — switching requires rewriting the entire CSS variable override. Stick with v3. |
| react-router-dom v6 JSX routes | createBrowserRouter (data API) | Data router adds loaders/actions complexity unnecessary for 2-route Phase 3. JSX routes + ProtectedRoute wrapper is simpler and Phase 4 compatible. |
| jwt-decode | Fetch /api/users/me on mount | Extra network round-trip every page load; jwt-decode is a 4KB library that runs synchronously in the browser |
| Context + useReducer | Redux Toolkit | Redux adds boilerplate and bundle weight; CLAUDE.md explicitly excludes Redux/Zustand |
| Vitest + Testing Library | Jest + Testing Library | Vitest runs in the same Vite pipeline — no separate Babel config needed |

**Installation (sequence matters — see Architecture Patterns for exact order):**

```bash
# 1. Scaffold
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install

# 2. Runtime deps
npm install react-router-dom @stomp/stompjs axios jwt-decode

# 3. Tailwind v3 + postcss
npm install -D tailwindcss@^3.4 postcss autoprefixer @types/node
npx tailwindcss init -p

# 4. shadcn/ui (Tailwind v3 version)
npx shadcn@2.3.0 init

# 5. shadcn components (from UI-SPEC §7)
npx shadcn@2.3.0 add tabs input label button alert avatar skeleton

# 6. Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

**Version verification (confirmed via `npm view` on 2026-05-26):** [VERIFIED: npm registry]
- react@18.3.1, vite@5.4.21, react-router-dom@6.30.3, @stomp/stompjs@7.3.0, axios@1.16.1, jwt-decode@4.0.0
- tailwindcss@3.4.19, shadcn@2.3.0, vitest@4.1.7, @testing-library/react@16.3.2

---

## Package Legitimacy Audit

> slopcheck was run against PyPI (wrong registry — this is a Node.js project). All packages below were verified against the npm registry via `npm view` and official source repositories on GitHub. No slopcheck npm verdict is available; all packages marked [ASSUMED] for slopcheck column, but all are well-established with multi-year histories and official org repos.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| react | npm | ~14 yrs (2011) | github.com/facebook/react | [ASSUMED] | Approved — Facebook/Meta official |
| vite | npm | ~5 yrs | github.com/vitejs/vite | [ASSUMED] | Approved — vitejs org |
| react-router-dom | npm | ~9 yrs (2016) | github.com/remix-run/react-router | [ASSUMED] | Approved — Remix/Shopify |
| @stomp/stompjs | npm | ~8 yrs (2017) | github.com/stomp-js/stompjs | [ASSUMED] | Approved — stomp-js org |
| axios | npm | ~11 yrs (2014) | github.com/axios/axios | [ASSUMED] | Approved — axios org |
| jwt-decode | npm | ~12 yrs (2014) | github.com/auth0/jwt-decode | [ASSUMED] | Approved — Auth0 |
| tailwindcss | npm | ~8 yrs (2017) | github.com/tailwindlabs/tailwindcss | [ASSUMED] | Approved — Tailwind Labs |
| shadcn | npm | ~2 yrs (2024) | github.com/shadcn-ui/ui | [ASSUMED] | Approved — shadcn-ui org |
| lucide-react | npm | ~5 yrs (2020) | github.com/lucide-icons/lucide | [ASSUMED] | Approved — lucide-icons org |
| vitest | npm | ~4 yrs (2021) | github.com/vitest-dev/vitest | [ASSUMED] | Approved — vitest-dev org |
| @testing-library/react | npm | ~7 yrs (2019) | github.com/testing-library | [ASSUMED] | Approved — testing-library org |
| @testing-library/jest-dom | npm | ~7 yrs (2019) | github.com/testing-library | [ASSUMED] | Approved — testing-library org |
| msw | npm | ~8 yrs (2018) | github.com/mswjs/msw | [ASSUMED] | Approved — mswjs org |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Postinstall script check (npm view `<pkg>` scripts.postinstall):** [VERIFIED: npm registry]
No postinstall scripts found for any of the core packages listed above. The msw postinstall was checked and is not a network call.

*slopcheck ran against PyPI, not npm — npm registry existence was verified manually via `npm view` for all packages.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Tab
│
├── React App (src/main.tsx)
│   ├── AuthProvider (AuthContext)
│   │   └── stores { token, username } in state + localStorage['vdt_token']
│   │
│   ├── WebSocketProvider (WebSocketContext)
│   │   └── @stomp/stompjs Client
│   │       ├── brokerURL: ws://localhost:8080/ws
│   │       ├── connectHeaders: { Authorization: 'Bearer {token}' }
│   │       └── subscribes /topic/presence → onlineUsers[]
│   │
│   └── BrowserRouter
│       ├── / → redirect (token? → /users : /login)
│       ├── /login → AuthPage (Tabs: Login | Register)
│       └── /users → ProtectedRoute → UserListPage
│
├── Axios Instance (src/lib/api.ts)
│   ├── baseURL: http://localhost:8080
│   └── request interceptor: inject Authorization: Bearer {token} from localStorage
│
└── Vite Dev Server (localhost:5173)
    └── proxy: /api → http://localhost:8080
              /ws  → ws://localhost:8080 (ws: true)

                    │
                    ▼
Spring Boot Backend (localhost:8080)  [Phase 1-2 — already built]
    ├── POST /api/auth/register  → { token }
    ├── POST /api/auth/login     → { token }
    ├── POST /api/auth/logout    → 200
    ├── GET  /api/users/me       → { username, displayName, status }
    └── WebSocket /ws
        ├── JwtChannelInterceptor (validates Bearer token on CONNECT)
        └── /topic/presence broadcasts → { onlineUsers: string[] }
```

### Recommended Project Structure

```
frontend/
├── public/
├── src/
│   ├── contexts/
│   │   ├── AuthContext.tsx        # useReducer auth state, useAuth() hook
│   │   └── WebSocketContext.tsx   # STOMP client, useWebSocket() hook
│   ├── components/
│   │   ├── ui/                   # shadcn-generated components (auto-created by CLI)
│   │   └── ProtectedRoute.tsx    # ProtectedRoute wrapper
│   ├── pages/
│   │   ├── AuthPage.tsx          # Login/Register tabbed card
│   │   └── UserListPage.tsx      # Online user list
│   ├── lib/
│   │   ├── api.ts                # Axios instance + interceptor
│   │   └── utils.ts              # shadcn cn() utility (auto-created by shadcn init)
│   ├── main.tsx                  # App entry point, provider wrapping
│   ├── App.tsx                   # BrowserRouter + routes
│   └── index.css                 # Tailwind directives + CSS variable override
├── index.html                    # Loads Inter font via <link>
├── vite.config.ts                # Proxy + path alias + vitest config
├── tailwind.config.js            # Content paths + emerald accent extension
├── postcss.config.js             # Auto-generated by npx tailwindcss init -p
├── tsconfig.json                 # Path alias baseUrl + paths
├── tsconfig.app.json             # Same paths in compilerOptions
└── package.json
```

### Pattern 1: shadcn/ui + Tailwind v3 Scaffold Sequence

**What:** Exact setup order for Tailwind v3 with shadcn@2.3.0. Order matters — tailwind init must run before shadcn init.

**When to use:** Wave 0 project scaffold task.

```bash
# Source: https://ui.shadcn.com/docs/legacy + npm registry confirmation
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install

# Install Tailwind v3 with postcss pipeline
npm install -D tailwindcss@^3.4 postcss autoprefixer @types/node
npx tailwindcss init -p
# ^ generates tailwind.config.js AND postcss.config.js automatically
```

`tailwind.config.js` content paths (required or Tailwind produces no output):
```js
// Source: tailwindcss.com/docs/configuration [CITED: tailwindcss.com/docs/configuration]
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#10B981',   // emerald-500
          hover:   '#059669',   // emerald-600
          muted:   '#064E3B',   // emerald-900
        }
      }
    }
  },
  plugins: [],
}
```

`src/index.css` Tailwind directives (v3 syntax — NOT @import "tailwindcss"):
```css
/* Source: tailwindcss.com/docs/installation [CITED] */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark-only theme override — copied verbatim from UI-SPEC.md §4 */
:root,
.dark {
  --background:         222 84% 5%;
  --foreground:         210 40% 98%;
  --card:               222 47% 11%;
  --card-foreground:    210 40% 98%;
  --popover:            215 28% 17%;
  --popover-foreground: 210 40% 98%;
  --primary:            160 84% 39%;
  --primary-foreground: 0 0% 100%;
  --secondary:          215 28% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted:              217 33% 17%;
  --muted-foreground:   215 16% 57%;
  --accent:             160 84% 39%;
  --accent-foreground:  0 0% 100%;
  --destructive:        0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border:             215 20% 26%;
  --input:              215 20% 26%;
  --ring:               160 84% 39%;
  --radius: 0.5rem;
}

html, body, #root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  min-height: 100vh;
}
```

tsconfig path alias (required before shadcn init):
```json
// tsconfig.json and tsconfig.app.json — both need this
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`vite.config.ts` — path alias + proxy + vitest:
```typescript
// Source: vite.dev/config/server-options [CITED: vite.dev]
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

After Tailwind and tsconfig are configured, run shadcn init:
```bash
# Source: confirmed via npm view shadcn@2.3.0 [VERIFIED: npm registry]
npx shadcn@2.3.0 init
# Prompts:
# Style: Default
# Base color: Slate
# CSS variables: Yes
```

Then add the components from UI-SPEC §7:
```bash
npx shadcn@2.3.0 add tabs input label button alert avatar skeleton
```

### Pattern 2: AuthContext with useReducer

**What:** Global auth state via Context API + useReducer. Initializes from localStorage on mount.

**When to use:** This is the single pattern — no alternatives considered per CLAUDE.md.

```typescript
// Source: React docs — Context + useReducer pattern [ASSUMED pattern structure]
// src/contexts/AuthContext.tsx

interface AuthState {
  token: string | null;
  username: string | null;
}

type AuthAction =
  | { type: 'LOGIN'; token: string; username: string }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('vdt_token', action.token);
      return { token: action.token, username: action.username };
    case 'LOGOUT':
      localStorage.removeItem('vdt_token');
      return { token: null, username: null };
    default:
      return state;
  }
};

// Initialization reads from localStorage synchronously
const initState = (): AuthState => {
  const token = localStorage.getItem('vdt_token');
  if (token) {
    try {
      const { sub } = jwtDecode<{ sub: string }>(token);
      return { token, username: sub };
    } catch {
      localStorage.removeItem('vdt_token');
    }
  }
  return { token: null, username: null };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, undefined, initState);
  // ...provide state and dispatch via context
};
```

### Pattern 3: WebSocketContext with @stomp/stompjs 7.x

**What:** Global STOMP client that connects on login, subscribes to `/topic/presence`, and exposes `{ client, subscribe, publish }`.

**When to use:** WebSocketContext is created once. Components call `useWebSocket()` to publish signaling messages (Phase 4+).

```typescript
// Source: stomp-js.github.io/api-docs/latest/classes/Client.html [CITED]
// src/contexts/WebSocketContext.tsx
import { Client, IMessage } from '@stomp/stompjs';

const connect = (token: string) => {
  const stompClient = new Client({
    brokerURL: 'ws://localhost:8080/ws',  // native WebSocket — no SockJS
    connectHeaders: {
      Authorization: `Bearer ${token}`,  // matches JwtChannelInterceptor expectation
    },
    reconnectDelay: 5000,  // default — acceptable for LAN demo (D-09 discretion)
    onConnect: () => {
      // Subscribe to presence immediately after connect (D-11)
      stompClient.subscribe('/topic/presence', (frame: IMessage) => {
        const { onlineUsers } = JSON.parse(frame.body) as { onlineUsers: string[] };
        setOnlineUsers(onlineUsers);
      });
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    },
  });
  stompClient.activate();
  setClient(stompClient);
};

const disconnect = async () => {
  if (client) {
    await client.deactivate();
    setClient(null);
    setOnlineUsers([]);
  }
};
```

**Critical integration point:** The `Authorization: Bearer {token}` header goes in `connectHeaders`, NOT in the HTTP WebSocket upgrade request. Spring Boot's `JwtChannelInterceptor` reads from `accessor.getFirstNativeHeader("Authorization")` on the STOMP CONNECT frame — this is correct. [VERIFIED: reading backend source]

### Pattern 4: ProtectedRoute

**What:** Wrapper component that reads auth state from AuthContext and redirects to `/login` if unauthenticated.

```typescript
// Source: reactrouter.com/6.30.3 docs [CITED]
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
```

Usage in App.tsx:
```tsx
<Route path="/users" element={
  <ProtectedRoute><UserListPage /></ProtectedRoute>
} />
```

### Pattern 5: Axios Instance with Request Interceptor

**What:** Axios instance reads JWT from localStorage on every request (not from React state — avoids closure staleness).

```typescript
// src/lib/api.ts
// Source: Axios docs — interceptors [ASSUMED pattern; Axios API is stable]
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vdt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Why localStorage, not AuthContext state:** Axios interceptors are defined outside React's render cycle. Accessing a ref or closure over context state risks reading stale values after re-renders. Reading from localStorage is always synchronous and current. [ASSUMED - standard pattern, matches CONTEXT.md discretion decision]

### Pattern 6: jwt-decode v4 Usage

**Breaking change from v3 to v4:** The exported function was renamed from `jwt_decode` to `jwtDecode`. [CITED: github.com/auth0/jwt-decode]

```typescript
// Source: github.com/auth0/jwt-decode [CITED]
import { jwtDecode } from 'jwt-decode';  // named export in v4

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

const decoded = jwtDecode<JwtPayload>(token);
const username = decoded.sub;
// Wrap in try/catch — throws InvalidTokenError for malformed tokens
```

### Pattern 7: Vitest + Testing Library Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

vitest configuration goes inside `vite.config.ts` (not a separate file):
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
},
```

Also add to `tsconfig.app.json` compilerOptions:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

### Anti-Patterns to Avoid

- **@stompjs/stompjs (note: wrong scope):** The correct package is `@stomp/stompjs` (scope `stomp`, not `stompjs`). Typo in import or install will silently install a different (possibly malicious) package.
- **`sockjs-client` as a dependency:** CLAUDE.md and CONTEXT.md both forbid SockJS. The Spring backend uses native WebSocket only. Adding SockJS causes transport fallback confusion.
- **Using `shadcn@latest` with Tailwind v3:** `shadcn@latest` as of 2025 defaults to Tailwind v4 and generates `@import "tailwindcss"` in index.css and `@tailwindcss/vite` plugin. These are incompatible with the v3 CSS variable override in UI-SPEC. Use `shadcn@2.3.0` explicitly.
- **Subscribing to `/topic/presence` before STOMP CONNECT completes:** Subscriptions must be called inside the `onConnect` callback, not immediately after `activate()`. The client is not connected when `activate()` returns.
- **Not filtering self from user list:** The backend broadcasts ALL online users including the requester. The component must filter out `username === currentUsername` before rendering rows. (UI-SPEC §6: "The current logged-in user must NOT appear in their own user list.")
- **Using `import jwt_decode from 'jwt-decode'`:** v4 removed the default export. Use `import { jwtDecode } from 'jwt-decode'` (named import).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form components (Input, Label, Button) | Custom styled inputs | `shadcn/ui Input, Label, Button` | Radix primitives: accessible, keyboard-nav, aria — hundreds of edge cases handled |
| Tab UI (Login/Register toggle) | CSS tab hack with hidden divs | `shadcn/ui Tabs` | Radix Tabs handles keyboard navigation, ARIA roles, animations |
| Avatar initials | `<div>` with CSS letter | `shadcn/ui Avatar, AvatarFallback` | Handles image loading states, fallback gracefully |
| Skeleton loading | CSS pulse animation | `shadcn/ui Skeleton` | `animate-pulse` consistent with design system |
| JWT decoding | String split on `.` + atob() | `jwt-decode` library | Base64url != base64; padding edge cases; error handling |
| STOMP protocol framing | Raw WebSocket messages | `@stomp/stompjs` | STOMP framing, heartbeat, reconnect, subscription ID management — hundreds of edge cases |
| HTTP request auth injection | Wrap every Axios call | Axios request interceptor | Centralized, applied to all requests, avoids forgetting in new calls |
| Route protection | localStorage check in every page | `ProtectedRoute` component | Single source of truth; React Router handles redirects atomically |

**Key insight:** shadcn/ui is component scaffolding (copies code into your project), not a runtime dependency. Every component you add with `npx shadcn@2.3.0 add <component>` becomes a file in `src/components/ui/` that you own and can modify. This is why the version of the CLI at generation time matters — generated files reflect the CLI version.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 vs v3 Setup Confusion

**What goes wrong:** Running `npx shadcn@latest init` generates Tailwind v4 config (`@import "tailwindcss"` in index.css, `@tailwindcss/vite` plugin in vite.config). The v4 CSS variable format conflicts with the UI-SPEC §4 override block which uses v3 HSL format.

**Why it happens:** `shadcn@latest` = v4-first as of 2025. The v3 docs are at `v3.shadcn.com` and the CLI version is `2.3.0`.

**How to avoid:** Use `npx shadcn@2.3.0 init` explicitly. Never use `@latest` for shadcn in this project.

**Warning signs:** `vite.config.ts` imports `@tailwindcss/vite`; `index.css` starts with `@import "tailwindcss"` — both are v4 indicators.

### Pitfall 2: STOMP Subscription Before Connection Ready

**What goes wrong:** Calling `client.subscribe('/topic/presence', ...)` immediately after `client.activate()` throws "Client is not connected" or silently drops the subscription.

**Why it happens:** `activate()` is async; it initiates the connection but returns immediately. The STOMP CONNECT handshake happens asynchronously.

**How to avoid:** Always subscribe inside the `onConnect` callback:
```typescript
const client = new Client({
  onConnect: () => {
    client.subscribe('/topic/presence', handler); // CORRECT: inside onConnect
  }
});
client.activate(); // starts the connection process
// Do NOT call subscribe() here — connection is not ready yet
```

**Warning signs:** Subscriptions not receiving messages; no error thrown but no messages arrive.

### Pitfall 3: STOMP Authorization Header Placement

**What goes wrong:** Putting the JWT in the HTTP WebSocket upgrade request headers (e.g., via a custom header in the `brokerURL` query string) instead of the STOMP CONNECT frame.

**Why it happens:** Browsers do not allow custom HTTP headers on WebSocket upgrade requests from JavaScript. The backend `JwtChannelInterceptor` reads from the STOMP-level `Authorization` header, not from HTTP headers.

**How to avoid:** Use `connectHeaders: { Authorization: 'Bearer <token>' }` in the Client config. [VERIFIED: reading JwtChannelInterceptor.java — `accessor.getFirstNativeHeader("Authorization")`]

**Warning signs:** WebSocket connects (HTTP 101) but immediately receives an error frame from the broker; server logs show "Missing or invalid Authorization header".

### Pitfall 4: Self in Online User List

**What goes wrong:** The current user sees themselves in their own user list and can "Call" themselves.

**Why it happens:** `/topic/presence` broadcasts ALL online users including the authenticated user.

**How to avoid:** Filter on the client side: `onlineUsers.filter(u => u !== username)` before rendering. The `username` comes from the AuthContext (decoded from JWT sub at login time).

**Warning signs:** User row appears with own username; clicking Call has no peer to signal.

### Pitfall 5: Missing @types/node for Path Alias

**What goes wrong:** `vite.config.ts` fails with TS error `Cannot find module 'path' or its corresponding type declarations`.

**Why it happens:** `path.resolve()` is a Node.js built-in; TypeScript needs type definitions.

**How to avoid:** `npm install -D @types/node` before writing vite.config.ts with the `@` alias.

### Pitfall 6: Vite Proxy WebSocket Target Protocol

**What goes wrong:** WebSocket connection fails with connection refused or protocol mismatch.

**Why it happens:** Using `http://` instead of `ws://` as the proxy target for WebSocket paths.

**How to avoid:**
```typescript
// CORRECT
'/ws': { target: 'ws://localhost:8080', ws: true }
// WRONG
'/ws': { target: 'http://localhost:8080', ws: true }
```
[CITED: vite.dev/config/server-options]

### Pitfall 7: jwt-decode v4 Named Export Breaking Change

**What goes wrong:** `import jwt_decode from 'jwt-decode'` or `import jwtDecode from 'jwt-decode'` fails at runtime ("not a function" or undefined).

**Why it happens:** v4 removed the default export. Only named export `{ jwtDecode }` remains.

**How to avoid:** `import { jwtDecode } from 'jwt-decode'` (curly braces required).

### Pitfall 8: Loading State Race — Showing Empty List Before First Presence

**What goes wrong:** User list shows "No one else is online" immediately on page load, then flickers to show actual users.

**Why it happens:** The React component renders before the STOMP subscription receives the first `/topic/presence` message.

**How to avoid:** Maintain a separate `isLoading` boolean in WebSocketContext, initialized to `true`. Set to `false` when the first presence message is received OR after a 3-second timeout. While loading, render the 3 skeleton rows from UI-SPEC §6.

---

## Code Examples

### AuthPage: Tabbed Login/Register

```tsx
// Source: shadcn/ui Tabs docs + UI-SPEC §5 [CITED: ui.shadcn.com]
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Layout wrapper (UI-SPEC §5):
// <div className="min-h-screen flex items-center justify-center bg-slate-950">
//   <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-8">
//     <Tabs defaultValue="login">
//       <TabsList className="bg-slate-800 rounded-lg p-1 w-full grid grid-cols-2">
//         <TabsTrigger value="login">Login</TabsTrigger>
//         <TabsTrigger value="register">Register</TabsTrigger>
//       </TabsList>
//       <TabsContent value="login">...</TabsContent>
//       <TabsContent value="register">...</TabsContent>
//     </Tabs>
//   </div>
// </div>
```

### Submit Button Loading State (UI-SPEC §5)

```tsx
// Source: UI-SPEC.md §5 — Loading State [CITED: 03-UI-SPEC.md]
import { Loader2 } from 'lucide-react';

<Button
  type="submit"
  disabled={isLoading}
  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10"
>
  {isLoading ? (
    <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Signing in...</>
  ) : (
    'Sign In'
  )}
</Button>
```

### User Row (UI-SPEC §6)

```tsx
// Source: UI-SPEC.md §6 — User Row [CITED: 03-UI-SPEC.md]
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

<li className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/50 transition-colors duration-150">
  <Avatar className="h-10 w-10">
    <AvatarFallback className="bg-slate-700 text-slate-200 text-sm font-semibold">
      {username[0].toUpperCase()}
    </AvatarFallback>
  </Avatar>
  <span className="text-sm font-normal text-slate-50 truncate max-w-[160px]">{username}</span>
  <span className="flex-1" />
  <span className="text-xs font-normal text-emerald-400">● Online</span>
  <Button
    size="sm"
    className="bg-emerald-500 hover:bg-emerald-600 text-white"
    aria-label={`Call ${username}`}
  >
    <Phone className="size-4 mr-2" /> Call
  </Button>
</li>
```

### Presence Subscription

```typescript
// Source: stomp-js.github.io/api-docs/latest [CITED] + JwtChannelInterceptor.java [VERIFIED]
import { Client, IMessage } from '@stomp/stompjs';

const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  connectHeaders: {
    Authorization: `Bearer ${token}`,
  },
  reconnectDelay: 5000,
  onConnect: () => {
    setIsLoading(true);
    client.subscribe('/topic/presence', (frame: IMessage) => {
      const payload = JSON.parse(frame.body) as { onlineUsers: string[] };
      setOnlineUsers(payload.onlineUsers);
      setIsLoading(false);
    });
  },
});
client.activate();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App (CRA) | Vite 5.x | 2023 — CRA deprecated | Faster dev server, HMR, no ejecting needed |
| `jwt_decode` (default import) | `{ jwtDecode }` (named import) | jwt-decode v4 (2023) | Named import required — old code breaks |
| `shadcn@latest` for Tailwind v3 | `shadcn@2.3.0` | 2025 — shadcn@latest now Tailwind v4 | Must pin CLI version for v3 projects |
| `@stomp/stompjs` with SockJS fallback | Native WebSocket only | 2022+ — all browsers support native WS | SockJS is legacy; `withSockJS()` not needed |
| `react-scripts test` (Jest) | Vitest 4.x | 2022 — Vite ecosystem | Same config file; no Babel setup |

**Deprecated/outdated:**
- `sockjs-client`: Legacy transport fallback. All 2025 browsers support native WebSocket. CLAUDE.md explicitly excludes it.
- `react-scripts` / CRA: Officially deprecated by React team. Vite is the standard.
- `jwt_decode` default import: Removed in jwt-decode v4. Use named `jwtDecode`.
- `shadcn@latest init` for Tailwind v3 projects: Now generates v4 setup. Use `shadcn@2.3.0`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Axios interceptor reads from localStorage (not closure over state) to avoid staleness | Standard Stack, Pattern 5 | If wrong: stale token sent after logout; request fails with 401 |
| A2 | `shadcn@2.3.0` is the correct CLI version for Tailwind v3 (confirmed from shadcn.com/docs/legacy) | Standard Stack | If wrong: v4 CSS generated; index.css override incompatible with UI-SPEC |
| A3 | All npm packages confirmed via `npm view` — slopcheck ran on wrong ecosystem (PyPI) | Package Legitimacy Audit | If wrong: package identity risk; mitigated by source repo verification |
| A4 | `vitest` environment: jsdom required; globals: true allows describe/it/expect without import | Validation Architecture | If wrong: test setup fails; `globals: false` requires explicit vitest imports |

**If this table is empty:** Not empty — A1-A4 require verification at execution time.

---

## Open Questions

1. **Vite dev proxy vs direct backend CORS for the STOMP WebSocket upgrade**
   - What we know: Spring Security `corsConfigSource()` allows all origins (`allowedOriginPatterns(List.of("*"))`) and the WebSocket endpoint is `permitAll()` in the filter chain. [VERIFIED: reading SecurityConfig.java]
   - What's unclear: Whether the Vite proxy is strictly necessary for the `/ws` path, or whether the browser can connect directly to `ws://localhost:8080/ws` without proxy.
   - Recommendation: Use the Vite proxy for `/ws` anyway — it eliminates any CORS surprises and is the pattern in CONTEXT.md. In production, CORS is not a concern (same origin).

2. **shadcn init prompts for `components.json` — choosing "Default" style**
   - What we know: UI-SPEC §1 says prompt answer is "Default" style and "Slate" base color.
   - What's unclear: Whether `shadcn@2.3.0 init` prompts differ from current version.
   - Recommendation: Document expected prompt answers in the Wave 0 task. If prompts differ, accept defaults except for base color (must be Slate).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite + npm | Confirmed (npm commands ran successfully) | v24.14.0 | — |
| npm | Package management | Confirmed | (bundled with Node 24) | — |
| Java / Spring Boot backend | Axios REST + STOMP | Must be running separately | 8080 | Phase 3 can scaffold + mock; integration test requires running backend |
| PostgreSQL | Backend JWT issuance | Must be running for backend | 16 | Phase 3 frontend-only unit tests don't need DB |
| Python (for slopcheck) | Package audit | Confirmed | 3.14 | — |

**Missing dependencies with no fallback:** None blocking Phase 3 frontend scaffold.

**Missing dependencies with fallback:**
- Backend (Spring Boot + PostgreSQL): Required for integration testing of login/register flow. Unit tests using msw can mock the API. The planner should note that a running backend is required before Wave 3 (auth form integration tests).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `frontend/vite.config.ts` (`test:` block) |
| Quick run command | `cd frontend && npm run test -- --run` |
| Full suite command | `cd frontend && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Login form submits valid credentials → sets token → navigates to /users | Integration (component) | `npm run test -- AuthPage.test.tsx --run` | Wave 0 gap |
| UI-01 | Register form submits → success → navigates to /users | Integration (component) | `npm run test -- AuthPage.test.tsx --run` | Wave 0 gap |
| UI-01 | Invalid credentials (401) → shows error Alert | Unit | `npm run test -- AuthPage.test.tsx --run` | Wave 0 gap |
| UI-01 | Username taken (409) → shows "Username already taken" message | Unit | `npm run test -- AuthPage.test.tsx --run` | Wave 0 gap |
| UI-01 | Submit button shows spinner while loading | Unit | `npm run test -- AuthPage.test.tsx --run` | Wave 0 gap |
| UI-02 | UserListPage renders online users from presence payload | Unit | `npm run test -- UserListPage.test.tsx --run` | Wave 0 gap |
| UI-02 | UserListPage filters self from list | Unit | `npm run test -- UserListPage.test.tsx --run` | Wave 0 gap |
| UI-02 | UserListPage shows skeleton while loading | Unit | `npm run test -- UserListPage.test.tsx --run` | Wave 0 gap |
| UI-02 | UserListPage shows empty state when no other users | Unit | `npm run test -- UserListPage.test.tsx --run` | Wave 0 gap |
| SC-4 | Logout → clears token → navigates to /login → name gone from others' lists | E2E / manual | Manual: two browser tabs | Manual only |

### Sampling Rate

- **Per task commit:** `cd frontend && npm run test -- --run` (fail-fast mode)
- **Per wave merge:** `cd frontend && npm run test` (watch off, all tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/test/setup.ts` — vitest + testing-library cleanup
- [ ] `frontend/src/test/AuthPage.test.tsx` — UI-01 component tests
- [ ] `frontend/src/test/UserListPage.test.tsx` — UI-02 component tests
- [ ] `frontend/src/test/mocks/server.ts` — msw mock server for API calls
- [ ] `package.json` test script: `"test": "vitest"`

---

## Security Domain

> security_enforcement: enabled (config.json `security_enforcement: true`, `security_asvs_level: 1`)

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT from Spring Boot; frontend stores token in localStorage; no password handled beyond form submission |
| V3 Session Management | Yes | JWT expiry 24h; localStorage cleared on logout; no refresh token (v2 scope) |
| V4 Access Control | Yes | ProtectedRoute wrapper; backend validates JWT on every request |
| V5 Input Validation | Yes | Client-side: min-length checks per UI-SPEC §5. Server-side: Spring `@Valid` on DTOs (Phase 1) |
| V6 Cryptography | No | Frontend never generates or stores cryptographic material; JWT signature validation is server-side |

### Known Threat Patterns for React + JWT + WebSocket

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS access to localStorage token | Information Disclosure | LAN demo scope: risk accepted per CONTEXT.md D-05. Production: use httpOnly cookies. No eval(), no dangerouslySetInnerHTML. |
| STOMP subscription to other users' destinations | Elevation of Privilege | Backend controls subscription authorization; client only subscribes to `/topic/presence` (public) |
| CSRF on REST endpoints | Tampering | Spring Security CSRF disabled (stateless JWT — no cookies). CORS `allowedOriginPatterns("*")` acceptable for LAN dev. |
| JWT in URL/query params | Information Disclosure | Never put token in URL. Axios interceptor uses Authorization header only. |
| Stale token after logout | Spoofing | Logout clears localStorage + disconnects STOMP + backend marks OFFLINE. Token itself remains valid until expiry (no blacklist — D-07 accepted tradeoff). |
| Open redirect via `?redirect=` param | Spoofing | ProtectedRoute uses hardcoded `/login` redirect — no dynamic redirect target. |

---

## Sources

### Primary (HIGH confidence)

- `JwtChannelInterceptor.java` [VERIFIED: direct code reading] — confirms `Authorization` header placement in STOMP CONNECT frame, not HTTP upgrade
- `PresenceDTO.java` [VERIFIED: direct code reading] — confirms payload shape `{ onlineUsers: string[] }`
- `WebSocketConfig.java` [VERIFIED: direct code reading] — confirms `/ws` endpoint, no SockJS, `/topic` + `/queue` broker prefixes
- `SecurityConfig.java` [VERIFIED: direct code reading] — confirms CORS wildcard, JWT stateless, `/ws/**` permitAll
- `AuthResponse.java` [VERIFIED: direct code reading] — confirms response shape `{ token: string }` only
- stomp-js.github.io/api-docs/latest [CITED] — Client constructor, activate/deactivate, subscribe API
- vite.dev/config/server-options [CITED] — Proxy configuration with `ws: true`
- github.com/auth0/jwt-decode [CITED] — v4 breaking change: `jwtDecode` named export
- reactrouter.com v6 docs [CITED] — ProtectedRoute + Navigate pattern
- ui.shadcn.com/docs/legacy [CITED] — Tailwind v3 note, `v3.shadcn.com` redirect
- npm registry [VERIFIED: npm registry] — all package versions confirmed via `npm view`

### Secondary (MEDIUM confidence)

- WebSearch: shadcn@2.3.0 is the Tailwind v3-compatible CLI version — corroborated by multiple community guides and shadcn docs note
- WebSearch: Vitest jsdom environment setup with setupFiles — multiple 2024-2026 guides consistent
- WebSearch: Vite proxy `/api` + `/ws` syntax — confirmed by official Vite docs

### Tertiary (LOW confidence)

- Training knowledge: AuthContext + useReducer structure — standard React pattern, well-established

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry; packages confirmed via official org repos
- Architecture: HIGH — directly confirmed against Phase 1-2 backend source code; no speculation
- shadcn/Tailwind version constraint: HIGH — confirmed via shadcn docs legacy page; `shadcn@2.3.0` explicitly confirmed on npm
- Pitfalls: HIGH — most pitfalls verified by reading actual backend code (STOMP header, CORS); some from community patterns (jwt-decode v4 import)
- Testing setup: MEDIUM — Vitest + RTL configuration from community guides; standard pattern but not from official Vitest docs directly

**Research date:** 2026-05-26
**Valid until:** 2026-08-26 (90 days — stable ecosystem; main risk is shadcn CLI version drift)
