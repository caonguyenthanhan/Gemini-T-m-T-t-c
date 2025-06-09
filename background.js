// Import thư viện crypto-js đầy đủ
try {
    importScripts('crypto-js.min.js');
  } catch (e) {
    console.error(e);
  }
  
  // Lắng nghe tin nhắn
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUMMARIZE_REQUEST") {
          callGeminiApi(request.apiKey, request.content);
          return true; // Giữ kênh tin nhắn mở
      } else if (request.type === "TTS_REQUEST") {
          callIflytekApi(request.config, request.text);
          return true; // Giữ kênh tin nhắn mở
      }
  });
  
  // --- HÀM GỌI API GEMINI ---
  async function callGeminiApi(apiKey, textToSummarize) {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      const prompt = `Với vai trò là một trợ lý AI chuyên nghiệp, hãy tóm tắt nội dung sau đây bằng tiếng Việt trong khoảng 3 đến 5 câu. Giữ lại những ý chính, quan trọng nhất và trình bày một cách cô đọng, mạch lạc:\n\n---\n\n${textToSummarize}`;
  
      try {
          const response = await fetch(apiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                  ]
              })
          });
  
          const data = await response.json();
          if (!response.ok) {
              throw new Error(`Lỗi API (${response.status}): ${data.error?.message || 'Unknown error'}`);
          }
  
          const summary = data.candidates[0].content.parts[0].text;
          chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: true, summary: summary.trim() });
  
      } catch (error) {
          console.error("Lỗi khi gọi Gemini API:", error);
          chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: false, error: error.message });
      }
  }
  
  // --- HÀM GỌI API iFLYTEK ---
// --- HÀM GỌI API iFLYTEK ---
function callIflytekApi(config, text) {
    // Các thông tin xác thực lấy từ popup
    const { appId, apiKey, apiSecret } = config;
    const host = "tts-api.xfyun.cn";
    const date = new Date().toUTCString();
    const requestLine = "POST /v2/tts HTTP/1.1";

    // 1. Tạo signature
    const tmp = `host: ${host}\ndate: ${date}\n${requestLine}`;
    const signature = CryptoJS.HmacSHA256(tmp, apiSecret).toString(CryptoJS.enc.Base64);

    // 2. Tạo authorization
    const authorization_origin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorization_origin);

    // 3. Tạo URL
    const url = `https://${host}/v2/tts?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;

    // 4. Gửi yêu cầu
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            header: {
                app_id: appId,
                status: 3
            },
            parameter: {
                tts: {
                    // --- THAY ĐỔI QUAN TRỌNG Ở ĐÂY ---
                    vcn: "banmai",    // Sử dụng giọng đọc tiếng Việt
                    // Đã loại bỏ 'language' và 'auditory_style' để đơn giản hóa và tránh xung đột
                    volume: 50,
                    speed: 50,
                    pitch: 50,
                    aue: "raw",       // Giữ nguyên: định dạng MP3
                    tte: "UTF8"
                }
            },
            payload: {
                text: {
                    encoding: "UTF8",
                    status: 3,
                    text: btoa(unescape(encodeURIComponent(text)))
                }
            }
        })
    })
    .then(response => {
        // Kiểm tra nếu response không phải JSON, để tránh lỗi
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            // Nếu không phải JSON, đọc nó như text và báo lỗi
            return response.text().then(text => {
                throw new Error("Phản hồi từ API không phải là JSON: " + text);
            });
        }
    })
    .then(data => {
        if (data.header.code === 0) {
            // Thành công
            chrome.runtime.sendMessage({ type: "TTS_RESULT", success: true, audioData: data.payload.audio.audio });
        } else {
            // Có lỗi từ API
            throw new Error(`[${data.header.code}] ${data.header.message}`);
        }
    })
    .catch(error => {
        console.error("Lỗi khi gọi iFLYTEK API:", error);
        chrome.runtime.sendMessage({ type: "TTS_RESULT", success: false, error: error.message });
    });
}