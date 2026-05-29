---
phase: 06-screen-sharing
plan: 01
subsystem: frontend/test
tags: [testing, screen-sharing, RED, mocks, vitest]
dependency_graph:
  requires: []
  provides: [test-infrastructure/screen-share-mocks, red-tests/SCRN-01, red-tests/SCRN-02, red-tests/SCRN-03, red-tests/D-06, red-tests/D-08]
  affects: [frontend/src/test/setup.ts, frontend/src/test/CallContext.test.tsx, frontend/src/test/CallPage.test.tsx]
tech_stack:
  added: []
  patterns: [RED-phase TDD scaffold, vi.fn() mock extension, as-unknown-as cast for future API surface]
key_files:
  created: []
  modified:
    - frontend/src/test/setup.ts
    - frontend/src/test/CallContext.test.tsx
    - frontend/src/test/CallPage.test.tsx
decisions:
  - "Used `as unknown as CallContextWithScreenShare` cast to typecheck tests against future API surface without touching production code"
  - "Split D-03 aria-pressed into two separate test cases for clarity (idle + active) — plan allowed 'two assertions or two cases'"
  - "9 pre-existing test failures confirmed pre-existing before this plan — not introduced by Wave 0 changes"
metrics:
  duration: ~15 minutes
  completed: "2026-05-29"
  tasks: 3
  files_modified: 3
---

# Phase 06 Plan 01: Wave 0 Test Infrastructure and RED Scaffolds Summary

**One-liner:** Extended `setup.ts` with `getDisplayMedia`/`getSenders`/`replaceTrack` mocks and exported `mockScreenTrack`; authored 18 failing test cases (11 CallContext + 7 CallPage) asserting the `startScreenShare`/`stopScreenShare`/`isScreenSharing` contract Plans 02 and 03 will implement.

---

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Extend setup.ts with getDisplayMedia, getSenders, replaceTrack mocks | `201d922` | `frontend/src/test/setup.ts` |
| 2 | Author failing CallContext screen-share test cases | `9c04666` | `frontend/src/test/CallContext.test.tsx` |
| 3 | Author failing CallPage Share-button and Camera-disabled tests | `4a3e227` | `frontend/src/test/CallPage.test.tsx` |

---

## What Was Built

### Task 1: setup.ts extensions

- Added `mockScreenTrack` export: `{ stop: vi.fn(), onended: null, kind: 'video' }`
- Added `kind: 'video'` to existing `mockVideoTrack` (required for `getSenders().find(s => s.track?.kind === 'video')` lookup)
- Added `mockScreenStream` object (`getTracks`/`getVideoTracks` returning `[mockScreenTrack]`)
- Added `getDisplayMedia: vi.fn().mockResolvedValue(mockScreenStream)` to `navigator.mediaDevices` stub (alongside existing `getUserMedia`)
- Added `getSenders = vi.fn().mockReturnValue([{ track: mockVideoTrack, replaceTrack: vi.fn().mockResolvedValue(undefined) }])` to `MockRTCPeerConnection` class

### Task 2: CallContext RED tests (11 cases)

All 11 tests in a `describe('CallContext — screen sharing', ...)` block:
- SCRN-01/02: `startScreenShare` calls `getDisplayMedia({ video: true })` and sets `isScreenSharing = true`
- SCRN-02: `replaceTrack` called on video sender with `mockScreenTrack`
- SCRN-03: `stopScreenShare` calls `replaceTrack` with `mockVideoTrack`, sets `isScreenSharing = false`
- SCRN-03: `stopScreenShare` calls `mockScreenTrack.stop()`
- D-06: `screenTrack.onended` invocation triggers `stopScreenShare` → `isScreenSharing = false`
- D-08: `hangUp` (teardown) resets `isScreenSharing = false`
- D-08: `hangUp` (teardown) calls `mockScreenTrack.stop()`
- SCRN-01: `NotAllowedError` → "Screen sharing cancelled" toast, `isScreenSharing` stays false
- SCRN-01: non-`NotAllowedError` → "Screen sharing unavailable" toast, `isScreenSharing` stays false
- No-op guard: `startScreenShare` with no active peer connection doesn't call `getDisplayMedia`
- No video sender: `startScreenShare` does not set `isScreenSharing` when only audio sender exists

### Task 3: CallPage RED tests (7 cases)

- SCRN-01: Share button aria-label `'Share screen'` when `mockIsScreenSharing = false`
- SCRN-01: Share button aria-label `'Stop sharing'` when `mockIsScreenSharing = true`
- SCRN-01: Clicking Share (idle) calls `mockStartScreenShare` once
- SCRN-03: Clicking Share (active) calls `mockStopScreenShare` once
- D-05: Camera button is disabled and labeled `'Camera disabled while sharing'` when `isScreenSharing = true`
- D-03: Share button has `aria-pressed="false"` when idle
- D-03: Share button has `aria-pressed="true"` when sharing

---

## Test State

| Suite | Before Plan 01 | After Plan 01 |
|-------|---------------|--------------|
| Passing | 56 | 56 |
| Pre-existing failures | 9 | 9 |
| New RED tests | 0 | 18 |
| Total | 65 | 83 |

All 18 new tests fail with `TypeError: result.current.startScreenShare is not a function` (CallContext) or `Unable to find role="button" name="Share screen"` (CallPage) — expected RED state before Plans 02/03.

---

## Verification

- `npx tsc --noEmit` exits 0 — all test files typecheck
- Phase 1-5 test suite: 56 tests still green (no regressions introduced)
- New screen-share tests: 18 FAILING (expected RED — production code does not exist yet)
- Zero new npm packages installed

---

## Deviations from Plan

**None** — plan executed exactly as written.

The 9 pre-existing failures in `CallContext.test.tsx` (CALL-02, CALL-03, CALL-04, etc.) were confirmed pre-existing via `git stash` round-trip before this plan began. They are not caused by Wave 0 changes.

---

## Known Stubs

None — this plan creates test scaffolding only. No production code was touched.

---

## Threat Flags

None — test files only; no new network endpoints, auth paths, or data access patterns introduced.

---

## Self-Check: PASSED

- `frontend/src/test/setup.ts` — FOUND (modified)
- `frontend/src/test/CallContext.test.tsx` — FOUND (modified)
- `frontend/src/test/CallPage.test.tsx` — FOUND (modified)
- Commit `201d922` — FOUND
- Commit `9c04666` — FOUND
- Commit `4a3e227` — FOUND
