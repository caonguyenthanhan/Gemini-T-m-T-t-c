// Lắng nghe tin nhắn yêu cầu tóm tắt từ popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SUMMARIZE_REQUEST") {
        console.log("Background: Đã nhận được yêu cầu tóm tắt.");
        callGeminiApi(request.apiKey, request.content);
        return true; // Giữ kênh tin nhắn mở để trả lời bất đồng bộ
    }
});

async function callGeminiApi(apiKey, textToSummarize) {
    // SỬA Ở ĐÂY: Đảm bảo bạn đang dùng đúng tên model mà API key của bạn hỗ trợ.
    // 'gemini-1.5-flash-latest' là model phổ biến, tốc độ cao và hiệu quả.
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const prompt = `Với vai trò là một trợ lý AI chuyên nghiệp, hãy tóm tắt nội dung sau đây bằng tiếng Việt trong khoảng 3 đến 5 câu. Giữ lại những ý chính, quan trọng nhất và trình bày một cách cô đọng, mạch lạc:\n\n---\n\n${textToSummarize}`;

    console.log("Background: Đang gửi yêu cầu tới API Gemini...");

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
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
            // Nếu API trả về lỗi, ném ra lỗi để catch xử lý
            throw new Error(`Lỗi API (${response.status}): ${data.error.message}`);
        }

        console.log("Background: Đã nhận phản hồi thành công từ API.");
        const summary = data.candidates[0].content.parts[0].text;
        
        // Gửi kết quả thành công về popup
        chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: true, summary: summary.trim() });

    } catch (error) {
        // Nếu có bất kỳ lỗi nào (mạng, API, ...), log ra và gửi về popup
        console.error("Background: Đã xảy ra lỗi khi gọi Gemini API:", error);
        chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: false, error: error.message });
    }
}