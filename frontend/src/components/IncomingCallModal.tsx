import { useCall } from '@/contexts/CallContext'
import { useRingtone } from '@/hooks/useRingtone'

// ──────────────────────────────────────────────────────────────────
// IncomingCallModal — stub component (Plan 03 implements full UI)
// D-06: Rendered outside <Routes> in App.tsx so it overlays any page.
// Returns null when callStatus !== 'ringing' (stub behavior).
// Plan 03 implements the full modal per UI-SPEC §5.1 (backdrop,
// card, Avatar, Accept/Reject buttons, Escape key handler).
// ──────────────────────────────────────────────────────────────────
export function IncomingCallModal() {
  const { callStatus } = useCall()
  useRingtone()

  if (callStatus !== 'ringing') return null

  // Plan 03 replaces this stub with full modal markup per UI-SPEC §5.1
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-caller-name">
      Stub modal
    </div>
  )
}
