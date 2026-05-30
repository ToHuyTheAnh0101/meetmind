import { PredefinedBlock } from "../predefinedBlocks";

export const decisions: PredefinedBlock = {
  type: "decisions",
  label: "Quyết định quan trọng",
  description: "Liệt kê các quyết định quan trọng đã được thống nhất.",
  aiInstructions: "Liệt kê tất cả các quyết định được chốt và thông qua bởi những người tham gia họp.",
  placeholders: "### **Quyết định đã chốt**\n- ✔ **Quyết định 1:** [AI tự động trích xuất nội dung quyết định 1 đã thống nhất]\n- ✔ **Quyết định 2:** [AI tự động trích xuất nội dung quyết định 2 đã thống nhất]",
};
