---
phase: 5
slug: call-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 + @testing-library/react 16.3.2 |
| **Config file** | `frontend/vite.config.ts` (test block: `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`) |
| **Quick run command** | `npm test -- --run --reporter=verbose` (from `frontend/`) |
| **Full suite command** | `npm test -- --run` (from `frontend/`) |
| **Estimated runtime** | ~2–5 seconds |
| **Baseline** | 45 tests passing before Phase 5 begins |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=verbose`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green (baseline 45 + new Phase 5 tests)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-W0-01 | setup.ts mock extension | 0 | CTRL-01, CTRL-02 | — | N/A — test infrastructure | setup | `npm test -- --run` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-01 | CallContext extension | 1 | CTRL-01 | T-mute-bypass | `toggleMute` sets `isMuted=true` and `audioTrack.enabled=false` | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-02 | CallContext extension | 1 | CTRL-01 | — | `toggleMute` twice returns to `isMuted=false` and `audioTrack.enabled=true` | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-03 | CallContext extension | 1 | CTRL-02 | — | `toggleCamera` sets `isCameraOff=true` and `videoTrack.enabled=false` | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-04 | CallContext extension | 1 | CTRL-02 | — | `toggleCamera` is no-op when stream has no video tracks (audio-only guard D-12) | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-05 | CallContext extension | 1 | CTRL-03 | — | `teardown()` resets `isMuted=false`, `isCameraOff=false`, `iceState=null` | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-01-06 | CallContext extension | 1 | CTRL-05 | — | `iceState` is set when `oniceconnectionstatechange` fires in `createPeerConnection` | unit | `npm test -- --run src/test/CallContext.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-01 | CallPage UI | 2 | CTRL-01 | — | Mic button renders `MicOff` icon + `bg-red-600` class when `isMuted=true` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-02 | CallPage UI | 2 | CTRL-01 | — | Mic button has `aria-pressed="true"` and `aria-label="Unmute microphone"` when muted | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-03 | CallPage UI | 2 | CTRL-02 | — | Camera button renders in disabled state (`opacity-50 cursor-not-allowed`) when stream has no video tracks | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-04 | CallPage UI | 2 | CTRL-04 | — | Timer displays `00:00` when `callStatus !== 'connected'` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-05 | CallPage UI | 2 | CTRL-04 | — | Timer increments after `callStatus='connected'` (fake timers + advance 3s → displays `00:03`) | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-06 | CallPage UI | 2 | CTRL-05 | — | Status pill renders `● Connecting...` with `text-amber-400` when `iceState='checking'` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-07 | CallPage UI | 2 | CTRL-05 | — | Status pill renders `● Connected` with `text-emerald-400` when `iceState='connected'` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-08 | CallPage UI | 2 | CTRL-05 | — | Status pill renders `● Reconnecting...` with `animate-pulse` when `iceState='disconnected'` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-09 | CallPage UI | 2 | CTRL-05 | — | Status pill has `role="status"` and `aria-live="polite"` | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (needs extension) | ⬜ pending |
| 05-02-10 | CallPage UI | 2 | CTRL-06 | — | Local PiP `<video>` element present, `muted`, has `-scale-x-[1]` mirror class | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (passing baseline) | ✅ green |
| 05-02-11 | CallPage UI | 2 | CTRL-07 | — | Peer username overlay renders with correct `peerUsername` value | component | `npm test -- --run src/test/CallPage.test.tsx` | ✅ exists (passing baseline) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/test/setup.ts` — extend `mockMediaStream` with `getAudioTracks()` and `getVideoTracks()` returning mockable tracks with `enabled` property:
  ```ts
  const mockAudioTrack = { stop: vi.fn(), enabled: true }
  const mockVideoTrack = { stop: vi.fn(), enabled: true }
  // mockMediaStream must expose all three: getTracks, getAudioTracks, getVideoTracks
  ```
- [ ] `frontend/src/test/CallContext.test.tsx` — extend existing file with toggle + iceState tests (05-01-01 through 05-01-06); no new file needed
- [ ] `frontend/src/test/CallPage.test.tsx` — extend existing file with timer, status overlay, and button state tests (05-02-01 through 05-02-09); no new file needed

*All three targets already exist. Wave 0 is extension-only, not creation.*

**MockRTCPeerConnection iceConnectionState mutation pattern** (for iceState tests):
```typescript
// Simulate ICE state change in a test — mutate the field, then call the handler
MockPC.lastInstance!.iceConnectionState = 'connected' as RTCIceConnectionState
MockPC.lastInstance!.oniceconnectionstatechange?.({} as Event)
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mic mute silences remote peer (audio stops flowing) | CTRL-01 | Requires two real browser tabs + real WebRTC connection; jsdom cannot simulate RTP silence | Open two tabs, establish call, click mute, confirm remote tab hears silence |
| Camera off sends black video to remote | CTRL-02 | Same — real RTP stream required | Open two tabs, establish call, click camera off, confirm remote tab sees black frame |
| Timer starts at 0:00 and increments visibly during call | CTRL-04 | Real browser display timing | Establish call, observe timer starts at 00:00 and counts up in real time |
| Connection status shows each lifecycle state visually | CTRL-05 | ICE transitions require real network | Observe Connecting→Connected during call setup on two-tab test |
| MediaStream tracks released (camera/mic indicator cleared) on call end | CTRL-03 | Browser hardware indicator not accessible to test framework | End call; verify browser tab shows no active camera/mic indicator |
| Unmount cleanup: navigating away from /call via browser back button stops tracks | Pitfall 5 | Navigation events not simulatable end-to-end in jsdom | During active call, press browser back; verify camera/mic indicator clears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
