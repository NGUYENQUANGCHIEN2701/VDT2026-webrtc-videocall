---
phase: 06-screen-sharing
plan: 02
subsystem: frontend/context
tags: [screen-sharing, webrtc, react-context, useCallback, useRef, replaceTrack, getDisplayMedia]

requires:
  - phase: 06-screen-sharing/01
    provides: [test-infrastructure/screen-share-mocks, red-tests/SCRN-01, red-tests/SCRN-02, red-tests/SCRN-03, red-tests/D-06, red-tests/D-08]
provides:
  - isScreenSharing state + startScreenShare/stopScreenShare actions in CallContext
  - RTCRtpSender.replaceTrack()-based mid-call screen track swap (SCRN-02, no renegotiation)
  - screenTrack.onended → stopScreenShareRef stale-closure-safe browser native stop handler (D-06)
  - teardown step 2.5: screen track cleanup and isScreenSharing reset (D-08)
  - All 11 Plan 01 RED screen-share CallContext tests turned GREEN
affects:
  - 06-03 (CallPage UI — consumes isScreenSharing, startScreenShare, stopScreenShare)

tech-stack:
  added: []
  patterns:
    - "stopScreenShareRef mirror pattern: useEffect mirrors stopScreenShare into a ref (same as handleSignalRef) to eliminate stale closure risk in screenTrack.onended"
    - "Option A sender re-query: getSenders().find() called in both startScreenShare and stopScreenShare — no extra ref, negligible overhead"
    - "DOMException .name check: direct property access (err as {name?:string}).name avoids instanceof which fails in jsdom"

key-files:
  created: []
  modified:
    - frontend/src/contexts/CallContext.tsx
    - frontend/src/test/CallContext.test.tsx

key-decisions:
  - "DOMException .name is accessible directly but jsdom DOMException is neither instanceof Error nor instanceof Object — use direct property access for NotAllowedError check"
  - "Tasks 1 and 2 committed in a single atomic commit because CallContext.tsx cannot be left in a mid-implementation state (Provider value references symbols defined later in the file)"
  - "getDisplayMedia mock reset added to screen-sharing describe beforeEach — prevents accumulated call count from cross-test leakage (test infrastructure fix)"

patterns-established:
  - "stopScreenShareRef mirror: same pattern as handleSignalRef already in CallContext — stable reference for event handlers in React hooks"
  - "teardown step numbering: step 2.5 pattern for phase extensions to existing teardown sequence"

requirements-completed: [SCRN-01, SCRN-02, SCRN-03, SCRN-04]

duration: 25min
completed: "2026-05-29"
---

# Phase 06 Plan 02: Screen Sharing CallContext Implementation Summary

**`RTCRtpSender.replaceTrack()`-based screen sharing in CallContext: isScreenSharing state, startScreenShare/stopScreenShare actions, stopScreenShareRef stale-closure guard, and teardown extension — 11 RED tests turned GREEN**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-29T14:30:00Z
- **Completed:** 2026-05-29T14:40:00Z
- **Tasks:** 2 (committed together)
- **Files modified:** 2

## Accomplishments

- Extended `CallContextValue` interface with `isScreenSharing: boolean`, `startScreenShare: () => Promise<void>`, `stopScreenShare: () => void`
- Implemented `startScreenShare`: `getDisplayMedia({ video: true })` → `getSenders().find(video)` → `replaceTrack(screenTrack)` → `setIsScreenSharing(true)` → `screenTrack.onended = () => stopScreenShareRef.current()` with two pcRef null-guards (Pitfall 2 post-await guard)
- Implemented `stopScreenShare`: re-queries video sender via `getSenders().find()`, `replaceTrack(cameraTrack)`, stops screen track, resets `isScreenSharing`
- Extended `teardown()` with step 2.5: `screenTrackRef.current?.stop(); screenTrackRef.current = null; setIsScreenSharing(false)` (D-08, T-06-04)
- All 11 Plan 01 screen-share RED tests now GREEN; 9 pre-existing failures unchanged; 7 CallPage RED tests remain for Plan 03

## Task Commits

1. **Tasks 1+2: isScreenSharing state/refs/interface + startScreenShare/stopScreenShare implementation** - `afcaa77` (feat)

