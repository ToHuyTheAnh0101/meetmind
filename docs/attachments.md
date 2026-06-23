# Tài liệu kỹ thuật: Module Tệp đính kèm (Attachments)

Tài liệu này mô tả chi tiết kiến trúc, cơ sở dữ liệu, các API endpoints và trạng thái triển khai giao diện của tính năng Tệp đính kèm & Tài nguyên (Attachments & Resources) trong hệ thống MeetMind.

---

## 📌 Tổng quan tính năng

Tính năng Tệp đính kèm giúp người dùng lưu trữ, chia sẻ và truy cập các tài nguyên liên quan đến cuộc họp (ví dụ: slide trình chiếu, tài liệu hướng dẫn, tệp âm thanh, video, hoặc hình ảnh minh họa).
* **Phân loại tệp (Attachment Types):** Hệ thống phân loại tệp thành các nhóm chính: `document` (tài liệu), `audio` (âm thanh), `video` (video), `image` (hình ảnh), `link` (đường dẫn liên kết) và `other` (khác).
* **Được tải lên bởi thành viên (Uploader Context):** Ghi nhận rõ ràng ID người dùng đã tải lên tệp để phục vụ truy vết và quản lý quyền sở hữu.
* **Liên kết theo cuộc họp (Meeting Scope):** Tất cả tệp đính kèm đều liên kết trực tiếp với một cuộc họp cụ thể qua `meetingId`.

---

## 🏗️ Trạng thái Triển khai (Implementation Progress)

> [!NOTE]
> Tính năng Tệp đính kèm đã được triển khai hoàn chỉnh ở cả **Backend** và **Frontend** (bao gồm tải lên tệp, quản lý danh sách tài nguyên và tải xuống tệp).

---

## 🗄️ Cơ sở dữ liệu (Database Schema)

Thực thể Tệp đính kèm được định nghĩa trong module `attachments`:

### `Attachment` (Bảng `attachments`)

| Tên cột | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Khóa chính của tệp đính kèm |
| `meetingId` | `uuid` (FK, Index) | Liên kết với bảng `meetings` |
| `uploadedByUserId` | `uuid` (FK) | Liên kết với bảng `users` (người tải lên) |
| `type` | `enum` | Loại tệp: `document`, `audio`, `link`, `video`, `image`, `other` |
| `fileName` | `varchar` | Tên tệp tin gốc |
| `fileUrl` | `varchar` | Đường dẫn lưu trữ tệp (URL) |
| `fileSize` | `integer` | Dung lượng tệp tính bằng bytes |
| `mimeType` | `varchar` | Định dạng MIME của tệp (Ví dụ: `application/pdf`, `image/png`) |
| `createdAt` | `timestamp` | Thời gian tải lên |
| `updatedAt` | `timestamp` | Thời gian cập nhật |

---

## 🔌 API Endpoints (Backend)

Các API endpoints quản lý tệp đính kèm nằm dưới tiền tố `/meetings/:meetingId/attachments` (Yêu cầu JWT Token xác thực ở Authorization header):

### 1. Lấy danh sách tệp đính kèm của cuộc họp
* **Endpoint:** `GET /meetings/:meetingId/attachments`
* **Phản hồi:** Danh sách toàn bộ các đối tượng `Attachment` liên quan đến `meetingId` đó.

### 2. Lấy chi tiết tệp đính kèm cụ thể
* **Endpoint:** `GET /meetings/:meetingId/attachments/:id`
* **Phản hồi:** Đối tượng `Attachment` tương ứng với ID.

### 3. Đăng ký tệp đính kèm mới
* **Endpoint:** `POST /meetings/:meetingId/attachments`
* **Body:**
  ```json
  {
    "fileName": "slide_thuyet_trinh.pdf",
    "fileUrl": "https://storage.meetmind.com/files/slide_thuyet_trinh.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "type": "document"
  }
  ```
* **Phản hồi:** Đối tượng `Attachment` đã lưu thành công vào cơ sở dữ liệu.

### 4. Xóa tệp đính kèm
* **Endpoint:** `DELETE /meetings/:meetingId/attachments/:id`
* **Phản hồi:** 204 No Content. Xóa bản ghi trong cơ sở dữ liệu.

---

## 💻 Thành phần Giao diện (Frontend)

Mã nguồn Frontend quản lý tệp đính kèm tại các tệp sau:
* **[AttachmentManager.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/pages/details/permissions/AttachmentManager.tsx):**
  * Giao diện quản lý tệp tin cho phép kéo thả (drag-and-drop), theo dõi tiến trình tải lên, hiển thị danh sách tệp đính kèm kèm kích thước, loại tệp, và hỗ trợ tải xuống (download) hoặc xóa tệp đính kèm với hộp xác nhận.
* **[MeetingGeneralForm.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/pages/details/MeetingGeneralForm.tsx):**
  * Nhúng thành phần `AttachmentManager` để quản lý các tệp đính kèm của cuộc họp ở trang chi tiết thông tin chung.
* **[MeetingSidebar.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/pages/room/MeetingSidebar.tsx):**
  * Tích hợp tab Tệp đính kèm trong phòng họp WebRTC, cho phép xem danh sách tài nguyên được chia sẻ và tải xuống trực tuyến trong cuộc họp.
