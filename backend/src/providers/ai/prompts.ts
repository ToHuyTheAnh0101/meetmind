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
 * Biên dịch Mẫu (Template) thành một prompt chi tiết cho Ollama
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
        sectionPrompt += `  - Cấu trúc hiển thị và các biến mẫu bạn cần điền dữ liệu vào (hãy điền vào và trả về văn bản Markdown thuần túy trực tiếp, TUYỆT ĐỐI KHÔNG dùng ký hiệu code block \`\`\` để bao bọc):\n${sec.placeholders}\n`;
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
        - TUYỆT ĐỐI KHÔNG ĐƯỢC tự ý viết thêm bất kỳ lời dẫn dắt, lời xin lỗi, lời giải thích kỹ thuật hay đoạn văn bình luận nào ở đầu hoặc cuối câu trả lời (ví dụ: "Dựa trên yêu cầu của bạn...", "Tôi chưa thể xác định...", "Tuy nhiên, tôi xin tóm tắt..."). Hãy bắt đầu ngay lập tức bằng tiêu đề của mục đầu tiên (ví dụ: ### **${template.sections[0]?.label || 'Tiêu đề'}**).
        - TUYỆT ĐỐI KHÔNG ĐƯỢC bao bọc toàn bộ bản tóm tắt hoặc bất kỳ phần nào của bản tóm tắt bằng các ký tự code block (như \`\`\`markdown hoặc \`\`\`). Hãy trả về nội dung Markdown thuần túy trực tiếp.
        - TUYỆT ĐỐI KHÔNG ĐƯỢC SAO CHÉP hoặc in các nhãn kỹ thuật hướng dẫn như: "Mục thứ...", "Tiêu đề mục cần tạo", "Loại khối nội dung", "Yêu cầu tổng quan cho mục này", "Chỉ dẫn phân tích riêng của AI cho mục này", "Cấu trúc hiển thị và các biến mẫu" vào bản tóm tắt cuối cùng. Những nhãn này CHỈ là hướng dẫn thiết kế dành riêng cho bạn để biết cách phân tích và định dạng.
        - [BẮT BUỘC TUÂN THỦ BỐ CỤC KHỐI]: Đối với các mục có cung cấp "Cấu trúc hiển thị và các biến mẫu" (ví dụ: Bảng Markdown, danh sách Checkbox '- [ ]', hay Danh sách gạch đầu dòng), bạn BẮT BUỘC phải giữ nguyên 100% định dạng nguyên mẫu này trong đầu ra của mục. Tuyệt đối không được tự ý thay đổi bảng thành văn bản thường hoặc ngược lại.
        - [LẶP HÀNG/LẶP DÒNG CHO NHIỀU PHẦN TỬ]: Nếu cuộc họp thảo luận nhiều nội dung tương ứng (ví dụ: có nhiều công việc cần giao, nhiều ý kiến thảo luận, nhiều quyết định), bạn BẮT BUỘC phải nhân bản/lặp lại dòng cấu trúc mẫu đó (ví dụ: thêm các dòng mới vào bảng Markdown hoặc thêm nhiều dòng Checkbox '- [ ]') tương ứng với số lượng phần tử thực tế trong cuộc họp, điền đầy đủ dữ liệu vào các biến tương ứng.
        - [QUY TẮC BẮT BUỘC - THAY THẾ HOÀN TOÀN NGOẶC VUÔNG CHỈ DẪN '[...]']:
          1. Bạn phải phân biệt rõ hai loại ngoặc vuông:
             - Loại A (Ngoặc vuông chức năng): Định dạng Markdown như hộp kiểm (Checkbox) '- [ ]' hoặc '- [x]', hãy GIỮ NGUYÊN để làm checkbox hiển thị trên giao diện.
             - Loại B (Ngoặc vuông chỉ dẫn/giữ chỗ): Các nhãn hướng dẫn như '[AI tự động...]', '[Công Việc 1]', '[Tên người]', '[Hạn chót]', v.v. Bạn BẮT BUỘC phải XÓA BỎ hoàn toàn cặp ngoặc vuông này và thay thế bằng dữ liệu thực tế.
          2. Tuyệt đối không được sao chép nguyên văn hoặc in các ngoặc vuông chỉ dẫn/giữ chỗ (Loại B) này ra kết quả cuối cùng.
          3. Nếu một phần nội dung mẫu (ví dụ: mô tả tóm tắt hoặc các hàng trong bảng nhiệm vụ) hoàn toàn không có thông tin thảo luận thực tế trong cuộc họp, bạn BẮT BUỘC phải thay thế phần chỉ dẫn mẫu đó bằng dòng chữ: "Không có thông tin được nhắc đến trong cuộc họp". Tuyệt đối không in lại các dòng chữ hướng dẫn mẫu trong ngoặc vuông.
          4. Nếu trong cấu trúc mẫu có yêu cầu thông tin chi tiết như người phụ trách hoặc thời hạn/hạn chót (ví dụ: \`Phụ trách: [Tên người]\`, \`Hạn: [Thời gian]\`, \`Người phụ trách: [Tên người được giao]\`, \`Hạn chót: [Hạn hoàn thành]\`), nhưng trong cuộc họp không nhắc đến người phụ trách hoặc thời hạn cụ thể, bạn BẮT BUỘC phải thay thế phần ngoặc vuông đó bằng chữ "không có" hoặc "không đề cập" (ví dụ: \`Phụ trách: không có\`, \`Hạn: không đề cập\`). Tuyệt đối không được giữ nguyên nhãn mẫu trong ngoặc vuông.
        - Đầu ra cuối cùng cho mỗi mục chỉ được chứa Tiêu đề mục (ví dụ: ### **${template.sections[0]?.label || 'Tiêu đề'}**) và phần nội dung đã được phân tích/điền dữ liệu tương ứng.
        - [QUY TẮC BẮT BUỘC - LỌC TRÙNG LẶP DO GỐI ĐẦU ÂM THANH (5S OVERLAP)]:
          1. Transcript cuộc họp đầu vào được ghép từ các phần ghi âm nhỏ gối đầu 5 giây (5s overlap).
          2. Điều này dẫn đến việc xuất hiện các câu nói bị lặp lại hoặc gối nhau ở điểm tiếp giáp các đoạn (ví dụ: Một câu ở cuối đoạn trước bị cắt cụt, dở dang, nhưng được lặp lại đầy đủ và mạch lạc hơn ở đoạn sau).
          3. Bạn BẮT BUỘC phải phân tích ngữ cảnh, đối chiếu và loại bỏ các câu trùng lặp/dở dang do kỹ thuật gối đầu này. Hãy ƯU TIÊN chọn phiên bản câu hoàn chỉnh, rõ ý và đầy đủ ngữ nghĩa ở đoạn sau để đưa vào nội dung tóm tắt.
          4. Tuyệt đối không coi các câu lặp lại do gối đầu này là thông tin mới hoặc công việc mới.
        - TUYỆT ĐỐI TRÁNH ẢO GIÁC HÓA: Chỉ trích xuất và hiển thị thông tin thực tế từ đoạn transcript cuộc họp. Không tự ý bịa đặt, phỏng đoán hoặc bổ sung thông tin ngoài lề.
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
        3. LỌC TRÙNG LẶP DO GỐI ĐẦU 5S: Đoạn transcript có thể chứa các câu nói gối đầu lặp lại 5 giây do kỹ thuật chia nhỏ audio. Hãy chủ động lọc bỏ các câu trùng lặp hoặc câu dở dang bị cắt cụt, ưu tiên chọn phiên bản câu hoàn chỉnh và rõ ràng nhất để trả lời.
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
        - LỌC TRÙNG LẶP DO GỐI ĐẦU 5S: Đoạn transcript được tạo bởi các đoạn audio gối đầu 5 giây nên sẽ có các câu nói lặp lại hoặc bị cắt dở ở ranh giới. Hãy tự động đối chiếu và loại bỏ các phần trùng lặp dở dang này, chỉ chọn lọc và tổng hợp từ phiên bản câu nói đầy đủ, rõ nghĩa nhất.
        - Trình bày thật ngắn gọn, súc tích, trực quan và dễ đọc.
      `;
