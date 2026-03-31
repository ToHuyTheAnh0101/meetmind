# Kiến Trúc Thành Phần Của MeetMind

## 1. Các Thành Phần Chính

### Thành Phần Client (Frontend)
- **Thành phần UI**: Lưới Video, Hộp Chat, Thanh Điều Khiển (React/NextJS)
- **LiveKit Client SDK**: Quản lý kết nối WebRTC, bật/tắt cam, mic
- **Quản Lý Trạng Thái**: Quản lý trạng thái người dùng (Zustand/Redux)

### Thành Phần App Server (Backend)
- **Dịch Vụ Xác Thực**: Cấp phát Access Token cho người dùng vào phòng
- **Trình Quản Lý Phòng**: Quản lý tạo/xóa phòng họp từ Cơ Sở Dữ Liệu
- **Cổng API**: Cổng giao tiếp giữa Client và các dịch vụ nội bộ

### Thành Phần Media Thời Gian Thực
- **Máy Chủ LiveKit**: "Trái tim" hệ thống, xử lý luồng (SFU)
- **Redis**: Lưu trữ trạng thái phòng và người dùng hiện tại (State Store)

### Thành Phần Cơ Sở Dữ Liệu
- **PostgreSQL**: Lưu thông tin người dùng, lịch sử cuộc họp
- **S3 Storage**: Lưu trữ file recording từ Egress

## 2. Cách Vẽ Sơ Đồ (Luồng Giao Tiếp)

Bạn có thể dùng công cụ như Lucidchart, Draw.io (Diagrams.net) hoặc Figma. Sơ đồ nên thể hiện luồng từ trái qua phải hoặc từ trên xuống dưới:

Bước 1: Vẽ khối Client (Trái)
Vẽ một khung lớn tên là Client App (NextJS).

Bên trong chia nhỏ thành: Video Component, Chat Component, LiveKit SDK.

Bước 2: Vẽ khối Backend & Media (Giữa)
Vẽ khối App Server (NestJS/Node.js).

Vẽ khối LiveKit Server.

Vẽ khối Redis nằm cạnh LiveKit Server.

Bước 3: Vẽ khối Database (Phải)
Vẽ biểu tượng hình trụ cho Database.

## 3. Mô Tả Các Kết Nối

Đây là phần quan trọng nhất trong Component-based:

Client App ↔ App Server: Kết nối qua HTTPS/REST API (để lấy Token).

Client App ↔ LiveKit Server: Kết nối qua Websocket & WebRTC (UDP) (để truyền video).

App Server ↔ LiveKit Server: Kết nối qua Server SDK/Webhooks (để quản lý phòng).

LiveKit Server ↔ Redis: Kết nối nội bộ để đồng bộ dữ liệu.

## 4. Gợi Ý Cấu Trúc Hình Ảnh

```
[ Người dùng ] --(HTTPS)--> [ Cổng API / Máy Chủ Backend ] --(Cấp Token)--> [ Cơ Sở Dữ Liệu ]
      |                             |
      |                          (API Quản Trị)
      |                             |
      +-------(WebRTC/WS)------> [ Máy Chủ LiveKit (SFU) ] <------> [ Redis ]
                                    |
                                 [ Dịch Vụ Egress ] ----> [ Lưu Trữ S3 ]
```

## 5. Mẹo Để Sơ Đồ "Chuẩn" Báo Cáo

Sử dụng màu sắc: Hãy dùng cùng một tông màu cho các thành phần thuộc về Frontend, một tông màu cho Backend, và một màu riêng cho Hạ tầng LiveKit.

Chú thích Interface: Ở mỗi mũi tên nối giữa các Component, hãy ghi rõ giao thức (ví dụ: gRPC, REST, WebRTC).

Tính đóng gói: Hãy vẽ các khung bao quanh các Component có liên quan mật thiết để thể hiện tính Module.