# Phase 4: 1-1 Call Core — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 7 (4 new, 3 modified)
**Analogs found:** 7 / 7

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `frontend/src/contexts/CallContext.tsx` | context/provider | event-driven + request-response | `frontend/src/contexts/WebSocketContext.tsx` | exact |
| `frontend/src/hooks/useRingtone.ts` | hook (side-effect) | event-driven | No hook exists — `WebSocketContext.tsx` `useEffect` cleanup pattern | partial |
| `frontend/src/components/IncomingCallModal.tsx` | component | request-response | `frontend/src/pages/UserListPage.tsx` (Avatar + Button usage) + `frontend/src/components/ProtectedRoute.tsx` (component structure) | role-match |
| `frontend/src/pages/CallPage.tsx` | page | request-response + streaming | `frontend/src/pages/UserListPage.tsx` (full page: header layout, section structure, `useCall` hook consumers) | role-match |
| `frontend/src/App.tsx` | router / shell | request-response | self (current `App.tsx`) | self-modify |
| `frontend/src/main.tsx` | entry / provider tree | — | self (current `main.tsx`) | self-modify |
| `frontend/src/pages/UserListPage.tsx` | page (modified) | request-response | self (current `UserListPage.tsx`) | self-modify |

---

## Pattern Assignments

### `frontend/src/contexts/CallContext.tsx` (context/provider, event-driven)

**Analog:** `frontend/src/contexts/WebSocketContext.tsx`

**Imports pattern** (WebSocketContext.tsx lines 1–3 — follow exactly):
```typescript
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { IMessage } from '@stomp/stompjs'
```

**Context + interface declaration pattern** (WebSocketContext.tsx lines 4–14):
```typescript
// Follow the same shape: declare interface, call createContext<Interface | null>(null)
interface CallContextValue {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  peerUsername: string | null
  toasts: Toast[]
  startCall: (targetUsername: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  hangUp: () => void
}

const CallContext = createContext<CallContextValue | null>(null)
```

**Provider function skeleton pattern** (WebSocketContext.tsx lines 16–72):
```typescript
// Pattern: named export function XxxProvider({ children }: { children: ReactNode })
// All state at top, all helper functions below, return <Context.Provider value={...}>
export function CallProvider({ children }: { children: ReactNode }) {
  // useState for exposed reactive values
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [peerUsername, setPeerUsername] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // useRef for mutable objects that must NOT trigger re-renders
  // (RTCPeerConnection, MediaStream, timers, ICE buffer, state mirrors)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerUsernameRef = useRef<string | null>(null)
  const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([])
  const remoteDescSetRef = useRef(false)
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { client, subscribe, publish } = useWebSocket()
  const { username } = useAuth()
  const navigate = useNavigate()
  // ...
  return (
    <CallContext.Provider value={{ localStream, remoteStream, callStatus, peerUsername, toasts, startCall, acceptCall, rejectCall, hangUp }}>
      {children}
    </CallContext.Provider>
  )
}
```

**STOMP subscription pattern** (WebSocketContext.tsx lines 29–41 — mirror for CallContext):
```typescript
// WebSocketContext subscribes inside onConnect. CallContext cannot access that callback —
// instead, watch client becoming connected in a useEffect (Pattern 3 from RESEARCH.md):
useEffect(() => {
  if (!client?.connected) return

  const sub = subscribe('/user/queue/signal', (frame: IMessage) => {
    try {
      const msg = JSON.parse(frame.body) as SignalMessage
      handleSignal(msg)   // reads refs only — no stale state closures
    } catch (err) {
      console.error('Signal parse error:', err)
    }
  })

  return () => {
    sub?.unsubscribe()
  }
}, [client])   // dependency is the Client object reference, not client?.connected
```

**publish helper usage pattern** (WebSocketContext.tsx lines 63–65):
```typescript
// WebSocketContext exposes: publish(destination: string, body: string) => void
// CallContext calls it as:
function publishSignal(msg: { type: string; to: string; payload: string }) {
  publish('/app/signal', JSON.stringify(msg))
}
```

**useXxx hook export pattern** (WebSocketContext.tsx lines 74–78 — copy exactly):
```typescript
export function useCall(): CallContextValue {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used inside CallProvider')
  return ctx
}
```

