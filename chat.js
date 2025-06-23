document.addEventListener('DOMContentLoaded', function () {
    const contentSummary = document.getElementById('content-summary');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const ttsEngineSelect = document.getElementById('ttsEngine');
    
    let pageContent = "";
    let chatMode = "";
    let chatHistory = [];
    let currentTextToRead = ""; // Lưu nội dung đang được đọc
    let currentAiMessage = null; // Lưu tin nhắn AI đang được đọc
    
    // Biến cho TTS
    let utterance = null;
    let audioContext = null;
    let audioSource = null;
    let port = null;
    
    // Hàm để đảm bảo port kết nối luôn hoạt động
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "chat"});
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    if (message.type === "TTS_RESULT") {
                        if (message.success) {
                            playAudioFromBase64(message.audioData);
                        } else {
                            console.error("Lỗi đọc:", message.error);
                            resetPlayButton();
                        }
                    }
                });
                
                // Xử lý khi kết nối bị đóng
                port.onDisconnect.addListener(() => {
                    console.log("Port bị ngắt kết nối");
                    port = null;
                });
            } catch (error) {
                console.error("Lỗi khi kết nối port:", error);
                port = null;
            }
        }
        return port;
    }

    // Khởi tạo kết nối port khi trang được tải
    port = ensureConnected();

    // Tải lựa chọn công cụ TTS đã lưu
    chrome.storage.sync.get(['ttsEngine'], function (result) {
        if (result.ttsEngine) {
            ttsEngineSelect.value = result.ttsEngine;
        }
    });

    // Lưu lựa chọn công cụ TTS
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
    });
    
    // Lắng nghe tin nhắn từ background script thông qua chrome.runtime.onMessage
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "TTS_RESULT") {
            if (message.success) {
                playAudioFromBase64(message.audioData);
            } else {
                console.error("Lỗi đọc:", message.error);
                resetPlayButton();
            }
        }
    });
    
    // Tải nội dung từ storage
    chrome.storage.local.get(['fullPageContent', 'chatMode'], function(result) {
        if (result.fullPageContent) {
            pageContent = result.fullPageContent;
            chatMode = result.chatMode || 'fullPage';
            
            // Tóm tắt nội dung để hiển thị
            summarizeContent(pageContent);
            
            // Thêm tin nhắn chào mừng
            addChatMessage("Xin chào! Tôi là trợ lý AI. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về nội dung trang web này.", 'ai');
        } else {
            contentSummary.textContent = "Không tìm thấy nội dung trang.";
            addChatMessage("Không tìm thấy nội dung trang. Vui lòng quay lại và thử lại.", 'ai');
        }
    });
    
    // Xử lý sự kiện khi nhấn Enter trong ô nhập liệu
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Xử lý sự kiện khi nhấn nút Gửi
    sendBtn.addEventListener('click', sendChatMessage);
    
    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', function() {
        // Nếu đang đọc phần tóm tắt, tiếp tục đọc
        if (currentTextToRead === contentSummary.textContent) {
            readText(currentTextToRead);
            return;
        }
        
        // Nếu có tin nhắn AI đang được chọn để đọc
        if (currentAiMessage) {
            readText(currentAiMessage.textContent);
            return;
        }
        
        // Mặc định đọc phần tóm tắt
        currentTextToRead = contentSummary.textContent;
        readText(currentTextToRead);
    });

    // Sự kiện nhấn nút Dừng
    stopBtn.addEventListener('click', function() {
        stopReading();
    });
    
    // Hàm đọc văn bản
    function readText(text) {
        if (!text || text === "Không tìm thấy nội dung trang." || text === "Đang tải nội dung...") {
            return;
        }
        
        stopReading(); // Dừng mọi thứ trước khi bắt đầu
    
        if (ttsEngineSelect.value === 'browser') {
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                playPauseBtn.textContent = '⏸️ Tạm dừng';
            } else if (speechSynthesis.speaking) {
                speechSynthesis.pause();
                playPauseBtn.textContent = '▶️ Tiếp tục';
            } else {
                startBrowserReading(text);
            }
        } else { // Google TTS
            chrome.storage.sync.get('googleTtsConfig', function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    console.error("Vui lòng nhập và lưu Google Cloud API Key trong popup của tiện ích.");
                    return;
                }
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                
                // Đảm bảo port kết nối trước khi gửi tin nhắn
                const activePort = ensureConnected();
                if (activePort) {
                    activePort.postMessage({
                        type: "TTS_REQUEST",
                        config: result.googleTtsConfig,
                        text: text
                    });
                } else {
                    // Nếu không thể kết nối, sử dụng chrome.runtime.sendMessage thay thế
                    chrome.runtime.sendMessage({
                        type: "TTS_REQUEST",
                        config: result.googleTtsConfig,
                        text: text
                    });
                }
            });
        }
    }
    
    // --- CÁC HÀM ĐIỀU KHIỂN ĐỌC ---

    function startBrowserReading(text) {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = function() {
            resetPlayButton();
        };
        utterance.onerror = function(event) {
            console.error("Lỗi giọng đọc trình duyệt:", event.error);
            resetPlayButton();
        }
        speechSynthesis.speak(utterance);
        playPauseBtn.textContent = '⏸️ Tạm dừng';
    }

    function stopBrowserReading() {
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
    }
    
    function playAudioFromBase64(base64String) {
        try {
            if (audioSource) {
                audioSource.stop();
            }
            const audioData = atob(base64String);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }
    
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(audioContext.destination);
                audioSource.start(0);
                playPauseBtn.textContent = '⏹️ Dừng';
                playPauseBtn.disabled = false;
                audioSource.onended = () => {
                   resetPlayButton();
                };
            }, (err) => {
                console.error('Lỗi giải mã audio:', err);
                resetPlayButton();
            });
        } catch (error) {
            console.error('Lỗi khi phát audio:', error);
            resetPlayButton();
        }
    }

    function stopAudioPlayback() {
        if (audioSource) {
            audioSource.stop();
            audioSource = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }

    function stopReading() {
        stopBrowserReading();
        stopAudioPlayback();
        resetPlayButton();
    }
    
    function resetPlayButton() {
        playPauseBtn.textContent = '▶️ Đọc';
        playPauseBtn.disabled = false;
    }
    
    // Hàm tóm tắt nội dung để hiển thị
    function summarizeContent(content) {
        // Lấy API key từ storage
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                contentSummary.textContent = "Vui lòng nhập Gemini API Key trong popup của tiện ích.";
                return;
            }
            
            // Hiển thị thông báo đang xử lý
            contentSummary.textContent = "Đang tóm tắt nội dung...";
            
            // Gọi API để tóm tắt nội dung
            callGeminiApi(result.geminiApiKey, content)
                .then(summary => {
                    contentSummary.textContent = summary;
                })
                .catch(error => {
                    contentSummary.textContent = `Lỗi khi tóm tắt: ${error.message}`;
                });
        });
    }
    
    // Hàm gửi tin nhắn chat
    function sendChatMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;
        
        // Hiển thị tin nhắn của người dùng
        addChatMessage(userMessage, 'user');
        chatInput.value = '';
        
        // Thêm vào lịch sử chat
        chatHistory.push({role: 'user', content: userMessage});
        
        // Lấy API key từ storage
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                addChatMessage("Vui lòng nhập Gemini API Key trong popup của tiện ích.", 'ai');
                return;
            }
            
            // Hiển thị thông báo đang xử lý
            const loadingMsgElement = addChatMessage("Đang xử lý...", 'ai');
            
            // Gọi API để trả lời câu hỏi
            callGeminiChatApi(result.geminiApiKey, userMessage, pageContent, chatHistory)
                .then(response => {
                    // Xóa thông báo đang xử lý
                    loadingMsgElement.remove();
                    // Hiển thị câu trả lời
                    addChatMessage(response, 'ai');
                    // Thêm vào lịch sử chat
                    chatHistory.push({role: 'assistant', content: response});
                })
                .catch(error => {
                    // Xóa thông báo đang xử lý
                    loadingMsgElement.remove();
                    // Hiển thị lỗi
                    addChatMessage(`Lỗi: ${error.message}`, 'ai');
                });
        });
    }
    
    // Hàm thêm tin nhắn vào container
    function addChatMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Thêm khả năng đọc cho tin nhắn AI khi nhấp vào
        if (sender === 'ai') {
            messageElement.style.cursor = 'pointer';
            messageElement.title = 'Nhấp để đọc tin nhắn này';
            messageElement.addEventListener('click', function() {
                // Đặt tin nhắn hiện tại để đọc
                currentAiMessage = this;
                currentTextToRead = this.textContent;
                // Đọc nội dung tin nhắn
                readText(this.textContent);
            });
        }
        
        return messageElement;
    }
    
    // Hàm gọi Gemini API để tóm tắt
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
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Lỗi khi gọi Gemini API:", error);
            throw error;
        }
    }
    
    // Hàm gọi Gemini API để chat
    async function callGeminiChatApi(apiKey, userQuestion, contextText, chatHistory) {
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        // Tạo prompt với context và câu hỏi
        const contextPrompt = `Bạn là trợ lý AI giúp người dùng hiểu sâu hơn về nội dung họ đang đọc. Dưới đây là nội dung trang web mà người dùng đang tìm hiểu:\n\n"""${contextText}"""\n\nHãy trả lời câu hỏi của người dùng dựa trên nội dung trang web. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu và chính xác. Nếu câu hỏi không liên quan đến nội dung, hãy lịch sự đề nghị người dùng đặt câu hỏi liên quan đến nội dung trang web.`;
        
        // Chuẩn bị nội dung cho API
        const contents = [
            { role: 'user', parts: [{ text: contextPrompt }] }
        ];
        
        // Thêm lịch sử chat (giới hạn 10 tin nhắn gần nhất để tránh quá dài)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            contents.push({
                role: msg.role,
                parts: [{ text: msg.content }]
            });
        });
        
        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
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
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Lỗi khi gọi Gemini API:", error);
            throw error;
        }
    }
});