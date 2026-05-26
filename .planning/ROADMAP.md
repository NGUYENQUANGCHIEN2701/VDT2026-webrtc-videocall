# Roadmap: VDT-WebRTC

## Overview

Eight phases deliver a WebRTC video call application from backend foundation to a fully documented, Dockerized deliverable. Each phase produces a coherent, testable capability. The first four phases establish the working 1-1 video call (the core demo); the final four add screen sharing, group call, recording, and packaging. Every phase is runnable end-to-end before the next begins.

## Phases

- [x] **Phase 1: Backend Foundation** - REST API + JWT auth + database schema; server accepts registrations and logins
- [x] **Phase 2: WebSocket Infrastructure** - STOMP signaling relay + presence service; online user list broadcasts in realtime (completed 2026-05-25)
- [x] **Phase 3: React Auth + User List** - Login/Register UI + live user list; a user can open the app and see who is online (completed 2026-05-26)
- [ ] **Phase 4: 1-1 Call Core** - Full WebRTC P2P video call end-to-end; two users can call each other and see video
- [ ] **Phase 5: Call Controls** - Mic/camera toggles, end-call, duration timer, connection status, self-view; all UX controls work during a live call
- [ ] **Phase 6: Screen Sharing** - Share screen during a call with no renegotiation; remote peer sees the screen automatically
- [ ] **Phase 7: Group Call (Mesh)** - 3-5 participant group calls over mesh P2P with dynamic grid UI
- [ ] **Phase 8: Recording + Deliverables** - Local call recording + Docker Compose + README; project is fully packaged for submission

## Phase Details

### Phase 1: Backend Foundation

**Goal:** A user can register an account, log in, and receive a JWT token that authenticates both REST and WebSocket requests
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-01, INFRA-03
**Success Criteria** (what must be TRUE):

  1. A new user can POST to `/api/auth/register` with username + password and receive a success response
  2. A registered user can POST to `/api/auth/login` and receive a valid JWT token in the response body
  3. An authenticated request carrying the JWT reaches protected REST endpoints without a 401
  4. Logging out marks the user as offline (status reflected in the database)
  5. Flyway migration scripts exist and run automatically on startup, creating the versioned schema

**Plans:** 3 plansPlans:
**Wave 1**

- [x] 01-01-PLAN.md — Project scaffold (Maven, application.yml, Flyway V1, User entity/repo, Dockerfile, FlywayMigrationTest)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Security infrastructure (JwtService, JwtAuthenticationFilter, CustomUserDetailsService, SecurityConfig, GlobalExceptionHandler)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Auth endpoints (DTOs, AuthService, AuthController, GET /api/users/me, AuthControllerTest)

**UI hint:** no

### Phase 2: WebSocket Infrastructure

**Goal:** The backend can relay signaling messages between clients and broadcast realtime presence so clients know who is online
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** PRES-01, PRES-02, CALL-05, CALL-06
**Success Criteria** (what must be TRUE):

  1. A client authenticating the STOMP CONNECT frame with a valid JWT is accepted; an invalid JWT is rejected
  2. When a user connects, all other connected clients receive a `/topic/presence` update listing them as online
  3. When a user disconnects, all other clients receive a presence update removing them within seconds
  4. A signaling message sent to `/app/signal` is routed to the correct recipient's private queue using the JWT principal as the sender identity

**Plans:** 3/3 plans complete
**UI hint:** no

### Phase 3: React Auth + User List

**Goal:** A user can open the browser app, register or log in, and see a live list of online users that updates without a page reload
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** UI-01, UI-02
**Success Criteria** (what must be TRUE):

  1. The Login/Register screen is functional and styled; submitting valid credentials logs the user in and navigates to the user list
  2. The online user list screen shows currently connected users with a visible call initiation button next to each name
  3. When a second browser tab logs in, the first tab's user list updates automatically (no refresh required)
  4. When a user logs out, the app returns to the login screen and their name disappears from other users' lists

**Plans:** 3/3 plans complete

**Wave 0**

- [x] 03-01-PLAN.md — Project scaffold (Vite+TS+Tailwind v3+shadcn@2.3.0), all runtime deps, AuthContext, WebSocketContext, ProtectedRoute, Axios interceptor, test infrastructure with stubs

**Wave 1** *(blocked on Wave 0)*

- [x] 03-02-PLAN.md — UI-01 vertical slice: Login/Register tabbed AuthPage with API integration, error states, STOMP connect on login success

**Wave 2** *(blocked on Wave 1)*

- [x] 03-03-PLAN.md — UI-02 vertical slice: UserListPage with skeleton, live presence rows, self-filter, empty state, logout flow

**UI hint:** yes

### Phase 4: 1-1 Call Core

**Goal:** Two users on the same LAN can initiate, accept, and complete a live WebRTC P2P video and audio call through the browser
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** CALL-01, CALL-02, CALL-03, CALL-04, CALL-07, CALL-08, UI-03
**Success Criteria** (what must be TRUE):

  1. Clicking "Call" next to an online user triggers an incoming call modal on the callee's screen showing the caller name, Accept and Reject buttons, and a ringtone
  2. Accepting the call establishes a WebRTC P2P connection; both users see and hear each other within a few seconds
  3. Rejecting a call dismisses the modal on both sides; the caller sees a "Call declined" message
  4. An unanswered call automatically cancels after ~30 seconds and both sides see a "No answer" notification
  5. Either party can cancel the call before connection is established; both sides return to idle state
  6. The video call screen is stable showing local and remote video streams simultaneously

