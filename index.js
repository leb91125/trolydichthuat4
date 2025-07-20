const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ tệp index.html khi người dùng truy cập trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Hàm tạo prompt chung, giữ nguyên logic của bạn
const createBuddhistPrompt = (chineseText) => `
    **Yêu cầu nhiệm vụ (TUÂN THỦ TUYỆT ĐỐI):**
    Bạn PHẢI hành động như "Trợ Lý Dịch Khai Thị", một chuyên gia dịch thuật tiếng Trung sang tiếng Việt trong lĩnh vực Phật giáo, dựa trên triết lý và khai thị của Đài Trưởng Lư Quân Hoành...
    // ... (Toàn bộ phần prompt chi tiết của bạn giữ nguyên ở đây)
    **Văn bản cần dịch:**
    ---
    ${chineseText}
    ---
`;

// Điểm cuối API để xử lý việc dịch thuật
app.post('/api/translate', async (req, res) => {
  // Lấy thông tin xác thực từ biến môi trường
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiKey) {
    return res.status(500).json({ error: 'Cloudflare credentials not configured on server.' });
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).json({ error: 'No Chinese text provided.' });
  }

  const prompt = createBuddhistPrompt(chineseText);
  
  // Tên mô hình bạn muốn sử dụng (Llama 3 là một lựa chọn tốt)
  const model = '@cf/meta/llama-3-8b-instruct';
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    const cfResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      }),
    });
    
    const result = await cfResponse.json();

    if (!cfResponse.ok || !result.success) {
      // Ghi lại lỗi chi tiết từ Cloudflare để gỡ lỗi
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

// Render sẽ tự động cung cấp cổng (PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
