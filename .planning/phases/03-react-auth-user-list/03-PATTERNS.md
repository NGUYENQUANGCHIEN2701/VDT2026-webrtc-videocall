# Phase 3: React Auth + User List — Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14 (all backend analogs — no frontend exists yet; backend patterns mapped to frontend equivalents)

---

## Note on Analog Source

This is the first frontend phase. No React files exist in the codebase. All analogs are drawn from the backend (Spring Boot Java), mapped to their TypeScript/React equivalents. Where the backend has no structural equivalent, patterns come from RESEARCH.md documented sources (marked `[RESEARCH]`). Every mapping notes the conceptual parallel explicitly.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `frontend/vite.config.ts` | config | — | `backend/src/main/resources/application.properties` (app config) | structural-analog |
| `frontend/tailwind.config.js` | config | — | `backend/src/main/resources/application.properties` | structural-analog |
| `frontend/src/index.css` | config | — | No backend analog | [RESEARCH] |
| `frontend/src/main.tsx` | provider/entry | — | `backend/.../VdtApplication.java` (app bootstrap) | structural-analog |
| `frontend/src/App.tsx` | router/config | request-response | `backend/.../SecurityConfig.java` (route authorization rules) | structural-analog |
| `frontend/src/contexts/AuthContext.tsx` | provider + service | request-response | `backend/.../AuthService.java` + `JwtAuthenticationFilter.java` | role-match |
| `frontend/src/contexts/WebSocketContext.tsx` | provider + service | event-driven | `backend/.../JwtChannelInterceptor.java` + `PresenceService.java` | role-match |
| `frontend/src/lib/api.ts` | utility/middleware | request-response | `backend/.../JwtAuthenticationFilter.java` (JWT injection per-request) | role-match |
| `frontend/src/components/ProtectedRoute.tsx` | middleware/component | request-response | `backend/.../SecurityConfig.java` lines 43-46 (route guards) | role-match |
| `frontend/src/pages/AuthPage.tsx` | component/page | request-response | `backend/.../AuthController.java` (auth endpoint handler) | structural-analog |
| `frontend/src/pages/UserListPage.tsx` | component/page | event-driven | `backend/.../UserController.java` + `PresenceService.java` | structural-analog |
| `frontend/src/test/setup.ts` | config/test | — | No backend analog | [RESEARCH] |
| `frontend/src/test/AuthPage.test.tsx` | test | request-response | No backend analog | [RESEARCH] |
| `frontend/src/test/UserListPage.test.tsx` | test | event-driven | No backend analog | [RESEARCH] |

---

## Pattern Assignments

### `frontend/vite.config.ts` (config)

**Analog:** `backend/src/main/resources/application.properties` (structural: both are app-level configuration entry points)
**Backend insight:** The backend config externalizes base URLs and JWT secrets via `@Value`; the frontend equivalent externalizes the backend base URL via the Vite proxy and the `@` path alias via `resolve.alias`.

