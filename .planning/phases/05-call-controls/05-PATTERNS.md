# Phase 5: Call Controls — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/contexts/CallContext.tsx` | context/provider | event-driven | self (extend existing) | exact — extend in place |
| `frontend/src/pages/CallPage.tsx` | component/page | request-response | self (extend existing) | exact — extend in place |
| `frontend/src/hooks/useCallTimer.ts` | hook/utility | event-driven | `frontend/src/hooks/useRingtone.ts` | role-match — same useEffect+cleanup pattern |
| `frontend/src/test/setup.ts` | test-setup | — | self (extend existing) | exact — add mock methods |
| `frontend/src/test/CallContext.test.tsx` | test | — | self (extend existing) | exact — follow established test structure |
| `frontend/src/test/CallPage.test.tsx` | test | — | self (extend existing) | exact — follow established test structure |

---

## Pattern Assignments

### `frontend/src/contexts/CallContext.tsx` (context, event-driven) — EXTEND

**Analog:** self (read in full above, 474 lines)

#### Imports pattern (lines 1-13) — no new imports needed
```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { IMessage } from '@stomp/stompjs'
```

#### Interface extension pattern — add 5 new fields after existing `hangUp` (lines 26-36)
Copy the existing `CallContextValue` block and add to the end:
```typescript
export interface CallContextValue {
  // ...all existing fields unchanged...
  isMuted: boolean
  isCameraOff: boolean
  iceState: RTCIceConnectionState | null
  toggleMute: () => void
  toggleCamera: () => void
}
```

#### New useState declarations — insert after line 78 (existing `toasts` state)
Follow the exact existing `useState` declaration style (one declaration per line, type annotations inline):
```typescript
const [isMuted, setIsMuted] = useState(false)
const [isCameraOff, setIsCameraOff] = useState(false)
const [iceState, setIceState] = useState<RTCIceConnectionState | null>(null)
```

#### toggleMute / toggleCamera — useCallback pattern (copy from existing `addToast` / `publishSignal` at lines 99-115)
```typescript
const toggleMute = useCallback(() => {
  setIsMuted((prev) => {
    const nextMuted = !prev
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) audioTrack.enabled = !nextMuted
    return nextMuted
  })
}, [])

const toggleCamera = useCallback(() => {
  const videoTracks = localStreamRef.current?.getVideoTracks()
  if (!videoTracks || videoTracks.length === 0) return   // audio-only guard (D-12)
  setIsCameraOff((prev) => {
    const nextOff = !prev
    videoTracks[0].enabled = !nextOff
    return nextOff
  })
}, [])
```

Key: functional updater form `setState(prev => ...)` is already used in `iceCandidateBufferRef` and `setToasts` — copy that exact pattern. `localStreamRef.current` is a ref, always current, no closure issue.

#### oniceconnectionstatechange extension — inside `createPeerConnection()` (lines 190-212)
Add ONE line `setIceState(state)` as the first statement in the handler, before the existing `if/else if` chain:
```typescript
pc.oniceconnectionstatechange = () => {
  const state = pc.iceConnectionState
  setIceState(state)                            // NEW — Phase 5 line 1
  if (state === 'disconnected') {
    teardownTimerRef.current = setTimeout(teardown, 2000)
  } else if (state === 'failed') {
    // ...existing code unchanged...
    teardown()
    addToast('Connection lost', 'bg-slate-800 border border-red-600/40 text-red-400')
  } else if (state === 'connected' || state === 'completed') {
    // ...existing code unchanged...
    setCallStatus('connected')
  }
}
```

#### teardown() extension — inside existing `teardown` callback (lines 137-166)
Add 3 reset calls at the end of step 5 (React state resets), after `setCallStatus('idle')` on line 165:
```typescript
// Step 5. Update React state (existing lines)
setLocalStream(null)
setRemoteStream(null)
setPeerUsername(null)
setCallStatus('idle')
// NEW — Phase 5 resets (prevents second call inheriting first call's toggle state)
setIsMuted(false)
setIsCameraOff(false)
setIceState(null)
```

#### Provider value — add 5 new fields to the return value object (lines 448-463)
```typescript
<CallContext.Provider
  value={{
    // ...existing fields...
    isMuted,
    isCameraOff,
    iceState,
    toggleMute,
    toggleCamera,
  }}
>
```

---

### `frontend/src/pages/CallPage.tsx` (component, request-response) — EXTEND

**Analog:** self (read in full above, 100 lines)

#### Import extensions (lines 7-11)
Add 4 new icon imports and destructure new context values. Current imports:
```typescript
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users, PhoneOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
```

