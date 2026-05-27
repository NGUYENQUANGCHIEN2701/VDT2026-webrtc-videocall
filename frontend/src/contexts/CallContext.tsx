import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import type { IMessage } from '@stomp/stompjs'

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
// ──────────────────────────────────────────────────────────────────
export function CallProvider({ children }: { children: ReactNode }) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [peerUsername, setPeerUsername] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Refs for mutable objects that must NOT trigger re-renders (Plan 02 will use these)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerUsernameRef = useRef<string | null>(null)
  const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([])
  const remoteDescSetRef = useRef(false)
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hooks — imports ready for Plan 02 to use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { client, subscribe, publish } = useWebSocket()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { username } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate()

  // Suppress unused ref warnings in stub — Plan 02 will use all refs
  void pcRef; void localStreamRef; void peerUsernameRef
  void iceCandidateBufferRef; void remoteDescSetRef
  void teardownTimerRef; void callTimeoutRef

  // Suppress unused IMessage — Plan 02 will use it in signal handler
  void (null as unknown as IMessage)

  // Stub no-op functions — Plan 02 replaces these bodies
  const startCall = async (_targetUsername: string): Promise<void> => {
    // Plan 02 implements: getUserMedia, create RTCPeerConnection, create offer, publish call-request
  }

  const acceptCall = async (): Promise<void> => {
    // Plan 02 implements: getUserMedia, create answer, navigate to /call
  }

  const rejectCall = (): void => {
    // Plan 02 implements: publish call-decline, reset state
  }

  const hangUp = (): void => {
    // Plan 02 implements: publish call-end, teardown, reset state
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