**Ref-state mirror pattern** (needed when signal handlers must read current state):
```typescript
// Mirror peerUsername state → ref so signal handler closures never go stale
// (WebSocketContext doesn't need this but AuthContext + this pattern is standard)
useEffect(() => {
  peerUsernameRef.current = peerUsername
}, [peerUsername])
```

---

### `frontend/src/hooks/useRingtone.ts` (hook, event-driven)

**Analog:** `frontend/src/contexts/WebSocketContext.tsx` — the `useEffect` with cleanup pattern

No existing hook files exist in the project (`frontend/src/hooks/` is empty). Use the `useEffect`-only hook pattern from RESEARCH.md Pattern 6. The sole structural reference is the `useEffect` + cleanup pattern visible across all contexts.

**Complete hook structure** (pattern from RESEARCH.md Pattern 6 + WebSocketContext cleanup pattern):
```typescript
import { useEffect } from 'react'

export function useRingtone() {
  useEffect(() => {
    let audioCtx: AudioContext | null = null
    let stopped = false
    let timeoutId: ReturnType<typeof setTimeout>

    function beep() {
      if (stopped || !audioCtx) return
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      const now = audioCtx.currentTime
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
      timeoutId = setTimeout(beep, 2000)   // 0.3s on + 1.7s off = 2s cycle
    }

    audioCtx = new AudioContext()
    audioCtx.resume().then(() => { beep() })

    // Cleanup: mirror WebSocketContext sub?.unsubscribe() pattern — always clean on unmount
    return () => {
      stopped = true
      clearTimeout(timeoutId)
      audioCtx?.close()
      audioCtx = null
    }
  }, [])   // empty deps — run once on mount, clean on unmount
}
```

**File location:** `frontend/src/hooks/useRingtone.ts` — place in `src/hooks/` (create directory).

---

### `frontend/src/components/IncomingCallModal.tsx` (component, request-response)

**Analog:** `frontend/src/pages/UserListPage.tsx` (Avatar + Button usage) and `frontend/src/components/ProtectedRoute.tsx` (component shape)

**Imports pattern** (UserListPage.tsx lines 1–8 — import subset):
```typescript
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useRingtone } from '@/hooks/useRingtone'
```

**Component export pattern** (ProtectedRoute.tsx lines 8–18 — named export, props interface):
```typescript
// Named export (NOT default export) — matches ProtectedRoute.tsx pattern
// ProtectedRoute has no props; IncomingCallModal also has no props (reads from context)
export function IncomingCallModal() {
  const { callStatus, peerUsername, acceptCall, rejectCall } = useCall()
  useRingtone()   // starts on mount, stops on unmount automatically

  if (callStatus !== 'ringing') return null   // mirror ProtectedRoute's early return pattern

  // ... JSX
}
```

**Avatar usage pattern** (UserListPage.tsx lines 34–37 — copy AvatarFallback style):
```typescript
<Avatar className="h-16 w-16">
  <AvatarFallback className="bg-slate-700 text-slate-200 text-xl font-semibold">
    {peerUsername?.[0]?.toUpperCase() ?? '?'}
  </AvatarFallback>
</Avatar>
```

**Button usage pattern** (UserListPage.tsx lines 42–50 — copy size/className style):
```typescript
// Reject button — mirrors ghost Button with destructive styling
<Button
  className="h-11 flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
  aria-label={`Reject call from ${peerUsername}`}
  onClick={rejectCall}
>
  <PhoneOff className="size-4 mr-2" />
  Reject
</Button>

// Accept button — mirrors emerald Call button from UserListPage
<Button
  className="h-11 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
  aria-label={`Accept call from ${peerUsername}`}
  onClick={acceptCall}
>
  <Phone className="size-4 mr-2" />
  Accept
</Button>
```

**Backdrop + card layout pattern** (UI-SPEC §5.1):
```typescript
// Outer: fixed overlay scrim — same z-index layer as shadcn Dialog
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
  {/* Inner: card — bg-slate-900 border-slate-700 matches UserListPage panel style */}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-caller-name"
    className="w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
  >
    {/* ... content */}
  </div>
</div>
```

---

### `frontend/src/pages/CallPage.tsx` (page, streaming)

