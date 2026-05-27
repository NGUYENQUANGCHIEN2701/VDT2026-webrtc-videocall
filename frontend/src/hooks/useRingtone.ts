import { useEffect } from 'react'

// ──────────────────────────────────────────────────────────────────
// useRingtone — Web Audio API ringtone hook (D-10, D-11)
// 800 Hz sine wave oscillator, on 0.3s / off 1.7s = 2s cycle
// Mounts: creates AudioContext, resumes, starts beep loop
// Unmounts: stops loop, closes AudioContext to release resources
// ──────────────────────────────────────────────────────────────────
export function useRingtone() {
  useEffect(() => {
    let audioCtx: AudioContext | null = null
    let stopped = false
    let timeoutId: ReturnType<typeof setTimeout>

    function beep() {
      // Guard: prevent schedule-after-unmount race (T-4-03-02 mitigation)
      if (stopped || !audioCtx || audioCtx.state === 'closed') return

      // New oscillator for each beep (oscillators cannot be restarted — MDN)
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.frequency.value = 800
      osc.type = 'sine'

      const now = audioCtx.currentTime
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)

      // Schedule next beep: 0.3s on + 1.7s off = 2s cycle (D-10)
      timeoutId = setTimeout(beep, 2000)
    }

    // AudioContext may start suspended due to browser autoplay policy (Pitfall 7).
    // resume() is called immediately so beeps are audible.
    audioCtx = new AudioContext()
    audioCtx.resume().then(() => {
      beep()
    })

    return () => {
      stopped = true
      clearTimeout(timeoutId)
      audioCtx?.close()
      audioCtx = null
    }
  }, []) // empty deps — run once on mount, clean on unmount (D-11)
}
