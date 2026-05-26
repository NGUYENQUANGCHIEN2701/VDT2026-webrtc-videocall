---
phase: "03-react-auth-user-list"
plan: "03"
subsystem: "frontend-user-list"
tags:
  - react
  - websocket
  - stomp
  - presence
  - tdd
dependency_graph:
  requires:
    - "03-01 (scaffold, AuthContext, WebSocketContext)"
    - "03-02 (AuthPage, STOMP connect on login)"
    - "Phase 2 backend (PresenceService, /topic/presence broadcast)"
  provides:
    - "UserListPage.tsx — live online user list per UI-SPEC §6"
    - "6 UserListPage component tests — UI-02 coverage complete"
    - "PresenceController.java — /app/presence/sync endpoint (race condition fix)"
  affects:
    - "Phase 4 — Call button onClick wired up here as no-op; Phase 4 fills it"
tech_stack:
  added:
    - "PresenceController.java (backend) — new @MessageMapping('/presence/sync')"
  patterns:
    - "Self-filter: onlineUsers.filter(u => u !== username) — RESEARCH Pitfall 4"
    - "Logout sequence: api.post → disconnect() → dispatch(LOGOUT) → navigate('/login')"
    - "Race condition fix: stompClient.publish('/app/presence/sync') after subscribe in onConnect"
key_files:
  created:
    - "backend/src/main/java/com/vdt/websocket/PresenceController.java"
  modified:
    - "frontend/src/pages/UserListPage.tsx"
    - "frontend/src/test/UserListPage.test.tsx"
    - "frontend/src/contexts/WebSocketContext.tsx"
decisions:
  - "Added /app/presence/sync STOMP endpoint to fix race condition where SessionConnectedEvent broadcast arrives before client SUBSCRIBE frame — client now explicitly requests a fresh broadcast after subscribing"
requirements-completed:
  - UI-02
metrics:
  completed_date: "2026-05-26"
  tests_passing: 17
  build_status: "passing"
  uat_result: "10/10 passed"
---

# Phase 03 Plan 03: UserListPage Implementation Summary

UserListPage implemented per UI-SPEC §6 — 6 component tests pass, UAT 10/10 passed with live two-tab verification. One race condition found and fixed during UAT.

## What Was Built

### UserListPage (Task 1 — TDD)

`frontend/src/pages/UserListPage.tsx` implemented with:

- **Header** (sticky): VDT-WebRTC logo (emerald Video icon), logged-in username, Logout button
- **Online Users panel**: section with count badge, three rendering branches:
  - `isLoading=true` → 3 skeleton rows in `role="status"` wrapper
  - `!isLoading && otherUsers.length===0` → empty state (Users icon + "No one else is online" + body copy)
  - `!isLoading && otherUsers.length>0` → `<ul>` of UserRow components
- **UserRow**: avatar (first letter uppercase), username, "● Online" badge, Call button (no-op until Phase 4) with `aria-label="Call {username}"`
- **Self-filter**: `onlineUsers.filter(u => u !== username)` — RESEARCH Pitfall 4
- **Logout handler**: `api.post('/api/auth/logout')` (try/catch) → `disconnect()` → `dispatch({ type: 'LOGOUT' })` → `navigate('/login', { replace: true })`

6 component tests converted from `it.todo`: renders filtered list, filters self (case-sensitive), skeleton loading, empty state, Call button aria-label, logout call order.

### Race Condition Fix (found during UAT)

**Bug**: `SessionConnectedEvent` on the backend fires immediately after sending the STOMP CONNECTED frame. The backend broadcasts `/topic/presence` at this point, but the client hasn't sent its SUBSCRIBE frame yet — it's still processing the CONNECTED response. The client misses the initial broadcast and stays in skeleton state.

**Fix**:
- `backend/src/main/java/com/vdt/websocket/PresenceController.java` — `@MessageMapping("/presence/sync")` broadcasts current online users to `/topic/presence`
- `frontend/src/contexts/WebSocketContext.tsx` — after `stompClient.subscribe('/topic/presence', ...)` in `onConnect`, immediately publishes to `/app/presence/sync` to request a fresh broadcast while guaranteed to be subscribed

## UAT Results

10/10 tests passed. Two-tab live verification confirmed:
- Realtime join: second user appears in first tab's list within ~1 second ✓
- Self-filter: own name never appears in own list ✓
- Logout flow: token cleared, ProtectedRoute guards /users ✓
- Realtime logout: disconnected user disappears from other tab's list within ~5 seconds ✓

## Phase 3 Success Criteria

1. Login/Register screen functional and styled → ✓ (UI-01, Plan 02)
2. Online user list shows connected users with Call button → ✓ (UI-02, Plan 03)
3. Second tab login updates first tab's list without refresh → ✓ (verified live)
4. Logout returns to login screen, name disappears from other lists → ✓ (verified live)

## Self-Check: PASSED

- [x] `frontend/src/pages/UserListPage.tsx` — 150 lines, all required imports and copy strings present
- [x] `frontend/src/contexts/WebSocketContext.tsx` — race condition fix applied
- [x] `backend/.../PresenceController.java` — /app/presence/sync endpoint
- [x] 17/17 tests pass (4 AuthContext + 7 AuthPage + 6 UserListPage)
- [x] UAT complete: 10/10 passed

---
*Phase: 03-react-auth-user-list*
*Completed: 2026-05-26*