**Analog:** `frontend/src/pages/UserListPage.tsx`

**Imports pattern** (UserListPage.tsx lines 1–8 — same @/ alias structure):
```typescript
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users, PhoneOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
```

**Default export page pattern** (UserListPage.tsx line 58):
```typescript
// Always default export for pages — matches UserListPage, AuthPage convention
export default function CallPage() {
  const { localStream, remoteStream, peerUsername, hangUp } = useCall()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  // ...
}
```

**Video srcObject wiring pattern** (RESEARCH.md Pitfall 3 — CRITICAL):
```typescript
// NEVER set srcObject as a JSX prop — it will be reset on every re-render.
// Always wire via useEffect watching the stream state:
useEffect(() => {
  if (localVideoRef.current) localVideoRef.current.srcObject = localStream
}, [localStream])

useEffect(() => {
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
}, [remoteStream])
```

**Teardown on unmount pattern** (addresses RESEARCH.md Pitfall 4):
```typescript
// Call hangUp() when user navigates away from /call without pressing the button
useEffect(() => {
  return () => {
    // Only teardown if still in a connected call (avoids double-teardown)
    // hangUp() is idempotent — safe to call on any callStatus
  }
}, [])
```

**Full-screen container pattern** (UI-SPEC §5.3 — matches `min-h-screen bg-slate-950` from UserListPage):
```typescript
// CallPage outer wrapper — full viewport, dark background
<div className="relative w-full h-screen bg-slate-950 overflow-hidden">

  {/* Remote video fills screen */}
  <video
    ref={remoteVideoRef}
    className="w-full h-full object-cover"
    autoPlay
    playsInline
    aria-label="Remote video stream"
  />

  {/* Remote video placeholder when null */}
  {!remoteStream && (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
      <Users className="size-16 text-slate-700 mb-4" />
      <p className="text-sm text-slate-500">Waiting for remote video...</p>
    </div>
  )}

  {/* Peer username overlay — top-left */}
  {peerUsername && (
    <div className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1">
      <span className="text-sm font-semibold text-slate-50">{peerUsername}</span>
    </div>
  )}

  {/* Local video PiP — bottom-right, above control bar */}
  <div className="absolute bottom-24 right-4 w-32 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
    <video
      ref={localVideoRef}
      className="w-full h-full object-cover scale-x-[-1]"
      autoPlay
      playsInline
      muted
      aria-label="Local video preview"
    />
  </div>

  {/* Control bar — bottom, hang-up only in Phase 4 */}
  <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
    <Button
      className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
      aria-label="End call"
      onClick={hangUp}
    >
      <PhoneOff className="size-5" />
    </Button>
  </div>

</div>
```

---

### `frontend/src/App.tsx` (modified — router shell)

**Analog:** self (`frontend/src/App.tsx`)

**Current file** (App.tsx lines 1–28 — full file, 28 lines):
```typescript
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
        <Route path="/login" element={<AuthPage />} />
        <Route path="/users" element={
          <ProtectedRoute><UserListPage /></ProtectedRoute>
        } />
        <Route path="/" element={
          <Navigate to={token ? '/users' : '/login'} replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

**Required changes — D-04, D-06, D-07:**
1. Remove `BrowserRouter` import and JSX (moved to `main.tsx`)
2. Add imports: `CallPage`, `IncomingCallModal`, `useCall`
3. Add `/call` route inside `<ProtectedRoute>`
4. Render `<IncomingCallModal />` and toast list OUTSIDE `<Routes>` so they overlay any route

**Modified App.tsx target shape:**
```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCall } from '@/contexts/CallContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { IncomingCallModal } from '@/components/IncomingCallModal'
import AuthPage from '@/pages/AuthPage'
import UserListPage from '@/pages/UserListPage'
import CallPage from '@/pages/CallPage'

export default function App() {
  const { token } = useAuth()
  const { toasts } = useCall()

  return (
    <>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/users" element={
          <ProtectedRoute><UserListPage /></ProtectedRoute>
        } />
        <Route path="/call" element={
          <ProtectedRoute><CallPage /></ProtectedRoute>
        } />
        <Route path="/" element={
          <Navigate to={token ? '/users' : '/login'} replace />
        } />
      </Routes>

      {/* Global overlays — rendered outside Routes so they appear on any page */}
      <IncomingCallModal />

      {/* Toast notification list — UI-SPEC §5.4 */}
      <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm font-normal shadow-lg animate-in fade-in slide-in-from-right-2 duration-200 ${t.style}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}
