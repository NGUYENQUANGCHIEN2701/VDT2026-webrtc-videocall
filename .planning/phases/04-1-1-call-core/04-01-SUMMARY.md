---
phase: 04-1-1-call-core
plan: "01"
subsystem: frontend
tags: [webrtc, call-context, test-infrastructure, provider-tree, wave-0]
depends_on:
  requires: []
  provides:
    - CallContext stub with CallContextValue interface and useCall() hook
    - RTCPeerConnection global mock via vi.stubGlobal in setup.ts
    - Provider tree per D-04 (BrowserRouter > AuthProvider > WebSocketProvider > CallProvider > App)
    - Wave 0 test scaffolds for CallContext, IncomingCallModal, CallPage
  affects:
    - frontend/src/main.tsx (provider tree refactored)
    - frontend/src/App.tsx (BrowserRouter removed, overlays added)
tech_stack:
  added: []
  patterns:
    - RTCPeerConnection class mock via vi.stubGlobal (setup.ts)
    - getUserMedia stub via vi.stubGlobal('navigator')
    - CallContext stub provider with no-op functions
    - it.skip() Wave 0 scaffold pattern for future plan implementation
key_files:
  created:
    - frontend/src/contexts/CallContext.tsx
    - frontend/src/hooks/useRingtone.ts
    - frontend/src/components/IncomingCallModal.tsx
    - frontend/src/pages/CallPage.tsx
    - frontend/src/test/CallContext.test.tsx
    - frontend/src/test/IncomingCallModal.test.tsx
    - frontend/src/test/CallPage.test.tsx
  modified:
    - frontend/src/test/setup.ts
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/tsconfig.json
decisions:
  - "D-04 provider order enforced in main.tsx: BrowserRouter > AuthProvider > WebSocketProvider > CallProvider > App"
  - "CallContext stub uses minimal imports (no useEffect/useRef/useNavigate) to satisfy tsc noUnusedLocals; Plan 02 adds them"
  - "setup.ts uses vi.stubGlobal('navigator') instead of Object.defineProperty to avoid tsc Cannot find name 'global' error"
  - "tsconfig.json ignoreDeprecations 6.0 added to silence pre-existing baseUrl deprecation warning"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-27T01:15:14Z"
  tasks_completed: 3
  files_changed: 11
---

# Phase 4 Plan 01: Wave 0 Test Infrastructure + App Shell Refactor Summary

**One-liner:** RTCPeerConnection global mock, CallContext stub with locked CallContextValue interface, D-04 provider tree, and Wave 0 test scaffolds (18 passing, 17 skipped) to unblock Waves 1-3.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Global RTCPeerConnection mock + CallContext stub | 5807e32 | setup.ts, CallContext.tsx, tsconfig.json |
| 2 | Stub components + D-04 provider tree refactor | 93b3e28 | useRingtone.ts, IncomingCallModal.tsx, CallPage.tsx, main.tsx, App.tsx |
| 3 | Wave 0 test scaffolds | c4f7f89, fcec107 | CallContext.test.tsx, IncomingCallModal.test.tsx, CallPage.test.tsx |

## Verification Results

- `npm test -- --run`: 18 passed, 17 skipped, 0 failed (6 test files, 2 skipped for Wave 0)
- `npx tsc --noEmit`: exit 0
- `npm run build`: exit 0 (tsc -b + vite build)
- Provider order in main.tsx matches D-04 verbatim
- All stub files compile and export correct symbols

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing tsconfig.json baseUrl deprecation**
- **Found during:** Task 1 (tsc --noEmit exit 2)
- **Issue:** tsconfig.json used `baseUrl` without `ignoreDeprecations: "6.0"`, causing tsc to exit 2 with TS5101
- **Fix:** Added `"ignoreDeprecations": "6.0"` to tsconfig.json compilerOptions
- **Files modified:** frontend/tsconfig.json
- **Commit:** 5807e32

**2. [Rule 1 - Bug] setup.ts used `global` keyword not available in strict tsconfig**
- **Found during:** Task 2 (npm run build exit 2)
- **Issue:** `Object.defineProperty(global, ...)` used `global` which tsc reports as TS2304 (Cannot find name 'global') in browser-targeted compilation
- **Fix:** Changed to `vi.stubGlobal('navigator', ...)` using vitest's built-in stub mechanism
- **Files modified:** frontend/src/test/setup.ts
- **Commit:** 93b3e28

**3. [Rule 1 - Bug] CallContext.tsx had unused imports/variables rejected by noUnusedLocals**
- **Found during:** Task 2 (npm run build exit 2)
- **Issue:** Initial stub included `useEffect, useRef, useNavigate, useWebSocket, useAuth, IMessage` imports that aren't used in the stub body; tsc -b rejects these with TS6133
- **Fix:** Simplified stub to minimal imports (createContext, useContext, useState, ReactNode) only; Plan 02 will add the rest when implementing real WebRTC logic
- **Files modified:** frontend/src/contexts/CallContext.tsx
- **Commit:** 93b3e28

**4. [Rule 1 - Bug] CallPage.test.tsx renderCallPage helper unused due to all tests being skipped**
- **Found during:** Task 3 (npm run build exit 2)
- **Issue:** tsc -b reported TS6133 for `renderCallPage` function declared but never read (all UI-03 tests are it.skip)
- **Fix:** Added `void renderCallPage` reference so noUnusedLocals is satisfied; Plan 04 removes this when tests activate
- **Files modified:** frontend/src/test/CallPage.test.tsx
- **Commit:** fcec107

## Known Stubs

| File | Stub | Reason | Future Plan |
|------|------|--------|-------------|
| frontend/src/contexts/CallContext.tsx | `startCall`, `acceptCall`, `rejectCall`, `hangUp` are no-ops | Wave 0 scaffold; real WebRTC logic is Plan 02's scope | Plan 02 |
| frontend/src/components/IncomingCallModal.tsx | Returns `<div>Stub modal</div>` when ringing | Full modal markup per UI-SPEC §5.1 is Plan 03's scope | Plan 03 |
| frontend/src/hooks/useRingtone.ts | Empty useEffect body | Web Audio API implementation per D-10/D-11 is Plan 03's scope | Plan 03 |
| frontend/src/pages/CallPage.tsx | Returns `<div>Stub call page</div>` | Full video call UI per UI-SPEC §5.3 is Plan 04's scope | Plan 04 |

These stubs are intentional — Plan 01's goal is to establish the file structure, type contracts, and test scaffolds. The stubs prevent the plan's goal from being blocked; each future plan listed above will replace the stub body.

## Threat Flags

No new security-relevant surface introduced. All changes are frontend scaffolding with no new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

All 10 required files exist. All 4 task commits verified in git log.