**Full file pattern** (from RESEARCH.md Pattern 1, lines 371-403):
```typescript
// frontend/vite.config.ts
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
        target: 'ws://localhost:8080',   // MUST be ws://, not http://
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

**Critical:** `@types/node` must be installed before writing this file or `path.resolve` causes a TypeScript error (RESEARCH.md Pitfall 5).

---

### `frontend/tailwind.config.js` (config)

**Analog:** RESEARCH.md Pattern 1 — Tailwind v3 scaffold sequence.
**Backend insight:** No direct analog. Treat like a Spring Boot `@Configuration` class — it registers extension points (color aliases) without owning logic.

**Full file pattern** (from RESEARCH.md Pattern 1):
```js
// frontend/tailwind.config.js
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
          muted:   '#064E3B',   // emerald-900 (ghost backgrounds)
        }
      }
    }
  },
  plugins: [],
}
```

**Warning:** This file must exist before running `npx shadcn@2.3.0 init`. Tailwind v3 syntax (`tailwind.config.js` + `@tailwind` directives) — NOT v4 (`@tailwindcss/vite` + `@import "tailwindcss"`).

---

### `frontend/src/index.css` (config — CSS variable override)

**Analog:** None in backend. Pattern from UI-SPEC.md §4 — locked CSS variable block.

**Full file pattern** (from UI-SPEC.md §4 and RESEARCH.md Pattern 1):
```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark-only override for VDT-WebRTC — copied verbatim from UI-SPEC.md §4 */
:root,
.dark {
  --background:         222 84% 5%;     /* slate-950 */
  --foreground:         210 40% 98%;    /* slate-50 */
  --card:               222 47% 11%;    /* slate-900 */
  --card-foreground:    210 40% 98%;
  --popover:            215 28% 17%;    /* slate-800 */
  --popover-foreground: 210 40% 98%;
  --primary:            160 84% 39%;    /* emerald-500 */
  --primary-foreground: 0 0% 100%;
  --secondary:          215 28% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted:              217 33% 17%;
  --muted-foreground:   215 16% 57%;    /* slate-400 */
  --accent:             160 84% 39%;    /* emerald-500 */
  --accent-foreground:  0 0% 100%;
  --destructive:        0 72% 51%;      /* red-600 */
  --destructive-foreground: 0 0% 100%;
  --border:             215 20% 26%;    /* slate-700 */
  --input:              215 20% 26%;
  --ring:               160 84% 39%;    /* emerald-500 — focus ring */
  --radius: 0.5rem;
}

html, body, #root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  min-height: 100vh;
}
```

**Critical:** The `@tailwind base/components/utilities` directives are Tailwind v3 syntax. Do NOT write `@import "tailwindcss"` (that is v4).

---

### `frontend/src/main.tsx` (provider/entry — app bootstrap)

**Analog:** `backend/src/main/java/com/vdt/VdtApplication.java` (conceptual: both are the single entry point that assembles all providers and starts the app)
**Backend pattern:** `VdtApplication.java` calls `SpringApplication.run()` which bootstraps the IoC container (all beans/providers). The frontend equivalent wraps the React tree with all Context providers before mounting.

**Full file pattern** (from RESEARCH.md Architecture §System Architecture Diagram):
```tsx
// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from '@/contexts/AuthContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)
```

**Provider order:** `AuthProvider` wraps `WebSocketProvider` because `WebSocketContext` reads from `AuthContext` (token) to trigger STOMP connect.

---

### `frontend/src/App.tsx` (router/config — route authorization rules)

**Analog:** `backend/src/main/java/com/vdt/common/SecurityConfig.java`
**Backend pattern (lines 43-46):** Route authorization matrix — which paths require authentication and which are public.

```java
// SecurityConfig.java lines 43-46 — the route auth matrix this file mirrors:
.requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
.requestMatchers("/ws/**").permitAll()
.anyRequest().authenticated()
```

**Frontend equivalent** — three routes, one ProtectedRoute guard:
```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AuthPage from '@/pages/AuthPage'
import UserListPage from '@/pages/UserListPage'

