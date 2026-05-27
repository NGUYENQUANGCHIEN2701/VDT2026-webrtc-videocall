import { createContext, useContext, useState, type ReactNode } from 'react'

// ──────────────────────────────────────────────────────────────────
// Types (D-02, D-03) — exported so downstream plans can import
// ──────────────────────────────────────────────────────────────────
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

export type Toast = {
  id: string
  message: string
  style: string
}

export interface CallContextValue {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callStatus: CallStatus
  peerUsername: string | null
  toasts: Toast[]
  startCall: (targetUsername: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  hangUp: () => void
}

// ──────────────────────────────────────────────────────────────────
// Context — null default per project pattern (never use undefined)
// ──────────────────────────────────────────────────────────────────
const CallContext = createContext<CallContextValue | null>(null)

// ──────────────────────────────────────────────────────────────────
// Provider — stub implementation (Plan 02 owns the real WebRTC logic)
// D-04: CallProvider is innermost in the provider tree, inside
// WebSocketProvider and AuthProvider so it can call useWebSocket()
// and useAuth(). It also calls useNavigate() (works because
// BrowserRouter is outermost per D-04).
//
// Plan 02 will:
//   - Add imports: useEffect, useRef, useNavigate, useWebSocket, useAuth, IMessage
//   - Replace useState constants with useState + setters
//   - Add useRef declarations for pcRef, localStreamRef, peerUsernameRef,
//     iceCandidateBufferRef, remoteDescSetRef, teardownTimerRef, callTimeoutRef
//   - Implement startCall, acceptCall, rejectCall, hangUp with real WebRTC logic
//   - Add STOMP signal subscription in a useEffect watching client connectivity
// ──────────────────────────────────────────────────────────────────
export function CallProvider({ children }: { children: ReactNode }) {
  const [callStatus] = useState<CallStatus>('idle')
  const [peerUsername] = useState<string | null>(null)
  const [localStream] = useState<MediaStream | null>(null)
  const [remoteStream] = useState<MediaStream | null>(null)
  const [toasts] = useState<Toast[]>([])

  // Stub no-op functions — Plan 02 replaces these bodies with real WebRTC logic
  const startCall = async (_targetUsername: string): Promise<void> => {
    // Plan 02: self-call guard, getUserMedia, RTCPeerConnection, offer, publish call-request
  }

  const acceptCall = async (): Promise<void> => {
    // Plan 02: getUserMedia, answer, navigate('/call')
  }

  const rejectCall = (): void => {
    // Plan 02: publish call-decline signal, reset to idle
  }

  const hangUp = (): void => {
    // Plan 02: publish call-end signal, teardown, reset state
  }

  return (
    <CallContext.Provider value={{
      localStream,
      remoteStream,
      callStatus,
      peerUsername,
      toasts,
      startCall,
      acceptCall,
      rejectCall,
      hangUp,
    }}>
      {children}
    </CallContext.Provider>
  )
}

// ──────────────────────────────────────────────────────────────────
// Hook — mirrors useWebSocket() pattern exactly
// ──────────────────────────────────────────────────────────────────
export function useCall(): CallContextValue {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used inside CallProvider')
  return ctx
}
