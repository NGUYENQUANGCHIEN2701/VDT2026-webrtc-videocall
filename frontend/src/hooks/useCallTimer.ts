import { useState, useEffect } from 'react'
import type { CallStatus } from '@/contexts/CallContext'

// ──────────────────────────────────────────────────────────────────
// useCallTimer — call duration timer hook (D-05, D-06, D-07)
// Counts elapsed seconds from when callStatus transitions to 'connected'
// Mounts: starts setInterval(1000) only when callStatus === 'connected'
// Unmounts / status change: clears interval and resets counter to 0
// Pitfall 4: StrictMode double-mount safe — clearInterval in cleanup
// ──────────────────────────────────────────────────────────────────
export function useCallTimer(callStatus: CallStatus): string {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (callStatus !== 'connected') {
      setSeconds(0)
      return
    }

    const id = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(id)
  }, [callStatus])

  return (
    String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0')
  )
}