export default function App() {
  const { token } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — mirror SecurityConfig permitAll() paths */}
        <Route path="/login" element={<AuthPage />} />

        {/* Protected routes — mirror SecurityConfig anyRequest().authenticated() */}
        <Route path="/users" element={
          <ProtectedRoute><UserListPage /></ProtectedRoute>
        } />

        {/* Root redirect — token-aware, mirrors SecurityConfig entry point behavior */}
        <Route path="/" element={
          <Navigate to={token ? '/users' : '/login'} replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

---

### `frontend/src/contexts/AuthContext.tsx` (provider + service — auth state management)

**Analogs:**
- `backend/src/main/java/com/vdt/auth/AuthService.java` — owns login/register/logout business logic
- `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` — validates JWT on every request (AuthContext does this on mount via localStorage)

**Auth service pattern from AuthService.java (lines 25-61):**
The backend's `register()` calls `userRepository.save()` then `jwtService.generateToken()`. The frontend dispatches `LOGIN` after a successful Axios call. The backend's `logout()` sets `status = OFFLINE`; the frontend clears localStorage and resets state.

**JWT filter pattern from JwtAuthenticationFilter.java (lines 31-48):**
```java
// Backend: extract token from header, validate, set SecurityContext
String authHeader = request.getHeader("Authorization");
if (authHeader == null || !authHeader.startsWith("Bearer ")) { ... return; }
String token = authHeader.substring(7);
String username = jwtService.extractUsername(token);
```
Frontend equivalent: read from `localStorage.getItem('vdt_token')` on mount, decode `sub` claim via `jwtDecode`.

**Full AuthContext pattern** (from RESEARCH.md Pattern 2):
```tsx
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'   // named import — v4 breaking change

interface AuthState {
  token: string | null
  username: string | null
}

type AuthAction =
  | { type: 'LOGIN'; token: string; username: string }
  | { type: 'LOGOUT' }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('vdt_token', action.token)
      return { token: action.token, username: action.username }
    case 'LOGOUT':
      localStorage.removeItem('vdt_token')
      return { token: null, username: null }
    default:
      return state
  }
}

// Mirrors JwtAuthenticationFilter — read token from storage on initialization
const initState = (): AuthState => {
  const token = localStorage.getItem('vdt_token')
  if (token) {
    try {
      const { sub } = jwtDecode<{ sub: string }>(token)
      return { token, username: sub }
    } catch {
      localStorage.removeItem('vdt_token')
    }
  }
  return { token: null, username: null }
}

interface AuthContextValue extends AuthState {
  dispatch: React.Dispatch<AuthAction>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initState)

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

**Key token storage:** `localStorage` key `'vdt_token'` — matches CONTEXT.md D-05.

---

### `frontend/src/contexts/WebSocketContext.tsx` (provider + service — STOMP connection lifecycle)

**Analogs:**
- `backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java` — validates `Authorization: Bearer {token}` from STOMP CONNECT frame headers (lines 41-44)
- `backend/src/main/java/com/vdt/websocket/PresenceService.java` — owns the in-memory online user list; `getOnlineUsers()` returns distinct sorted list

**Critical integration point from JwtChannelInterceptor.java (lines 41-44):**
```java
// Backend reads Authorization from STOMP CONNECT native headers — NOT HTTP headers
String authHeader = accessor.getFirstNativeHeader("Authorization");
if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    throw new IllegalArgumentException("Missing or invalid Authorization header");
}
```
This confirms: `connectHeaders: { Authorization: 'Bearer ${token}' }` in the STOMP Client config is the correct placement.

**PresenceService insight:** `getOnlineUsers()` returns all users alphabetically — frontend receives this same list in `{ onlineUsers: string[] }` and must filter out `currentUsername` before rendering.

**Full WebSocketContext pattern** (from RESEARCH.md Pattern 3):
```tsx
// frontend/src/contexts/WebSocketContext.tsx
import { createContext, useContext, useState, useRef, ReactNode } from 'react'
import { Client, IMessage, StompSubscription } from '@stomp/stompjs'

