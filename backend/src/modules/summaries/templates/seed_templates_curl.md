# Hướng dẫn tạo Template Hệ thống qua cURL

Để lưu trữ các mẫu tóm tắt (templates) vào Cơ sở dữ liệu (Postgres), bạn hãy chạy các lệnh `curl` dưới đây trong Terminal của mình.

> [!IMPORTANT]
> **Trước khi chạy:**
> Bạn hãy sao chép JWT Token (ví dụ từ tab Network hoặc localStorage khi đăng nhập giao diện web) và thay thế vào vị trí của `<YOUR_JWT_TOKEN>` trong các lệnh dưới đây.

---

### 1. Mẫu "Họp dự án & Phân công" (Project Discussion)

```bash
curl 'http://localhost:3000/summary-templates' \
  -X 'POST' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_JWT_TOKEN>' \
  -d '{
    "name": "Họp dự án & Phân công",
    "description": "Dành cho các buổi họp định kỳ, tổng kết tiến độ dự án và cập nhật nhiệm vụ mới.",
    "purpose": "project_discussion",
    "summaryStyle": "detailed",
    "globalRules": "Không bị ảo giác hóa, những nội dung nào nếu không tìm thấy trong tóm tắt hay transcript cuộc họp thì không tự chế, chỉ cần trả lời khôn khéo như không có hoặc không được nhắc đến trong cuộc họp.",
    "sections": [
      {
        "name": "executive_summary",
        "label": "Tóm tắt điều hành",
        "blockType": "executive_summary",
        "description": "Tóm tắt bối cảnh và diễn biến chính cuộc họp",
        "aiInstructions": "Tóm tắt ngắn gọn 2-3 câu bối cảnh, diễn biến chính và không khí buổi họp cập nhật tiến độ.",
        "placeholders": "[AI tự động phân tích bối cảnh cuộc họp]",
        "order": 1
      },
      {
        "name": "todo_table",
        "label": "Bảng phân công nhiệm vụ",
        "blockType": "todo_table",
        "description": "Bảng chi tiết nhiệm vụ giao cho các thành viên",
        "aiInstructions": "Trích xuất tất cả các đầu việc được giao, người thực hiện và hạn chót. Trình bày dưới dạng bảng Markdown.",
        "placeholders": "| Nhiệm vụ | Người phụ trách | Hạn chót | Trạng thái |\\n| :--- | :--- | :--- | :--- |\\n| [Tên nhiệm vụ cụ thể] | [Tên người được giao] | [Hạn hoàn thành] | Chưa bắt đầu |",
        "order": 2
      },
      {
        "name": "decisions",
        "label": "Các quyết định thống nhất",
        "blockType": "decisions",
        "description": "Quyết định quan trọng đã thống nhất",
        "aiInstructions": "Liệt kê tất cả các quyết định, chính sách, hoặc giải pháp kỹ thuật đã thống nhất trong cuộc họp.",
        "placeholders": "- Quyết định 1: [Nội dung quyết định]\\n- Quyết định 2: [Nội dung quyết định]",
        "order": 3
      }
    ]
  }'
```

---

### 2. Mẫu "Thảo luận ý tưởng & Sáng tạo" (Brainstorming)

```bash
curl 'http://localhost:3000/summary-templates' \
  -X 'POST' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_JWT_TOKEN>' \
  -d '{
    "name": "Thảo luận ý tưởng & Sáng tạo",
    "description": "Mẫu tối ưu cho các buổi họp Brainstorming, tìm kiếm giải pháp mới và ghi nhận ý tưởng đột phá.",
    "purpose": "brainstorming",
    "summaryStyle": "detailed",
    "globalRules": "Không bị ảo giác hóa, chỉ lấy những ý tưởng thực tế được đề xuất và thảo luận trong cuộc họp.",
    "sections": [
      {
        "name": "brainstorm_context",
        "label": "Ý tưởng trung tâm & Bối cảnh",
        "blockType": "executive_summary",
        "description": "Chủ đề sáng tạo chính và mục tiêu cốt lõi",
        "aiInstructions": "Tóm tắt ngắn gọn chủ đề sáng tạo chính và mục tiêu cốt lõi của buổi thảo luận.",
        "placeholders": "[Bối cảnh thảo luận ý tưởng]",
        "order": 1
      },
      {
        "name": "proposed_ideas",
        "label": "Danh sách ý tưởng đề xuất",
        "blockType": "custom",
        "description": "Danh sách chi tiết các ý kiến sáng tạo",
        "aiInstructions": "Liệt kê tất cả các ý tưởng đã được thảo luận, ghi chú rõ người đề xuất và ưu/nhược điểm sơ bộ nếu có.",
        "placeholders": "- **[Tên ý tưởng]** (Đề xuất bởi: [Tên người]):\\n  * Chi tiết: [Mô tả ngắn]\\n  * Đánh giá: [Ưu điểm / Nhược điểm]",
        "order": 2
      },
      {
        "name": "action_plan",
        "label": "Kế hoạch thử nghiệm ý tưởng",
        "blockType": "action_items",
        "description": "Các bước hành động tiếp theo để triển khai ý tưởng",
        "aiInstructions": "Nêu rõ các bước hành động tiếp theo để thử nghiệm và triển khai các ý tưởng khả thi nhất.",
        "placeholders": "- [ ] [Bước hành động cụ thể] - [Người thực hiện]",
        "order": 3
      }
    ]
  }'
```

