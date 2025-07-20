// Điểm cuối API để xử lý việc dịch thuật
app.post('/api/translate', async (req, res) => {
  // --- BẮT ĐẦU KHỐI LỆNH CHẨN ĐOÁN ---
  console.log("--- Bắt đầu chẩn đoán lỗi xác thực ---");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = process.env.CLOUDFLARE_API_TOKEN;

  // In ra các giá trị mà code đang thực sự sử dụng
  console.log("Account ID đang sử dụng:", accountId);

  // In ra 4 ký tự đầu và 4 ký tự cuối của Token để kiểm tra mà không làm lộ toàn bộ
  if (apiKey) {
    console.log(`API Token đang sử dụng (kiểm tra): Bắt đầu: [${apiKey.substring(0, 4)}]... Kết thúc: [...${apiKey.slice(-4)}]`);
  } else {
    console.log("API Token đang sử dụng: !!! KHÔNG TÌM THẤY TOKEN !!!");
  }
  
  const model = '@cf/meta/llama-3-8b-instruct';
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  console.log("URL đang gọi đến:", apiUrl);
  console.log("--- Kết thúc chẩn đoán ---");
  // --- KẾT THÚC KHỐI LỆNH CHẨN ĐOÁN ---

  if (!accountId || !apiKey) {
    // Trả về lỗi ngay nếu không có thông tin xác thực
    return res.status(500).json({ error: 'Cloudflare credentials not configured on server. Please check environment variables.' });
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).json({ error: 'No Chinese text provided.' });
  }

  const prompt = createBuddhistPrompt(chineseText); // Dùng lại hàm tạo prompt của bạn

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
