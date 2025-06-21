// Import thư viện crypto-js đầy đủ
try {
    importScripts('crypto-js.min.js');
  } catch (e) {
    console.error(e);
  }
  
  // Tạo context menu khi extension được cài đặt
  chrome.runtime.onInstalled.addListener(() => {
    // Menu tóm tắt trang web
    chrome.contextMenus.create({
      id: "summarizePage",
      title: "Tóm tắt trang này",
      contexts: ["page"]
    });
    
    // Menu tóm tắt văn bản đã chọn
    chrome.contextMenus.create({
      id: "summarizeSelection",
      title: "Tóm tắt văn bản đã chọn",
      contexts: ["selection"]
    });
  });
  
  // Xử lý khi người dùng nhấp vào context menu
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "summarizePage") {
      // Mở popup và gửi lệnh tóm tắt trang
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['Readability.js', 'content.js']
      }).then(() => {
        // Mở popup sau khi đã trích xuất nội dung
        chrome.action.openPopup();
      });
    } 
    else if (info.menuItemId === "summarizeSelection" && info.selectionText) {
      // Lấy API key từ storage
      chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
          // Gọi API để tóm tắt văn bản đã chọn với tham số fromContextMenu=true
          callGeminiApi(result.geminiApiKey, info.selectionText, true);
          
          // Thông báo cho người dùng
          chrome.action.setBadgeText({ text: "...", tabId: tab.id });
          chrome.action.setBadgeBackgroundColor({ color: "#4285F4", tabId: tab.id });
          
          // Xóa badge sau 3 giây
          setTimeout(() => {
            chrome.action.setBadgeText({ text: "", tabId: tab.id });
          }, 3000);
        } else {
          // Thông báo nếu chưa có API key
          alert("Vui lòng nhập Gemini API Key trong popup của extension.");
          chrome.action.openPopup();
        }
      });
    }
  });
  
  // Lắng nghe tin nhắn
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUMMARIZE_REQUEST") {
          // Xử lý không đồng bộ và gửi phản hồi ngay lập tức
          callGeminiApi(request.apiKey, request.content)
              .catch(error => console.error("Lỗi khi gọi Gemini API:", error));
          // Không trả về true, không giữ kênh tin nhắn mở
          return false;
      } else if (request.type === "TTS_REQUEST") {
          // Xử lý không đồng bộ và gửi phản hồi ngay lập tức
          callGoogleTtsApi(request.config, request.text)
              .catch(error => console.error("Lỗi khi gọi Google TTS API:", error));
          // Không trả về true, không giữ kênh tin nhắn mở
          return false;
      }
  });
  
  // --- HÀM GỌI API GEMINI ---
  // Cập nhật hàm callGeminiApi để xử lý nội dung từ YouTube và Google Doc
  async function callGeminiApi(apiKey, textToSummarize, fromContextMenu = false, port = null) {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      
      // Kiểm tra nếu là nội dung YouTube
      let prompt = "";
      if (textToSummarize.startsWith("Video YouTube:")) {
          prompt = `Với vai trò là một trợ lý AI chuyên nghiệp, hãy tóm tắt nội dung video YouTube này dựa trên thông tin được cung cấp. Tóm tắt bằng tiếng Việt trong khoảng 3 đến 5 câu, giữ lại những ý chính và trình bày một cách cô đọng, mạch lạc:\n\n---\n\n${textToSummarize}`;
      }
      // Kiểm tra nếu là nội dung Google Doc
      else if (textToSummarize.startsWith("Google Doc:")) {
        prompt = `Với vai trò là một trợ lý AI chuyên nghiệp, hãy tóm tắt nội dung tài liệu Google Doc này. Tóm tắt bằng tiếng Việt trong khoảng 3 đến 5 câu, giữ lại những ý chính và trình bày một cách cô đọng, mạch lạc:\n\n---\n\n${textToSummarize}`;
        }
      // Nội dung trang web thông thường
      else {
          prompt = `Với vai trò là một trợ lý AI chuyên nghiệp, hãy tóm tắt nội dung sau đây bằng tiếng Việt trong khoảng 3 đến 5 câu. Giữ lại những ý chính, quan trọng nhất và trình bày một cách cô đọng, mạch lạc:\n\n---\n\n${textToSummarize}`;
      }
  
      try {
          // Phần còn lại giữ nguyên
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
          
          // Nếu được gọi từ context menu, lưu kết quả và mở cửa sổ mới
          if (fromContextMenu) {
              // Lưu kết quả tóm tắt vào storage
              chrome.storage.local.set({ contextMenuSummary: summary.trim() }, function() {
                  // Mở trang summary.html trong cửa sổ mới
                  chrome.windows.create({
                      url: chrome.runtime.getURL('summary.html'),
                      type: 'popup',
                      width: 800,
                      height: 600
                  });
              });
          } else {
              // Gửi kết quả về popup như bình thường
              if (port) {
                  port.postMessage({ type: "SUMMARY_RESULT", success: true, summary: summary.trim() });
              } else {
                  chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: true, summary: summary.trim() });
              }
          }
  
      } catch (error) {
          console.error("Lỗi khi gọi Gemini API:", error);
          if (fromContextMenu) {
              // Lưu thông báo lỗi vào storage
              chrome.storage.local.set({ contextMenuSummary: `Lỗi khi tóm tắt: ${error.message}` }, function() {
                  // Mở trang summary.html trong cửa sổ mới
                  chrome.windows.create({
                      url: chrome.runtime.getURL('summary.html'),
                      type: 'popup',
                      width: 800,
                      height: 600
                  });
              });
          } else {
              if (port) {
                  port.postMessage({ type: "SUMMARY_RESULT", success: false, error: error.message });
              } else {
                  chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: false, error: error.message });
              }
          }
      }
  }
  
  // --- HÀM GỌI API GOOGLE TTS ---
  // Thêm bộ nhớ đệm cho kết quả TTS
  const ttsCache = new Map();

  async function callGoogleTtsApi(config, text, port = null) {
      // Kiểm tra cache
      const cacheKey = `${config.apiKey}_${text}`;
      if (ttsCache.has(cacheKey)) {
          const cachedAudio = ttsCache.get(cacheKey);
          if (port) {
              port.postMessage({ type: "TTS_RESULT", success: true, audioData: cachedAudio });
          } else {
              chrome.runtime.sendMessage({ type: "TTS_RESULT", success: true, audioData: cachedAudio });
          }
          return;
      }
      
      // Lấy API key từ config
      const { apiKey } = config;
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      try {
          // Chuẩn bị dữ liệu cho request
          const requestData = {
              input: {
                  text: text
              },
              voice: {
                  languageCode: "vi-VN",
                  name: "vi-VN-Wavenet-A", // Giọng nữ Wavenet chất lượng cao
                  ssmlGender: "FEMALE"
              },
              audioConfig: {
                  audioEncoding: "MP3",
                  speakingRate: 1.0,
                  pitch: 0.0
              }
          };

          // Gửi request đến Google Cloud TTS API
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData)
          });

          // Xử lý response
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Lỗi API (${response.status}): ${errorText}`);
          }

          const data = await response.json();
          
          // Lưu vào cache
          ttsCache.set(cacheKey, data.audioContent);
          // Giới hạn kích thước cache
          if (ttsCache.size > 20) {
              const firstKey = ttsCache.keys().next().value;
              ttsCache.delete(firstKey);
          }
          
          // Gửi kết quả
          if (port) {
              port.postMessage({ type: "TTS_RESULT", success: true, audioData: data.audioContent });
          } else {
              chrome.runtime.sendMessage({ type: "TTS_RESULT", success: true, audioData: data.audioContent });
          }
      } catch (error) {
          console.error("Lỗi khi gọi Google TTS API:", error);
          if (port) {
              port.postMessage({ type: "TTS_RESULT", success: false, error: error.message });
          } else {
              chrome.runtime.sendMessage({ type: "TTS_RESULT", success: false, error: error.message });
          }
      }
  }

  // Cập nhật xử lý kết nối từ popup và summary
  chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "popup" || port.name === "summary") {
          port.onMessage.addListener((request) => {
              if (request.type === "SUMMARIZE_REQUEST") {
                  callGeminiApi(request.apiKey, request.content, false, port);
              } else if (request.type === "TTS_REQUEST") {
                  callGoogleTtsApi(request.config, request.text, port);
              }
          });
      }
  });

  // Cập nhật listener cho tin nhắn
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUMMARIZE_REQUEST") {
          // Xử lý không đồng bộ và gửi phản hồi ngay lập tức
          callGeminiApi(request.apiKey, request.content)
              .catch(error => console.error("Lỗi khi gọi Gemini API:", error));
          // Không trả về true, không giữ kênh tin nhắn mở
          return false;
      } else if (request.type === "TTS_REQUEST") {
          // Xử lý không đồng bộ và gửi phản hồi ngay lập tức
          callGoogleTtsApi(request.config, request.text)
              .catch(error => console.error("Lỗi khi gọi Google TTS API:", error));
          // Không trả về true, không giữ kênh tin nhắn mở
          return false;
      }
  });