import { useEffect } from 'react'

// ──────────────────────────────────────────────────────────────────
// useRingtone — stub hook
// Plan 03 implements Web Audio API per D-10/D-11 (800Hz sine wave
// oscillator, 0.3s on / 1.7s off, 2s cycle). This stub exists so
// IncomingCallModal can import it without compilation errors.
// ──────────────────────────────────────────────────────────────────
export function useRingtone() {
  useEffect(() => {
    // Plan 03 implements: AudioContext, OscillatorNode (800Hz), GainNode envelope, 2s repeat
    return () => {
      // Plan 03 implements: stopped = true, clearTimeout, audioCtx.close()
    }
  }, [])
}
