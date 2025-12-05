document.addEventListener('DOMContentLoaded', function () {
    const summaryContent = document.getElementById('summary-content');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const ttsEngineSelect = document.getElementById('ttsEngine');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const allowExternalKnowledgeCheckbox = document.getElementById('allowExternalKnowledge');
    let chatHistory = [];
    
    let utterance = null;
    let audioContext = null;
    let audioSource = null;
    let port = null;
    let originalContent = ""; // Lưu nội dung gốc của văn bản được tóm tắt

    // Hàm để đảm bảo port kết nối luôn hoạt động
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "summary"});
                console.log("Đã kết nối port mới");
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    console.log("Nhận tin nhắn từ background:", message);
                    if (message.type === "TTS_RESULT") {
                        if (message.success) {
                            console.log("Nhận kết quả TTS thành công");
                            playAudioFromBase64(message.audioData);
                        } else {
                            console.error("Lỗi TTS:", message.error);
                            summaryContent.textContent += "\n\nLỗi đọc: " + message.error;
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
    // Đảm bảo DOM đã tải xong trước khi kết nối
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM đã tải xong, kết nối port");
        port = ensureConnected();
    });

    // Tải lựa chọn công cụ TTS đã lưu
    chrome.storage.sync.get(['ttsEngine', 'allowExternalKnowledge'], function (result) {
        if (result.ttsEngine) {
            ttsEngineSelect.value = result.ttsEngine;
        }
        allowExternalKnowledgeCheckbox.checked = result.allowExternalKnowledge === true;
    });

    // Lưu lựa chọn công cụ TTS
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
    });

    allowExternalKnowledgeCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({ allowExternalKnowledge: this.checked });
    });

    // Khôi phục lịch sử chat theo phiên
    chrome.storage.local.get(['chatHistory_summary'], function(res) {
        if (Array.isArray(res.chatHistory_summary) && res.chatHistory_summary.length > 0) {
            chatHistory = res.chatHistory_summary;
            chatHistory.forEach(function(msg){ addChatMessage(msg.content, msg.role); });
        }
    });

    // Tải kết quả tóm tắt và nội dung gốc từ storage
    chrome.storage.sync.get(['contextMenuSummary', 'selectedText', 'originalContent', 'chatMode'], function(result) {
        if (result.contextMenuSummary) {
            summaryContent.textContent = result.contextMenuSummary;
        } else {
            summaryContent.textContent = "Không tìm thấy kết quả tóm tắt.";
        }
        
        // Lưu nội dung gốc nếu có
        if (result.originalContent) {
            originalContent = result.originalContent;
        } else if (result.selectedText) {
            originalContent = result.selectedText;
        }
    });

    // Lắng nghe tin nhắn từ background script thông qua chrome.runtime.onMessage
    chrome.runtime.onMessage.addListener((message) => {
        console.log("Nhận tin nhắn từ background script:", message);
        if (message.type === "TTS_RESULT") {
            console.log("Nhận kết quả TTS:", message.success ? "thành công" : "thất bại");
            if (message.success) {
                playAudioFromBase64(message.audioData);
            } else {
                console.error("Lỗi TTS từ background:", message.error);
                summaryContent.textContent += "\n\nLỗi đọc: " + message.error;
                resetPlayButton();
            }
        }
        // Trả về true để giữ kênh tin nhắn mở cho phản hồi bất đồng bộ
        return true;
    });
    
    // Hàm gửi yêu cầu TTS đến background script
    function requestTTS(text) {
        console.log("Bắt đầu gửi yêu cầu TTS cho văn bản:", text.substring(0, 50) + "...");
        chrome.storage.sync.get(['googleTtsConfig'], function(result) {
            const apiKey = result.googleTtsConfig?.apiKey;
            if (!apiKey) {
                console.error("Lỗi: Chưa cấu hình Google API Key");
                summaryContent.textContent += "\n\nLỗi: Chưa cấu hình Google API Key";
                resetPlayButton();
                return;
            }
            
            console.log("Đã lấy được API key, chuẩn bị gửi yêu cầu TTS");
            const config = { apiKey: apiKey, engine: 'google' };
            const connected = ensureConnected();
            if (connected) {
                try {
                    connected.postMessage({
                        type: "TTS_REQUEST",
                        config: config,
                        text: text
                    });
                } catch (error) {
                    sendTTSWithMessage(config, text);
                }
            } else {
                sendTTSWithMessage(config, text);
            }
        });
    }
    
    // Hàm gửi yêu cầu TTS bằng sendMessage
    function sendTTSWithMessage(config, text) {
        console.log("Gửi yêu cầu TTS bằng sendMessage");
        try {
            chrome.runtime.sendMessage({
                type: "TTS_REQUEST",
                config: config,
                text: text
            });
            console.log("Đã gửi yêu cầu TTS bằng sendMessage");
        } catch (error) {
            console.error("Lỗi khi gửi yêu cầu TTS bằng sendMessage:", error);
            summaryContent.textContent += "\n\nLỗi khi gửi yêu cầu TTS: " + error.message;
            resetPlayButton();
        }
    }
    
    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', function() {
        const textToRead = summaryContent.textContent;
        if (!textToRead || textToRead === "Không tìm thấy kết quả tóm tắt.") {
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
                startBrowserReading(textToRead);
            }
        } else if (ttsEngineSelect.value === 'google') { // Google TTS
            chrome.storage.sync.get(['googleTtsConfig'], function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    console.error("Lỗi: Chưa cấu hình Google API Key");
                    summaryContent.textContent += "\n\nLỗi: Chưa cấu hình Google API Key";
                    resetPlayButton();
                    return;
                }
                
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                
                // Sử dụng hàm requestTTS để gửi yêu cầu
                requestTTS(textToRead);
            });
        } else if (ttsEngineSelect.value === 'local') {
            playPauseBtn.disabled = true;
            playPauseBtn.textContent = 'Đang tải...';
            const config = { engine: 'local', languageCode: 'vi-VN' };
            const connected = ensureConnected();
            if (connected) {
                try {
                    connected.postMessage({ type: "TTS_REQUEST", config: config, text: textToRead });
                } catch (error) {
                    sendTTSWithMessage(config, textToRead);
                }
            } else {
                sendTTSWithMessage(config, textToRead);
            }
        }
    });

    // Sự kiện nhấn nút Dừng
    stopBtn.addEventListener('click', function() {
        stopReading();
    });

    // --- CÁC HÀM ĐIỀU KHIỂN ĐỌC ---

    function startBrowserReading(text) {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = function() {
            resetPlayButton();
        };
        utterance.onerror = function(event) {
            summaryContent.textContent += "\n\nLỗi giọng đọc trình duyệt: " + event.error;
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
        console.log("Bắt đầu phát audio từ base64");
        try {
            if (audioSource) {
                console.log("Dừng nguồn audio hiện tại");
                audioSource.stop();
            }
            
            if (!base64String) {
                console.error("Lỗi: Dữ liệu audio trống");
                summaryContent.textContent += '\n\nLỗi: Dữ liệu audio trống.';
                resetPlayButton();
                return;
            }
            
            console.log("Giải mã dữ liệu base64");
            const audioData = atob(base64String);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }
    
            console.log("Tạo AudioContext mới");
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            console.log("Giải mã dữ liệu audio");
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                console.log("Giải mã thành công, bắt đầu phát audio");
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(audioContext.destination);
                audioSource.start(0);
                playPauseBtn.textContent = '⏹️ Dừng';
                playPauseBtn.disabled = false;
                
                audioSource.onended = () => {
                   console.log("Audio đã phát xong");
                   resetPlayButton();
                };
            }, (err) => {
                console.error('Lỗi giải mã audio:', err);
                summaryContent.textContent += '\n\nLỗi giải mã audio: ' + (err.message || 'Không xác định');
                resetPlayButton();
            });
        } catch (error) {
            console.error('Lỗi khi phát audio:', error);
            summaryContent.textContent += '\n\nLỗi phát audio: ' + (error.message || 'Không xác định');
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
    
    // --- CHỨC NĂNG CHAT ---
    
    // Xử lý sự kiện khi nhấn Enter trong ô nhập liệu
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Xử lý sự kiện khi nhấn nút Gửi
    sendBtn.addEventListener('click', sendChatMessage);
    
    // Hàm gửi tin nhắn chat
    function sendChatMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;
        
        // Hiển thị tin nhắn của người dùng
        addChatMessage(userMessage, 'user');
        chatInput.value = '';
        
        // Thêm vào lịch sử chat và lưu
        chatHistory.push({role: 'user', content: userMessage});
        chrome.storage.local.set({chatHistory_summary: chatHistory});
        
        // Lấy API key từ storage
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                addChatMessage("Vui lòng nhập Gemini API Key trong popup của tiện ích.", 'ai');
                return;
            }
            
            // Chuẩn bị nội dung để gửi đến API
            const summaryText = summaryContent.textContent;
            const contextText = originalContent || summaryText;
            
            // Hiển thị thông báo đang xử lý
            const loadingMsgElement = addChatMessage("Đang xử lý...", 'ai');
            
            // Gọi API để trả lời câu hỏi
            callGeminiChatApi(result.geminiApiKey, userMessage, contextText, summaryText, allowExternalKnowledgeCheckbox.checked, chatHistory)
                .then(response => {
                    // Xóa thông báo đang xử lý
                    loadingMsgElement.remove();
                    // Hiển thị câu trả lời
                    addChatMessage(response, 'ai');
                    chatHistory.push({role: 'assistant', content: response});
                    chrome.storage.local.set({chatHistory_summary: chatHistory});
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
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        if (sender === 'ai') {
            contentEl.innerHTML = (function(md){
                function e(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
                let t = e(md);
                t = t.replace(/```([\s\S]*?)```/g, function(_,c){return '<pre><code>'+c+'</code></pre>';});
                t = t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
                t = t.replace(/\*(.*?)\*/g,'<em>$1</em>');
                t = t.replace(/`([^`]+)`/g,'<code>$1</code>');
                t = t.replace(/(?:^|\n)((?:\d+\.\s.*(?:\n|$))+)/gm, function(b){
                    const items=b.trim().split(/\n/).filter(Boolean).map(function(l){return l.replace(/^\d+\.\s*/, '');}).map(function(it){return '<li>'+it+'</li>';}).join('');
                    return '<ol>'+items+'</ol>';
                });
                t = t.replace(/(?:^|\n)((?:[-\*]\s.*(?:\n|$))+)/gm, function(b){
                    const items=b.trim().split(/\n/).filter(Boolean).map(function(l){return l.replace(/^[-\*]\s*/, '');}).map(function(it){return '<li>'+it+'</li>';}).join('');
                    return '<ul>'+items+'</ul>';
                });
                t = t.replace(/\n/g,'<br>');
                return t;
            })(message);
        } else {
            contentEl.textContent = message;
        }
        messageElement.appendChild(contentEl);
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageElement;
    }
    
    // Hàm gọi Gemini API để chat
    async function callGeminiChatApi(apiKey, userQuestion, contextText, summaryText, allowExternalKnowledge = false, chatHistory = []) {
        // const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        // Tạo prompt với context và câu hỏi
        const prompt = `Bạn là trợ lý AI giúp người dùng hiểu sâu hơn về nội dung họ đang đọc. 

Dưới đây là nội dung gốc mà người dùng đang tìm hiểu:

"""${contextText}"""

Đây là bản tóm tắt của nội dung trên:

"""${summaryText}"""

Người dùng hỏi: "${userQuestion}"

${allowExternalKnowledge ? 'Bạn có thể sử dụng kiến thức chung ngoài nội dung được cung cấp khi cần, nhưng luôn ưu tiên thông tin từ nội dung gốc và bản tóm tắt.' : 'Chỉ sử dụng thông tin có trong nội dung gốc và bản tóm tắt; không dùng kiến thức ngoài. Nếu nội dung không đủ để trả lời, hãy nói rõ rằng chưa đủ thông tin.'}

Hãy trả lời câu hỏi của người dùng dựa trên nội dung gốc và bản tóm tắt. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu và chính xác. Nếu câu hỏi không liên quan đến nội dung, hãy lịch sự đề nghị người dùng đặt câu hỏi liên quan đến nội dung đang được tóm tắt.`;
        
        const contents = [
            { role: 'user', parts: [{ text: prompt }] }
        ];
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(function(msg){ contents.push({ role: msg.role, parts: [{ text: msg.content }] }); });

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
