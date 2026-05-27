# Phase 5: Call Controls - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Hoàn thiện `CallPage` UI trong lúc gọi — thêm mic/camera toggle buttons vào control bar, call duration timer và connection status indicator overlaid lên video, và expose toggle state qua `CallContext`. Đây là pure frontend phase — `CallContext`, `CallPage`, và toàn bộ backend từ Phase 4 không cần thay đổi cấu trúc; chỉ mở rộng thêm state + UI.

**Delivers:** CTRL-01 (mic toggle), CTRL-02 (camera toggle), CTRL-03 (end call — đã có từ Phase 4, Phase 5 confirm complete), CTRL-04 (duration timer), CTRL-05 (connection status), CTRL-06 (self-view PiP — đã có từ Phase 4, Phase 5 confirm complete), CTRL-07 (remote username overlay — đã có từ Phase 4).

**Not in Phase 5:** Screen sharing (Phase 6), group call (Phase 7), recording (Phase 8), Sonner toast upgrade (deferred — keep minimal toast array), draggable PiP (not required by CTRL-06).

</domain>

<decisions>
## Implementation Decisions

### Control Bar Layout
- **D-01:** Control bar giữ 3 action buttons: `[Mic] [End Call] [Camera]`. End Call ở giữa (red, `h-12 w-12 rounded-full bg-red-600` — kế thừa từ Phase 4 UI-SPEC). Mic bên trái, Camera bên phải, kích thước nhỏ hơn (`h-10 w-10 rounded-full`).
- **D-02:** Timer và connection status KHÔNG đặt trong control bar — overlay lên remote video (top area). Timer top-center, status badge dưới timer, cùng style `backdrop-blur-sm`. Peer name vẫn top-left như Phase 4.

### Toggle Button State Visualization
- **D-03:** Mic muted → icon đổi sang `MicOff` (lucide) + nền đổi sang `bg-red-600 hover:bg-red-700`. Mic active → `Mic` icon + `bg-slate-700 hover:bg-slate-600`.
- **D-04:** Camera off → icon đổi sang `VideoOff` (lucide) + nền đổi sang `bg-red-600 hover:bg-red-700`. Camera active → `Video` icon + `bg-slate-700 hover:bg-slate-600`. Nhất quán với mic pattern.

### Timer
- **D-05:** Timer bắt đầu khi `callStatus === 'connected'` (set bởi `oniceconnectionstatechange` khi ICE state = 'connected' / 'completed'). Reset về 0 khi call kết thúc.
- **D-06:** Format: `MM:SS` (ví dụ `02:34`). Hiển thị `00:00` trước khi bắt đầu. Không cần `HH:MM:SS` cho demo.
- **D-07:** Timer logic là local state trong `CallPage` (hoặc custom hook `useCallTimer`) — không cần đưa vào `CallContext`. `setInterval(1000)` tracking seconds elapsed, cleared on unmount / callStatus trở về idle.

### Connection Status Indicator
- **D-08:** 4 trạng thái với màu sắc semantic:
  - `Connecting...` → `text-amber-400` + `●` amber dot
  - `Connected` → `text-emerald-400` + `●` emerald dot
  - `Reconnecting...` → `text-amber-400` + `●` amber dot (pulsing nếu dễ làm)
  - `Failed` → `text-red-400` + `●` red dot
- **D-09:** Map từ ICE connection state: `'new' | 'checking'` → "Connecting...", `'connected' | 'completed'` → "Connected", `'disconnected'` → "Reconnecting...", `'failed' | 'closed'` → "Failed".
- **D-10:** Status cần được expose từ `CallContext` (hoặc `CallPage` track ICE state trực tiếp qua `pcRef` — cần quyết định ở planning). Tùy chọn đơn giản: thêm `iceState` vào `CallContext` state, set trong `oniceconnectionstatechange` handler đã có.

### CallContext Extension
- **D-11:** `CallContext` cần expose thêm: `isMuted: boolean`, `isCameraOff: boolean`, `toggleMute: () => void`, `toggleCamera: () => void`. Các hàm này thao tác trực tiếp `localStreamRef.current.getAudioTracks()[0].enabled` và `localStreamRef.current.getVideoTracks()[0].enabled`.
- **D-12:** Khi `localStream` là audio-only (không có camera, fallback từ Phase 4), camera toggle button disable/hidden. Mic toggle vẫn hoạt động bình thường.

### Toast System
- **D-13:** Giữ nguyên minimal toast array hiện tại trong `CallContext`. Không install Sonner. Đủ cho LAN demo.

