export interface PromptTemplateSection {
  name: string;
  label: string;
  description?: string;
  blockType?: string;
  aiInstructions?: string;
  placeholders?: string;
  order: number;
}

export interface PromptTemplateInput {
  summaryStyle?: string;
  globalRules?: string;
  sections: PromptTemplateSection[];
}

/**
 * Tạo chỉ dẫn phong cách viết (style)
 */
export function getStyleInstruction(summaryStyle?: string): string {
  switch (summaryStyle) {
    case 'concise':
    case 'short':
      return 'Hãy tóm tắt cực kỳ ngắn gọn, súc tích, lược bỏ các chi tiết phụ.';
    case 'formal':
      return 'Hãy viết tóm tắt với văn phong trang trọng, lịch sự, chuẩn mực công sở.';
    case 'detailed':
      return 'Hãy phân tích chi tiết, đầy đủ mọi ý kiến thảo luận và giải pháp đề xuất.';
    case 'bullet_points':
      return 'Hãy trình bày chủ yếu dưới dạng gạch đầu dòng trực quan, dễ theo dõi.';
    default:
      return 'Hãy trình bày rõ ràng, súc tích.';
  }
}

/**
 * Biên dịch Mẫu (Template) thành một prompt chi tiết cho Gemini
 */
export function compileSummaryTemplatePrompt(
  title: string,
  transcript: string,
  template: PromptTemplateInput,
): string {
  // 1. Build sections instructions with clear separation of guidelines and structure
  const sectionsPrompt = template.sections
    .sort((a, b) => a.order - b.order)
    .map((sec, idx) => {
      let sectionPrompt = `Mục thứ ${idx + 1}:\n`;
      sectionPrompt += `- Tiêu đề mục cần tạo: ### **${sec.label}**\n`;
      if (sec.blockType) {
        sectionPrompt += `  - Loại khối nội dung: ${sec.blockType}\n`;
      }
      if (sec.description) {
        sectionPrompt += `  - Yêu cầu tổng quan cho mục này: ${sec.description}\n`;
      }
      if (sec.aiInstructions) {
        sectionPrompt += `  - Chỉ dẫn phân tích riêng của AI cho mục này: ${sec.aiInstructions}\n`;
      }
      if (sec.placeholders) {
        sectionPrompt += `  - Cấu trúc hiển thị và các biến mẫu bạn cần điền dữ liệu vào:\n\`\`\`markdown\n${sec.placeholders}\n\`\`\`\n`;
      }
      return sectionPrompt;
    })
    .join('\n\n');

  const styleInstruction = getStyleInstruction(template.summaryStyle);
  const globalRulesPrompt = template.globalRules
    ? `- Quy tắc phân tích toàn cục của người dùng: ${template.globalRules}\n`
    : '';

  return `
        Bạn là một trợ lý cuộc họp AI chuyên nghiệp cực kỳ thông minh. Hãy phân tích đoạn hội thoại/nội dung cuộc họp "${title}" sau đây:
        
        ${transcript}
        
        Nhiệm vụ của bạn là tạo ra bản tóm tắt cuộc họp tuân thủ chặt chẽ theo cấu trúc mẫu (Template) dưới đây. 

        [Yêu cầu định dạng toàn cục - Cực kỳ Nghiêm ngặt]
        - Trả về bản tóm tắt bằng tiếng Việt dưới định dạng Markdown sạch sẽ.
        - Tông giọng/Văn phong: ${styleInstruction}
        - TUYỆT ĐỐI KHÔNG ĐƯỢC SAO CHÉP hoặc in các nhãn kỹ thuật hướng dẫn như: "Mục thứ...", "Tiêu đề mục cần tạo", "Loại khối nội dung", "Yêu cầu tổng quan cho mục này", "Chỉ dẫn phân tích riêng của AI cho mục này", "Cấu trúc hiển thị và các biến mẫu" vào bản tóm tắt cuối cùng. Những nhãn này CHỈ là hướng dẫn thiết kế dành riêng cho bạn để biết cách phân tích và định dạng.
        - Đầu ra cuối cùng cho mỗi mục chỉ được chứa Tiêu đề mục (ví dụ: ### **${template.sections[0]?.label || 'Tiêu đề'}**) và phần nội dung đã được phân tích/điền dữ liệu tương ứng.
        - TUYỆT ĐỐI TRÁNH ẢO GIÁC HÓA: Chỉ trích xuất và hiển thị thông tin thực tế từ đoạn transcript cuộc họp. Không tự ý bịa đặt, phỏng đoán hoặc bổ sung thông tin ngoài lề.
        - NẾU KHÔNG CÓ THÔNG TIN/NỘI DUNG: Nếu một phần nội dung hoặc một khối trong cấu trúc mẫu không xuất hiện/không tìm thấy dữ liệu trong transcript cuộc họp, bạn CHỈ cần ghi rõ "Không có thông tin được nhắc đến trong cuộc họp" ngay bên dưới tiêu đề mục tương ứng, TUYỆT ĐỐI không tự chế nội dung và TUYỆT ĐỐI không in ra bất kỳ dòng hướng dẫn kỹ thuật nào.
        ${globalRulesPrompt}

        [Cấu trúc các mục tóm tắt cần tuân thủ]
        Hãy tạo đầy đủ các mục theo thứ tự chính xác như dưới đây. Đối với mỗi mục, hãy dựa trên transcript cuộc họp để trích xuất và trình bày thông tin khớp với hướng dẫn và cấu trúc định dạng/biến mẫu được cung cấp:

        ${sectionsPrompt}

        Hãy chắc chắn rằng đầu ra của bạn chỉ bao gồm các phần Markdown rõ ràng, trực quan, không có thêm lời giải thích dẫn dắt bên ngoài.
      `;
}

