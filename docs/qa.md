# Tài liệu kỹ thuật: Module Hỏi & Đáp (Q&A)

Tài liệu này mô tả chi tiết kiến trúc, cơ sở dữ liệu, các API endpoints và thành phần giao diện của tính năng Hỏi & Đáp (Q&A / Discussion) trong hệ thống MeetMind.

---

## 📌 Tổng quan tính năng

Tính năng Hỏi & Đáp cho phép người dùng tương tác trong cuộc họp thông qua các câu hỏi và câu trả lời. Hệ thống hỗ trợ:
* **Hỏi đáp định hướng (Host Q&A):** Người điều hành (Host/Co-host) tạo câu hỏi thảo luận cho cả phòng và người tham gia (Audience) phản hồi câu hỏi đó.
* **Hỏi đáp tự do (Audience Q&A):** Người tham gia đặt câu hỏi trực tiếp cho người điều hành (hiện tại logic code Backend hỗ trợ phân loại qua trường `type` nhưng luồng hoạt động chính đang tập trung vào `host_qa`).
* **Bảo mật phản hồi (Response Privacy):** Người tham gia thông thường chỉ xem được câu trả lời của chính họ cho câu hỏi của Host. Host và Co-host có đặc quyền xem tất cả các câu trả lời của tất cả thành viên trong cuộc họp.
* **Đồng bộ thời gian thực (Real-time Synchronization):** Sử dụng kênh truyền dữ liệu LiveKit Data Channel để thông báo thay đổi trạng thái câu hỏi, kích hoạt làm mới giao diện ngay lập tức cho các bên tham gia.

---

## 🏗️ Kiến trúc & Luồng hoạt động (Workflows)

### 1. Luồng Host tạo câu hỏi và Khán giả phản hồi
```mermaid
sequenceDiagram
    participant Host as Host (Client)
    participant Backend as NestJS API
    participant DB as Database
    participant LiveKit as LiveKit Data Channel
    participant Participant as Participant (Client)

    Host->>Backend: POST /meetings/:meetingId/qa (Tạo câu hỏi thảo luận)
    Backend->>DB: Lưu câu hỏi (type = host_qa, status = pending)
    Backend-->>Host: Trả về thông tin câu hỏi mới
    Host->>LiveKit: Gửi tin nhắn Broadcast: { type: 'QA_UPDATED' }
    LiveKit-->>Participant: Nhận tin nhắn -> Kích hoạt event 'refresh-qa'
    Participant->>Backend: GET /meetings/:meetingId/qa
    Backend-->>Participant: Trả về danh sách câu hỏi mới nhất
    
    Participant->>Backend: POST /meetings/:meetingId/qa/:questionId/answers (Trả lời câu hỏi)
    Backend->>DB: Lưu câu trả lời & Cập nhật trạng thái câu hỏi thành answered
    Backend-->>Participant: Trả về câu trả lời thành công
    Participant->>LiveKit: Gửi tin nhắn Broadcast: { type: 'QA_UPDATED' }
    LiveKit-->>Host: Nhận tin nhắn -> Kích hoạt event 'refresh-qa'
```

### 2. Luồng bảo mật hiển thị câu trả lời (Filter logic)
* **Frontend filtering (QuestionDetailModal.tsx):**
  * Đối với **Host/Co-host**: Hiển thị toàn bộ câu trả lời từ tất cả người tham gia cuộc họp.
  * Đối với **Khán giả (Regular Participant)**: Chỉ hiển thị các câu trả lời do chính họ gửi (`answeredByUserId === userId`).

---

## 🗄️ Cơ sở dữ liệu (Database Schema)

Tính năng Hỏi & Đáp được quản lý qua hai bảng cơ sở dữ liệu chính:

### 1. `MeetingQuestion` (Bảng `meeting-questions`)
Lưu trữ thông tin chi tiết về các câu hỏi trong cuộc họp.

| Tên cột | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Khóa chính của câu hỏi |
| `sessionId` | `uuid` (FK, Index) | Liên kết với bảng `meeting-sessions` |
| `meetingId` | `uuid` (FK) | Liên kết với bảng `meetings` |
| `askedByUserId` | `uuid` (FK) | Liên kết với bảng `users` |
| `content` | `varchar` | Nội dung câu hỏi |
| `type` | `enum` | Loại câu hỏi: `host_qa` (Host hỏi khán giả) hoặc `audience_qa` (Khán giả hỏi Host) |
| `isAnonymous` | `boolean` | Chế độ ẩn danh (mặc định `false` cho câu hỏi thảo luận) |
| `status` | `enum` | Trạng thái câu hỏi: `pending`, `answered`, `dismissed` |
| `createdAt` | `timestamp` | Thời gian tạo câu hỏi |
| `updatedAt` | `timestamp` | Thời gian cập nhật trạng thái |