## Files Created/Modified

- `frontend/src/contexts/CallContext.tsx` - Extended with isScreenSharing state, screenTrackRef, stopScreenShareRef, stopScreenShare useCallback, startScreenShare useCallback, teardown extension, Provider value additions
- `frontend/src/test/CallContext.test.tsx` - Added getDisplayMedia mockClear() and mockResolvedValue() reset to screen-sharing describe beforeEach to prevent cross-test leakage

## Decisions Made

- Committed Tasks 1 and 2 together as one atomic commit — splitting would leave the Provider value referencing undefined symbols (tsc would fail at the intermediate state)
- Used direct `(err as { name?: string }).name` for NotAllowedError check instead of `instanceof Error` — jsdom's DOMException is neither `instanceof Error` nor `instanceof Object`, so instanceof guards silently fall to the else branch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DOMException instanceof check incompatibility with jsdom**
- **Found during:** Task 2 (startScreenShare error handling)
- **Issue:** jsdom's DOMException object is not instanceof Error nor instanceof Object. The planned check `err instanceof Error && err.name === 'NotAllowedError'` (from RESEARCH code example) silently fell to the else branch, showing "Screen sharing unavailable" instead of "Screen sharing cancelled". Verified via a local vitest/jsdom test.
- **Fix:** Changed error check to `const errName = err != null ? (err as { name?: string }).name : undefined; if (errName === 'NotAllowedError')` — reads .name directly without instanceof guard
- **Files modified:** `frontend/src/contexts/CallContext.tsx`
- **Verification:** `SCRN-01: startScreenShare shows "Screen sharing cancelled" toast on NotAllowedError` test passes
- **Committed in:** `afcaa77` (Task commit)

**2. [Rule 1 - Bug] Fixed getDisplayMedia mock not reset between screen-sharing tests**
- **Found during:** Task 2 verification (startScreenShare no-op test)
- **Issue:** The `startScreenShare is a no-op when there is no active peer connection` test checked `not.toHaveBeenCalled()` but accumulated 9 calls from prior tests in the suite. The Plan 01 screen-sharing `beforeEach` reset `mockScreenTrack` but not `getDisplayMedia`.
- **Fix:** Added `vi.mocked(navigator.mediaDevices.getDisplayMedia).mockClear()` and `.mockResolvedValue(mockScreenStream)` to the screen-sharing `describe` `beforeEach`
- **Files modified:** `frontend/src/test/CallContext.test.tsx`
- **Verification:** No-op test passes; getDisplayMedia mock call count starts at 0 for each screen-sharing test
- **Committed in:** `afcaa77` (Task commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs — jsdom instanceof incompatibility + test mock reset gap)
**Impact on plan:** Both fixes required for test correctness. No scope changes.

## Issues Encountered

- jsdom's `DOMException` is `!instanceof Object` — unusual behavior not reflected in RESEARCH examples (which used standard Node.js DOMException). Diagnosed via a small inline vitest test file that confirmed `instanceof Object` returns false for jsdom DOMException.

## Known Stubs

None — all behavioral logic is fully implemented. `isScreenSharing`, `startScreenShare`, `stopScreenShare` are complete.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. All threat mitigations from plan's threat register are implemented (T-06-04: teardown stops screen track; T-06-05: post-await pcRef null guard).

## Next Phase Readiness

- Plan 03 (CallPage UI) can now import and use `isScreenSharing`, `startScreenShare`, `stopScreenShare` from `useCall()`
- The `CallContextValue` interface is complete — TypeScript consumers will see all three new members
- 7 CallPage RED tests remain for Plan 03 to turn GREEN (Share button render, Camera disabled-while-sharing)

---
*Phase: 06-screen-sharing*
*Completed: 2026-05-29*

## Self-Check: PASSED

- `frontend/src/contexts/CallContext.tsx` — FOUND (modified)
- `frontend/src/test/CallContext.test.tsx` — FOUND (modified)
- Commit `afcaa77` — FOUND (verified via git log)
- `npx tsc --noEmit` exits 0 — VERIFIED
- All 11 Plan 01 screen-share tests passing — VERIFIED (23/32 pass, 9 pre-existing failures)