---

### 3. Mẫu "Đánh giá cải tiến (Retrospective)" (Retrospective)

```bash
curl 'http://localhost:3000/summary-templates' \
  -X 'POST' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_JWT_TOKEN>' \
  -d '{
    "name": "Đánh giá cải tiến (Retrospective)",
    "description": "Mẫu phân tích định kỳ sau mỗi Sprint hoặc dự án để cải tiến quy trình làm việc nhóm.",
    "purpose": "retrospective",
    "summaryStyle": "detailed",
    "globalRules": "Tập trung trung thực vào phản hồi của các thành viên, không tự bịa đặt các vấn đề hoặc điểm tốt không có trong transcript.",
    "sections": [
      {
        "name": "what_went_well",
        "label": "Điểm tốt (What Went Well)",
        "blockType": "custom",
        "description": "Những điểm sáng, quy trình hoạt động tốt",
        "aiInstructions": "Liệt kê những việc, quy trình hoặc hành động tích cực đã hoạt động hiệu quả trong giai đoạn qua.",
        "placeholders": "- **[Điểm sáng 1]**: [Chi tiết vì sao thành công]\\n- **[Điểm sáng 2]**: [Chi tiết vì sao thành công]",
        "order": 1
      },
      {
        "name": "what_to_improve",
        "label": "Điểm cần cải thiện (What Can Be Improved)",
        "blockType": "custom",
        "description": "Các rào cản, khó khăn hoặc nút thắt cổ chai",
        "aiInstructions": "Xác định các vấn đề, rào cản hoặc nút thắt cổ chai làm chậm tiến độ làm việc nhóm.",
        "placeholders": "- **[Rào cản 1]**: [Mô tả vấn đề và tác động]\\n- **[Rào cản 2]**: [Mô tả vấn đề và tác động]",
        "order": 2
      },
      {
        "name": "retro_actions",
        "label": "Hành động khắc phục & Cam kết mới",
        "blockType": "action_items",
        "description": "Cam kết hành động cụ thể cho chu kỳ tiếp theo",
        "aiInstructions": "Đưa ra các giải pháp và hành động cụ thể sẽ được áp dụng ngay trong Sprint tiếp theo để cải tiến.",
        "placeholders": "- [ ] [Hành động khắc phục] - Phụ trách: [Tên người]",
        "order": 3
      }
    ]
  }'
```

---

### 4. Mẫu "Gặp gỡ khách hàng & Sales Pitch" (Sales Pitch)

```bash
curl 'http://localhost:3000/summary-templates' \
  -X 'POST' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_JWT_TOKEN>' \
  -d '{
    "name": "Gặp gỡ khách hàng & Sales Pitch",
    "description": "Dành cho các buổi gặp gỡ đối tác, tìm hiểu nhu cầu khách hàng và đề xuất giải pháp.",
    "purpose": "sales_pitch",
    "summaryStyle": "detailed",
    "globalRules": "Trích xuất chính xác các mong muốn hoặc phàn nàn của khách hàng để làm căn cứ follow-up.",
    "sections": [
      {
        "name": "customer_pain_points",
        "label": "Nhu cầu & Nỗi đau của khách hàng",
        "blockType": "custom",
        "description": "Nhu cầu cụ thể và các khó khăn khách hàng đang gặp phải",
        "aiInstructions": "Phân tích và trích xuất những khó khăn, mong đợi, hoặc nhu cầu cốt lõi mà khách hàng đã chia sẻ.",
        "placeholders": "- **[Nhu cầu 1]**: [Mô tả nỗi đau hoặc mong muốn của đối tác]\\n- **[Nhu cầu 2]**: [Mô tả nỗi đau hoặc mong muốn của đối tác]",
        "order": 1
      },
      {
        "name": "proposed_solution",
        "label": "Giải pháp đề xuất & Cam kết giá trị",
        "blockType": "decisions",
        "description": "Lộ trình hợp tác và đề xuất giá trị từ phía ta",
        "aiInstructions": "Liệt kê các giải pháp, tính năng, hoặc lộ trình hợp tác mà phía ta đã đề xuất và khách hàng tỏ ý đồng tình.",
        "placeholders": "- Đề xuất 1: [Chi tiết giải pháp đề xuất]\\n- Đề xuất 2: [Chi tiết giải pháp đề xuất]",
        "order": 2
      },
      {
        "name": "sales_next_steps",
        "label": "Các bước theo sát & Hẹn gặp tiếp theo",
        "blockType": "action_items",
        "description": "Kế hoạch theo dõi (follow-up) và gửi báo giá tiếp theo",
        "aiInstructions": "Xác định các việc cần theo sát (follow-up) sau cuộc họp để thúc đẩy tiến độ ký hợp đồng.",
        "placeholders": "- [ ] [Gửi tài liệu báo giá/đề xuất] - Hạn chót: [Thời gian]\\n- [ ] [Lên lịch buổi demo tiếp theo]",
        "order": 3
      }
    ]
  }'
```

