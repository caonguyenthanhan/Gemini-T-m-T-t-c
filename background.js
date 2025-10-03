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

    chrome.contextMenus.create({
      id: "readSelection",
      title: "Đọc phần đã chọn",
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
          // Lưu văn bản đã chọn vào storage để sử dụng cho chức năng chat
          chrome.storage.sync.set({ 
            selectedText: info.selectionText,
            originalContent: info.selectionText,
            chatMode: 'selection'
          }, function() {
            // Gọi API để tóm tắt văn bản đã chọn với tham số fromContextMenu=true
            callGeminiApi(result.geminiApiKey, info.selectionText, true);
            
            // Thông báo cho người dùng
            chrome.action.setBadgeText({ text: "...", tabId: tab.id });
            chrome.action.setBadgeBackgroundColor({ color: "#4285F4", tabId: tab.id });
            
            // Xóa badge sau 3 giây
            setTimeout(() => {
              chrome.action.setBadgeText({ text: "", tabId: tab.id });
            }, 3000);
          });
        } else {
          // Thông báo nếu chưa có API key
          alert("Vui lòng nhập Gemini API Key trong popup của extension.");
          chrome.action.openPopup();
        }
      });
    } else if (info.menuItemId === "readSelection" && info.selectionText) {
      const selected = info.selectionText.trim();
      if (!selected) return;
      chrome.storage.local.set({ selectedReadText: selected }, function() {
        const url = chrome.runtime.getURL('read.html');
        chrome.windows.create({ url, type: 'popup', width: 520, height: 700, focused: true });
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
          callGoogleTtsApi(request.config, request.text, null, request.readingIndex)
              .catch(error => console.error("Lỗi khi gọi Google TTS API:", error));
          // Không trả về true, không giữ kênh tin nhắn mở
          return false;
      } else if (request.type === "WEB_SEARCH_REQUEST") {
          // Xử lý yêu cầu tìm kiếm web
          handleWebSearchRequest(request, sendResponse);
          return true; // Giữ kênh tin nhắn mở cho phản hồi bất đồng bộ
      }
  });
  
  // --- HÀM GỌI API GEMINI ---
  // Cập nhật hàm callGeminiApi để xử lý nội dung từ YouTube và Google Doc
  async function callGeminiApi(apiKey, textToSummarize, fromContextMenu = false, port = null) {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
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
              chrome.storage.sync.set({ contextMenuSummary: summary.trim() }, function() {
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
              chrome.storage.sync.set({ contextMenuSummary: `Lỗi khi tóm tắt: ${error.message}` }, function() {
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
  // Bộ nhớ đệm riêng cho chat
  const ttsChatCache = new Map();

  async function callLocalTtsApi(config, text, port = null, readingIndex = -1, sendResponseCallback = null, isFromChat = false) {
      isFromChat = isFromChat || (port && port.name === "chat");
      console.log("Bắt đầu gọi Local TTS", port ? "với port" : "không có port", "cho đoạn", readingIndex, isFromChat ? "(từ chat)" : "");
      if (!text || text.trim() === "") {
          const errorMsg = "Văn bản trống, không thể chuyển đổi thành giọng nói";
          sendTTSResponse(port, false, null, errorMsg, readingIndex, sendResponseCallback);
          return;
      }
      const cacheKey = `local_${(config && config.languageCode) || 'vi-VN'}_${text}`;
      const cache = isFromChat ? ttsChatCache : ttsCache;
      if (cache.has(cacheKey)) {
          sendTTSResponse(port, true, cache.get(cacheKey), null, readingIndex, sendResponseCallback);
          return;
      }
      const url = 'http://127.0.0.1:5001/tts';
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  text: text,
                  languageCode: (config && config.languageCode) || 'vi-VN'
              })
          });
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Lỗi Local TTS (${response.status}): ${errorText}`);
          }
          const data = await response.json();
          if (!data.success || !data.audioContent) {
              throw new Error(data.error || "Không nhận được dữ liệu audio từ Local TTS");
          }
          cache.set(cacheKey, data.audioContent);
          if (cache.size > 50) {
              const oldestKey = cache.keys().next().value;
              cache.delete(oldestKey);
          }
          sendTTSResponse(port, true, data.audioContent, null, readingIndex, sendResponseCallback);
      } catch (error) {
          const errMsg = error.message && error.message.includes('Failed to fetch')
              ? "Không thể kết nối máy chủ TTS cục bộ tại http://127.0.0.1:5001/tts. Vui lòng đảm bảo server đang chạy."
              : error.message;
          sendTTSResponse(port, false, null, errMsg, readingIndex, sendResponseCallback);
      }
  }
  
  async function callGoogleTtsApi(config, text, port = null, readingIndex = -1, sendResponseCallback = null, isFromChat = false) {
      // Xác định nguồn yêu cầu: từ chat hoặc từ port chat
      isFromChat = isFromChat || (port && port.name === "chat");
      console.log("Bắt đầu gọi Google TTS API", port ? "với port" : "không có port", "cho đoạn", readingIndex, isFromChat ? "(từ chat)" : "");
      
      // Kiểm tra text
      if (!text || text.trim() === "") {
          const errorMsg = "Văn bản trống, không thể chuyển đổi thành giọng nói";
          console.error(errorMsg);
          sendTTSResponse(port, false, null, errorMsg, readingIndex, sendResponseCallback);
          return;
      }
      
      // Kiểm tra config
      if (!config || !config.apiKey) {
          const errorMsg = "Thiếu API key trong cấu hình";
          console.error(errorMsg);
          sendTTSResponse(port, false, null, errorMsg, readingIndex, sendResponseCallback);
          return;
      }
      
      // Kiểm tra cache - sử dụng cache riêng cho chat
       const cacheKey = `${config.apiKey}_${text}`;
       const cache = isFromChat ? ttsChatCache : ttsCache;
      
      if (cache.has(cacheKey)) {
          console.log("Tìm thấy kết quả trong cache", isFromChat ? "chat" : "chung", "trả về ngay lập tức cho đoạn", readingIndex);
          const cachedAudio = cache.get(cacheKey);
          sendTTSResponse(port, true, cachedAudio, null, readingIndex, sendResponseCallback);
          return;
      }
      
      // Lấy API key từ config
      const { apiKey } = config;
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      console.log("Chuẩn bị gọi Google TTS API với URL:", url.substring(0, url.indexOf('?')));

      try {
          // Chuẩn bị dữ liệu cho request
          const requestData = {
              input: {
                  text: text
              },
              voice: {
                  languageCode: config.languageCode || "vi-VN",
                  name: config.voice || "vi-VN-Wavenet-A", // Giọng nữ Wavenet chất lượng cao
                  ssmlGender: "FEMALE"
              },
              audioConfig: {
                  audioEncoding: "MP3",
                  speakingRate: config.speakingRate || 1.0,
                  pitch: config.pitch || 0.0
              }
          };

          console.log("Gửi request đến Google TTS API cho đoạn", readingIndex);
          // Gửi request đến Google Cloud TTS API
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData)
          });

          console.log("Nhận phản hồi từ Google TTS API, status:", response.status, "cho đoạn", readingIndex);
          // Xử lý response
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Lỗi API (${response.status}): ${errorText}`);
          }

          const data = await response.json();
          console.log("Đã nhận dữ liệu JSON từ Google TTS API cho đoạn", readingIndex);
          
          if (!data.audioContent) {
              throw new Error("Không nhận được dữ liệu audio từ Google TTS API");
          }
          
          // Sử dụng biến isFromChat đã được định nghĩa trước đó
          // Không cần định nghĩa lại biến useChat
          const cache = isFromChat ? ttsChatCache : ttsCache;
          
          console.log("Lưu kết quả vào cache", isFromChat ? "chat" : "chung", "cho đoạn", readingIndex);
          cache.set(cacheKey, data.audioContent);
          
          // Giới hạn kích thước cache
          if (cache.size > 50) {
              const oldestKey = cache.keys().next().value;
              cache.delete(oldestKey);
              console.log("Đã xóa mục cũ nhất khỏi cache", isFromChat ? "chat" : "chung");
          }
          
          // Gửi kết quả
          console.log("Gửi kết quả TTS thành công");
          sendTTSResponse(port, true, data.audioContent, null, readingIndex, sendResponseCallback);
      } catch (error) {
            console.error("Lỗi khi gọi Google TTS API cho đoạn", readingIndex, ":", error);
            
            // Kiểm tra lỗi API bị vô hiệu hóa
            if (error.message && error.message.includes("SERVICE_DISABLED") || 
                (error.message && error.message.includes("403") && error.message.includes("disabled"))) {
                // Lưu trạng thái API key vào localStorage
                localStorage.setItem('googleApiKeyStatus', 'disabled');
                
                // Tạo thông báo chi tiết với hướng dẫn
                const errorMsg = "Google TTS API chưa được kích hoạt. Vui lòng thực hiện các bước sau:\n" +
                    "1. Truy cập Google Cloud Console: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com\n" +
                    "2. Đăng nhập với tài khoản Google của bạn\n" +
                    "3. Chọn dự án của bạn\n" +
                    "4. Nhấn nút 'Kích hoạt' để bật API Text-to-Speech\n" +
                    "5. Đợi vài phút để thay đổi có hiệu lực\n" +
                    "6. Thử lại tính năng đọc";
                
                sendTTSResponse(port, false, null, errorMsg, readingIndex, sendResponseCallback);
            } else {
                sendTTSResponse(port, false, null, error.message, readingIndex, sendResponseCallback);
            }
        }
  }
  
  // Hàm gửi phản hồi TTS
