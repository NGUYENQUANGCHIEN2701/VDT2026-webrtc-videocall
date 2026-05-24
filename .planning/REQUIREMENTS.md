# Requirements: VDT-WebRTC

**Defined:** 2026-05-24
**Core Value:** Hai người dùng trên cùng mạng LAN có thể thực hiện cuộc gọi video/audio realtime ổn định, bắt đầu từ login đến kết nối WebRTC thành công trong vài giây.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can register a new account with username and password
- [ ] **AUTH-02**: User can log in with username/password and receive a JWT token
- [ ] **AUTH-03**: User can log out; session is invalidated and user marked offline
- [ ] **AUTH-04**: JWT is used to authenticate both REST API calls and WebSocket connections

### Online Presence

- [ ] **PRES-01**: User can see a realtime list of currently online users (auto-updates on join/leave without page reload)
- [ ] **PRES-02**: User's online/offline status is automatically updated when they log in, log out, or disconnect

### Core Video Call (1-1)

- [ ] **CALL-01**: User can initiate a video call to any online user from the user list
- [ ] **CALL-02**: The callee receives an incoming call notification (modal with caller name, Accept and Reject buttons, ringtone audio)
- [ ] **CALL-03**: User can accept or reject an incoming call
- [ ] **CALL-04**: After acceptance, a WebRTC P2P video + audio connection is established between the two peers
- [ ] **CALL-05**: Signaling is performed via WebSocket (STOMP) exchanging SDP offer/answer and ICE candidates
- [ ] **CALL-06**: Google public STUN server is used for ICE candidate resolution
- [ ] **CALL-07**: Unanswered calls automatically cancel after ~30 seconds with a "No answer" notification
- [ ] **CALL-08**: Either party can cancel the call before connection is established

### Call Controls & UX

- [ ] **CTRL-01**: User can mute/unmute their microphone during a call
- [ ] **CTRL-02**: User can turn their camera on/off during a call
- [ ] **CTRL-03**: User can end the call at any time; all tracks and peer connections are cleaned up
- [ ] **CTRL-04**: A call duration timer is displayed once the connection is established
- [ ] **CTRL-05**: Connection status is shown during the call (Connecting... / Connected / Reconnecting... / Failed)
- [ ] **CTRL-06**: Local video self-view is shown as a small overlay (picture-in-picture style, mirrored)
- [ ] **CTRL-07**: Remote video is displayed as the dominant full-screen view with the remote user's name overlay

### UI Screens

- [ ] **UI-01**: Login/Register screen is functional and styled
- [ ] **UI-02**: Online user list screen displays connected users with call initiation button
- [ ] **UI-03**: 1-1 video call screen is stable with local/remote video and call controls bar

### Screen Sharing

- [ ] **SCRN-01**: User can share their screen during an active 1-1 or group call
- [ ] **SCRN-02**: Screen sharing replaces the video track via `sender.replaceTrack()` (no full renegotiation)
- [ ] **SCRN-03**: User can stop screen sharing and switch back to camera
- [ ] **SCRN-04**: Remote peer sees the screen share stream with no additional action required

### Group Call (Mesh P2P)

- [ ] **GRP-01**: User can initiate a group call by inviting multiple online users (3-5 participants)
- [ ] **GRP-02**: Each participant establishes a direct P2P WebRTC connection to every other participant (mesh topology)
- [ ] **GRP-03**: A new participant can join an existing group call and establish connections to all current participants
- [ ] **GRP-04**: A participant leaving the group call is removed gracefully without affecting remaining connections
- [ ] **GRP-05**: Group call UI displays all participant video streams in a dynamic grid layout

### Recording

- [ ] **REC-01**: User can start recording an active call (1-1 or group)
- [ ] **REC-02**: Recording captures both local and remote audio/video streams
- [ ] **REC-03**: User can stop recording; the file is automatically downloaded as a `.webm` file
- [ ] **REC-04**: A visible recording indicator (red dot + elapsed time) is shown during active recording

### Infrastructure & Deliverables

- [ ] **INFRA-01**: Full source code delivered (Spring Boot backend + React frontend)
- [ ] **INFRA-02**: Docker Compose file allows running the entire stack with a single command
- [ ] **INFRA-03**: Database migration scripts (Flyway) provide the versioned SQL schema as a deliverable
- [ ] **INFRA-04**: README documents prerequisites, setup steps, and demo instructions for LAN environment

---

## v2 Requirements

### Authentication Enhancements

- **AUTH-V2-01**: Refresh token support for automatic JWT renewal
- **AUTH-V2-02**: OAuth login (Google, GitHub)
- **AUTH-V2-03**: Two-factor authentication

### Call Quality & Monitoring

- **QUAL-01**: Visual call quality indicator showing ICE candidate type (host / srflx)
- **QUAL-02**: Active speaker detection in group call (enlarge loudest speaker's tile)
- **QUAL-03**: Network bandwidth adaptive quality

### Collaboration

- **COLLAB-01**: Text chat during call via WebRTC data channel
- **COLLAB-02**: File transfer during call
- **COLLAB-03**: Whiteboard / annotation during screen share

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| TURN server | Demo on LAN — STUN candidates always succeed; TURN adds infra complexity |
| SFU / MCU for group call | Requires separate media server (mediasoup, Janus); mesh P2P is sufficient for ≤5 peers |
| Server-side recording storage | Local `.webm` download is sufficient; server storage adds backend complexity |
| Cloud / internet deployment | Out of stated scope; LAN demo is the target environment |
| Mobile responsive layout | Desktop browser only; no mobile layout required |
| Push notifications (FCM/APNS) | Browser WebSocket is sufficient while app is open |
| Virtual backgrounds / video filters | Requires WebGL/TensorFlow.js; massive scope expansion |
| End-to-end encryption beyond WebRTC defaults | DTLS/SRTP handled natively by browser; no additional implementation |
| User profile / avatar upload | Not mentioned in requirements; adds storage complexity |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| PRES-01 | Phase 2 | Pending |
| PRES-02 | Phase 2 | Pending |
| CALL-01 | Phase 4 | Pending |
| CALL-02 | Phase 4 | Pending |
| CALL-03 | Phase 4 | Pending |
| CALL-04 | Phase 4 | Pending |
| CALL-05 | Phase 2 | Pending |
| CALL-06 | Phase 2 | Pending |
| CALL-07 | Phase 4 | Pending |
| CALL-08 | Phase 4 | Pending |
| CTRL-01 | Phase 5 | Pending |
| CTRL-02 | Phase 5 | Pending |
| CTRL-03 | Phase 5 | Pending |
| CTRL-04 | Phase 5 | Pending |
| CTRL-05 | Phase 5 | Pending |
| CTRL-06 | Phase 5 | Pending |
| CTRL-07 | Phase 5 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 4 | Pending |
| SCRN-01 | Phase 6 | Pending |
| SCRN-02 | Phase 6 | Pending |
| SCRN-03 | Phase 6 | Pending |
| SCRN-04 | Phase 6 | Pending |
| GRP-01 | Phase 7 | Pending |
| GRP-02 | Phase 7 | Pending |
| GRP-03 | Phase 7 | Pending |
| GRP-04 | Phase 7 | Pending |
| GRP-05 | Phase 7 | Pending |
| REC-01 | Phase 8 | Pending |
| REC-02 | Phase 8 | Pending |
| REC-03 | Phase 8 | Pending |
| REC-04 | Phase 8 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 8 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41 (roadmap complete)
- Unmapped: 0

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after roadmap creation — all 41 requirements mapped to phases 1-8*
