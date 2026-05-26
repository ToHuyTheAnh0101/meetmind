# Meeting Session Plan

## Why & What
- Why: Cân bằng giữa trải nghiệm người dùng và tính toàn vẹn dữ liệu. Người dùng cần một link cố định để vào họp nhanh (good UX), nhưng các kết quả phân tích (transcript, AI summary, recordings, Q&A) cần được tách riêng theo từng lần ghi nhận để tránh ghi đè/ô nhiễm dữ liệu.
- What: Thay đổi mô hình để tách rõ `Meeting` (phòng/link/config chung) và `Session` (một lần ghi nhận có recording/transcript/summary). Đặc biệt, session chỉ khởi tạo khi host bắt đầu hành động ghi âm/ghi hình (start record), không khởi tạo khi người dùng chỉ vào/ra.

## Goal
Chuyển hệ thống họp sang mô hình:
- `Meeting` giữ cấu hình chung và link cố định
- `Session` đại diện cho từng lần họp/ghi nhận thực tế
- Dữ liệu AI, transcript, recording, Q&A, poll bám theo session

## Core Decisions
- Không tạo session chỉ vì người dùng vào rồi thoát ra.
- Session chỉ được tạo khi host bắt đầu record.
- Khi session đã end thì đóng hẳn session đó.
- Meeting link không bị khóa vĩnh viễn sau khi session end; link có thể dùng lại để tạo session mới.
- Không dùng cơ chế reopen session đã end.
- Session dùng chung cấu hình của meeting cha.

## Data Model Direction
### Meeting
Giữ các trường cấu hình chung:
- title
- description
- accessType
- waitingRoomEnabled
- muteOnJoin
- allowDisplayNameEdit
- isQaEnabled
- isAnonymousAllowed
- inviteeEmails
- reminderMinutes
- password
- organizerId
- link / room identifier

### Session
Giữ dữ liệu theo từng lần họp:
- actualStartTime
- actualEndTime
- status
- recordingUrl
- transcript
- summary
- QA history
- poll results
- participant history
- meeting events

## Implementation Plan
### Phase 1 - Trigger Session
- Xác định event bắt đầu session từ UI/backend.
- Session chỉ tạo khi host bấm bắt đầu record.
- Join/leave không sinh session mới.

### Phase 2 - Split Data Responsibilities
- Giữ cấu hình chung ở Meeting.
- Chuyển dữ liệu phát sinh theo lần họp sang Session.
- Gắn AI summary, transcript, recording, Q&A vào session.

### Phase 3 - Update Meeting Lifecycle
- End session chỉ đóng session hiện tại.
- Meeting/link vẫn tồn tại để tạo session mới về sau.
- Nếu người dùng họp lại cùng link, hệ thống tạo session mới.

### Phase 4 - UI Update
- Màn chi tiết meeting hiển thị cấu hình chung.
- Hiển thị danh sách session theo meeting.
- Có nút bắt đầu session / record rõ ràng.

### Phase 5 - Documentation Update
- Cập nhật use case thiết lập cuộc họp.
- Cập nhật luồng start/end/session/summary.
- Cập nhật ERD và mô tả nghiệp vụ theo mô hình meeting-session.

## Out of Scope For Now
- Reopen session đã end.
- Khóa vĩnh viễn meeting link sau khi session kết thúc.
- Refactor sâu toàn bộ tính năng hiện có trong một lần.

## Expected Outcome
- UX vẫn gọn vì người dùng có một link quen thuộc.
- Dữ liệu không bị lẫn giữa các lần họp.
- AI summary và lịch sử họp được gắn đúng từng session.
- Báo cáo chỉ cần sửa theo hướng bổ sung mô hình session, không phải đập lại toàn bộ.
