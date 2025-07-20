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
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiKey) {
    return res.status(500).json({ error: 'Cloudflare credentials not configured on server.' });
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).json({ error: 'No Chinese text provided.' });
  }
  
  // --- PROMPT ĐÃ ĐƯỢC TỐI ƯU HÓA ---
  // Tách biệt rõ ràng vai trò hệ thống và yêu cầu người dùng
  const system_prompt = `
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

  const user_prompt = `Dịch đoạn văn tiếng Trung sau đây sang tiếng Việt. Hãy tuân thủ tuyệt đối các quy tắc đã được nêu.
    
    Văn bản cần dịch:
    ---
    ${chineseText}
    ---
  `;

  // Sử dụng mô hình Llama 3, mạnh hơn và mới hơn
  const model = '@cf/meta/llama-3-8b-instruct';
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    const cfResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Cấu trúc body mới với system prompt
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system_prompt },
          { role: 'user', content: user_prompt }
        ]
      }),
    });
    
    const result = await cfResponse.json();

    if (!cfResponse.ok || !result.success) {
      console.error('Cloudflare AI Error:', result.errors);
      throw new Error(result.errors?.[0]?.message || 'Error from Cloudflare AI');
    }
    
    const translatedText = result.result.response;
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