```

---

### `frontend/src/main.tsx` (modified — provider tree)

**Analog:** self (`frontend/src/main.tsx`)

**Current file** (main.tsx lines 1–16 — full file):
```typescript
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

**Required changes — D-04:**
- Add `BrowserRouter` import from `react-router-dom` (moved from App.tsx)
- Add `CallProvider` import from `@/contexts/CallContext`
- Wrap the whole tree in `<BrowserRouter>` (outermost, so `useNavigate` works in `CallProvider`)
- Insert `<CallProvider>` between `<WebSocketProvider>` and `<App />`

**Modified main.tsx target shape:**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { CallProvider } from '@/contexts/CallContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
```

**Provider order is locked by D-04.** `BrowserRouter` must be outermost so `CallProvider` can call `useNavigate()`. `AuthProvider` must wrap `WebSocketProvider` (auth token needed to connect). `CallProvider` must be inside `WebSocketProvider` (needs `publish`/`subscribe`).

---

### `frontend/src/pages/UserListPage.tsx` (modified — wire call button)

**Analog:** self (`frontend/src/pages/UserListPage.tsx`)

**Current UserRow** (UserListPage.tsx lines 28–53):
```typescript
function UserRow({ user }: { user: string }) {
  return (
    <li className="...">
      {/* ... avatar, name, badge */}
      <Button
        size="sm"
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
        aria-label={`Call ${user}`}
        onClick={() => { /* TODO Phase 4 — call initiation */ }}
      >
        <Phone className="size-4 mr-2" />
        {COPY.callButton}
      </Button>
    </li>
  )
}
```

**Required changes:**
1. `UserRow` needs access to `callStatus`, `peerUsername`, and `startCall` — pass as props or pull `useCall()` at page level and pass down
2. Call button: when `callStatus !== 'idle'`, disable all call buttons
3. When `callStatus === 'calling' && peerUsername === user`, show Loader2 spinner + "Calling..." text
4. Add `Loader2` to lucide imports

**Modified UserRow target shape:**
```typescript
// Add to COPY object:
const COPY = {
  // ... existing
  callingButton: 'Calling...',
} as const

// UserRow receives additional props
function UserRow({
  user,
  callStatus,
  peerUsername,
  onCall,
}: {
  user: string
  callStatus: string
  peerUsername: string | null
  onCall: (username: string) => void
}) {
  const isCallActive = callStatus !== 'idle'
  const isCallingThisUser = callStatus === 'calling' && peerUsername === user

  return (
    <li className="...">
      {/* ... avatar, name, badge unchanged */}
      {isCallingThisUser ? (
        <Button
          size="sm"
          disabled
          className="bg-slate-700 text-emerald-400 cursor-not-allowed h-8"
          aria-label={`Calling ${user}...`}
        >
          <Loader2 className="animate-spin size-4 mr-2" />
          {COPY.callingButton}
        </Button>
      ) : (
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:pointer-events-none"
          aria-label={`Call ${user}`}
          disabled={isCallActive}
          onClick={() => onCall(user)}
        >
          <Phone className="size-4 mr-2" />
          {COPY.callButton}
        </Button>
      )}
    </li>
  )
}
```

**UserListPage wiring** (adds useCall, passes props to UserRow):
```typescript
export default function UserListPage() {
  const { username, dispatch } = useAuth()
  const { onlineUsers, isLoading, disconnect } = useWebSocket()
  const { callStatus, peerUsername, startCall } = useCall()   // ADD
  const navigate = useNavigate()

  const otherUsers = onlineUsers.filter(u => u !== username)
  // ...

  // In the ul render:
  {otherUsers.map(user => (
    <UserRow
      key={user}
      user={user}
      callStatus={callStatus}
      peerUsername={peerUsername}
      onCall={startCall}
    />
  ))}
}
```

---

## Shared Patterns

### Context + Hook export pattern
**Source:** `frontend/src/contexts/WebSocketContext.tsx` lines 14 and 74–78
**Apply to:** `CallContext.tsx`
```typescript
// 1. createContext with null default — NEVER use undefined
const XxxContext = createContext<XxxContextValue | null>(null)

