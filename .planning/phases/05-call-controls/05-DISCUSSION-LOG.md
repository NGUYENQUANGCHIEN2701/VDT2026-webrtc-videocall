# Phase 5: Call Controls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 05-call-controls
**Areas discussed:** Control bar layout, Toggle state visuals, Timer + status placement, Toast upgrade (Sonner)

---

## Control Bar Layout

### Timer + status placement

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay trên video | Timer top-center, status dưới timer — overlay lên remote video (Zoom/Meet style). Control bar chỉ có 3 buttons. | ✓ |
| Tất cả trong control bar | Control bar cao hơn, 2 hàng: timer+status ở trên, 3 buttons ở dưới. Không có overlay. | |

**User's choice:** Overlay trên video
**Notes:** Timer top-center, status badge dưới timer, cùng backdrop-blur style. Peer name vẫn top-left kế thừa từ Phase 4.

---

### 3-button arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| [Mic] [End Call] [Camera] | End Call ở giữa nổi bật hơn, Mic trái, Camera phải — tương tự Google Meet. | ✓ |
| [Mic] [Camera] \| [End Call] | Mic + Camera cụm trái, End Call độc lập phải — phân biệt rõ action ngắt kết nối vs toggle. | |

**User's choice:** [Mic] [End Call] [Camera]
**Notes:** End Call lớn hơn (h-12 w-12), Mic/Camera nhỏ hơn (h-10 w-10).

---

### Timer + status arrangement on overlay

| Option | Description | Selected |
|--------|-------------|----------|
| Timer top-center, status dưới timer | 02:34 ở trên, ● Connected ở dưới — 2 dòng riêng biệt. | ✓ |
| Timer + status cùng 1 hàng | "02:34 ● Connected" trên cùng 1 badge/chip, top-center. | |

**User's choice:** Timer top-center, status dưới timer
**Notes:** Tiết kiệm khoảng trống ngang, rõ ràng hơn khi text status dài ("Reconnecting...").

---

## Toggle State Visuals

### Mic button khi muted

| Option | Description | Selected |
|--------|-------------|----------|
| Icon swap + nền đỏ | Mic → MicOff icon + bg-red-600 | ✓ |
| Chỉ icon swap | Mic → MicOff, nền giữ slate | |
| Icon swap + ring đỏ | Icon đổi + viền đỏ xung quanh khi muted | |

**User's choice:** Icon swap + nền đỏ
**Notes:** Rõ ràng nhất khi nhìn thoáng, nhất quán với destructive color scheme.

---

### Camera button khi off

| Option | Description | Selected |
|--------|-------------|----------|
| Giống mic: Video → VideoOff + nền đỏ | Nhất quán với mic pattern | ✓ |
| Video → VideoOff + nền slate (không đỏ) | Phân biệt: đỏ chỉ dành riêng cho mic mute và end call | |

**User's choice:** Giống mic: Video → VideoOff + nền đỏ
**Notes:** Nhất quán — user không cần nhớ 2 convention khác nhau cho 2 toggle.

---

## Timer + Status Placement

### Connection status màu sắc

| Option | Description | Selected |
|--------|-------------|----------|
| Màu semantic | Connecting: amber-400, Connected: emerald-400, Reconnecting: amber-400, Failed: red-400 | ✓ |
| Chỉ dot không text | Chấm màu nhỏ không có chữ | |

**User's choice:** Màu semantic
**Notes:** Nhất quán với toast color scheme đã dùng trong Phase 4 (amber cho warning, emerald cho success, red cho error).

---

### Timer start trigger

| Option | Description | Selected |
|--------|-------------|----------|
| callStatus === 'connected' | ICE connection thực sự established | ✓ |
| Navigate đến /call | Bắt đầu ngay khi vào trang | |

**User's choice:** callStatus === 'connected'
**Notes:** Chính xác nhất — đếm thời gian thực sự connected, không phải kể từ khi navigation.

---

## Toast Upgrade (Sonner)

| Option | Description | Selected |
|--------|-------------|----------|
| Giữ minimal toast array | Hiện tại hoạt động ổn, không cần dependency mới | ✓ |
| Upgrade lên shadcn Sonner | Stacking, auto-dismiss, tái sử dụng cho phases sau | |

**User's choice:** Giữ minimal toast array
**Notes:** LAN demo không cần toast queue/stacking. Avoid unnecessary dependency.

---

## Claude's Discretion

- **Timer implementation:** `useCallTimer` custom hook vs inline state trong `CallPage` — planner chọn cách sạch nhất
- **ICE state tracking:** Thêm `iceState` vào `CallContext` state (centralized) vs đọc từ `pcRef.current` trong `CallPage` — planner chọn
- **Reconnecting pulse animation:** `animate-pulse` trên status dot nếu đơn giản, bỏ nếu cần thêm logic phức tạp
- **Mute indicator trên PiP:** Nice-to-have small MicOff icon overlay trên local video khi muted — planner quyết định

## Deferred Ideas

- Sonner toast upgrade — minimal array đủ dùng; có thể làm sau Phase 8 nếu cần
- Draggable PiP self-view — CTRL-06 không yêu cầu drag
- `restartIce()` reconnection — vẫn dùng teardown strategy từ Phase 4; Phase 5 UAT sẽ cho biết có cần không