export const ANSWER_QUESTION_PROMPT = (question: string, context: string) => `
        Bạn là một trợ lý cuộc họp thông minh, trung thực và cực kỳ chính xác. Dựa trên nội dung cuộc họp sau đây:
        
        ${context}
        
        Hãy trả lời câu hỏi sau của người dùng: "${question}"

        [Quy tắc nghiêm ngặt khi trả lời]:
        1. TUYỆT ĐỐI TRÁNH ẢO GIÁC HÓA: Chỉ trả lời dựa vào các thông tin thực tế có trong ngữ cảnh cuộc họp được cung cấp ở trên. Tuyệt đối không tự bịa đặt, suy đoán hoặc thêm thắt thông tin nằm ngoài nội dung cuộc họp.
        2. TỪ CHỐI CÂU HỎI NGOÀI LỀ: Nếu câu hỏi hoàn toàn không liên quan đến nội dung cuộc họp, hoặc thông tin được hỏi không hề xuất hiện/không tìm thấy trong ngữ cảnh cuộc họp, hãy lịch sự từ chối trả lời bằng tiếng Việt. Bạn có thể phản hồi khéo léo như: "Nội dung này không được nhắc đến trong cuộc họp" hoặc "Câu hỏi không liên quan đến nội dung cuộc họp", tuyệt đối không tự chế câu trả lời hoặc sử dụng kiến thức bên ngoài cuộc họp để trả lời các vấn đề ngoài lề.
      `;

export const DEFAULT_SUMMARY_PROMPT = (title: string, transcript: string) => `
        Bạn là một trợ lý cuộc họp chuyên nghiệp và trung thực. Hãy phân tích đoạn hội thoại/nội dung cuộc họp "${title}" sau đây:
        
        ${transcript}
        
        Hãy tạo một bản tóm tắt cuộc họp cực kỳ chuyên nghiệp bằng tiếng Việt, có cấu trúc rõ ràng sử dụng Markdown bao gồm các mục chính:
        1. **Tổng quan cuộc họp** (Tóm tắt ngắn gọn mục đích và không khí cuộc họp)
        2. **Các chủ đề thảo luận chính** (Chi tiết thảo luận từng phần)
        3. **Quyết định quan trọng** (Các quyết định đã thống nhất)
        4. **Hành động tiếp theo (Action Items)** (Công việc cần làm, người phụ trách và thời hạn nếu có)

        [Quy tắc nghiêm ngặt chống ảo giác]:
        - Chỉ trích xuất những thông tin có thực tế trong đoạn transcript cuộc họp. Không tự ý suy diễn hoặc bịa đặt thông tin.
        - Nếu bất kỳ mục nào ở trên không được thảo luận hoặc không có thông tin trong cuộc họp, hãy ghi rõ "Không được đề cập trong cuộc họp" thay vì tự chế nội dung.
        - Trình bày thật ngắn gọn, súc tích, trực quan và dễ đọc.
      `;
