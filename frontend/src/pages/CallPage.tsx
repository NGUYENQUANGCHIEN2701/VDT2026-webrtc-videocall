// ──────────────────────────────────────────────────────────────────
// CallPage — full UI per UI-SPEC §5.3 (Phase 4) + §5 extensions (Phase 5)
// Remote video full-screen, local PiP overlay, peer name overlay,
// timer overlay, connection status overlay, and 4-button control bar.
// Phase 5 adds: Mic toggle, Camera toggle, useCallTimer, ICE status.
// Phase 6 adds: Share Screen button, Camera disabled-while-sharing (D-05).
// ──────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users, PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useCallTimer } from '@/hooks/useCallTimer'

// ──────────────────────────────────────────────────────────────────
// Copy strings — UI-SPEC §8
// ──────────────────────────────────────────────────────────────────
const COPY = {
  placeholderText: 'Waiting for remote video...',
  endCallLabel: 'End call',
  muteMicLabel: 'Mute microphone',
  unmuteMicLabel: 'Unmute microphone',
  cameraOffLabel: 'Turn off camera',
  cameraOnLabel: 'Turn on camera',
  cameraUnavailableLabel: 'Camera unavailable',
  shareScreenLabel: 'Share screen',
  stopSharingLabel: 'Stop sharing',
  cameraDisabledSharingLabel: 'Camera disabled while sharing',
} as const

// ──────────────────────────────────────────────────────────────────
// ICE_STATUS — maps RTCIceConnectionState to status pill display info
// D-08/D-09: 4 semantic states with colors per UI-SPEC §5.4
// ──────────────────────────────────────────────────────────────────
const ICE_STATUS: Record<string, { label: string; colorClass: string; pulse: boolean }> = {
  new:          { label: '● Connecting...',  colorClass: 'text-amber-400',   pulse: false },
  checking:     { label: '● Connecting...',  colorClass: 'text-amber-400',   pulse: false },
  connected:    { label: '● Connected',      colorClass: 'text-emerald-400', pulse: false },
  completed:    { label: '● Connected',      colorClass: 'text-emerald-400', pulse: false },
  disconnected: { label: '● Reconnecting...', colorClass: 'text-amber-400',  pulse: true  },
  failed:       { label: '● Failed',         colorClass: 'text-red-400',     pulse: false },
  closed:       { label: '● Failed',         colorClass: 'text-red-400',     pulse: false },
}

// ──────────────────────────────────────────────────────────────────
// CallPage
// ──────────────────────────────────────────────────────────────────
export default function CallPage() {
  const {
    localStream,
    remoteStream,
    peerUsername,
    callStatus,
    hangUp,
    isMuted,
    isCameraOff,
    iceState,
    toggleMute,
    toggleCamera,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
  } = useCall()
  const navigate = useNavigate()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const timerDisplay = useCallTimer(callStatus)
  const hasVideoTracks = (localStream?.getVideoTracks().length ?? 0) > 0
  const statusInfo = iceState ? (ICE_STATUS[iceState] ?? ICE_STATUS.new) : ICE_STATUS.new

  // Pitfall 3: NEVER set srcObject as a JSX prop — always via useEffect.
  // Setting srcObject as a prop causes React to reset it on every re-render.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  // Navigate back to user list when call ends (hangUp, remote hang-up, or connection lost)
  useEffect(() => {
    if (callStatus === 'idle') {
      navigate('/users', { replace: true })
    }
  }, [callStatus, navigate])

  // Pitfall 5: stop media tracks if user navigates away via browser back button.
  // hangUp() guards against null peer internally, so it is safe to call unconditionally —
  // no signal is sent when teardown already ran (peerUsernameRef is null).
  useEffect(() => {
    return () => {
      hangUp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      {/* Timer + status overlay — top-center, above remote video (UI-SPEC §5.3, D-02) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        {/* Timer pill — D-05/D-06/D-07 */}
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1">
          <span className="text-sm font-semibold text-slate-50 tabular-nums">{timerDisplay}</span>
        </div>
        {/* Status pill — D-08/D-09; role=status aria-live=polite per UI-SPEC §9 */}
        <div
          className={`bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1${statusInfo.pulse ? ' animate-pulse' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className={`text-xs font-normal ${statusInfo.colorClass}`}>{statusInfo.label}</span>
        </div>
      </div>

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

      {/* Control bar — 4-button row: Mic (left) | Share | End Call (center) | Camera (right) */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4">
        {/* Mic toggle button — D-03 */}
        <Button
          className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={isMuted ? COPY.unmuteMicLabel : COPY.muteMicLabel}
          aria-pressed={isMuted}
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>

        {/* Share Screen button — Phase 6 D-01, D-03; never disabled (UI-SPEC §5.2) */}
        <Button
          className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${isScreenSharing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={isScreenSharing ? COPY.stopSharingLabel : COPY.shareScreenLabel}
          title={isScreenSharing ? COPY.stopSharingLabel : COPY.shareScreenLabel}
          aria-pressed={isScreenSharing}
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="size-4" /> : <Monitor className="size-4" />}
        </Button>

        {/* End Call button — inherited from Phase 4, center anchor */}
        <Button
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
          aria-label={COPY.endCallLabel}
          onClick={hangUp}
        >
          <PhoneOff className="size-5" />
        </Button>

        {/* Camera toggle button — D-04, D-12, D-05 (Phase 6: disabled while sharing) */}
        <Button
          className={`h-10 w-10 rounded-full text-white transition-colors duration-150 ${!hasVideoTracks || isScreenSharing ? 'bg-slate-700 opacity-50 cursor-not-allowed' : isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={!hasVideoTracks ? COPY.cameraUnavailableLabel : isScreenSharing ? COPY.cameraDisabledSharingLabel : isCameraOff ? COPY.cameraOnLabel : COPY.cameraOffLabel}
          aria-pressed={isCameraOff}
          aria-disabled={!hasVideoTracks || isScreenSharing}
          disabled={!hasVideoTracks || isScreenSharing}
          onClick={toggleCamera}
        >
          {isCameraOff || !hasVideoTracks ? <VideoOff className="size-4" /> : <Video className="size-4" />}
        </Button>
      </div>

    </div>
  )
}