Extended to:
```typescript
import { useEffect, useRef } from 'react'      // no change; useCallTimer may add useState if inline
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
// Optional if hook is extracted:
// import { useCallTimer } from '@/hooks/useCallTimer'
```

If timer is kept inline, also add `useState` to the React import.

#### COPY object extension (lines 16-19)
Copy the existing `COPY` constant pattern and add new strings:
```typescript
const COPY = {
  placeholderText: 'Waiting for remote video...',
  endCallLabel: 'End call',
  // Phase 5 additions:
  muteMicLabel: 'Mute microphone',
  unmuteMicLabel: 'Unmute microphone',
  cameraOffLabel: 'Turn off camera',
  cameraOnLabel: 'Turn on camera',
  cameraUnavailableLabel: 'Camera unavailable',
} as const
```

#### ICE_STATUS map — add as a module-level constant before `CallPage` function
This follows the existing `COPY` and `ICE_CONFIG` constant pattern (module-level, `as const`):
```typescript
const ICE_STATUS: Record<string, { label: string; colorClass: string; pulse: boolean }> = {
  new:          { label: '● Connecting...',   colorClass: 'text-amber-400',   pulse: false },
  checking:     { label: '● Connecting...',   colorClass: 'text-amber-400',   pulse: false },
  connected:    { label: '● Connected',       colorClass: 'text-emerald-400', pulse: false },
  completed:    { label: '● Connected',       colorClass: 'text-emerald-400', pulse: false },
  disconnected: { label: '● Reconnecting...', colorClass: 'text-amber-400',   pulse: true  },
  failed:       { label: '● Failed',          colorClass: 'text-red-400',     pulse: false },
  closed:       { label: '● Failed',          colorClass: 'text-red-400',     pulse: false },
}
```

#### useCall() destructure extension (line 25)
Current:
```typescript
const { localStream, remoteStream, peerUsername, callStatus, hangUp } = useCall()
```
Extended:
```typescript
const { localStream, remoteStream, peerUsername, callStatus, hangUp,
        isMuted, isCameraOff, iceState, toggleMute, toggleCamera } = useCall()
```

#### hasVideoTracks derived value — add after the useCall() destructure
```typescript
const hasVideoTracks = (localStream?.getVideoTracks().length ?? 0) > 0
const statusInfo = iceState ? (ICE_STATUS[iceState] ?? ICE_STATUS.new) : ICE_STATUS.new
```

#### Timer (inline pattern) — follows existing `useEffect` watcher pattern (lines 42-46)
Copy the existing `useEffect(() => { if (callStatus === 'idle') navigate(...) }, [callStatus, navigate])` pattern:
```typescript
const [seconds, setSeconds] = useState(0)

useEffect(() => {
  if (callStatus !== 'connected') {
    setSeconds(0)
    return
  }
  const id = setInterval(() => setSeconds((s) => s + 1), 1000)
  return () => clearInterval(id)    // Pitfall 4: always return cleanup
}, [callStatus])

const timerDisplay =
  String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
  String(seconds % 60).padStart(2, '0')
```

If extracted to `useCallTimer`, replace the above block with `const timerDisplay = useCallTimer(callStatus)`.

#### Timer + status overlay JSX — add inside the top-level `div`, after the peer name overlay block (after line 73)
Copy the existing peer name overlay `absolute` positioning pattern (lines 69-73) as the template:
```tsx
{/* Timer + Status — top-center, pointer-events-none (UI-SPEC §5.3, §5.4) */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
  {/* Timer pill */}
  <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1">
    <span className="text-sm font-semibold text-slate-50 tabular-nums">{timerDisplay}</span>
  </div>
  {/* Status pill */}
  <div
    className={`bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1 ${statusInfo.pulse ? 'animate-pulse' : ''}`}
    role="status"
    aria-live="polite"
  >
    <span className={`text-xs font-normal ${statusInfo.colorClass}`}>{statusInfo.label}</span>
  </div>
</div>
```

#### Control bar extension (lines 88-96) — replace the single-button bar
Current control bar:
```tsx
<div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
  <Button className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white" aria-label={COPY.endCallLabel} onClick={hangUp}>
    <PhoneOff className="size-5" />
  </Button>
</div>
```

