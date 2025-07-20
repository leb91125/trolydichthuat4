const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ tệp index.html khi người dùng truy cập trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Điểm cuối API để xử lý việc dịch thuật
app.post('/api/translate', async (req, res) => {
  // QUAN TRỌNG: Đảm bảo bạn đã cấu hình GOOGLE_API_KEY trên Render
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google API Key not configured on server.' });
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).json({ error: 'No Chinese text provided.' });
  }
  
  // --- PROMPT CHUYÊN NGHIỆP DÀNH CHO GEMINI ---
  // System Instruction: Đặt ra vai trò và quy tắc không thể phá vỡ cho AI
  const system_instruction = `
    **VAI TRÒ VÀ QUY TẮC TUYỆT ĐỐI:**
    1.  **BẠN LÀ MỘT DỊCH GIẢ PHẬT GIÁO CHUYÊN NGHIỆP.** Tên của bạn là "Trợ Lý Dịch Khai Thị".
    2.  **NHIỆM VỤ DUY NHẤT:** Dịch văn bản từ tiếng Trung sang tiếng Việt.
    3.  **NGÔN NGỮ ĐẦU RA BẮT BUỘC:** Chỉ và chỉ được phép trả lời bằng tiếng Việt. KHÔNG được viết bất kỳ từ nào bằng tiếng Anh, tiếng Trung hay ngôn ngữ khác trong phần trả lời.
    4.  **VĂN PHONG:** Sử dụng văn phong, thuật ngữ của Pháp Môn Tâm Linh do Sư Phụ Lư Quân Hoành khai thị. Dịch sát nghĩa, giữ nguyên bố cục gốc.
    5.  **TỪ ĐIỂN BẮT BUỘC:** - 礼佛大忏悔文: Lễ Phật Đại Sám Hối Văn
        - 女听众: Nữ Thính Giả
        - 台长答: Đài Trưởng đáp
        - 小房子: Ngôi Nhà Nhỏ
        - 灵性: Vong Linh
        - 好好修: Cứ chăm chỉ tu hành
        - 一門精進: Nhất Môn Tinh Tấn
        - 卢军宏: Lư Quân Hoành
        - 师兄: Sư Huynh
  `;

  // User Prompt: Yêu cầu cụ thể cho lần dịch này
  const user_prompt = `Dịch đoạn văn tiếng Trung sau đây sang tiếng Việt. Hãy tuân thủ tuyệt đối các quy tắc đã được nêu trong vai trò của bạn.
    
    Văn bản cần dịch:
    ---
    ${chineseText}
    ---
  `;

  // Sử dụng mô hình Gemini 1.5 Pro để có chất lượng cao nhất
  const model = 'gemini-1.5-pro-latest';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cấu trúc body chuyên nghiệp với systemInstruction
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: user_prompt }]
        }],
        systemInstruction: {
          role: "system",
          parts: [{ text: system_instruction }]
        }
      }),
    });
    
    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API Error:', result.error);
      throw new Error(result.error?.message || 'Error from Google AI API');
    }
    
    // Xử lý trường hợp bị chặn do an toàn hoặc không có nội dung
    if (!result.candidates || result.candidates.length === 0) {
        console.error('Gemini Response Blocked:', result.promptFeedback);
        const blockReason = result.promptFeedback?.blockReason || 'Không có nội dung trả về';
        throw new Error(`Bản dịch bị chặn hoặc không có nội dung. Lý do: ${blockReason}`);
    }

    const translatedText = result.candidates[0].content.parts[0].text;
    res.status(200).json({ translation: translatedText });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Khởi động máy chủ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