function sendTTSResponse(port, success, audioData, errorMsg = null, readingIndex = -1, sendResponseCallback = null) {
    const response = { 
        type: "TTS_RESULT", 
        success: success,
        readingIndex: readingIndex
    };
    
    if (success) {
        response.audioData = audioData;
    } else {
        response.error = errorMsg || "Lỗi không xác định";
    }
    
    try {
        if (port) {
            console.log("Gửi kết quả TTS qua port cho đoạn", readingIndex);
            port.postMessage(response);
        } else if (sendResponseCallback) {
            console.log("Gửi kết quả TTS qua sendResponse cho đoạn", readingIndex);
            sendResponseCallback(response);
        } else {
            console.log("Gửi kết quả TTS qua sendMessage cho đoạn", readingIndex);
            chrome.runtime.sendMessage(response);
        }
    } catch (error) {
        console.error("Lỗi khi gửi kết quả TTS:", error);
    }
}

  // Cập nhật xử lý kết nối từ popup, summary và chat
  chrome.runtime.onConnect.addListener((port) => {
      console.log("Nhận kết nối từ:", port.name);
      if (port.name === "popup" || port.name === "summary") {
          port.onMessage.addListener((request) => {
              console.log("Nhận tin nhắn từ", port.name, ":", request.type);
              if (request.type === "SUMMARIZE_REQUEST") {
                  callGeminiApi(request.apiKey, request.content, false, port);
              } else if (request.type === "TTS_REQUEST") {
                  console.log("Xử lý yêu cầu TTS từ", port.name);
                  if (request.config && request.config.engine === 'local') {
                      callLocalTtsApi(request.config, request.text, port, request.readingIndex, null);
                  } else {
                      callGoogleTtsApi(request.config, request.text, port, request.readingIndex, null);
                  }
              }
          });
      } else if (port.name === "chat") {
          port.onMessage.addListener((request) => {
              console.log("Nhận tin nhắn từ chat:", request.type);
              if (request.type === "TTS_REQUEST") {
                  console.log("Xử lý yêu cầu TTS từ chat cho đoạn", request.readingIndex);
                  if (request.config && request.config.engine === 'local') {
                      callLocalTtsApi(request.config, request.text, port, request.readingIndex, null);
                  } else {
                      callGoogleTtsApi(request.config, request.text, port, request.readingIndex, null);
                  }
              }
          });
      }
      port.onDisconnect.addListener(() => {
          console.log("Port", port.name, "bị ngắt kết nối");
      });
  });

  // Cập nhật listener cho tin nhắn
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Nhận tin nhắn từ content script:", request.type);
      if (request.type === "SUMMARIZE_REQUEST") {
          console.log("Xử lý yêu cầu tóm tắt");
          callGeminiApi(request.apiKey, request.content)
              .then(result => {})
              .catch(error => {
                  console.error("Lỗi khi gọi Gemini API:", error);
                  if (sendResponse) {
                      sendResponse({
                          type: "SUMMARY_RESULT",
                          success: false,
                          error: error.message
                      });
                  }
              });
          return true;
      } else if (request.type === "TTS_REQUEST") {
          const isFromChat = sender.tab && sender.tab.url && sender.tab.url.includes("chat.html");
          console.log("Xử lý yêu cầu TTS cho đoạn", request.readingIndex, isFromChat ? "từ chat" : "từ popup/summary");
          if (request.config && request.config.engine === 'local') {
              callLocalTtsApi(request.config, request.text, null, request.readingIndex, sendResponse)
                  .then(result => {})
                  .catch(error => {
                      console.error("Lỗi khi gọi Local TTS:", error);
                      if (sendResponse) {
                          sendResponse({
                              type: "TTS_RESULT",
                              success: false,
                              error: error.message,
                              readingIndex: request.readingIndex
                          });
                      }
                  });
          } else {
              callGoogleTtsApi(request.config, request.text, null, request.readingIndex, sendResponse)
                  .then(result => {})
                  .catch(error => {
                      console.error("Lỗi khi gọi Google TTS API:", error);
                      if (sendResponse) {
                          sendResponse({
                              type: "TTS_RESULT",
                              success: false,
                              error: error.message,
                              readingIndex: request.readingIndex
                          });
                      }
                  });
          }
          return true;
      } else if (request.type === "WEB_SEARCH_REQUEST") {
          handleWebSearchRequest(request, sendResponse);
          return true;
      }
      return false;
  });

  // --- HÀM TÌM KIẾM WEB ---
  async function handleWebSearchRequest(request, sendResponse) {
      try {
          const searchResults = await searchWeb(request.query, request.maxResults || 3);
          sendResponse({
              success: true,
              results: searchResults
          });
      } catch (error) {
          console.error("Lỗi khi tìm kiếm web:", error);
          sendResponse({
              success: false,
              error: error.message
          });
      }
  }

  // Hàm tìm kiếm web sử dụng DuckDuckGo Instant Answer API
  async function searchWeb(query, maxResults = 3) {
      try {
          // Sử dụng DuckDuckGo Instant Answer API (miễn phí, không cần API key)
          const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
          
          const response = await fetch(searchUrl);
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          const results = [];
          
          // Lấy thông tin từ Abstract (thông tin tóm tắt chính)
          if (data.Abstract && data.Abstract.trim()) {
              results.push({
                  title: data.Heading || "Thông tin chính",
                  snippet: data.Abstract,
                  url: data.AbstractURL || "",
                  source: data.AbstractSource || "DuckDuckGo"
              });
          }
          
          // Lấy thông tin từ RelatedTopics (các chủ đề liên quan)
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
              for (let i = 0; i < Math.min(data.RelatedTopics.length, maxResults - results.length); i++) {
                  const topic = data.RelatedTopics[i];
                  if (topic.Text && topic.Text.trim()) {
                      results.push({
                          title: topic.Text.split(' - ')[0] || "Thông tin liên quan",
                          snippet: topic.Text,
                          url: topic.FirstURL || "",
                          source: "DuckDuckGo"
                      });
                  }
              }
          }
          
          // Nếu không có kết quả từ DuckDuckGo, thử tìm kiếm bằng cách khác
          if (results.length === 0) {
              // Fallback: sử dụng Wikipedia API
              const wikiResults = await searchWikipedia(query, maxResults);
              results.push(...wikiResults);
          }
          
          return results.slice(0, maxResults);
      } catch (error) {
          console.error("Lỗi khi tìm kiếm DuckDuckGo:", error);
          // Fallback: sử dụng Wikipedia API
          try {
              return await searchWikipedia(query, maxResults);
          } catch (wikiError) {
              console.error("Lỗi khi tìm kiếm Wikipedia:", wikiError);
              throw new Error("Không thể tìm kiếm thông tin từ các nguồn bên ngoài");
          }
      }
  }

  // Hàm tìm kiếm Wikipedia (fallback)
  async function searchWikipedia(query, maxResults = 3) {
      try {
          // Tìm kiếm tiếng Việt trước
          let searchUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
          let response = await fetch(searchUrl);
          
          const results = [];
          
          if (response.ok) {
              const data = await response.json();
              if (data.extract && data.extract.trim()) {
                  results.push({
                      title: data.title || "Wikipedia",
                      snippet: data.extract,
                      url: data.content_urls?.desktop?.page || "",
                      source: "Wikipedia (Tiếng Việt)"
                  });
              }
          }
          
          // Nếu không tìm thấy tiếng Việt, thử tiếng Anh
          if (results.length === 0) {
              searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
              response = await fetch(searchUrl);
              
              if (response.ok) {
                  const data = await response.json();
                  if (data.extract && data.extract.trim()) {
                      results.push({
                          title: data.title || "Wikipedia",
                          snippet: data.extract,
                          url: data.content_urls?.desktop?.page || "",
                          source: "Wikipedia (English)"
                      });
                  }
              }
          }
          
          return results.slice(0, maxResults);
      } catch (error) {
          console.error("Lỗi khi tìm kiếm Wikipedia:", error);
          return [];
      }
  }