interface WebSocketContextValue {
  client: Client | null
  onlineUsers: string[]
  isLoading: boolean
  connect: (token: string) => void
  disconnect: () => Promise<void>
  subscribe: (destination: string, callback: (msg: IMessage) => void) => StompSubscription | undefined
  publish: (destination: string, body: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const connect = (token: string) => {
    // Mirror JwtChannelInterceptor expectation: token in connectHeaders (not HTTP headers)
    const stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws',       // native WebSocket — no SockJS
      connectHeaders: {
        Authorization: `Bearer ${token}`,         // STOMP CONNECT frame header
      },
      reconnectDelay: 5000,                       // default — adequate for LAN demo
      onConnect: () => {
        setIsLoading(true)
        // Subscribe inside onConnect — NEVER before activate() returns (RESEARCH Pitfall 2)
        stompClient.subscribe('/topic/presence', (frame: IMessage) => {
          const { onlineUsers } = JSON.parse(frame.body) as { onlineUsers: string[] }
          setOnlineUsers(onlineUsers)
          setIsLoading(false)
        })
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'])
        setIsLoading(false)
      },
    })
    stompClient.activate()
    setClient(stompClient)
  }

  const disconnect = async () => {
    if (client) {
      await client.deactivate()
      setClient(null)
      setOnlineUsers([])
    }
  }

  const subscribe = (destination: string, callback: (msg: IMessage) => void) => {
    return client?.subscribe(destination, callback)
  }

  const publish = (destination: string, body: string) => {
    client?.publish({ destination, body })
  }

  return (
    <WebSocketContext.Provider value={{ client, onlineUsers, isLoading, connect, disconnect, subscribe, publish }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider')
  return ctx
}
```

---

### `frontend/src/lib/api.ts` (utility — Axios instance with JWT interceptor)

**Analog:** `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java`
**Backend pattern (lines 30-36):** Every inbound HTTP request is intercepted; if `Authorization: Bearer {token}` header exists it is extracted and validated. The frontend equivalent intercepts every *outbound* Axios request and *injects* the JWT.

```java
// Backend JwtAuthenticationFilter — intercept and extract JWT from every request (lines 30-36)
String authHeader = request.getHeader("Authorization");
if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    filterChain.doFilter(request, response);
    return;
}
String token = authHeader.substring(7);
```

**Frontend equivalent** (from RESEARCH.md Pattern 5):
```typescript
// frontend/src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
})

// Mirrors JwtAuthenticationFilter — inject Authorization header on every outbound request
// Reads from localStorage (NOT from AuthContext state) to avoid closure staleness
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vdt_token')   // key 'vdt_token' — CONTEXT.md D-05
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

**Why localStorage not context state:** Axios interceptors are defined outside the React render cycle. A closure over context state reads a stale snapshot after re-renders. localStorage is always synchronous and current (CONTEXT.md Claude's Discretion).

---

### `frontend/src/components/ProtectedRoute.tsx` (middleware/component — route guard)

**Analog:** `backend/src/main/java/com/vdt/common/SecurityConfig.java` lines 43-46
**Backend pattern:** `anyRequest().authenticated()` — the security filter chain checks authentication before allowing access to protected routes. The frontend equivalent checks `token` from AuthContext before rendering the protected page.

```java
// SecurityConfig.java lines 43-46 — route protection matrix this component mirrors:
.requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
.anyRequest().authenticated()   // ← this line becomes ProtectedRoute
```

**Full component pattern** (from RESEARCH.md Pattern 4):
```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token } = useAuth()

  if (!token) {
    // Mirrors SecurityConfig 401 response — redirects to login with replace
    // replace: true prevents back-button returning to protected route
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

---

### `frontend/src/pages/AuthPage.tsx` (component/page — login/register UI + auth calls)

**Analog:** `backend/src/main/java/com/vdt/auth/AuthController.java`
**Backend pattern (lines 23-39):** Three endpoints: `register()` → 201 + token, `login()` → 200 + token, `logout()` → 200. Each validates input (`@Valid`) and delegates to `AuthService`. Error cases surface as exceptions caught by `GlobalExceptionHandler`.

```java
// AuthController.java lines 23-39 — the operations this page performs:
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
}
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
}
```

**Error response shapes from GlobalExceptionHandler.java (lines 14-41):**
- 400 VALIDATION_ERROR → field + message
- 409 USERNAME_TAKEN → "Username already taken"
- 401 INVALID_CREDENTIALS → "Username or password is incorrect"
- 500 INTERNAL_ERROR → "An unexpected error occurred"

**Core page pattern** (from RESEARCH.md Code Examples + UI-SPEC.md §5):
```tsx
// frontend/src/pages/AuthPage.tsx — skeleton showing structure
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import api from '@/lib/api'
import { jwtDecode } from 'jwt-decode'  // named import — v4 requirement

