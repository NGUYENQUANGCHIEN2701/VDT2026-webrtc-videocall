---
status: partial
phase: 06-screen-sharing
source: [06-VERIFICATION.md]
started: 2026-05-29T00:00:00.000Z
updated: 2026-05-29T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Share Screen picker appears
expected: Clicking the "Share screen" button during a live call opens the OS screen picker (SCRN-01)
result: [pending]

### 2. Remote peer sees screen share without call drop
expected: After User A picks a screen, User B's video switches to the screen with no renegotiation or call drop (SCRN-02, SCRN-04)
result: [pending]

### 3. Stop Sharing restores camera — app button and native browser stop bar
expected: Clicking "Stop sharing" (or native browser stop bar) restores the camera feed for both peers; Camera button re-enables (SCRN-03, D-05, D-06)
result: [pending]

### 4. Local PiP keeps camera feed during screen share
expected: User A's local PiP video element continues showing the camera, not the screen content, while sharing (D-04)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
