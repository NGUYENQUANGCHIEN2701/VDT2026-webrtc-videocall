import { useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useRingtone } from '@/hooks/useRingtone'

// ──────────────────────────────────────────────────────────────────
// Copy strings — UI-SPEC §8
// ──────────────────────────────────────────────────────────────────
const COPY = {
  incomingCallLabel: 'Incoming Call',
  callerSubLabel: 'is calling you...',
  rejectButton: 'Reject',
  acceptButton: 'Accept',
} as const

// ──────────────────────────────────────────────────────────────────
// IncomingCallModalInner — renders when callStatus === 'ringing'
// Calls useRingtone() so the hook lifecycle matches modal visibility:
// mounts with modal → unmounts with modal → AudioContext closed (D-11)
// ──────────────────────────────────────────────────────────────────
interface InnerProps {
  peerUsername: string
  onAccept: () => void
  onReject: () => void
}

function IncomingCallModalInner({ peerUsername, onAccept, onReject }: InnerProps) {
  useRingtone()

  // Escape key handler — UI-SPEC §9
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onReject()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onReject])

  return (
    // Backdrop — UI-SPEC §5.1
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      {/* Modal card — UI-SPEC §5.1 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-caller-name"
        className="w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header label */}
        <div className="text-sm font-normal text-slate-400">{COPY.incomingCallLabel}</div>

        {/* Avatar + caller name + sub-label */}
        <div className="flex flex-col items-center gap-2 py-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-slate-700 text-slate-200 text-xl font-semibold">
              {peerUsername[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div id="modal-caller-name" className="text-lg font-semibold text-slate-50">
            {peerUsername}
          </div>
          <div className="text-sm font-normal text-slate-400">{COPY.callerSubLabel}</div>
        </div>

        {/* Action buttons — UI-SPEC §5.1 */}
        <div className="flex gap-4 mt-2">
          {/* Reject button */}
          <Button
            className="h-11 flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            aria-label={`Reject call from ${peerUsername}`}
            onClick={onReject}
          >
            <PhoneOff className="size-4 mr-2" />
            {COPY.rejectButton}
          </Button>

          {/* Accept button */}
          <Button
            className="h-11 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            aria-label={`Accept call from ${peerUsername}`}
            onClick={onAccept}
          >
            <Phone className="size-4 mr-2" />
            {COPY.acceptButton}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// IncomingCallModal — outer guard component
// D-06: rendered outside <Routes> in App.tsx so it overlays any page.
// Early-returns null when not ringing so IncomingCallModalInner
// (and useRingtone inside it) only mounts when callStatus === 'ringing'.
// Rules of Hooks satisfied: both components always call hooks at top level.
// ──────────────────────────────────────────────────────────────────
export function IncomingCallModal() {
  const { callStatus, peerUsername, acceptCall, rejectCall } = useCall()

  if (callStatus !== 'ringing') return null

  return (
    <IncomingCallModalInner
      peerUsername={peerUsername!}
      onAccept={acceptCall}
      onReject={rejectCall}
    />
  )
}