### 2. `MeetingAnswer` (Bảng `meeting_answers`)
Lưu trữ các câu trả lời phản hồi cho từng câu hỏi.

| Tên cột | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Khóa chính của câu trả lời |
| `meetingId` | `uuid` (FK) | Liên kết với bảng `meetings` |
| `questionId` | `uuid` (FK) | Liên kết với bảng `meeting-questions` |
| `answeredByUserId` | `uuid` (FK) | Liên kết với bảng `users` (người trả lời) |
| `content` | `text` | Nội dung văn bản câu trả lời |
| `createdAt` | `timestamp` | Thời gian gửi câu trả lời |

---

## 🔌 API Endpoints

Mọi API nằm dưới tiền tố `/meetings/:meetingId/qa` (Yêu cầu Authorization header kèm JWT Token):

### 1. Lấy danh sách câu hỏi
* **Endpoint:** `GET /meetings/:meetingId/qa`
* **Phản hồi:** Danh sách các câu hỏi thảo luận (`host_qa`) của cuộc họp kèm danh sách câu trả lời liên kết.

### 2. Tạo câu hỏi thảo luận mới
* **Endpoint:** `POST /meetings/:meetingId/qa`
* **Body:**
  ```json
  {
    "content": "Theo bạn, giải pháp tối ưu nhất cho vấn đề hiệu năng là gì?",
    "type": "host_qa",
    "isAnonymous": false
  }
  ```
* **Phản hồi:** Trả về đối tượng `MeetingQuestion` đã được lưu vào cơ sở dữ liệu.

### 3. Cập nhật trạng thái câu hỏi
* **Endpoint:** `PATCH /meetings/:meetingId/qa/:id/status`
* **Body:**
  ```json
  {
    "status": "dismissed" // hoặc "answered", "pending"
  }
  ```
* **Phản hồi:** Thông tin câu hỏi sau khi cập nhật trạng thái.

### 4. Gửi câu trả lời phản hồi
* **Endpoint:** `POST /meetings/:meetingId/qa/:id/answers`
* **Body:**
  ```json
  {
    "content": "Tôi nghĩ chúng ta nên sử dụng Redis Cache kết hợp với tối ưu chỉ mục index DB."
  }
  ```
* **Phản hồi:** Trả về đối tượng `MeetingAnswer` vừa tạo.

---

## 💻 Thành phần Giao diện & Hooks (Frontend)

Mã nguồn frontend của module Hỏi & Đáp được triển khai tại:

### 1. Thành phần giao diện chính
* **[QATab.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/components/room/QATab.tsx):**
  * Hiển thị danh sách câu hỏi thảo luận dạng dòng thời gian.
  * Form nhập câu hỏi lớn dành riêng cho Host (`hasManagePrivilege === true`).
  * Nút "Trả lời" (Reply) và trạng thái hiển thị đã trả lời (badge "Đã trả lời" màu xanh lá cây).
* **[QuestionDetailModal.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/components/room/QuestionDetailModal.tsx):**
  * Modal chi tiết cho từng câu hỏi cụ thể.
  * Tách biệt logic phân quyền hiển thị câu trả lời: lọc câu trả lời của khán giả thông thường so với hiển thị toàn bộ cho Host/Co-host.
  * Tích hợp form gửi câu trả lời nhanh.

### 2. Cơ chế đồng bộ dữ liệu thời gian thực
* Sử dụng hook `useDataChannel` của LiveKit Client:
  * Khi gửi câu hỏi hoặc câu trả lời mới thành công, client phát đi sự kiện `QA_UPDATED` trên kênh LiveKit Data Channel.
  * Component [DataHandler.tsx](file:///home/theanh/meetmind/frontend/src/features/meetings/components/room/DataHandler.tsx) (hoặc tương tự) lắng nghe sự kiện từ kênh dữ liệu và phát ra một Custom Event cục bộ trong tab trình duyệt mang tên `refresh-qa`.
  * `QATab.tsx` lắng nghe sự kiện `refresh-qa` và thực hiện `queryClient.invalidateQueries(['questions', meetingId])` để làm mới danh sách hiển thị tự động mà không cần tải lại trang.