function injectPlayAudioBase64(tabId, base64String) {
  if (!base64String) return;
  chrome.scripting.executeScript({
    target: { tabId },
    func: (audioB64) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
        audio.play().catch(err => console.error('Không thể phát audio:', err));
      } catch (e) {
        console.error('Lỗi injectPlayAudioBase64:', e);
      }
    },
    args: [base64String]
  });
}

function injectBrowserSpeech(tabId, text) {
  if (!text) return;
  chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => {
      try {
        const utter = new SpeechSynthesisUtterance(t);
        utter.lang = 'vi-VN';
        speechSynthesis.speak(utter);
      } catch (e) {
        console.error('Lỗi injectBrowserSpeech:', e);
      }
    },
    args: [text]
  });
}

function showInPageToast(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      try {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '999999';
        toast.style.background = 'rgba(0,0,0,0.8)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '14px';
        toast.style.maxWidth = '320px';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } catch (e) {
        console.error('Lỗi showInPageToast:', e);
      }
    },
    args: [message]
  });
}

function injectPlayAudioBase64(tabId, base64String, selectedText) {
  if (!base64String) return;
  chrome.scripting.executeScript({
    target: { tabId },
    func: (audioB64, textForFallback) => {
      try {
        function b64ToUint8Array(b64) {
          const binary_string = atob(b64);
          const len = binary_string.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
          }
          return bytes;
        }
        const bytes = b64ToUint8Array(audioB64);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = document.createElement('audio');
        audio.src = url;
        audio.style.display = 'none';
        audio.preload = 'auto';
        audio.volume = 1.0;
        audio.setAttribute('playsinline', '');
        document.body.appendChild(audio);
        audio.play().catch(err => {
          console.error('Không thể phát audio:', err);
          try {
            const toast = document.createElement('div');
            toast.textContent = 'Không thể phát âm thanh. Đang dùng giọng đọc của trình duyệt...';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.zIndex = '999999';
            toast.style.background = 'rgba(0,0,0,0.8)';
            toast.style.color = '#fff';
            toast.style.padding = '10px 14px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '14px';
            toast.style.maxWidth = '320px';
            toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
          } catch (_) {}
          try {
            if (textForFallback && typeof speechSynthesis !== 'undefined') {
              const utter = new SpeechSynthesisUtterance(textForFallback);
              utter.lang = 'vi-VN';
              speechSynthesis.speak(utter);
            }
          } catch (e2) {
            console.error('Fallback speechSynthesis lỗi:', e2);
          }
        });
      } catch (e) {
        console.error('Lỗi injectPlayAudioBase64:', e);
      }
    },
    args: [base64String, selectedText]
  });
}