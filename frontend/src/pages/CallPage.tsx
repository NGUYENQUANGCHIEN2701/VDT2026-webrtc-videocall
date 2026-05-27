// ──────────────────────────────────────────────────────────────────
// CallPage — full UI per UI-SPEC §5.3
// Remote video full-screen, local PiP overlay, peer name overlay,
// and hang-up control bar. Phase 5 adds mic/camera toggles, timer,
// and connection status indicator.
// ──────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Users, PhoneOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'

// ──────────────────────────────────────────────────────────────────
// Copy strings — UI-SPEC §8
// ──────────────────────────────────────────────────────────────────
const COPY = {
  placeholderText: 'Waiting for remote video...',
  endCallLabel: 'End call',
} as const

// ──────────────────────────────────────────────────────────────────
// CallPage
// ──────────────────────────────────────────────────────────────────
export default function CallPage() {
  const { localStream, remoteStream, peerUsername, hangUp } = useCall()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Pitfall 3: NEVER set srcObject as a JSX prop — always via useEffect.
  // Setting srcObject as a prop causes React to reset it on every re-render.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  // Phase 4: deliberately no unmount cleanup — see RESEARCH.md Pitfall 4 / Phase 5 TODO.
  // Navigating away from /call leaves call state intact so user can navigate back.
  // Phase 5 will add proper unmount handling if needed.

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">

      {/* Remote video fills screen — NOT muted (user must hear remote audio per UI-SPEC §9) */}
      <video
        ref={remoteVideoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        aria-label="Remote video stream"
      />

      {/* Remote video placeholder — shown only when remoteStream is null */}
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
          <Users className="size-16 text-slate-700 mb-4" />
          <p className="text-sm text-slate-500">{COPY.placeholderText}</p>
        </div>
      )}

      {/* Peer username overlay — top-left, shown only when peerUsername is set */}
      {peerUsername && (
        <div className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1">
          <span className="text-sm font-semibold text-slate-50">{peerUsername}</span>
        </div>
      )}

      {/* Local video PiP — bottom-right, above control bar (UI-SPEC §5.3) */}
      <div className="absolute bottom-24 right-4 w-32 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg animate-in fade-in zoom-in-90 duration-200">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
          muted
          aria-label="Local video preview"
        />
      </div>

      {/* Control bar — hang-up only in Phase 4. Mic/camera/timer added in Phase 5. */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
        <Button
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
          aria-label={COPY.endCallLabel}
          onClick={hangUp}
        >
          <PhoneOff className="size-5" />
        </Button>
      </div>

    </div>
  )
}