export default function AuthPage() {
  const { dispatch } = useAuth()
  const { connect } = useWebSocket()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login submit — mirrors AuthController.login()
  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ token: string }>('/api/auth/login', { username, password })
      const { sub } = jwtDecode<{ sub: string }>(data.token)
      dispatch({ type: 'LOGIN', token: data.token, username: sub })
      connect(data.token)      // D-09: connect STOMP on login success
      navigate('/users', { replace: true })
    } catch (err: any) {
      // Map backend error shapes (GlobalExceptionHandler) to inline messages
      const status = err.response?.status
      if (status === 401) setError('Invalid username or password')
      else if (status >= 500) setError('Something went wrong. Please try again.')
      else setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Layout (UI-SPEC §5):
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-8">
        {/* Logo area — UI-SPEC §5 */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Video className="size-8 text-emerald-400" />
          <span className="text-xl font-semibold text-slate-50">VDT-WebRTC</span>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabbed card (UI-SPEC §5) */}
        <Tabs defaultValue="login">
          <TabsList className="bg-slate-800 rounded-lg p-1 w-full grid grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            {/* Login form — see UI-SPEC §5 for all field specs */}
          </TabsContent>
          <TabsContent value="register">
            {/* Register form */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
```

**Submit button loading state** (from RESEARCH.md Code Examples):
```tsx
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

---

### `frontend/src/pages/UserListPage.tsx` (component/page — online user list driven by STOMP)

**Analogs:**
- `backend/src/main/java/com/vdt/user/UserController.java` — serves the current user data
- `backend/src/main/java/com/vdt/websocket/PresenceService.java` — `getOnlineUsers()` returns the list that `/topic/presence` broadcasts

**UserController pattern (lines 21-30):** Authentication via `Authentication` principal injected by Spring Security. Frontend analog: read `username` from `useAuth()` hook.

```java
// UserController.java lines 21-30 — get current user (frontend reads from context instead)
@GetMapping("/me")
public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
    String username = authentication.getName();  // ← frontend: useAuth().username
    // ...
}
```

**PresenceService insight (lines 56-63):** `getOnlineUsers()` returns sorted, distinct list. Frontend receives this exact list in `onlineUsers` from `useWebSocket()` — must filter `currentUsername` before render.

**Full page pattern** (from RESEARCH.md Code Examples + UI-SPEC.md §6):
```tsx
// frontend/src/pages/UserListPage.tsx
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Video, Phone, LogOut, Users } from 'lucide-react'
import api from '@/lib/api'
import { useNavigate } from 'react-router-dom'

export default function UserListPage() {
  const { username, dispatch } = useAuth()
  const { onlineUsers, isLoading, disconnect } = useWebSocket()
  const navigate = useNavigate()

  // Filter self from list — RESEARCH Pitfall 4 / UI-SPEC §6
  const otherUsers = onlineUsers.filter(u => u !== username)

  const handleLogout = async () => {
    await api.post('/api/auth/logout')   // matches AuthController.logout()
    await disconnect()                   // D-12: deactivate STOMP
    dispatch({ type: 'LOGOUT' })         // D-07: clear localStorage + state
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header — UI-SPEC §6 */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 h-14">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-2">
            <Video className="size-5 text-emerald-400" />
            <span className="text-base font-semibold text-slate-50">VDT-WebRTC</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content — UI-SPEC §6 */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <section aria-label="Online users"
          className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-50">Online Users</h2>
            <span className="text-xs font-normal text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">
              {otherUsers.length} online
            </span>
          </div>

          {/* Loading state — 3 skeleton rows (UI-SPEC §6) */}
          {isLoading && (
            <div role="status" aria-label="Loading online users...">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex-1" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state (UI-SPEC §6) */}
          {!isLoading && otherUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-slate-600 mb-4" />
              <p className="text-base font-semibold text-slate-400">No one else is online</p>
              <p className="text-sm text-slate-500">Share the app link with a friend to start a call.</p>
            </div>
          )}

          {/* User rows (UI-SPEC §6) */}
          {!isLoading && otherUsers.length > 0 && (
            <ul className="divide-y divide-slate-700/50">
              {otherUsers.map(user => (
                <li key={user}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/50 transition-colors duration-150">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-700 text-slate-200 text-sm font-semibold">
                      {user[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-normal text-slate-50 truncate max-w-[160px]">{user}</span>
                  <span className="flex-1" />
                  <span className="text-xs font-normal text-emerald-400">● Online</span>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    aria-label={`Call ${user}`}
                    onClick={() => { /* Phase 4 — call initiation */ }}
                  >
                    <Phone className="size-4 mr-2" /> Call
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
```

---

### `frontend/src/test/setup.ts` (test config)

**Analog:** None in backend (Spring Boot uses `@SpringBootTest` annotations, not a setup file). Pattern from RESEARCH.md Pattern 7.

**Full file pattern:**
```typescript
// frontend/src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()   // unmount components between tests — prevents DOM state leakage
})
```

Also required in `tsconfig.app.json`:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

---

### `frontend/src/test/AuthPage.test.tsx` (test — UI-01 coverage)

**Analog:** No direct backend test analog. Backend uses `@SpringBootTest` + MockMvc; frontend uses Vitest + RTL + msw.

**Test structure pattern** (from RESEARCH.md §Validation Architecture):
```tsx
// frontend/src/test/AuthPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from '@/pages/AuthPage'

// Required: wrap with MemoryRouter + mock AuthContext + mock WebSocketContext
// Tests must cover (RESEARCH.md §Validation Architecture):
// - Login form submits valid credentials → dispatches LOGIN → navigates to /users
// - Register form submits → success → navigates to /users
// - Invalid credentials (401) → shows Alert with 'Invalid username or password'
// - Username taken (409) → shows 'Username already taken. Please choose another.'
// - Submit button shows Loader2 spinner while loading (disabled={isLoading})

describe('AuthPage', () => {
  it('shows spinner on submit and navigates to /users on login success', async () => {
    // msw intercepts POST /api/auth/login → { token: 'test.jwt.token' }
    // expect: button disabled + 'Signing in...' text during call
    // expect: navigate('/users') after success
  })

  it('shows error Alert on 401 invalid credentials', async () => {
    // msw intercepts POST /api/auth/login → 401
    // expect: Alert with 'Invalid username or password'
  })
})
```

---

### `frontend/src/test/UserListPage.test.tsx` (test — UI-02 coverage)

**Analog:** No direct backend test analog.

**Test structure pattern** (from RESEARCH.md §Validation Architecture):
```tsx
// frontend/src/test/UserListPage.test.tsx
// Tests must cover:
// - Renders online users from mocked WebSocketContext.onlineUsers
// - Filters self (currentUsername) from rendered list
// - Shows 3 skeleton rows when isLoading=true
// - Shows empty state when onlineUsers = [] after loading

describe('UserListPage', () => {
  it('filters current user from online list', () => {
    // Mock WebSocketContext: onlineUsers=['alice','bob'], isLoading=false
    // Mock AuthContext: username='alice'
    // Expect: 'bob' visible, 'alice' NOT in document
  })

  it('shows skeleton rows while loading', () => {
    // Mock WebSocketContext: isLoading=true
    // Expect: role='status' + aria-label='Loading online users...'
  })
})
```

---

## Shared Patterns

### JWT Token Storage Key
**Source:** CONTEXT.md D-05
**Apply to:** `AuthContext.tsx`, `api.ts`, `AuthPage.tsx` (any file reading/writing JWT)
```typescript
const TOKEN_KEY = 'vdt_token'
localStorage.getItem(TOKEN_KEY)
localStorage.setItem(TOKEN_KEY, token)
localStorage.removeItem(TOKEN_KEY)
```

### Authorization Header Format
**Source:** `backend/src/main/java/com/vdt/auth/JwtAuthenticationFilter.java` lines 30-32
**Verified by:** `backend/src/main/java/com/vdt/websocket/JwtChannelInterceptor.java` lines 41-44
**Apply to:** `api.ts` (Axios interceptor), `WebSocketContext.tsx` (STOMP connectHeaders)
```
Authorization: Bearer {token}
```
Both the REST filter and the STOMP interceptor check for `"Bearer "` prefix (7 characters) and substring from index 7. The header name and value format must match exactly.

### Backend Error HTTP Status → Frontend Message Map
**Source:** `backend/src/main/java/com/vdt/common/GlobalExceptionHandler.java` lines 14-41
**Apply to:** `AuthPage.tsx` (all catch blocks)
```
400 VALIDATION_ERROR  → field-level inline error (e.g., "Username must be at least 3 characters")
401 INVALID_CREDENTIALS → Alert: "Invalid username or password"
409 USERNAME_TAKEN    → Alert: "Username already taken. Please choose another."
5xx / network error  → Alert: "Something went wrong. Please try again."
```

### Self-Filter on User List
**Source:** `PresenceService.java` — `getOnlineUsers()` returns ALL online users including caller
**Apply to:** `UserListPage.tsx`
```typescript
// Backend broadcasts all users; frontend must filter self:
const otherUsers = onlineUsers.filter(u => u !== username)
```

### Path Alias Import Convention
**Source:** RESEARCH.md Pattern 1 (tsconfig + vite.config `@` alias)
**Apply to:** All `frontend/src/**/*.tsx` files
```typescript
// Use @/ prefix for project-local imports — never relative ../../ paths
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
```

### shadcn Component Import Pattern
**Source:** RESEARCH.md "Don't Hand-Roll" table + UI-SPEC §7
**Apply to:** `AuthPage.tsx`, `UserListPage.tsx`, `ProtectedRoute.tsx`
```typescript
// All shadcn components import from @/components/ui/ (generated by CLI into the project)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
// Do NOT import directly from radix-ui primitives
```

### STOMP Subscribe Must Be Inside onConnect
**Source:** RESEARCH.md Pitfall 2
**Apply to:** `WebSocketContext.tsx`
```typescript
// CORRECT — subscribe inside onConnect callback
const client = new Client({
  onConnect: () => {
    client.subscribe('/topic/presence', handler)  // connection is ready here
  }
})
client.activate()
// WRONG — do NOT subscribe() immediately after activate()
```

---

## No Analog Found

All files have analogs (backend structural analogs or RESEARCH.md documented patterns). The following files have no backend structural equivalent and rely entirely on RESEARCH.md patterns:

| File | Role | Data Flow | Pattern Source |
|------|------|-----------|----------------|
| `frontend/src/index.css` | config | — | UI-SPEC.md §4 CSS variable block (verbatim copy) |
| `frontend/src/test/setup.ts` | test config | — | RESEARCH.md Pattern 7 |
| `frontend/src/test/AuthPage.test.tsx` | test | request-response | RESEARCH.md §Validation Architecture |
| `frontend/src/test/UserListPage.test.tsx` | test | event-driven | RESEARCH.md §Validation Architecture |

---

## Metadata

**Analog search scope:** `D:/VDT-WebRTC/backend/src/main/java/com/vdt/` (all Java source files)
**Files scanned:** 16 backend files read
**Pattern extraction date:** 2026-05-26
**Note:** No frontend files existed prior to this phase. Backend patterns were mapped structurally (role + data flow equivalence) rather than syntactically. Each mapping includes the conceptual parallel so the planner understands the correspondence.