**Plans:** 5 plans

**Wave 0**

- [ ] 04-01-PLAN.md — Test infrastructure (RTCPeerConnection global mock) + app shell refactor (BrowserRouter to main.tsx per D-04) + stub files (CallContext, IncomingCallModal, useRingtone, CallPage) + test scaffolds

**Wave 1** *(blocked on Wave 0)*

- [ ] 04-02-PLAN.md — CallContext full implementation: signal dispatch (D-05), state machine (D-03), WebRTC offer/answer/ICE buffering, 30s timeout, ICE recovery (D-08/D-09), teardown, toasts

**Wave 2** *(blocked on Wave 1 — parallel within wave)*

- [ ] 04-03-PLAN.md — IncomingCallModal + useRingtone (Web Audio API 800Hz beep per D-10/D-11) vertical slice for CALL-02 + CALL-03
- [ ] 04-04-PLAN.md — CallPage /call route with remote video full-screen + local PiP + hang-up button vertical slice for UI-03

**Wave 3** *(blocked on Wave 2)*

- [ ] 04-05-PLAN.md — UserListPage wire-up (startCall, outgoing-call state per UI-SPEC §5.2) + manual two-tab UAT covering all six Phase 4 success criteria

**UI hint:** yes

### Phase 5: Call Controls

**Goal:** During a live call, a user has full control over mic, camera, and ending the call; connection quality and call duration are visible at all times
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07
**Success Criteria** (what must be TRUE):

  1. Clicking the mute button silences outgoing audio; clicking again restores it; button icon reflects current state
  2. Clicking the camera toggle turns off the outgoing video track; clicking again restores it
  3. Clicking "End call" terminates the connection on both sides, stops all media tracks, and both users return to the user list
  4. A call duration timer starts counting from the moment the connection is established and stays visible throughout the call
  5. Connection status (Connecting / Connected / Reconnecting / Failed) is displayed as a visual indicator throughout the call lifecycle
  6. The user's own video appears as a small mirrored overlay; the remote user's video fills the dominant view with the remote user's name overlaid

**Plans:** TBD
**UI hint:** yes

### Phase 6: Screen Sharing

**Goal:** During an active 1-1 call, a user can share their screen and the remote peer sees it immediately without any extra action
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** SCRN-01, SCRN-02, SCRN-03, SCRN-04
**Success Criteria** (what must be TRUE):

  1. A "Share Screen" button appears during an active call; clicking it triggers the browser's native screen picker
  2. After selecting a screen/window, the remote peer's view switches to display the shared screen without a call drop or renegotiation
  3. Clicking "Stop Sharing" (or using the browser native stop button) restores the camera view on both sides
  4. The remote peer sees the screen share stream automatically with no additional action required on their end

**Plans:** TBD
**UI hint:** yes

### Phase 7: Group Call (Mesh)

**Goal:** Three to five users can join a shared group call where every participant sees and hears all other participants simultaneously via mesh P2P connections
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** GRP-01, GRP-02, GRP-03, GRP-04, GRP-05
**Success Criteria** (what must be TRUE):

  1. A user can initiate a group call by selecting multiple online users (up to 5 total); all invited users receive incoming call notifications
  2. When all participants accept, each browser establishes a direct P2P WebRTC connection to every other participant (N*(N-1)/2 connections total)
  3. A new participant joining an in-progress group call establishes connections to all current members and appears in the grid without disrupting existing connections
  4. A participant leaving the group call is removed from the grid within seconds; remaining participants' connections are unaffected
  5. All participant video streams are displayed in a dynamic grid layout that adjusts as participants join or leave

**Plans:** TBD
**UI hint:** yes

### Phase 8: Recording + Deliverables

**Goal:** A user can record a call locally and download it; the entire project runs with one command and is fully documented for demo and submission
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** REC-01, REC-02, REC-03, REC-04, INFRA-02, INFRA-04
**Success Criteria** (what must be TRUE):

  1. A "Record" button is available during an active call; clicking it starts recording and shows a red dot indicator with an elapsed timer
  2. Clicking "Stop Recording" automatically downloads a `.webm` file containing both local and remote audio and video from the call
  3. Running `docker compose up` from the repository root starts the entire stack (PostgreSQL + Spring Boot + React) without manual configuration
  4. The README clearly documents prerequisites, setup steps, and how to run a LAN demo; a person unfamiliar with the project can follow it successfully

**Plans:** TBD
**UI hint:** no

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 3/3 | Done | 2026-05-25 |
| 2. WebSocket Infrastructure | 3/3 | Complete    | 2026-05-25 |
| 3. React Auth + User List | 3/3 | Done | 2026-05-26 |
| 4. 1-1 Call Core | 0/? | Not started | - |
| 5. Call Controls | 0/? | Not started | - |
| 6. Screen Sharing | 0/? | Not started | - |
| 7. Group Call (Mesh) | 0/? | Not started | - |
| 8. Recording + Deliverables | 0/? | Not started | - |
