// Thêm CSS cho thông báo lỗi
const errorStyle = document.createElement('style');
errorStyle.textContent = `
.tts-error-message {
    color: #721c24;
    padding: 12px;
    margin: 10px 0;
    border: 1px solid #f5c6cb;
    border-radius: 5px;
    background-color: #f8d7da;
    font-size: 14px;
    line-height: 1.5;
    max-width: 100%;
    word-break: break-word;
}

.tts-error-message strong {
    display: block;
    margin-bottom: 8px;
    font-size: 16px;
}

.tts-error-message ol {
    margin: 8px 0 8px 20px;
    padding: 0;
}

.tts-error-message li {
    margin-bottom: 6px;
}

.tts-error-message a {
    color: #0056b3;
    text-decoration: underline;
}

.tts-error-message a:hover {
    text-decoration: none;
}
`;
document.head.appendChild(errorStyle);

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
    let currentReadingIndex = -1; // Biến lưu chỉ số đoạn đang đọc (-1 là chưa đọc đoạn nào)
    
    // Hàm để đảm bảo port kết nối luôn hoạt động
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "chat"});
                console.log("Đã kết nối port mới");
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    console.log("Nhận tin nhắn từ background:", message);
                    if (message.type === "TTS_RESULT") {
                        if (message.success) {
                            console.log("Nhận kết quả TTS thành công cho đoạn", message.readingIndex);
                            // Cập nhật chỉ số đoạn đang đọc từ phản hồi nếu có
                            if (message.readingIndex !== undefined && message.readingIndex !== null) {
                                currentReadingIndex = message.readingIndex;
                            }
                            playAudioFromBase64(message.audioData, message);
                        } else {
                            console.error("Lỗi đọc:", message.error, "cho đoạn", message.readingIndex);
                            // Truyền thông tin lỗi cho hàm phát âm thanh để hiển thị
                            playAudioFromBase64(null, message);
                            resetPlayButton();
                            // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                            updateCurrentMessageReadButton('▶️ Đọc');
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
        console.log("Nhận tin nhắn từ background script:", message);
        if (message.type === "TTS_RESULT") {
            console.log("Nhận kết quả TTS:", message.success ? "thành công" : "thất bại", "cho đoạn", message.readingIndex);
            if (message.success) {
                // Cập nhật chỉ số đoạn đang đọc từ phản hồi nếu có
                if (message.readingIndex !== undefined && message.readingIndex !== null) {
                    currentReadingIndex = message.readingIndex;
                }
                playAudioFromBase64(message.audioData, message);
            } else {
                console.error("Lỗi TTS từ background:", message.error);
                // Truyền thông tin lỗi cho hàm phát âm thanh để hiển thị
                playAudioFromBase64(null, message);
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('▶️ Đọc');
            }
        }
        // Trả về true để giữ kênh tin nhắn mở cho phản hồi bất đồng bộ
        return true;
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
            readText(currentTextToRead, 0); // Đọc phần tóm tắt với chỉ số 0
            return;
        }
        
        // Nếu có tin nhắn AI đang được chọn để đọc
        if (currentAiMessage) {
            // Lấy chỉ số từ thuộc tính data-index của tin nhắn
            const messageIndex = currentAiMessage.getAttribute('data-index');
            readText(currentAiMessage.textContent, messageIndex ? parseInt(messageIndex) : -1);
            return;
        }
        
        // Mặc định đọc phần tóm tắt với chỉ số 0
        currentTextToRead = contentSummary.textContent;
        readText(currentTextToRead, 0);
    });

    // Sự kiện nhấn nút Dừng
    stopBtn.addEventListener('click', function() {
        stopReading();
    });
    
    // Hàm gửi yêu cầu TTS đến background script
    function requestTTS(text, readingIndex) {
        console.log("Bắt đầu gửi yêu cầu TTS cho văn bản:", text.substring(0, 50) + "...", "với chỉ số:", readingIndex);
        
        // Lưu chỉ số đoạn đang đọc
        currentReadingIndex = readingIndex;
        
        // Lấy API key từ storage
        chrome.storage.local.get(['googleApiKey'], function(result) {
            const apiKey = result.googleApiKey;
            if (!apiKey) {
                console.error("Lỗi: Chưa cấu hình Google API Key");
                if (currentAiMessage) {
                    currentAiMessage.textContent += "\n\nLỗi: Chưa cấu hình Google API Key";
                }
                // Hiển thị thông báo lỗi
                const errorMsg = {
                    error: "Không có Google API key. Vui lòng nhập API key trong phần Cài đặt.",
                    readingIndex: readingIndex
                };
                playAudioFromBase64(null, errorMsg);
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('▶️ Đọc');
                return;
            }
            
            // Kiểm tra xem API đã được kích hoạt chưa
            const apiKeyStatus = localStorage.getItem('googleApiKeyStatus');
            if (apiKeyStatus === 'disabled') {
                const errorMsg = {
                    error: "Google TTS API chưa được kích hoạt. Vui lòng thực hiện các bước sau:\n" +
                        "1. Truy cập Google Cloud Console: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com\n" +
                        "2. Đăng nhập với tài khoản Google của bạn\n" +
                        "3. Chọn dự án của bạn\n" +
                        "4. Nhấn nút 'Kích hoạt' để bật API Text-to-Speech\n" +
                        "5. Đợi vài phút để thay đổi có hiệu lực\n" +
                        "6. Thử lại tính năng đọc",
                    readingIndex: readingIndex
                };
                console.error(errorMsg.error);
                if (currentAiMessage) {
                    currentAiMessage.textContent += "\n\n" + "Google TTS API chưa được kích hoạt. Vui lòng truy cập Google Cloud Console để kích hoạt API.";
                }
                playAudioFromBase64(null, errorMsg);
                resetPlayButton();
                updateCurrentMessageReadButton('▶️ Đọc');
                return;
            }
            
            console.log("Đã lấy được API key, chuẩn bị gửi yêu cầu TTS cho đoạn", readingIndex);
            
            // Cấu hình cho TTS
            const config = {
                apiKey: apiKey
            };
            
            // Gửi yêu cầu TTS
            const connected = ensureConnected();
            if (connected) {
                console.log("Sử dụng kết nối port để gửi yêu cầu TTS cho đoạn", readingIndex);
                try {
                    connected.postMessage({
                        type: "TTS_REQUEST",
                        config: config,
                        text: text,
                        readingIndex: readingIndex
                    });
                    console.log("Đã gửi yêu cầu TTS qua port cho đoạn", readingIndex);
                } catch (error) {
                    console.error("Lỗi khi gửi yêu cầu TTS qua port:", error);
                    // Thử lại với sendMessage
                    sendTTSWithMessage(config, text, readingIndex);
                }
            } else {
                // Nếu không thể kết nối port, sử dụng sendMessage thay thế
                console.log("Không thể kết nối port, sử dụng sendMessage cho đoạn", readingIndex);
                sendTTSWithMessage(config, text, readingIndex);
            }
        });
    }
    
    // Hàm gửi yêu cầu TTS bằng sendMessage
    function sendTTSWithMessage(config, text, readingIndex) {
        console.log("Gửi yêu cầu TTS bằng sendMessage cho đoạn", readingIndex);
        try {
            chrome.runtime.sendMessage({
                type: "TTS_REQUEST",
                config: config,
                text: text,
                readingIndex: readingIndex
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error("Lỗi khi gửi tin nhắn:", chrome.runtime.lastError);
                    // Hiển thị thông báo lỗi
                    const errorMsg = {
                        error: "Lỗi kết nối với background script: " + chrome.runtime.lastError.message,
                        readingIndex: readingIndex
                    };
                    playAudioFromBase64(null, errorMsg);
                    resetPlayButton();
                    return;
                }
                
                console.log("Nhận phản hồi từ sendMessage:", response);
            });
            console.log("Đã gửi yêu cầu TTS bằng sendMessage cho đoạn", readingIndex);
        } catch (error) {
            console.error("Lỗi khi gửi yêu cầu TTS bằng sendMessage:", error);
            if (currentAiMessage) {
                currentAiMessage.textContent += "\n\nLỗi khi gửi yêu cầu TTS: " + error.message;
            }
            resetPlayButton();
            // Cập nhật nút đọc của tin nhắn hiện tại nếu có
            updateCurrentMessageReadButton('▶️ Đọc');
        }
    }
    
    // Hàm đọc văn bản
    function readText(text, readingIndex = -1) {
        if (!text || text === "Không tìm thấy nội dung trang." || text === "Đang tải nội dung...") {
            return;
        }
        
        stopReading(); // Dừng mọi thứ trước khi bắt đầu
    
        if (ttsEngineSelect.value === 'browser') {
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                playPauseBtn.textContent = '⏸️ Tạm dừng';
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('⏹️ Dừng');
            } else if (speechSynthesis.speaking) {
                speechSynthesis.pause();
                playPauseBtn.textContent = '▶️ Tiếp tục';
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('▶️ Tiếp tục');
            } else {
                // Lưu chỉ số đoạn đang đọc
                currentReadingIndex = readingIndex;
                startBrowserReading(text);
            }
        } else { // Google TTS
            chrome.storage.local.get(['googleApiKey'], function(result) {
                if (!result.googleApiKey) {
                    console.error("Vui lòng nhập và lưu Google Cloud API Key trong popup của tiện ích.");
                    return;
                }
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('Đang tải...');
                
                // Sử dụng hàm requestTTS để gửi yêu cầu
                requestTTS(text, readingIndex);
            });
        }
    }
    
    // Hàm cập nhật trạng thái nút đọc của tin nhắn hiện tại
    function updateCurrentMessageReadButton(text) {
        if (currentAiMessage) {
            const readButton = currentAiMessage.querySelector('.message-read-btn');
            if (readButton) {
                readButton.textContent = text;
                console.log("Cập nhật nút đọc của tin nhắn hiện tại thành:", text);
                if (text === 'Đang tải...') {
                    readButton.disabled = true;
                } else {
                    readButton.disabled = false;
                }
            } else {
                console.log("Không tìm thấy nút đọc trong tin nhắn hiện tại");
            }
        } else {
            console.log("Không có tin nhắn AI hiện tại để cập nhật nút đọc");
        }
    }
    
    // --- CÁC HÀM ĐIỀU KHIỂN ĐỌC ---

    function startBrowserReading(text) {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = function() {
            resetPlayButton();
            // Cập nhật nút đọc của tin nhắn hiện tại
            updateCurrentMessageReadButton('▶️ Đọc');
        };
        utterance.onerror = function(event) {
            console.error("Lỗi giọng đọc trình duyệt:", event.error);
            resetPlayButton();
            // Cập nhật nút đọc của tin nhắn hiện tại
            updateCurrentMessageReadButton('▶️ Đọc');
        }
        speechSynthesis.speak(utterance);
        playPauseBtn.textContent = '⏸️ Tạm dừng';
        // Cập nhật nút đọc của tin nhắn hiện tại
        updateCurrentMessageReadButton('⏹️ Dừng');
    }

    function stopBrowserReading() {
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
    }
    
    function playAudioFromBase64(base64String, message) {
        console.log("Bắt đầu phát audio từ base64 cho đoạn", currentReadingIndex);
        try {
            // Cập nhật chỉ số đọc hiện tại nếu có
            if (message && message.readingIndex !== undefined) {
                currentReadingIndex = message.readingIndex;
                console.log("Cập nhật chỉ số đọc hiện tại:", currentReadingIndex);
            }
            
            // Kiểm tra lỗi từ message
            if (message && message.error) {
                console.error("Lỗi TTS:", message.error);
                
                // Hiển thị thông báo lỗi cho người dùng
            const errorDiv = document.createElement('div');
            errorDiv.className = 'tts-error-message';
                
                // Định dạng thông báo lỗi
                if (message.error.includes('Google TTS API chưa được kích hoạt')) {
                    // Tạo thông báo với liên kết
                    const errorLines = message.error.split('\n');
                    errorDiv.innerHTML = `<strong>${errorLines[0]}</strong><br>`;
                    
                    const ul = document.createElement('ol');
                    for (let i = 1; i < errorLines.length; i++) {
                        const li = document.createElement('li');
                        if (errorLines[i].includes('https://')) {
                            const parts = errorLines[i].split(': ');
                            li.innerHTML = `${parts[0]}: <a href="${parts[1]}" target="_blank">${parts[1]}</a>`;
                        } else {
                            li.textContent = errorLines[i];
                        }
                        ul.appendChild(li);
                    }
                    errorDiv.appendChild(ul);
                } else {
                    errorDiv.textContent = message.error;
                }
                
                // Thêm vào DOM
                const chatContainer = document.getElementById('chat-container');
                chatContainer.appendChild(errorDiv);
                
                // Tự động xóa sau 30 giây
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 30000);
                
                // Đặt lại nút đọc
                resetPlayButton();
                return;
            }
            
            if (audioSource) {
                console.log("Dừng nguồn audio hiện tại");
                audioSource.stop();
            }
            
            if (!base64String) {
                console.error("Lỗi: Dữ liệu audio trống");
                if (currentAiMessage) {
                    currentAiMessage.textContent += '\n\nLỗi: Dữ liệu audio trống.';
                }
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại
                updateCurrentMessageReadButton('▶️ Đọc');
                return;
            }
            
            console.log("Giải mã dữ liệu base64 cho đoạn", currentReadingIndex);
            const audioData = atob(base64String);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }
    
            console.log("Tạo AudioContext mới cho đoạn", currentReadingIndex);
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            console.log("Giải mã dữ liệu audio cho đoạn", currentReadingIndex);
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                console.log("Giải mã thành công, bắt đầu phát audio cho đoạn", currentReadingIndex);
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(audioContext.destination);
                audioSource.start(0);
                playPauseBtn.textContent = '⏹️ Dừng';
                playPauseBtn.disabled = false;
                // Cập nhật nút đọc của tin nhắn hiện tại
                updateCurrentMessageReadButton('⏹️ Dừng');
                
                audioSource.onended = () => {
                   console.log("Audio đã phát xong cho đoạn", currentReadingIndex);
                   resetPlayButton();
                   // Cập nhật nút đọc của tin nhắn hiện tại
                   updateCurrentMessageReadButton('▶️ Đọc');
                };
            }, (err) => {
                console.error('Lỗi giải mã audio cho đoạn', currentReadingIndex, ':', err);
                if (currentAiMessage) {
                    currentAiMessage.textContent += '\n\nLỗi giải mã audio: ' + (err.message || 'Không xác định');
                }
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại
                updateCurrentMessageReadButton('▶️ Đọc');
            });
        } catch (error) {
            console.error('Lỗi khi phát audio cho đoạn', currentReadingIndex, ':', error);
            if (currentAiMessage) {
                currentAiMessage.textContent += '\n\nLỗi phát audio: ' + (error.message || 'Không xác định');
            }
            resetPlayButton();
            // Cập nhật nút đọc của tin nhắn hiện tại
            updateCurrentMessageReadButton('▶️ Đọc');
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
        // Cập nhật nút đọc của tin nhắn hiện tại
        updateCurrentMessageReadButton('▶️ Đọc');
        // Đặt lại chỉ số đoạn đang đọc
        console.log("Đặt lại chỉ số đoạn đang đọc từ", currentReadingIndex, "thành -1");
        currentReadingIndex = -1;
    }
    
    function resetPlayButton() {
        // Đặt lại nút đọc chính
        playPauseBtn.textContent = '▶️ Đọc';
        playPauseBtn.disabled = false;
        
        // Đặt lại tất cả các nút đọc tin nhắn
        const allReadButtons = document.querySelectorAll('.message-read-btn');
        allReadButtons.forEach(button => {
            if (button.textContent === '⏹️ Dừng') {
                button.textContent = '▶️ Đọc';
            }
        });
        
        // Đặt lại chỉ số đọc hiện tại
        currentReadingIndex = -1;
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
    
    // Biến đếm số lượng tin nhắn AI
    let aiMessageCount = 0;
    
    // Hàm thêm tin nhắn vào container
    function addChatMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Thêm khả năng đọc cho tin nhắn AI khi nhấp vào
        if (sender === 'ai') {
            // Tăng số lượng tin nhắn AI và gán chỉ số
            // Chỉ số bắt đầu từ 1 vì 0 dành cho phần tóm tắt
            const messageIndex = ++aiMessageCount;
            messageElement.setAttribute('data-index', messageIndex);
            
            // Thêm nút đọc cho tin nhắn AI
            const readButton = document.createElement('button');
            readButton.className = 'message-read-btn';
            readButton.textContent = '▶️ Đọc';
            readButton.style.marginTop = '8px';
            readButton.style.padding = '5px 10px';
            readButton.style.backgroundColor = '#34A853';
            readButton.style.color = 'white';
            readButton.style.border = 'none';
            readButton.style.borderRadius = '4px';
            readButton.style.cursor = 'pointer';
            
            readButton.addEventListener('click', function(e) {
                e.stopPropagation(); // Ngăn sự kiện lan truyền lên phần tử cha
                
                // Đặt tin nhắn hiện tại để đọc
                currentAiMessage = messageElement;
                currentTextToRead = messageElement.textContent;
                
                console.log("Nhấn nút đọc cho tin nhắn với chỉ số", messageIndex);
                
                // Cập nhật trạng thái nút
                if (this.textContent === '▶️ Đọc' || this.textContent === '▶️ Tiếp tục') {
                    // Đọc nội dung tin nhắn với chỉ số của tin nhắn
                    readText(messageElement.textContent, messageIndex);
                    this.textContent = '⏹️ Dừng';
                } else {
                    stopReading();
                    this.textContent = '▶️ Đọc';
                }
            });
            
            messageElement.appendChild(readButton);
            
            // Vẫn giữ khả năng nhấp vào tin nhắn để đọc
            messageElement.style.cursor = 'pointer';
            messageElement.title = 'Nhấp để đọc tin nhắn này';
            messageElement.addEventListener('click', function(e) {
                // Chỉ xử lý khi nhấp vào phần nội dung, không phải nút
                if (e.target !== readButton && !readButton.contains(e.target)) {
                    console.log("Nhấp vào tin nhắn với chỉ số", messageIndex);
                    
                    // Đặt tin nhắn hiện tại để đọc
                    currentAiMessage = this;
                    currentTextToRead = this.textContent;
                    
                    // Nếu đang đọc tin nhắn này, dừng lại
                    if (currentReadingIndex === messageIndex && (readButton.textContent === '⏹️ Dừng')) {
                        stopReading();
                        readButton.textContent = '▶️ Đọc';
                    } else {
                        // Đọc nội dung tin nhắn với chỉ số của tin nhắn
                        readText(this.textContent, messageIndex);
                        // Cập nhật trạng thái nút đọc
                        readButton.textContent = '⏹️ Dừng';
                    }
                }
            });
            
            console.log(`Đã thêm tin nhắn AI với chỉ số ${messageIndex}`);
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