import { PredefinedBlock } from "../predefinedBlocks";

export const executiveSummary: PredefinedBlock = {
  type: "executive_summary",
  label: "Tóm tắt điều hành",
  description: "Tóm tắt ngắn gọn bối cảnh và mục tiêu chính của cuộc họp.",
  aiInstructions: "Tóm tắt ngắn gọn bối cảnh cuộc họp, mục tiêu và bầu không khí chính. Tập trung vào bức tranh toàn cảnh.",
  placeholders: "### **Tổng quan cuộc họp**\n- **Bối cảnh:** [AI tự động phân tích bối cảnh/lý do diễn ra cuộc họp]\n- **Nội dung chính:** [AI tự động tóm tắt các diễn biến và nội dung thảo luận trọng tâm]",
};