Replace with 3-button bar — End Call button unchanged, Mic and Camera buttons added around it:
```tsx
<div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
  {/* Mic toggle */}
  <Button
    className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
      isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
    }`}
    aria-label={isMuted ? COPY.unmuteMicLabel : COPY.muteMicLabel}
    aria-pressed={isMuted}
    onClick={toggleMute}
  >
    {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
  </Button>

  {/* End Call — unchanged from Phase 4 */}
  <Button
    className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
    aria-label={COPY.endCallLabel}
    onClick={hangUp}
  >
    <PhoneOff className="size-5" />
  </Button>

  {/* Camera toggle */}
  <Button
    className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${
      !hasVideoTracks
        ? 'bg-slate-700 opacity-50 cursor-not-allowed'
        : isCameraOff
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-slate-700 hover:bg-slate-600'
    }`}
    aria-label={!hasVideoTracks ? COPY.cameraUnavailableLabel : isCameraOff ? COPY.cameraOnLabel : COPY.cameraOffLabel}
    aria-pressed={isCameraOff}
    aria-disabled={!hasVideoTracks}
    disabled={!hasVideoTracks}
    onClick={toggleCamera}
  >
    {isCameraOff || !hasVideoTracks ? <VideoOff className="size-4" /> : <Video className="size-4" />}
  </Button>
</div>
```

---

### `frontend/src/hooks/useCallTimer.ts` (hook, event-driven) — NEW (optional)

**Analog:** `frontend/src/hooks/useRingtone.ts`

The project has exactly one custom hook. `useRingtone.ts` establishes the project hook pattern:

#### Hook file structure pattern (from `useRingtone.ts` lines 1-52)
```typescript
// Header comment block: hook name, purpose, mount/unmount behavior
import { useEffect } from 'react'   // or { useState, useEffect }

export function useHookName(/* params */) {
  // state declarations first
  // useEffect with cleanup
  // return value
}
```

#### useCallTimer — copy `useRingtone.ts` structure precisely
```typescript
// ──────────────────────────────────────────────────────────────────
// useCallTimer — call duration counter (D-05, D-06, D-07)
// Returns MM:SS formatted string.
// Starts when callStatus === 'connected', resets on any other status.
// setInterval cleared on cleanup — prevents StrictMode double-mount bug (Pitfall 4).
// ──────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import type { CallStatus } from '@/contexts/CallContext'

export function useCallTimer(callStatus: CallStatus): string {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (callStatus !== 'connected') {
      setSeconds(0)
      return
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [callStatus])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
```

Key points from `useRingtone.ts` to copy:
- Header comment block with purpose + mount/unmount description (lines 1-8)
- Named export (not default) — `export function useHookName`
- Single `useEffect` with explicit return cleanup (lines 10-51)
- Empty or minimal dependency array, documented why (line 51 comment)

---

### `frontend/src/test/setup.ts` (test-setup) — EXTEND

**Analog:** self (read in full above, 87 lines)

#### mockMediaStream extension (lines 72-75)
Current shape:
```typescript
const mockTrack = { stop: vi.fn() }
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockTrack]),
}
```

Extended shape — replace in place, following the existing `vi.fn().mockReturnValue(...)` pattern used throughout:
```typescript
const mockAudioTrack = { stop: vi.fn(), enabled: true }
const mockVideoTrack = { stop: vi.fn(), enabled: true }
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
}
```

This preserves the existing `getTracks` contract (Phase 4 teardown calls `getTracks().forEach(t => t.stop())`) and adds the two new methods needed by Phase 5 toggle functions. `mockAudioTrack` replaces `mockTrack` so `stop()` still works.

Export `mockAudioTrack` and `mockVideoTrack` at the top scope so test files can read `.enabled` after toggle calls — or use `vi.fn()` and spy on `Object.defineProperty`. Simplest approach: just declare at module scope and tests can access them via the module-level binding.

---

### `frontend/src/test/CallContext.test.tsx` (test) — EXTEND

**Analog:** self (read in full above, 515 lines)

#### Test file structure — copy exactly
All new `it(...)` blocks follow the same pattern as the existing tests:
1. Comment header: `// ──── CTRL-NN: description ────`
2. `renderHook(() => useCall(), { wrapper })`
3. Set up state via `simulateSignal(...)` or `act(async () => { ... })`
4. Assert with `expect(result.current.X).toBe(...)` or `waitFor(...)`

#### MockRTCPeerConnection iceConnectionState mutation pattern
The research identifies a gap (Pitfall 6 in RESEARCH.md): `MockRTCPeerConnection.iceConnectionState` is a plain class field declared `= 'new'`. Tests that need to simulate ICE state changes must mutate the field on `lastInstance` before firing the handler:
```typescript
// Pattern: get lastInstance, mutate iceConnectionState, fire handler
const MockPC = globalThis.RTCPeerConnection as unknown as {
  lastInstance?: MockRTCPeerConnectionType
}
// ... set up call state first ...
MockPC.lastInstance!.iceConnectionState = 'connected'        // mutate field
act(() => { MockPC.lastInstance!.oniceconnectionstatechange?.() })   // fire handler

await waitFor(() => {
  expect(result.current.iceState).toBe('connected')
})
```

This exact `MockPC.lastInstance` access pattern is already used at line 413 in the existing `CallContext.test.tsx` for ICE candidate buffering.

#### New tests to add (CTRL-01, CTRL-02, CTRL-03 teardown, CTRL-05 iceState)

**CTRL-01 toggleMute test structure** (copy `CALL-08: hangUp` structure at lines 201-231):
```typescript
it('CTRL-01: toggleMute sets isMuted=true and disables audioTrack.enabled', async () => {
  const { result } = renderHook(() => useCall(), { wrapper })
  await act(async () => { await result.current.startCall('bob') })

  // Initial state
  expect(result.current.isMuted).toBe(false)

  act(() => { result.current.toggleMute() })

  await waitFor(() => {
    expect(result.current.isMuted).toBe(true)
  })
  // Verify track was muted (mockAudioTrack.enabled should be false)
  // Access via setup.ts module-level binding
})
```

**CTRL-03 teardown reset test structure** (copy toast test structure at lines 468-488 but assert state resets):
```typescript
it('CTRL-03: teardown() resets isMuted, isCameraOff, iceState to initial values', async () => {
  const { result } = renderHook(() => useCall(), { wrapper })
  // ... set isMuted/isCameraOff via toggles, set iceState via ICE handler ...
  act(() => { result.current.hangUp() })  // triggers teardown
  await waitFor(() => {
    expect(result.current.isMuted).toBe(false)
    expect(result.current.isCameraOff).toBe(false)
    expect(result.current.iceState).toBeNull()
  })
})
```

---

### `frontend/src/test/CallPage.test.tsx` (test) — EXTEND

**Analog:** self (read in full above, 119 lines)

#### Mock extension — add new fields to `vi.mock('@/contexts/CallContext', ...)`
Current mock (lines 15-27) returns a fixed object from `useCall()`. Phase 5 adds mutable fields following the existing `let mockHangUp = vi.fn()` / `let mockLocalStream: MediaStream | null = null` pattern:

```typescript
// New mutable mock fields at the top of the file
const mockToggleMute = vi.fn()
const mockToggleCamera = vi.fn()
let mockIsMuted = false
let mockIsCameraOff = false
let mockIceState: RTCIceConnectionState | null = null
let mockCallStatus: string = 'connected'

vi.mock('@/contexts/CallContext', () => ({
  useCall: () => ({
    callStatus: mockCallStatus,
    peerUsername: mockPeerUsername,
    localStream: mockLocalStream,
    remoteStream: mockRemoteStream,
    toasts: [],
    isMuted: mockIsMuted,
    isCameraOff: mockIsCameraOff,
    iceState: mockIceState,
    startCall: vi.fn().mockResolvedValue(undefined),
    acceptCall: vi.fn().mockResolvedValue(undefined),
    rejectCall: vi.fn(),
    hangUp: mockHangUp,
    toggleMute: mockToggleMute,
    toggleCamera: mockToggleCamera,
  }),
}))
```

#### beforeEach() extension (lines 42-47)
Add resets for the new fields:
```typescript
beforeEach(() => {
  mockHangUp.mockClear()
  mockToggleMute.mockClear()
  mockToggleCamera.mockClear()
  mockLocalStream = null
  mockRemoteStream = null
  mockPeerUsername = 'bob'
  mockIsMuted = false
  mockIsCameraOff = false
  mockIceState = null
  mockCallStatus = 'connected'
})
```

#### New component tests — copy `UI-03: clicking hang-up button` pattern (lines 71-83)
```typescript
// CTRL-01: mic button renders correctly in active state
it('CTRL-01: mic button renders Mic icon and aria-label="Mute microphone" when not muted', () => {
  mockIsMuted = false
  renderCallPage()
  const micButton = screen.getByRole('button', { name: 'Mute microphone' })
  expect(micButton).toBeInTheDocument()
})

// CTRL-01: mic button renders correctly in muted state
it('CTRL-01: mic button renders MicOff icon and aria-label="Unmute microphone" when muted', () => {
  mockIsMuted = true
  renderCallPage()
  const micButton = screen.getByRole('button', { name: 'Unmute microphone' })
  expect(micButton).toBeInTheDocument()
})

// CTRL-01: clicking mic button calls toggleMute
it('CTRL-01: clicking mic button calls toggleMute()', () => {
  renderCallPage()
  fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }))
  expect(mockToggleMute).toHaveBeenCalledTimes(1)
})

// CTRL-04: timer shows 00:00 before connected
it('CTRL-04: timer displays 00:00 when callStatus is not connected', () => {
  mockCallStatus = 'calling'
  renderCallPage()
  expect(screen.getByText('00:00')).toBeInTheDocument()
})

// CTRL-05: status overlay shows Connecting... when iceState is null
it('CTRL-05: status overlay shows "● Connecting..." when iceState is null', () => {
  mockIceState = null
  renderCallPage()
  expect(screen.getByRole('status')).toHaveTextContent('● Connecting...')
})

// CTRL-05: status overlay shows Connected when iceState is connected
it('CTRL-05: status overlay shows "● Connected" when iceState is connected', () => {
  mockIceState = 'connected'
  renderCallPage()
  expect(screen.getByRole('status')).toHaveTextContent('● Connected')
})
```

---

## Shared Patterns

### useCallback with functional updater (stale-closure prevention)
**Source:** `frontend/src/contexts/CallContext.tsx` lines 99-105 (`addToast`) and lines 110-115 (`publishSignal`)
**Apply to:** `toggleMute` and `toggleCamera` in `CallContext.tsx`
```typescript
const toggleMute = useCallback(() => {
  setIsMuted((prev) => {        // functional updater — never reads stale isMuted
    const next = !prev
    if (localStreamRef.current?.getAudioTracks()[0]) {
      localStreamRef.current.getAudioTracks()[0].enabled = !next
    }
    return next
  })
}, [])
```

### Ref pattern for stale closure prevention
**Source:** `frontend/src/contexts/CallContext.tsx` lines 80-88 (`pcRef`, `localStreamRef`, `peerUsernameRef`)
**Apply to:** `toggleMute` and `toggleCamera` — use `localStreamRef.current` (a ref, always current) instead of `localStream` state inside callbacks
```typescript
// localStreamRef.current is always up-to-date inside any callback
// Never use localStream (state) inside a useCallback — stale closure risk
const audioTrack = localStreamRef.current?.getAudioTracks()[0]
```

### useEffect + cleanup pattern
**Source:** `frontend/src/hooks/useRingtone.ts` lines 10-51; `frontend/src/pages/CallPage.tsx` lines 33-46
**Apply to:** `useCallTimer` hook or inline timer logic in `CallPage`
```typescript
useEffect(() => {
  if (condition_not_met) { reset(); return }
  const id = setInterval(/* ... */, 1000)
  return () => clearInterval(id)    // REQUIRED — prevents StrictMode double-interval
}, [dependency])
```

### Test: mutable mock pattern
**Source:** `frontend/src/test/CallPage.test.tsx` lines 9-13 and `CallContext.test.tsx` lines 10-13
**Apply to:** all new test variables in `CallPage.test.tsx` extension
```typescript
// Declare at module scope as `let` (mutable between tests)
let mockX: Type = initialValue
// Assign new values per-test before calling renderCallPage()
// Reset in beforeEach() — prevents test pollution
```

### Test: renderHook + act + waitFor pattern
**Source:** `frontend/src/test/CallContext.test.tsx` lines 100-116 (CALL-01 test)
**Apply to:** all new `CallContext.test.tsx` unit tests for toggle and iceState
```typescript
const { result } = renderHook(() => useCall(), { wrapper })
await act(async () => { /* trigger state change */ })
await waitFor(() => { expect(result.current.X).toBe(Y) })
```

### Module-level constant map pattern
**Source:** `frontend/src/contexts/CallContext.tsx` lines 52-54 (`ICE_CONFIG`) and `frontend/src/pages/CallPage.tsx` lines 16-19 (`COPY`)
**Apply to:** `ICE_STATUS` map in `CallPage.tsx`
```typescript
// Module-level, typed Record, declared before component function
const MAP_NAME: Record<string, Shape> = { key: { ...values } }
```

---

## No Analog Found

All 6 files have strong analogs in the codebase. No files require falling back to RESEARCH.md patterns only.

---

## Metadata

**Analog search scope:** `frontend/src/contexts/`, `frontend/src/pages/`, `frontend/src/hooks/`, `frontend/src/test/`
**Files scanned:** 7 (CallContext.tsx, CallPage.tsx, useRingtone.ts, setup.ts, CallContext.test.tsx, CallPage.test.tsx, plus UI-SPEC)
**Pattern extraction date:** 2026-05-27
