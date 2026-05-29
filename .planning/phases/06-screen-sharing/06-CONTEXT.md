# Phase 6: Screen Sharing - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Thêm tính năng chia sẻ màn hình vào cuộc gọi 1-1 đang active. User nhấn Share Screen → `getDisplayMedia()` → `sender.replaceTrack(screenTrack)` → remote tự thấy ngay. Nhấn lại hoặc dùng browser native stop → `track.onended` → `replaceTrack(cameraTrack)` restore về camera. Toàn bộ là **frontend-only** — không cần thay đổi backend hay signaling.

**Delivers:** SCRN-01 (share screen button), SCRN-02 (`sender.replaceTrack()` — kỹ thuật đã locked), SCRN-03 (stop sharing → camera restored), SCRN-04 (remote thấy tự động).

**Not in Phase 6:** Group call screen sharing (Phase 7), recording screen share (Phase 8), virtual camera/video filters.

</domain>

<decisions>
## Implementation Decisions

### Control Bar Layout
- **D-01:** Control bar mở rộng thành 4 buttons: `[Mic] [Share] [End Call] [Camera]`. Share nằm ở vị trí thứ 2 từ trái — symmetric layout với End Call làm anchor trung tâm (2 buttons mỗi bên).
- **D-02:** Share button size kế thừa pattern Mic/Camera: `h-10 w-10 rounded-full`. End Call vẫn `h-12 w-12 rounded-full bg-red-600` làm anchor.

### Share Button State Visualization
- **D-03:** Single toggle button. Khi **không** share: `Monitor` icon + `bg-slate-700 hover:bg-slate-600` (idle state, nhất quán với Mic/Camera active state). Khi **đang** share: `MonitorOff` icon + `bg-emerald-600 hover:bg-emerald-700` (active = sharing, màu emerald phân biệt với red = error/muted).

### PiP During Screen Share
- **D-04:** Local PiP **giữ nguyên** `srcObject = localStream` (camera feed). User vẫn thấy mặt mình khi chia sẻ màn hình — giống Google Meet / Teams pattern. Không thêm indicator hay label lên PiP.

### Camera Button Behavior While Sharing
- **D-05:** Camera button **disabled** (`opacity-50 cursor-not-allowed`) khi `isScreenSharing === true`. Remote đang thấy màn hình — toggle camera không có ý nghĩa với remote. Re-enable khi stop sharing.

### Stop Sharing — Browser Native Stop Button
- **D-06:** Lắng nghe `screenTrack.onended`. Khi event fires (user nhấn browser native "Stop sharing"): `replaceTrack(cameraTrack)` → reset `isScreenSharing = false` → Camera button re-enabled. Remote tự động thấy camera trở lại. Không teardown cuộc gọi.

### CallContext Extension
- **D-07:** Thêm vào `CallContextValue`: `isScreenSharing: boolean`, `startScreenShare: () => Promise<void>`, `stopScreenShare: () => void`. Pattern nhất quán với `isMuted`/`toggleMute` đã có.
- **D-08:** `teardown()` phải stop screen track nếu đang active (add vào teardown sequence, sau stop media tracks bước 2). Reset `isScreenSharing = false` trong teardown.

### Claude's Discretion
- Screen sender reference: tìm video sender qua `pcRef.current.getSenders().find(s => s.track?.kind === 'video')` — planner chọn cách lưu ref (local variable vs `screenSenderRef`).
- `getDisplayMedia` constraints: để browser default picker (không cần constraint cụ thể). `{ video: true }` là đủ.
- Icon: `Monitor` / `MonitorOff` từ lucide-react — check xem đã import chưa; nếu không có thì dùng `MonitorPlay` / `MonitorX` hoặc `Share2` tùy lucide version.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual & Design Contract (LOCKED)
- `.planning/phases/03-react-auth-user-list/03-UI-SPEC.md` — Baseline dark emerald theme: color palette, spacing scale, typography
- `.planning/phases/04-1-1-call-core/04-UI-SPEC.md` — CallPage layout (§5.3), control bar spec, color table (§4). Phase 6 extends §5.3.
- `.planning/phases/05-call-controls/05-CONTEXT.md` — Control bar decisions (D-01/D-02/D-03/D-04): button sizes, Mic/Camera pattern Phase 6 must be consistent with

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 6 covers SCRN-01 through SCRN-04 (Screen Sharing section). SCRN-02 explicitly locks `sender.replaceTrack()` technique.
- `.planning/ROADMAP.md` — Phase 6 success criteria (4 criteria)

### Existing Code (read before planning)
- `frontend/src/pages/CallPage.tsx` — File chính cần modify: thêm Share button vào control bar (line 148-180), disable Camera button logic khi `isScreenSharing`
- `frontend/src/contexts/CallContext.tsx` — File chính cần extend: thêm `isScreenSharing`, `startScreenShare`, `stopScreenShare`. `pcRef`, `localStreamRef`, `teardown()` đều đã có — pattern rõ ràng.

### Project Constraints
- `CLAUDE.md` §Technology Stack — React 18, Tailwind CSS 3.x, lucide-react, shadcn/ui. Không install package mới cho Phase 6 — Screen Capture API là browser native, không cần lib.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pcRef.current.getSenders()` — đã có trong `CallContext.tsx`, dùng để tìm video sender cho `replaceTrack()`
- `localStreamRef.current.getVideoTracks()[0]` — camera track đã accessible, dùng để restore sau khi stop share
- `Button` (shadcn) — đã install, dùng cho Share button với `h-10 w-10 rounded-full`
- `Monitor`, `MonitorOff` icons từ lucide-react — cần verify import; nếu không có thì `Share2` là fallback
- `teardown()` trong `CallContext` — cần extend để stop screen track nếu đang active

### Established Patterns
- Toggle state pattern: `isMuted`/`isCameraOff` + functional updater trong `useCallback` — `isScreenSharing` follow cùng pattern
- `oniceconnectionstatechange` handler cấu trúc — `onended` handler của screen track follow style tương tự
- `useEffect` watching callStatus để navigate — không cần thay đổi cho Phase 6
- Stale closure prevention: dùng ref cho callbacks trong event handlers

### Integration Points
- `CallContext.tsx` → thêm `isScreenSharing`, `startScreenShare`, `stopScreenShare` vào interface + Provider
- `CallPage.tsx` → control bar: thêm Share button, conditional disable Camera button
- Không có route mới, không có backend thay đổi, không có WebSocket messages mới

</code_context>

<specifics>
## Specific Ideas

- Control bar layout: `[Mic h-10] [Share h-10] ... [End Call h-12] ... [Camera h-10]`
- Share button idle: `bg-slate-700 hover:bg-slate-600` + `Monitor` icon
- Share button active (sharing): `bg-emerald-600 hover:bg-emerald-700` + `MonitorOff` icon
- Camera button khi share: thêm condition `|| isScreenSharing` vào disabled prop: `disabled={!hasVideoTracks || isScreenSharing}`
- `track.onended` handler: đặt trong `startScreenShare` function, gắn vào screenTrack sau khi `getDisplayMedia` thành công

</specifics>

<deferred>
## Deferred Ideas

- Screenshare trong group call — Phase 7 sẽ xử lý (cần replaceTrack trên nhiều senders)
- Annotation / whiteboard overlay khi share — COLLAB-03 trong v2 requirements, out of scope
- Hiển thị screen preview thumbnail trong PiP — user chọn không làm; giữ camera feed

</deferred>

---

*Phase: 06-screen-sharing*
*Context gathered: 2026-05-29*
