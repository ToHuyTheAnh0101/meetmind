import { PredefinedBlock } from "../predefinedBlocks";

export const todoTable: PredefinedBlock = {
  type: "todo_table",
  label: "Bảng phân công nhiệm vụ",
  description: "Bảng lưới chi tiết phân công công việc.",
  aiInstructions: "Tạo một bảng Markdown chi tiết liệt kê Công việc, Người thực hiện, và Hạn chót.",
  placeholders: "| Công việc | Người thực hiện | Hạn chót |\n| --- | --- | --- |\n| {{task}} | {{owner}} | {{deadline}} |",
};
