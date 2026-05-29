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
  isMuted: boolean
  isCameraOff: boolean
  iceState: RTCIceConnectionState | null
  toggleMute: () => void
  toggleCamera: () => void
  isScreenSharing: boolean
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
}

// ──────────────────────────────────────────────────────────────────
// Signal DTO — mirrors backend SignalMessage.java
// { to, type, payload, from } — from is overwritten server-side
// ──────────────────────────────────────────────────────────────────
type SignalMessage = {
  to: string
  type: string
  payload: string
  from: string
}

// ──────────────────────────────────────────────────────────────────
// ICE config — Google public STUN; no TURN needed for LAN demo
// ──────────────────────────────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

// ──────────────────────────────────────────────────────────────────
// Context — null default per project pattern
// ──────────────────────────────────────────────────────────────────
const CallContext = createContext<CallContextValue | null>(null)

// ──────────────────────────────────────────────────────────────────
// Provider — full WebRTC implementation
// D-04: CallProvider is innermost in the provider tree, inside
// WebSocketProvider and AuthProvider so it can call useWebSocket()
// and useAuth(). useNavigate() works because BrowserRouter is
// outermost per D-04.
// ──────────────────────────────────────────────────────────────────
export function CallProvider({ children }: { children: ReactNode }) {
  const { isConnected, subscribe, publish } = useWebSocket()
  const { username } = useAuth()
  const navigate = useNavigate()

  // ── React state ─────────────────────────────────────────────────
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [peerUsername, setPeerUsername] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [iceState, setIceState] = useState<RTCIceConnectionState | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // ── Refs (RESEARCH Pattern 1 — stale closure prevention) ────────
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  // Mirror stopScreenShare into a ref to prevent stale closure in screenTrack.onended
  // (follows the established handleSignalRef pattern at lines 361-364)
  const stopScreenShareRef = useRef<() => void>(() => {})
  const peerUsernameRef = useRef<string | null>(null)        // Pitfall 2 fix
  const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([])
  const remoteDescSetRef = useRef(false)
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mirror peerUsername state → ref (Pitfall 2) ─────────────────
  useEffect(() => {
    peerUsernameRef.current = peerUsername
  }, [peerUsername])

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Append a toast; auto-dismiss after 3 seconds (UI-SPEC §5.4).
   */
  const addToast = useCallback((message: string, style: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, style }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  /**
   * Publish a signal via STOMP /app/signal.
   */
  const publishSignal = useCallback(
    (msg: { type: string; to: string; payload: string }) => {
      publish('/app/signal', JSON.stringify(msg))
    },
    [publish],
  )

  /**
   * Drain buffered ICE candidates after setRemoteDescription (RESEARCH Pattern 2).
   * Must be called after every setRemoteDescription.
   */
  const drainIceCandidateBuffer = useCallback(async () => {
    remoteDescSetRef.current = true
    for (const candidate of iceCandidateBufferRef.current) {
      await pcRef.current?.addIceCandidate(candidate)
    }
    iceCandidateBufferRef.current = []
  }, [])

  /**
   * CTRL-01: Toggle microphone mute state.
   * Uses functional updater to avoid stale closure (RESEARCH Pitfall 1).
   * Sets track.enabled on the audio track directly via ref — no renegotiation needed.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev
      const audioTrack = localStreamRef.current?.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !nextMuted
      }
      return nextMuted
    })
  }, [])

  /**
   * CTRL-02: Toggle camera on/off state.
   * Audio-only guard (D-12): no-op if localStream has no video tracks.
   * Uses functional updater to avoid stale closure.
   */
  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks()
    if (!videoTracks || videoTracks.length === 0) return
    setIsCameraOff((prev) => {
      const nextOff = !prev
      videoTracks[0].enabled = !nextOff
      return nextOff
    })
  }, [])

  /**
   * SCRN-03 / D-06: Stop screen sharing and restore camera track.
   * Defined BEFORE startScreenShare so onended wiring is clear.
   * Uses Option A (re-query sender) per RESEARCH Pattern 5.
   */
  const stopScreenShare = useCallback((): void => {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
    const videoSender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')

    if (videoSender && cameraTrack) {
      void videoSender.replaceTrack(cameraTrack)
    }

    screenTrackRef.current?.stop()
    screenTrackRef.current = null
    setIsScreenSharing(false)
  }, [])

  // Mirror stopScreenShare into ref — same pattern as handleSignalRef (lines 361-364)
  // Prevents stale closure in screenTrack.onended (RESEARCH Pitfall 1)
  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare
  }, [stopScreenShare])

  /**
   * SCRN-01/02/04, D-06: Start screen sharing.
   * Calls getDisplayMedia, finds the video sender, replaces track via replaceTrack
   * (no SDP renegotiation — SCRN-02), attaches onended handler (D-06).
   */
  const startScreenShare = useCallback(async (): Promise<void> => {
    // Guard: no active peer connection
    if (!pcRef.current) return

    let screenTrack: MediaStreamTrack | null = null
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenTrack = screenStream.getVideoTracks()[0]
    } catch (err) {
      // jsdom's DOMException does not pass `instanceof Error` or `instanceof Object`,
      // so read .name directly via property access (works for DOMException, Error, and
      // any other thrown value that has a .name property).
      const errName = err != null ? (err as { name?: string }).name : undefined
      if (errName === 'NotAllowedError') {
        addToast('Screen sharing cancelled', 'bg-slate-800 border border-slate-700 text-slate-400')
      } else {
        addToast('Screen sharing unavailable', 'bg-slate-800 border border-amber-600/40 text-amber-400')
      }
      return
    }

    // Guard: call may have ended while user was in the picker (RESEARCH Pitfall 2)
    if (!pcRef.current) {
      screenTrack.stop()
      return
    }

    const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
    if (!videoSender) {
      // Audio-only call — no video sender to replace (RESEARCH Pitfall 5)
      screenTrack.stop()
      return
    }

    await videoSender.replaceTrack(screenTrack)
    screenTrackRef.current = screenTrack
    setIsScreenSharing(true)

    // D-06: fires when user clicks browser native "Stop sharing" bar
    // Use ref to avoid stale closure (RESEARCH Pitfall 1)
    screenTrack.onended = () => stopScreenShareRef.current()
  }, [addToast])

  /**
   * Teardown sequence (RESEARCH Pattern 4 — order matters):
   * 1. Cancel timers
   * 2. Stop media tracks (releases camera/mic indicator)
   * 2.5. Phase 6: stop screen track if active (D-08)
   * 3. Close peer connection
   * 4. Reset refs
   * 5. Update React state last
   */
  const teardown = useCallback(() => {
    // 1. Cancel pending timers
    if (teardownTimerRef.current !== null) {
      clearTimeout(teardownTimerRef.current)
      teardownTimerRef.current = null
    }
    if (callTimeoutRef.current !== null) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }

    // 2. Stop media tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null

    // 2.5 — Phase 6: stop screen track if active (D-08, T-06-04)
    screenTrackRef.current?.stop()
    screenTrackRef.current = null

    // 3. Close peer connection
    pcRef.current?.close()
    pcRef.current = null

    // 4. Reset refs
    iceCandidateBufferRef.current = []
    remoteDescSetRef.current = false
    peerUsernameRef.current = null

    // 5. Update React state
    setLocalStream(null)
    setRemoteStream(null)
    setPeerUsername(null)
    setCallStatus('idle')
    setIsMuted(false)
    setIsCameraOff(false)
    setIceState(null)
    setIsScreenSharing(false)
  }, [])

  /**
   * Create RTCPeerConnection with ICE config and attach event handlers.
   * (RESEARCH Pattern 1 — reads refs in handlers to avoid stale closures)
   */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_CONFIG)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        publishSignal({
          type: 'ice-candidate',
          to: peerUsernameRef.current!,
          payload: JSON.stringify(event.candidate),
        })
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    // D-08/D-09 ICE state recovery
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      setIceState(state as RTCIceConnectionState)
      if (state === 'disconnected') {
        // Grace window — browser may self-recover from transient glitch
        teardownTimerRef.current = setTimeout(teardown, 2000)
      } else if (state === 'failed') {
        if (teardownTimerRef.current !== null) {
          clearTimeout(teardownTimerRef.current)
          teardownTimerRef.current = null
        }
        teardown()
        addToast('Connection lost', 'bg-slate-800 border border-red-600/40 text-red-400')
      } else if (state === 'connected' || state === 'completed') {
        // Cancel grace timer if connection recovered
        if (teardownTimerRef.current !== null) {
          clearTimeout(teardownTimerRef.current)
          teardownTimerRef.current = null
        }
        setCallStatus('connected')
      }
    }

    return pc
  }, [publishSignal, teardown, addToast])

  // ── Signal handler ───────────────────────────────────────────────

  /**
   * Dispatch incoming STOMP signal frames by type (D-05 full table).
   * Wrapped in try/catch with teardown fallback — Open Question 2 / T-4-02/T-4-05.
   */
  const handleSignal = useCallback(
    async (msg: SignalMessage) => {
      try {
        switch (msg.type) {
          // ── Incoming call-request → transition to ringing ──────
          case 'call-request': {
            setPeerUsername(msg.from)
            peerUsernameRef.current = msg.from
            setCallStatus('ringing')
            break
          }

          // ── Callee accepted → caller creates offer ─────────────
          case 'call-accept': {
            if (callTimeoutRef.current !== null) {
              clearTimeout(callTimeoutRef.current)
              callTimeoutRef.current = null
            }
            const pc = pcRef.current!
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            publishSignal({
              type: 'offer',
              to: peerUsernameRef.current!,
              payload: JSON.stringify(offer),
            })
            navigate('/call')
            break
          }

          // ── Callee declined → teardown + toast ─────────────────
          case 'call-decline': {
            teardown()
            addToast('Call declined', 'bg-slate-800 border border-red-600/40 text-red-400')
            break
          }

          // ── Remote ended call → teardown + toast ───────────────
          case 'call-end': {
            teardown()
            addToast('Call ended', 'bg-slate-800 border border-slate-700 text-slate-400')
            break
          }

          // ── Callee receives offer → set remote desc + answer ───
          case 'offer': {
            const pc = pcRef.current!
            const offerInit = JSON.parse(msg.payload) as RTCSessionDescriptionInit
            await pc.setRemoteDescription(new RTCSessionDescription(offerInit))
            await drainIceCandidateBuffer()
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            publishSignal({
              type: 'answer',
              to: peerUsernameRef.current!,
              payload: JSON.stringify(answer),
            })
            break
          }

          // ── Caller receives answer → set remote desc ───────────
          case 'answer': {
            const pc = pcRef.current!
            const answerInit = JSON.parse(msg.payload) as RTCSessionDescriptionInit
            await pc.setRemoteDescription(new RTCSessionDescription(answerInit))
            await drainIceCandidateBuffer()
            break
          }

          // ── ICE candidate — buffer if no remote desc yet (Pitfall 1) ─
          case 'ice-candidate': {
            const candidate = new RTCIceCandidate(
              JSON.parse(msg.payload) as RTCIceCandidateInit,
            )
            if (!remoteDescSetRef.current) {
              iceCandidateBufferRef.current.push(candidate)
            } else {
              await pcRef.current?.addIceCandidate(candidate)
            }
            break
          }

          default:
            console.warn('[CallContext] Unknown signal type:', msg.type)
        }
      } catch (err) {
        // T-4-02/T-4-05: Malformed SDP or ICE payload throws DOMException —
        // teardown prevents stuck call state.
        console.error('[CallContext] Signal handler error:', err)
        teardown()
        addToast('Connection lost', 'bg-slate-800 border border-red-600/40 text-red-400')
      }
    },
    [publishSignal, navigate, teardown, addToast, drainIceCandidateBuffer],
  )

  // ── Stable ref for handleSignal — prevents subscription teardown on re-render ──
  const handleSignalRef = useRef(handleSignal)
  useEffect(() => {
    handleSignalRef.current = handleSignal
  }, [handleSignal])

  // ── STOMP subscription (RESEARCH Pattern 3) ─────────────────────
  // Depends on isConnected so the effect re-runs when STOMP connects.
  // client?.connected would be false at the time setClient() triggers
  // the effect — the connection completes later, flipping isConnected.
  // handleSignal is read via ref so the subscription never resets when
  // the handler reference changes (e.g. on presence list update).
  useEffect(() => {
    if (!isConnected) return

    const sub = subscribe('/user/queue/signal', (frame: IMessage) => {
      const msg = JSON.parse(frame.body) as SignalMessage
      void handleSignalRef.current(msg)
    })

    return () => {
      sub?.unsubscribe()
    }
  }, [isConnected, subscribe])

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Try video+audio, fall back to audio-only if no camera device found.
   * Returns null if even audio-only fails (e.g. no devices at all).
   */
  const getLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch {
      try {
        addToast('No camera found — audio only', 'bg-slate-800 border border-amber-600/40 text-amber-400')
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      } catch {
        addToast('Cannot access microphone', 'bg-slate-800 border border-red-600/40 text-red-400')
        return null
      }
    }
  }, [addToast])

  // ── Public actions ───────────────────────────────────────────────

  /**
   * CALL-01: Initiate an outgoing call.
   * Pitfall 6: do NOT createOffer here — offer is created in call-accept handler.
   * T-4-03: Guard against self-call.
   *
   * Media and PC are acquired BEFORE sending call-request to prevent a race
   * condition where the callee accepts instantly and call-accept arrives while
   * pcRef.current is still null, causing a null-deref → teardown crash.
   */
  const startCall = async (targetUsername: string): Promise<void> => {
    // Self-call guard (T-4-03)
    if (targetUsername === username) return

    setPeerUsername(targetUsername)
    peerUsernameRef.current = targetUsername
    setCallStatus('calling')

    // Acquire local media (with audio-only fallback if no camera)
    const stream = await getLocalStream()
    if (!stream) {
      teardown()
      return
    }
    localStreamRef.current = stream
    setLocalStream(stream)

    // Create peer connection and add tracks — must be done before call-request
    // so pcRef.current is ready when call-accept arrives
    const pc = createPeerConnection()
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pcRef.current = pc

    // PC ready — now safe to notify callee
    publishSignal({ type: 'call-request', to: targetUsername, payload: '' })

    // 30-second no-answer timeout (CALL-07)
    callTimeoutRef.current = setTimeout(() => {
      publishSignal({ type: 'call-end', to: peerUsernameRef.current!, payload: '' })
      addToast('No answer', 'bg-slate-800 border border-amber-600/40 text-amber-400')
      teardown()
    }, 30_000)
  }

  /**
   * CALL-03: Accept an incoming call.
   * Acquires media, creates pc, signals call-accept, navigates to /call (D-07).
   * Does NOT createAnswer here — callee waits for 'offer' signal (Pitfall 6).
   */
  const acceptCall = async (): Promise<void> => {
    const target = peerUsernameRef.current!

    // Acquire local media (with audio-only fallback if no camera)
    const stream = await getLocalStream()
    if (!stream) {
      rejectCall()
      return
    }
    localStreamRef.current = stream
    setLocalStream(stream)

    // Create peer connection and add tracks
    const pc = createPeerConnection()
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pcRef.current = pc

    // Signal call-accept to caller (caller will now create offer)
    publishSignal({ type: 'call-accept', to: target, payload: '' })

    // Transition to 'calling' so IncomingCallModal is hidden and CallPage stays.
    // 'connected' is set by oniceconnectionstatechange on both sides symmetrically.
    setCallStatus('calling')

    // Navigate to call page (D-07)
    navigate('/call')
  }

  /**
   * CALL-03: Reject an incoming call.
   */
  const rejectCall = (): void => {
    publishSignal({ type: 'call-decline', to: peerUsernameRef.current!, payload: '' })
    peerUsernameRef.current = null
    setPeerUsername(null)
    setCallStatus('idle')
  }

  /**
   * CALL-08: Hang up the current call.
   * Guards against null peer so it is safe to call after teardown already ran
   * (e.g. from the CallPage unmount cleanup or StrictMode simulated cleanup).
   */
  const hangUp = (): void => {
    if (peerUsernameRef.current) {
      publishSignal({ type: 'call-end', to: peerUsernameRef.current, payload: '' })
    }
    teardown()
  }

  return (
    <CallContext.Provider
      value={{
        localStream,
        remoteStream,
        callStatus,
        peerUsername,
        toasts,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
        isMuted,
        isCameraOff,
        iceState,
        toggleMute,
        toggleCamera,
        isScreenSharing,
        startScreenShare,
        stopScreenShare,
      }}
    >
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