### Claude's Discretion
- Timer hook: `useCallTimer` (custom hook) hay inline state trong `CallPage` — planner chọn cách sạch nhất.
- ICE state tracking: thêm `iceState` vào `CallContext` state (sạch, centralized) vs. read từ `pcRef.current.iceConnectionState` trực tiếp trong `CallPage` — planner chọn.
- Animation cho status badge "Reconnecting...": pulse `animate-pulse` nếu đơn giản, bỏ nếu cần thêm logic phức tạp.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual & Design Contract (LOCKED)
- `.planning/phases/03-react-auth-user-list/03-UI-SPEC.md` — Baseline dark emerald theme: color palette, spacing scale, typography. Tất cả visual decisions Phase 5 phải kế thừa.
- `.planning/phases/04-1-1-call-core/04-UI-SPEC.md` — Phase 4 visual contract: CallPage layout (§5.3), control bar spec (§5.3 — hang-up only, Phase 5 extends), color table (§4), animation contracts (§7), copywriting (§8). Phase 5 extends §5.3 directly.

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 5 covers CTRL-01 through CTRL-07 (Call Controls & UX section)
- `.planning/ROADMAP.md` — Phase 5 success criteria (§Phase 5 section — 6 criteria)

### Existing Code (read before planning)
- `frontend/src/pages/CallPage.tsx` — File chính cần modify: control bar, overlay area, PiP. Hiện có hang-up button + minimal PiP + peer name overlay.
- `frontend/src/contexts/CallContext.tsx` — File chính cần extend: thêm `isMuted`, `isCameraOff`, `toggleMute`, `toggleCamera`, và optionally `iceState`. `teardown()`, `localStreamRef`, `oniceconnectionstatechange` handler đều đã có.
- `frontend/src/App.tsx` — Không cần thay đổi (toast + IncomingCallModal render ở đây đã đúng).

### Project Constraints
- `CLAUDE.md` §Technology Stack — React 18, Tailwind CSS 3.x, lucide-react, shadcn/ui (no new packages needed for Phase 5)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` (shadcn) — đã cài, dùng trong control bar cho mic/camera buttons (`h-10 w-10 rounded-full`)
- `Mic`, `MicOff`, `Video`, `VideoOff` icons (lucide-react) — check nếu đã import, thêm nếu thiếu
- `oniceconnectionstatechange` handler trong `createPeerConnection()` — đã set `setCallStatus('connected')` và `teardown()`. Phase 5 thêm `setIceState()` call tại đây.
- `localStreamRef.current` — track ref đã có, `getAudioTracks()[0].enabled` và `getVideoTracks()[0].enabled` là cách toggle mic/camera

### Established Patterns
- Context pattern: `createContext` + `Provider` + `useX()` hook — follow đúng như `CallContext.tsx` hiện có
- Ref pattern cho stale closure: `peerUsernameRef`, `localStreamRef` — toggle functions cần dùng ref, không phải state, để tránh stale closure
- `useEffect` watching `callStatus` trong `CallPage` — timer hook có thể follow pattern này, watch `callStatus === 'connected'`

### Integration Points
- `CallContext.tsx` → thêm `isMuted`, `isCameraOff`, `toggleMute`, `toggleCamera` vào `CallContextValue` interface và Provider
- `CallPage.tsx` → control bar: thêm Mic + Camera buttons với conditional icon/color; thêm timer overlay + status overlay tại top-center
- Không có route mới, không có backend thay đổi

</code_context>

<specifics>
## Specific Ideas

- Control bar layout: `[Mic h-10 w-10] ... [End Call h-12 w-12] ... [Camera h-10 w-10]` — End Call lớn và đỏ nổi bật, Mic/Camera nhỏ hơn và slate (khi active)
- Timer overlay: `absolute top-4 left-1/2 -translate-x-1/2` — top-center, `bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1`
- Status badge: ngay dưới timer, cùng backdrop style, với colored dot `●` trước text
- Muted state: `bg-red-600 hover:bg-red-700` + `MicOff` icon — user nhìn thoáng biết ngay mic đang tắt
- Camera off state: `bg-red-600 hover:bg-red-700` + `VideoOff` icon — nhất quán với mic

</specifics>

<deferred>
## Deferred Ideas

- Sonner toast upgrade — kept minimal toast array; upgrade có thể làm sau Phase 8 nếu cần
- Draggable PiP self-view — CTRL-06 chỉ yêu cầu "small mirrored overlay", không cần drag
- `restartIce()` reconnection (Phase 4 deferred this) — Phase 5 vẫn dùng teardown strategy; restartIce nếu cần thêm ở Phase 5+ sau khi UAT
- Mute indicator overlay trên PiP (small mic-off icon on local video when muted) — nice-to-have, planner quyết định

</deferred>

---

*Phase: 05-call-controls*
*Context gathered: 2026-05-27*