---

### 5. Mẫu "Đánh giá Phỏng vấn Tuyển dụng" (Recruitment Interview)

```bash
curl 'http://localhost:3000/summary-templates' \
  -X 'POST' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiOTZlMGU4MC00YzJmLTRjZjctOGY3NC1kYTZjNzBkZmMyOTMiLCJlbWFpbCI6InRoZWFuaHRvMDEwMUBnbWFpbC5jb20iLCJpYXQiOjE3Nzk4MTkzOTgsImV4cCI6MTc3OTkwNTc5OH0.d1CYo6ou9RkKb9zq4W9w3-YHYfOeoZLbcQ29KSi6S-U' \
  -d '{
    "name": "Đánh giá Phỏng vấn Tuyển dụng",
    "description": "Mẫu tóm tắt và đánh giá năng lực ứng viên dành cho hội đồng phỏng vấn và bộ phận nhân sự.",
    "purpose": "interview",
    "summaryStyle": "detailed",
    "globalRules": "Không bị ảo giác hóa, ghi nhận trung thực các phản hồi, câu trả lời và đánh giá kỹ năng của ứng viên có thực tế trong transcript cuộc họp phỏng vấn.",
    "sections": [
      {
        "name": "candidate_profile",
        "label": "Thông tin ứng viên & Ấn tượng đầu tiên",
        "blockType": "executive_summary",
        "description": "Tóm tắt thông tin ứng viên và cảm nhận ban đầu",
        "aiInstructions": "Tóm tắt ngắn gọn 2-3 câu về vị trí ứng tuyển, lý lịch sơ lược của ứng viên và cảm nhận ban đầu của hội đồng phỏng vấn về tác phong giao tiếp.",
        "placeholders": "[AI phân tích ấn tượng ban đầu về ứng viên]",
        "order": 1
      },
      {
        "name": "technical_evaluation",
        "label": "Đánh giá chuyên môn & Kỹ năng kỹ thuật",
        "blockType": "todo_table",
        "description": "Bảng chi tiết các kỹ năng chuyên môn được kiểm tra",
        "aiInstructions": "Trích xuất các câu hỏi kỹ thuật hoặc bài kiểm tra năng lực đã trao đổi. Trình bày dưới dạng bảng gồm kỹ năng, nhận xét của người phỏng vấn và đánh giá kết quả (Đạt / Chưa đạt / Xuất sắc).",
        "placeholders": "| Kỹ năng kiểm tra | Chi tiết câu hỏi / Tình huống | Nhận xét chuyên môn | Đánh giá |\\n| :--- | :--- | :--- | :--- |\\n| [Kỹ năng 1] | [Câu hỏi/Tình huống đưa ra] | [Tóm tắt câu trả lời & khả năng của ứng viên] | Đạt |",
        "order": 2
      },
      {
        "name": "interview_conclusion",
        "label": "Kết luận & Đề xuất hành động tiếp theo",
        "blockType": "decisions",
        "description": "Kết quả phỏng vấn chung và bước tiếp theo",
        "aiInstructions": "Nêu rõ kết luận chung của buổi phỏng vấn (Đồng ý tuyển dụng / Cân nhắc vòng sau / Từ chối) và các bước tiếp theo cần thực hiện (ví dụ: gửi bài test, hẹn gặp vòng 2, hoặc chuẩn bị Offer letter).",
        "placeholders": "- Quyết định đề xuất: [Nhận tuyển dụng / Cân nhắc / Từ chối]\\n- Hành động tiếp theo: [Gửi Offer Letter / Hẹn phỏng vấn vòng 2 / Gửi thư từ chối khách sáo] - Phụ trách: [Tên người]",
        "order": 3
      }
    ]
  }'
```