// 2. Hook with null guard — throws descriptive error if used outside provider
export function useXxx(): XxxContextValue {
  const ctx = useContext(XxxContext)
  if (!ctx) throw new Error('useXxx must be used inside XxxProvider')
  return ctx
}
```

### Path alias imports
**Source:** `frontend/src/pages/UserListPage.tsx` lines 2–8
**Apply to:** All new files
```typescript
// Always use @/ alias — never relative paths for src/ imports
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
```

### COPY object pattern (copywriting contract)
**Source:** `frontend/src/pages/UserListPage.tsx` lines 12–23
**Apply to:** `IncomingCallModal.tsx`, `CallPage.tsx`, modified `UserListPage.tsx`
```typescript
// Exact copy strings at top of file, referenced by name — never inline string literals in JSX
const COPY = {
  incomingCallLabel: 'Incoming Call',
  callerSubLabel: 'is calling you...',
  rejectButton: 'Reject',
  acceptButton: 'Accept',
} as const
```

### Avatar fallback pattern
**Source:** `frontend/src/pages/UserListPage.tsx` lines 34–37
**Apply to:** `IncomingCallModal.tsx`
```typescript
<Avatar className="h-16 w-16">
  <AvatarFallback className="bg-slate-700 text-slate-200 text-xl font-semibold">
    {username[0].toUpperCase()}
  </AvatarFallback>
</Avatar>
```

### useEffect cleanup pattern
**Source:** `frontend/src/contexts/WebSocketContext.tsx` lines 59–61 (subscribe returns object with unsubscribe)
**Apply to:** `CallContext.tsx` STOMP subscription effect, `useRingtone.ts`
```typescript
useEffect(() => {
  // setup
  return () => {
    // ALWAYS clean up: unsubscribe, close, stop, clearTimeout
  }
}, [dependency])
```

### Mock context pattern for tests
**Source:** `frontend/src/test/UserListPage.test.tsx` lines 32–51
**Apply to:** `CallContext.test.tsx`, `IncomingCallModal.test.tsx`, `CallPage.test.tsx`
```typescript
// Mock the entire context module — return mutable mock values
vi.mock('@/contexts/CallContext', () => ({
  useCall: () => ({
    callStatus: mockCallStatus,
    peerUsername: mockPeerUsername,
    localStream: null,
    remoteStream: null,
    toasts: [],
    startCall: mockStartCall,
    acceptCall: mockAcceptCall,
    rejectCall: mockRejectCall,
    hangUp: mockHangUp,
  }),
}))
```

### RTCPeerConnection global mock for Vitest/jsdom
**Source:** `frontend/src/test/setup.ts` (no existing mock — new pattern required)
**Apply to:** `frontend/src/test/CallContext.test.tsx`
```typescript
// jsdom does not implement RTCPeerConnection — stub globally before tests
vi.stubGlobal('RTCPeerConnection', class MockRTCPeerConnection {
  onicecandidate: ((e: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((e: RTCTrackEvent) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  iceConnectionState = 'new'
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' })
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' })
  setLocalDescription = vi.fn().mockResolvedValue(undefined)
  setRemoteDescription = vi.fn().mockResolvedValue(undefined)
  addIceCandidate = vi.fn().mockResolvedValue(undefined)
  addTrack = vi.fn()
  close = vi.fn()
})
```

---

## No Analog Found

All 7 files have analogs identified. No files are analog-less.

However, `useRingtone.ts` has no hook analog in the codebase (the `hooks/` directory is empty). It follows a `useEffect`-only hook structure derived from:
- The `useEffect` cleanup pattern in `WebSocketContext.tsx`
- The complete implementation specified in RESEARCH.md Pattern 6

The planner should treat RESEARCH.md Pattern 6 as the implementation template for `useRingtone.ts` rather than a codebase analog.

---

## Metadata

**Analog search scope:** `frontend/src/contexts/`, `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/test/`, `backend/src/main/java/com/vdt/websocket/dto/`
**Files read:** 12
**Pattern extraction date:** 2026-05-27
