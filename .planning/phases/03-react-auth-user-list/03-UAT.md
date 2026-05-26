---
status: complete
phase: 03-react-auth-user-list
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-PLAN.md]
started: 2026-05-26T07:10:00Z
updated: 2026-05-26T07:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login with valid credentials
expected: At /login, enter valid username + password and click "Sign In". App navigates to /users. Header shows the username. No error visible.
result: pass

### 2. Register new account
expected: At /login, switch to the "Create Account" tab, enter a new username + matching passwords, click "Create Account". App navigates to /users. Header shows the new username.
result: pass

### 3. Login error — wrong password
expected: At /login, enter a valid username but the wrong password, click "Sign In". A destructive alert appears at the top of the card with "Invalid username or password." — no navigation occurs.
result: pass

### 4. User list header layout
expected: Logged in at /users. Header shows: VDT-WebRTC logo (emerald video icon + text) on the left; logged-in username in muted text + a "Logout" button on the right. Header is sticky at the top.
result: pass

### 5. Skeleton loading state
expected: Immediately after navigating to /users (or on a hard refresh), a loading state is visible with 3 skeleton/pulse rows inside the Online Users panel before the first presence message arrives.
result: pass

### 6. Empty state — no other users online
expected: When the logged-in user is the only one online, the Online Users panel shows the Users icon, "No one else is online" heading, and "Share the app link with a friend to start a call." body text — no user rows visible.
result: pass

### 7. Realtime join — second user appears automatically
expected: With Tab A logged in (showing empty state), open Tab B in a separate browser context (incognito) and log in as a different user. Within ~1 second, Tab A's list automatically shows the new user with: avatar circle (first letter uppercase), username, "● Online" badge, and a Call button — without any page refresh.
result: pass
note: "Race condition found and fixed during UAT — backend SessionConnectedEvent broadcast arrived before client SUBSCRIBE frame. Fixed by publishing /app/presence/sync after subscribe. New PresenceController added to backend."

### 8. Self-filter — own name not in the list
expected: With both Tab A (alice) and Tab B (bob) logged in, alice's list shows only "bob" and bob's list shows only "alice". Neither user sees their own name in the list (though the header still shows their own username).
result: pass

### 9. Logout flow — client-side cleanup
expected: Click "Logout". The app navigates to /login. DevTools → Application → Local Storage shows vdt_token is gone. Navigating to /users while logged out bounces back to /login (ProtectedRoute guard active).
result: pass

### 10. Realtime logout — user disappears from other tabs
expected: With alice and bob both online (Tab A = alice, Tab B = bob), bob clicks Logout. Within ~5 seconds, alice's Tab A transitions back to the empty state and bob's name is gone from the list — with no manual refresh.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — one race condition found during test 7 was diagnosed and fixed inline]
