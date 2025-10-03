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
    const enableWebSearchCheckbox = document.getElementById('enableWebSearch');
    
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
    let ttsState = {
        isProcessing: false,  // Đang xử lý yêu cầu TTS
        isPlaying: false,     // Đang phát audio
        isPaused: false,      // Đang tạm dừng (chỉ áp dụng cho trình duyệt)
        error: null,          // Lỗi nếu có
        retryCount: 0,        // Số lần thử lại kết nối
        maxRetries: 3         // Số lần thử lại tối đa
    };
    
    // Hàm để đảm bảo port kết nối luôn hoạt động với cơ chế thử lại
    function ensureConnected() {
        if (!port || port.error) {
            try {
                // Kiểm tra số lần thử lại
                if (ttsState.retryCount >= ttsState.maxRetries) {
                    console.warn("Đã vượt quá số lần thử lại kết nối port (", ttsState.maxRetries, ")");
                    ttsState.error = "Không thể kết nối với background script sau nhiều lần thử";
                    return null;
                }
                
                // Tạo kết nối port mới với tên "chat"
                port = chrome.runtime.connect({name: "chat"});
                console.log("Đã kết nối port mới (lần thử", ttsState.retryCount + 1, ")");
                ttsState.retryCount = 0; // Reset số lần thử lại khi kết nối thành công
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    console.log("Nhận tin nhắn từ port:", message);
                    if (message.type === "TTS_RESULT") {
                        ttsState.isProcessing = false; // Đã nhận phản hồi, không còn đang xử lý
                        
                        if (message.success) {
                            console.log("Nhận kết quả TTS thành công cho đoạn", message.readingIndex);
                            ttsState.error = null; // Xóa lỗi nếu có
                            
                            // Cập nhật chỉ số đoạn đang đọc từ phản hồi nếu có và khác với giá trị hiện tại
                            if (message.readingIndex !== undefined && message.readingIndex !== null && 
                                message.readingIndex !== currentReadingIndex) {
                                currentReadingIndex = message.readingIndex;
                                console.log("Cập nhật chỉ số đọc thành", currentReadingIndex);
                            }
                            
                            playAudioFromBase64(message.audioData, message);
                        } else {
                            console.error("Lỗi đọc:", message.error, "cho đoạn", message.readingIndex);
                            ttsState.error = message.error;
                            
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
                    ttsState.retryCount++; // Tăng số lần thử lại
                });
            } catch (error) {
                console.error("Lỗi khi kết nối port:", error);
                port = null;
                ttsState.retryCount++;
                ttsState.error = error.message;
            }
        }
        return port;
    }

    // Khởi tạo kết nối port khi trang được tải
    port = ensureConnected();

    // Tải lựa chọn công cụ TTS và cài đặt web search đã lưu
    chrome.storage.sync.get(['ttsEngine', 'enableWebSearch'], function (result) {
        if (result.ttsEngine) {
            ttsEngineSelect.value = result.ttsEngine;
        }
        // Mặc định bật tính năng web search nếu chưa có cài đặt
        enableWebSearchCheckbox.checked = result.enableWebSearch !== false;
    });

    // Lưu lựa chọn công cụ TTS
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
    });
    
    // Lưu cài đặt bật/tắt tính năng tra cứu thông tin bổ sung
    enableWebSearchCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({ enableWebSearch: this.checked }, function() {
            console.log('Đã lưu cài đặt tra cứu thông tin bổ sung:', enableWebSearchCheckbox.checked);
        });
    });
    
    // Lắng nghe tin nhắn từ background script thông qua chrome.runtime.onMessage
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            // Gửi phản hồi để xác nhận đã nhận được tin nhắn
            if (sendResponse) {
                sendResponse({received: true});
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
    
    // Hàm xử lý sự kiện nhấn nút Phát/Tạm dừng
    function handlePlayPauseClick() {
        console.log("Nhấn nút Phát/Tạm dừng, trạng thái hiện tại:", {
            isProcessing: ttsState.isProcessing,
            isPlaying: ttsState.isPlaying,
            isPaused: ttsState.isPaused,
            buttonText: playPauseBtn.textContent,
            currentReadingIndex: currentReadingIndex
        });
        
        // Nếu đang xử lý TTS, bỏ qua
        if (ttsState.isProcessing) {
            console.log("Đang xử lý TTS, bỏ qua yêu cầu mới");
            return;
        }
        
        // Nếu đang phát và không tạm dừng
        if (ttsState.isPlaying && !ttsState.isPaused) {
            // Nếu đang sử dụng Google TTS API và có AudioContext
            if (ttsEngineSelect.value !== 'browser' && audioContext && audioContext.state === 'running') {
                console.log("Tạm dừng phát audio");
                audioContext.suspend().then(() => {
                    ttsState.isPaused = true;
                    ttsState.isPlaying = true; // Vẫn đang phát nhưng tạm dừng
                    playPauseBtn.textContent = '▶️ Tiếp tục';
                    // Cập nhật nút đọc của tin nhắn hiện tại
                    updateCurrentMessageReadButton('▶️ Tiếp tục');
                });
                return;
            } else {
                // Nếu đang sử dụng trình duyệt hoặc không có AudioContext, dừng lại
                console.log("Đang phát, dừng lại");
                stopReading();
                return;
            }
        }
        
        // Nếu đang tạm dừng, tiếp tục
        if (ttsState.isPaused || (ttsEngineSelect.value === 'browser' && speechSynthesis.paused)) {
            console.log("Đang tạm dừng, tiếp tục");
            if (ttsEngineSelect.value === 'browser') {
                pauseBrowserReading(); // Hàm này sẽ tiếp tục phát nếu đang dùng trình duyệt
            } else if (audioContext && audioContext.state === 'suspended') {
                // Tiếp tục phát audio nếu đang dùng Google TTS API
                console.log("Tiếp tục phát audio từ trạng thái tạm dừng");
                audioContext.resume().then(() => {
                    ttsState.isPaused = false;
                    ttsState.isPlaying = true;
                    playPauseBtn.textContent = '⏸️ Tạm dừng';
                    // Cập nhật nút đọc của tin nhắn hiện tại
                    updateCurrentMessageReadButton('⏹️ Dừng');
                });
            }
            return;
        }
        
        // Xác định nội dung cần đọc
        // Nếu đang đọc phần tóm tắt, tiếp tục đọc
        if (currentTextToRead === contentSummary.textContent) {
            console.log("Đọc phần tóm tắt với chỉ số 0");
            readText(currentTextToRead, 0); // Đọc phần tóm tắt với chỉ số 0
            return;
        }
        
        // Nếu có tin nhắn AI đang được chọn để đọc
        if (currentAiMessage) {
            // Lấy chỉ số từ thuộc tính data-index của tin nhắn
            const messageIndex = currentAiMessage.getAttribute('data-index');
            console.log("Đọc tin nhắn AI với chỉ số", messageIndex);
            readText(currentAiMessage.textContent, messageIndex ? parseInt(messageIndex) : -1);
            return;
        }
        
        // Mặc định đọc phần tóm tắt với chỉ số 0
        console.log("Mặc định đọc phần tóm tắt với chỉ số 0");
        currentTextToRead = contentSummary.textContent;
        readText(currentTextToRead, 0);
    }
    
    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', handlePlayPauseClick);

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
        chrome.storage.sync.get(['googleTtsConfig'], function(result) {
            console.log("Đã lấy cấu hình Google TTS từ storage:", result);
            const apiKey = result.googleTtsConfig?.apiKey;
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
            
            // Cập nhật trạng thái TTS
            ttsState.isProcessing = true;
            ttsState.error = null;
            
            // Cập nhật UI trước khi bắt đầu xử lý
            playPauseBtn.disabled = true;
            playPauseBtn.textContent = '⏳ Đang tải...';
            updateCurrentMessageReadButton('⏳ Đang tải...');
            
            // Lấy cấu hình TTS từ storage
            chrome.storage.sync.get(['googleTtsConfig'], function(result) {
                const config = result.googleTtsConfig || {};
                
                // Thêm API key vào config
                config.apiKey = apiKey;
                config.engine = 'google';
                
                // Thiết lập timeout để xử lý trường hợp không nhận được phản hồi từ port
                const portTimeoutId = setTimeout(() => {
                    console.warn("Không nhận được phản hồi từ port sau 15 giây, thử lại với sendMessage");
                    // Thử lại với sendMessage
                    sendTTSWithMessage(config, text, readingIndex);
                }, 15000); // 15 giây timeout
                
                // Đảm bảo port kết nối trước khi gửi tin nhắn
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
                        
                        // Đăng ký listener tạm thời để xử lý phản hồi từ port
                        const messageHandler = (message) => {
                            if (message.type === "TTS_RESULT" && message.readingIndex === readingIndex) {
                                console.log("Nhận được phản hồi TTS_RESULT từ port cho đoạn", readingIndex);
                                // Xóa timeout vì đã nhận được phản hồi
                                clearTimeout(portTimeoutId);
                                // Xóa listener tạm thời
                                connected.onMessage.removeListener(messageHandler);
                                
                                // Xử lý phản hồi TTS
                                if (message.success) {
                                    console.log("Phản hồi TTS thành công từ port cho đoạn", readingIndex);
                                    ttsState.error = null;
                                    playAudioFromBase64(message.audioData, message);
                                } else {
                                    console.error("Lỗi TTS từ port:", message.error, "cho đoạn", readingIndex);
                                    ttsState.error = message.error;
                                    playAudioFromBase64(null, message);
                                    resetPlayButton();
                                    // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                                    updateCurrentMessageReadButton('▶️ Đọc');
                                }
                            }
                        };
                        connected.onMessage.addListener(messageHandler);
                        
                    } catch (error) {
                        // Xóa timeout vì đã có lỗi
                        clearTimeout(portTimeoutId);
                        console.error("Lỗi khi gửi yêu cầu TTS qua port:", error);
                        ttsState.error = error.message;
                        // Thử lại với sendMessage
                        sendTTSWithMessage(config, text, readingIndex);
                    }
                } else {
                    // Xóa timeout vì không thể kết nối port
                    clearTimeout(portTimeoutId);
                    // Nếu không thể kết nối port, sử dụng sendMessage thay thế
                    console.log("Không thể kết nối port, sử dụng sendMessage cho đoạn", readingIndex);
                    sendTTSWithMessage(config, text, readingIndex);
                }
            });
        });
    }
    
    // Hàm gửi yêu cầu TTS bằng sendMessage
    function sendTTSWithMessage(config, text, readingIndex) {
        console.log("Gửi yêu cầu TTS bằng sendMessage cho đoạn", readingIndex);
        try {
            // Đảm bảo trạng thái TTS được cập nhật
            if (!ttsState.isProcessing) {
                ttsState.isProcessing = true;
                ttsState.error = null;
                // Chỉ cập nhật UI nếu chưa được cập nhật trước đó
                updateCurrentMessageReadButton('⏳ Đang tải...');
            }
            
            // Cập nhật UI trước khi gửi yêu cầu
            playPauseBtn.disabled = true;
            playPauseBtn.textContent = '⏳ Đang tải...';
            
            // Thiết lập timeout để xử lý trường hợp không nhận được phản hồi
            const timeoutId = setTimeout(() => {
                console.warn("Không nhận được phản hồi TTS sau 30 giây, đặt lại trạng thái");
                ttsState.isProcessing = false;
                ttsState.error = "Không nhận được phản hồi từ background script sau 30 giây";
                
                // Hiển thị thông báo lỗi
                const errorMsg = {
                    error: "Không nhận được phản hồi từ background script sau 30 giây. Vui lòng thử lại.",
                    readingIndex: readingIndex
                };
                playAudioFromBase64(null, errorMsg);
                resetPlayButton();
                updateCurrentMessageReadButton('▶️ Đọc');
            }, 30000); // 30 giây timeout
            
            chrome.runtime.sendMessage({
                type: "TTS_REQUEST",
                config: config,
                text: text,
                readingIndex: readingIndex
            }, function(response) {
                // Xóa timeout vì đã nhận được phản hồi
                clearTimeout(timeoutId);
                
                // Đánh dấu đã xử lý xong
                ttsState.isProcessing = false;
                
                if (chrome.runtime.lastError) {
                    console.error("Lỗi khi gửi tin nhắn:", chrome.runtime.lastError);
                    ttsState.error = chrome.runtime.lastError.message;
                    
                    // Hiển thị thông báo lỗi
                    const errorMsg = {
                        error: "Lỗi kết nối với background script: " + chrome.runtime.lastError.message,
                        readingIndex: readingIndex
                    };
                    playAudioFromBase64(null, errorMsg);
                    resetPlayButton();
                    // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                    updateCurrentMessageReadButton('▶️ Đọc');
                    return;
                }
                
                // Xử lý phản hồi nếu có
                if (response && response.type === "TTS_RESULT") {
                    if (response.success) {
                        ttsState.error = null;
                        // Cập nhật chỉ số đọc nếu khác với giá trị hiện tại
                        if (response.readingIndex !== undefined && response.readingIndex !== null && 
                            response.readingIndex !== currentReadingIndex) {
                            currentReadingIndex = response.readingIndex;
                            console.log("Cập nhật chỉ số đọc thành", currentReadingIndex);
                        }
                        playAudioFromBase64(response.audioData, response);
                    } else {
                        console.error("Lỗi TTS:", response.error);
                        ttsState.error = response.error;
                        playAudioFromBase64(null, response);
                        resetPlayButton();
                        // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                        updateCurrentMessageReadButton('▶️ Đọc');
                    }
                }
            });
            console.log("Đã gửi yêu cầu TTS bằng sendMessage cho đoạn", readingIndex);
        } catch (error) {
            console.error("Lỗi khi gửi yêu cầu TTS bằng sendMessage:", error);
            ttsState.isProcessing = false;
            ttsState.error = error.message;
            
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
        // Kiểm tra nội dung văn bản
        if (!text || text === "Không tìm thấy nội dung trang." || text === "Đang tải nội dung...") {
            console.log("Không thể đọc: Văn bản trống hoặc không hợp lệ");
            return;
        }
        
        // Kiểm tra nếu đang xử lý TTS, tránh gửi nhiều yêu cầu cùng lúc
        if (ttsState.isProcessing) {
            console.log("Đang xử lý yêu cầu TTS khác, bỏ qua yêu cầu mới");
            return;
        }
        
        // Kiểm tra nếu đang tạm dừng với cùng một đoạn văn bản
        if (ttsState.isPaused && currentReadingIndex === readingIndex) {
            console.log("Tiếp tục đọc đoạn đang tạm dừng");
            if (ttsEngineSelect.value === 'browser') {
                pauseBrowserReading(); // Tiếp tục đọc bằng trình duyệt
            } else if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    ttsState.isPaused = false;
                    ttsState.isPlaying = true;
                    playPauseBtn.textContent = '⏸️ Tạm dừng';
                    // Cập nhật nút đọc của tin nhắn hiện tại
                    updateCurrentMessageReadButton('⏹️ Dừng');
                });
            }
            return;
        }
        
        // Dừng mọi thứ trước khi bắt đầu đọc mới
        stopReading();
        
        // Đặt lại trạng thái TTS
        ttsState.isProcessing = true;
        ttsState.error = null;
        ttsState.retryCount = 0;
        ttsState.isPaused = false;
        
        // Cập nhật chỉ số đọc
        if (readingIndex !== currentReadingIndex) {
            console.log("Cập nhật chỉ số đọc từ", currentReadingIndex, "thành", readingIndex);
            currentReadingIndex = readingIndex;
        }
    
        if (ttsEngineSelect.value === 'browser') {
            if (speechSynthesis.paused || ttsState.isPaused) {
                console.log("Tiếp tục đọc bằng trình duyệt từ trạng thái tạm dừng");
                speechSynthesis.resume();
                playPauseBtn.textContent = '⏸️ Tạm dừng';
                // Cập nhật trạng thái
                ttsState.isPlaying = true;
                ttsState.isPaused = false;
                ttsState.isProcessing = false;
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('⏹️ Dừng');
            } else if (speechSynthesis.speaking) {
                console.log("Tạm dừng đọc bằng trình duyệt");
                speechSynthesis.pause();
                playPauseBtn.textContent = '▶️ Tiếp tục';
                // Cập nhật trạng thái
                ttsState.isPlaying = true;
                ttsState.isPaused = true;
                ttsState.isProcessing = false;
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                updateCurrentMessageReadButton('▶️ Tiếp tục');
            } else {
                console.log("Bắt đầu đọc mới bằng trình duyệt");
                // Lưu chỉ số đoạn đang đọc
                currentReadingIndex = readingIndex;
                startBrowserReading(text);
            }
        } else if (ttsEngineSelect.value === 'google') {
            chrome.storage.sync.get(['googleTtsConfig'], function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    console.error("Vui lòng nhập và lưu Google Cloud API Key trong popup của tiện ích.");
                    ttsState.error = "Chưa cấu hình Google API Key";
                    ttsState.isProcessing = false;
                    
                    if (currentAiMessage) {
                        currentAiMessage.textContent += '\n\nLỗi: Chưa cấu hình Google TTS API Key. Vui lòng cấu hình trong phần Cài đặt.';
                    }
                    return;
                }
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                updateCurrentMessageReadButton('⏳ Đang tải...');
                console.log("Sử dụng Google TTS với API key:", result.googleTtsConfig.apiKey.substring(0, 5) + "...");
                requestTTS(text, readingIndex);
            });
        } else if (ttsEngineSelect.value === 'local') {
            playPauseBtn.disabled = true;
            playPauseBtn.textContent = 'Đang tải...';
            updateCurrentMessageReadButton('⏳ Đang tải...');
            const config = { engine: 'local', languageCode: 'vi-VN' };
            const connected = ensureConnected();
            if (connected) {
                try {
                    connected.postMessage({
                        type: "TTS_REQUEST",
                        config: config,
                        text: text,
                        readingIndex: readingIndex
                    });
                } catch (error) {
                    sendTTSWithMessage(config, text, readingIndex);
                }
            } else {
                sendTTSWithMessage(config, text, readingIndex);
            }
        }
    }
    
    function pauseBrowserReading() {
        try {
            // Kiểm tra nếu đang đọc và chưa tạm dừng
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
                console.log("Tạm dừng đọc bằng trình duyệt");
                speechSynthesis.pause();
                playPauseBtn.textContent = '▶️ Tiếp tục';
                
                // Cập nhật trạng thái (vẫn đang phát nhưng tạm dừng)
                ttsState.isPlaying = true;
                ttsState.isPaused = true;
                
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                if (currentAiMessage) {
                    const readButton = currentAiMessage.querySelector('.message-read-btn');
                    if (readButton) {
                        readButton.textContent = '▶️ Tiếp tục';
                    }
                }
            } 
            // Kiểm tra nếu đang tạm dừng
            else if (speechSynthesis.paused) {
                console.log("Tiếp tục đọc bằng trình duyệt");
                speechSynthesis.resume();
                playPauseBtn.textContent = '⏸️ Tạm dừng';
                
                // Cập nhật trạng thái
                ttsState.isPlaying = true;
                ttsState.isPaused = false;
                
                // Cập nhật nút đọc của tin nhắn hiện tại nếu có
                if (currentAiMessage) {
                    const readButton = currentAiMessage.querySelector('.message-read-btn');
                    if (readButton) {
                        readButton.textContent = '⏹️ Dừng';
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi tạm dừng/tiếp tục đọc bằng trình duyệt:", error);
            ttsState.error = error.message || "Lỗi khi tạm dừng/tiếp tục đọc bằng trình duyệt";
            ttsState.isPlaying = false;
            ttsState.isPaused = false;
            
            // Hiển thị thông báo lỗi cho người dùng
            if (currentAiMessage) {
                currentAiMessage.textContent += "\n\nLỗi khi tạm dừng/tiếp tục đọc: " + (error.message || "Không xác định");
            }
            
            // Đặt lại nút đọc trong trường hợp lỗi
            resetPlayButton();
        }
    }
    
    // Hàm cập nhật trạng thái nút đọc của tin nhắn hiện tại
    function updateCurrentMessageReadButton(text) {
        if (!currentAiMessage) {
            console.log("Không có tin nhắn AI hiện tại để cập nhật nút đọc");
            return;
        }
        
        const readButton = currentAiMessage.querySelector('.message-read-btn');
        if (!readButton) {
            console.log("Không tìm thấy nút đọc trong tin nhắn hiện tại");
            return;
        }
        
        // Kiểm tra nếu nội dung nút đã giống với text thì không cần cập nhật
        if (readButton.textContent === text) {
            return;
        }
        
        // Cập nhật nội dung nút
        readButton.textContent = text;
        console.log("Cập nhật nút đọc của tin nhắn hiện tại thành:", text);
        
        // Cập nhật trạng thái disabled dựa trên text
        if (text === '⏳ Đang tải...') {
            readButton.disabled = true;
        } else {
            readButton.disabled = false;
        }
        
        // Cập nhật trạng thái TTS dựa trên text
        if (text === '⏳ Đang tải...') {
            ttsState.isProcessing = true;
        } else if (text === '⏹️ Dừng') {
            ttsState.isPlaying = true;
            ttsState.isProcessing = false;
            ttsState.isPaused = false;
        } else if (text === '▶️ Tiếp tục') {
            ttsState.isPlaying = true;
            ttsState.isProcessing = false;
            ttsState.isPaused = true;
        } else if (text === '▶️ Đọc') {
            ttsState.isPlaying = false;
            ttsState.isProcessing = false;
            ttsState.isPaused = false;
        }
    }
    
    // --- CÁC HÀM ĐIỀU KHIỂN ĐỌC ---

    function startBrowserReading(text) {
        try {
            // Cập nhật trạng thái
            ttsState.isProcessing = true;
            ttsState.isPlaying = false;
            ttsState.isPaused = false;
            ttsState.error = null;
            
            // Cập nhật UI trước khi bắt đầu
            updateCurrentMessageReadButton('⏳ Đang tải...');
            
            // Tạo đối tượng SpeechSynthesisUtterance
            utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            
            // Xử lý khi đọc xong
            utterance.onend = function() {
                console.log("Trình duyệt đã đọc xong");
                ttsState.isPlaying = false;
                ttsState.isProcessing = false;
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại
                if (currentAiMessage) {
                    updateCurrentMessageReadButton('▶️ Đọc');
                }
            };
            
            // Xử lý khi có lỗi
            utterance.onerror = function(event) {
                console.error("Lỗi giọng đọc trình duyệt:", event.error);
                ttsState.error = event.error || "Lỗi giọng đọc trình duyệt";
                ttsState.isPlaying = false;
                ttsState.isProcessing = false;
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại
                if (currentAiMessage) {
                    updateCurrentMessageReadButton('▶️ Đọc');
                }
            };
            
            // Bắt đầu đọc
            speechSynthesis.speak(utterance);
            console.log("Bắt đầu đọc bằng trình duyệt");
            
            // Cập nhật trạng thái và UI
            ttsState.isPlaying = true;
            ttsState.isProcessing = false;
            ttsState.isPaused = false;
            playPauseBtn.textContent = '⏸️ Tạm dừng';
            playPauseBtn.disabled = false;
            
            // Cập nhật nút đọc của tin nhắn hiện tại
            if (currentAiMessage) {
                updateCurrentMessageReadButton('⏹️ Dừng');
            }
        } catch (error) {
            console.error("Lỗi khi bắt đầu đọc bằng trình duyệt:", error);
            ttsState.error = error.message || "Lỗi khi bắt đầu đọc bằng trình duyệt";
            ttsState.isPlaying = false;
            ttsState.isProcessing = false;
            ttsState.isPaused = false;
            
            resetPlayButton();
            if (currentAiMessage) {
                updateCurrentMessageReadButton('▶️ Đọc');
                currentAiMessage.textContent += '\n\nLỗi khi bắt đầu đọc bằng trình duyệt: ' + (error.message || 'Không xác định');
            }
        }
    }

    function stopBrowserReading() {
        try {
            // Kiểm tra nếu đang đọc hoặc tạm dừng
            if (speechSynthesis.speaking || speechSynthesis.paused) {
                console.log("Dừng đọc bằng trình duyệt");
                speechSynthesis.cancel();
                
                // Cập nhật trạng thái
                ttsState.isPlaying = false;
                ttsState.isPaused = false;
            }
        } catch (error) {
            console.error("Lỗi khi dừng đọc bằng trình duyệt:", error);
            ttsState.error = error.message || "Lỗi khi dừng đọc bằng trình duyệt";
        } finally {
            // Đảm bảo trạng thái luôn được cập nhật
            ttsState.isPlaying = false;
            ttsState.isPaused = false;
        }
    }
    
    function playAudioFromBase64(base64String, message) {
        console.log("Bắt đầu phát audio từ base64 cho đoạn", currentReadingIndex);
        try {
            // Cập nhật trạng thái TTS
            ttsState.isProcessing = false;
            ttsState.isPaused = false;
            
            // Cập nhật chỉ số đọc hiện tại nếu có và khác với giá trị hiện tại
            if (message && message.readingIndex !== undefined && message.readingIndex !== currentReadingIndex) {
                currentReadingIndex = message.readingIndex;
                console.log("Cập nhật chỉ số đọc hiện tại:", currentReadingIndex);
            }
            
            // Kiểm tra lỗi từ message
            if (message && message.error) {
                console.error("Lỗi TTS:", message.error);
                ttsState.error = message.error;
                ttsState.isPlaying = false;
                
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
                if (chatContainer) {
                    chatContainer.appendChild(errorDiv);
                    
                    // Tự động xóa sau 30 giây
                    setTimeout(() => {
                        if (errorDiv.parentNode) {
                            errorDiv.parentNode.removeChild(errorDiv);
                        }
                    }, 30000);
                }
                
                // Đặt lại nút đọc
                resetPlayButton();
                return;
            }
            
            // Dừng audio hiện tại nếu có
            if (audioSource) {
                console.log("Dừng nguồn audio hiện tại");
                audioSource.stop();
                audioSource = null;
            }
            
            // Kiểm tra dữ liệu audio
            if (!base64String) {
                console.error("Lỗi: Dữ liệu audio trống");
                ttsState.error = "Dữ liệu audio trống";
                ttsState.isPlaying = false;
                
                if (currentAiMessage) {
                    currentAiMessage.textContent += '\n\nLỗi: Dữ liệu audio trống.';
                }
                resetPlayButton();
                // Cập nhật nút đọc của tin nhắn hiện tại
                updateCurrentMessageReadButton('▶️ Đọc');
                return;
            }
            
            // Giải mã và phát audio
            try {
                console.log("Giải mã dữ liệu base64 cho đoạn", currentReadingIndex);
                const audioData = atob(base64String);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioData.length; i++) {
                    uint8Array[i] = audioData.charCodeAt(i);
                }
        
                // Đóng AudioContext cũ nếu có
                if (audioContext) {
                    audioContext.close().catch(e => console.warn("Lỗi khi đóng AudioContext:", e));
                }
                
                console.log("Tạo AudioContext mới cho đoạn", currentReadingIndex);
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                console.log("Giải mã dữ liệu audio cho đoạn", currentReadingIndex);
                audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                    console.log("Giải mã thành công, bắt đầu phát audio cho đoạn", currentReadingIndex);
                    audioSource = audioContext.createBufferSource();
                    audioSource.buffer = buffer;
                    audioSource.connect(audioContext.destination);
                    
                    // Cập nhật trạng thái
                    ttsState.isPlaying = true;
                    ttsState.isPaused = false;
                    ttsState.error = null;
                    
                    // Bắt đầu phát
                    audioSource.start(0);
                    playPauseBtn.textContent = '⏹️ Dừng';
                    playPauseBtn.disabled = false;
                    
                    // Cập nhật nút đọc của tin nhắn hiện tại
                    if (currentAiMessage) {
                        updateCurrentMessageReadButton('⏹️ Dừng');
                    }
                    
                    // Xử lý khi phát xong
                    audioSource.onended = () => {
                       console.log("Audio đã phát xong cho đoạn", currentReadingIndex);
                       ttsState.isPlaying = false;
                       ttsState.isPaused = false;
                       resetPlayButton();
                       // Cập nhật nút đọc của tin nhắn hiện tại
                       if (currentAiMessage) {
                           updateCurrentMessageReadButton('▶️ Đọc');
                       }
                    };
                }, (err) => {
                    console.error('Lỗi giải mã audio cho đoạn', currentReadingIndex, ':', err);
                    ttsState.error = err.message || 'Lỗi giải mã audio';
                    ttsState.isPlaying = false;
                    ttsState.isPaused = false;
                    
                    if (currentAiMessage) {
                        currentAiMessage.textContent += '\n\nLỗi giải mã audio: ' + (err.message || 'Không xác định');
                    }
                    resetPlayButton();
                    // Cập nhật nút đọc của tin nhắn hiện tại
                    if (currentAiMessage) {
                        updateCurrentMessageReadButton('▶️ Đọc');
                    }
                });
            } catch (decodeError) {
                console.error('Lỗi khi giải mã base64 cho đoạn', currentReadingIndex, ':', decodeError);
                ttsState.error = decodeError.message || 'Lỗi giải mã dữ liệu';
                ttsState.isPlaying = false;
                ttsState.isPaused = false;
                
                if (currentAiMessage) {
                    currentAiMessage.textContent += '\n\nLỗi giải mã dữ liệu: ' + (decodeError.message || 'Không xác định');
                }
                resetPlayButton();
                if (currentAiMessage) {
                    updateCurrentMessageReadButton('▶️ Đọc');
                }
            }
        } catch (error) {
            console.error('Lỗi khi phát audio cho đoạn', currentReadingIndex, ':', error);
            ttsState.error = error.message || 'Lỗi phát audio';
            ttsState.isProcessing = false;
            ttsState.isPlaying = false;
            ttsState.isPaused = false;
            
            if (currentAiMessage) {
                currentAiMessage.textContent += '\n\nLỗi phát audio: ' + (error.message || 'Không xác định');
            }
            resetPlayButton();
            // Cập nhật nút đọc của tin nhắn hiện tại
            if (currentAiMessage) {
                updateCurrentMessageReadButton('▶️ Đọc');
            }
        }
    }

    function stopAudioPlayback() {
        try {
            // Dừng nguồn audio nếu đang phát
            if (audioSource) {
                console.log("Dừng nguồn audio hiện tại");
                audioSource.stop();
                audioSource = null;
            }
            
            // Đóng AudioContext nếu có
            if (audioContext) {
                // Nếu đang tạm dừng, tiếp tục trước khi đóng
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                console.log("Đóng AudioContext hiện tại");
                audioContext.close().catch(e => {
                    console.warn("Lỗi khi đóng AudioContext:", e);
                });
                audioContext = null;
            }
            
            // Cập nhật trạng thái
            ttsState.isPlaying = false;
            ttsState.isPaused = false;
        } catch (error) {
            console.error("Lỗi khi dừng phát audio:", error);
            // Đặt lại các biến để tránh lỗi tiếp theo
            audioSource = null;
            audioContext = null;
            ttsState.isPlaying = false;
            ttsState.error = error.message || "Lỗi khi dừng phát audio";
        }
    }

    function stopReading() {
        // Dừng tất cả các nguồn phát âm thanh
        stopBrowserReading();
        stopAudioPlayback();
        
        // Đặt lại trạng thái TTS
        ttsState.isProcessing = false;
        ttsState.isPlaying = false;
        ttsState.isPaused = false;
        ttsState.error = null;
        
        // Đặt lại UI
        resetPlayButton();
        
        // Cập nhật nút đọc của tin nhắn hiện tại
        if (currentAiMessage) {
            updateCurrentMessageReadButton('▶️ Đọc');
        }
        
        // Đặt lại chỉ số đoạn đang đọc
        if (currentReadingIndex !== -1) {
            console.log("Đặt lại chỉ số đoạn đang đọc từ", currentReadingIndex, "thành -1");
            currentReadingIndex = -1;
        }
    }
    
    function resetPlayButton() {
        // Đặt lại nút đọc chính
        playPauseBtn.textContent = '▶️ Đọc';
        playPauseBtn.disabled = false;
        
        // Đặt lại tất cả các nút đọc tin nhắn
        const allReadButtons = document.querySelectorAll('.message-read-btn');
        allReadButtons.forEach(button => {
            if (button.textContent === '⏹️ Dừng' || button.textContent === '▶️ Tiếp tục') {
                button.textContent = '▶️ Đọc';
            }
        });
        
        // Cập nhật trạng thái TTS
        if (ttsState.isPlaying) {
            ttsState.isPlaying = false;
        }
        if (ttsState.isPaused) {
            ttsState.isPaused = false;
        }
        
        // Ghi log trạng thái hiện tại
        console.log("Đặt lại nút đọc, trạng thái TTS:", {
            isProcessing: ttsState.isProcessing,
            isPlaying: ttsState.isPlaying,
            isPaused: ttsState.isPaused,
            error: ttsState.error,
            readingIndex: currentReadingIndex
        });
        
        // Đặt lại chỉ số đọc hiện tại
        currentReadingIndex = -1;
    }
    
    // Hàm tóm tắt nội dung để hiển thị
    function summarizeContent(content) {
        // Lấy API key từ storage
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            const apiKey = result.geminiApiKey;
            if (!apiKey) {
                console.error("Lỗi: Chưa cấu hình Gemini API Key");
                contentSummary.textContent = "Lỗi: Chưa cấu hình Gemini API Key. Vui lòng nhập API key trong phần Cài đặt.";
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
            const apiKey = result.geminiApiKey;
            if (!apiKey) {
                console.error("Lỗi: Chưa cấu hình Gemini API Key");
                addChatMessage("Lỗi: Chưa cấu hình Gemini API Key. Vui lòng nhập API key trong phần Cài đặt.", 'ai');
                return;
            }
            
            // Hiển thị thông báo đang xử lý
            const loadingMsgElement = addChatMessage("Đang xử lý...", 'ai');
            
            // Gọi API để trả lời câu hỏi
            callGeminiChatApi(result.geminiApiKey, userMessage, pageContent, chatHistory)
                .then(async response => {
                    // Xóa thông báo đang xử lý
                    loadingMsgElement.remove();
                    
                    // Kiểm tra xem có cần tự động tìm kiếm thông tin bổ sung không
                    const needsAutoSearch = await shouldAutoSearchWeb(response, userMessage);
                    
                    if (needsAutoSearch) {
                        console.log("Phát hiện cần tự động tìm kiếm thông tin bổ sung");
                        
                        // Hiển thị câu trả lời ban đầu
                        addChatMessage(response, 'ai');
                        chatHistory.push({role: 'assistant', content: response});
                        
                        // Hiển thị thông báo đang tìm kiếm
                        const searchingMsgElement = addChatMessage("🔍 Đang tìm kiếm thông tin bổ sung...", 'ai');
                        
                        try {
                            // Gọi lại API với tìm kiếm bổ sung
                            const enhancedResponse = await callGeminiChatApi(result.geminiApiKey, userMessage, pageContent, chatHistory, true);
                            
                            // Xóa thông báo đang tìm kiếm
                            searchingMsgElement.remove();
                            
                            // Hiển thị câu trả lời được cải thiện
                            addChatMessage("📚 Thông tin bổ sung:\n\n" + enhancedResponse, 'ai');
                            chatHistory.push({role: 'assistant', content: enhancedResponse});
                        } catch (searchError) {
                            // Xóa thông báo đang tìm kiếm
                            searchingMsgElement.remove();
                            console.error("Lỗi khi tìm kiếm thông tin bổ sung:", searchError);
                            addChatMessage("⚠️ Không thể tìm kiếm thông tin bổ sung: " + searchError.message, 'ai');
                        }
                    } else {
                        // Hiển thị câu trả lời bình thường
                        addChatMessage(response, 'ai');
                        chatHistory.push({role: 'assistant', content: response});
                    }
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
        //const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
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
    
    // Hàm gọi Gemini API để chat với khả năng tự động tra cứu
    async function callGeminiChatApi(apiKey, userQuestion, contextText, chatHistory, isRetryWithSearch = false) {
        //const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        let additionalInfo = "";
        
        // Nếu đây là lần thử lại với tìm kiếm hoặc người dùng yêu cầu tìm kiếm
        if (isRetryWithSearch) {
            console.log("Thực hiện tìm kiếm thông tin bổ sung cho câu hỏi:", userQuestion);
            try {
                const searchResults = await searchWebForQuestion(userQuestion);
                if (searchResults && searchResults.length > 0) {
                    additionalInfo = formatSearchResults(searchResults);
                    console.log("Đã tìm thấy thông tin bổ sung:", additionalInfo.substring(0, 200) + "...");
                }
            } catch (error) {
                console.error("Lỗi khi tìm kiếm thông tin bổ sung:", error);
                // Tiếp tục mà không có thông tin bổ sung
            }
        }
        
        // Tạo prompt với context, thông tin bổ sung và câu hỏi
        let contextPrompt = `Bạn là trợ lý AI giúp người dùng hiểu sâu hơn về nội dung họ đang đọc. Dưới đây là nội dung trang web mà người dùng đang tìm hiểu:\n\n"""${contextText}"""`;
        
        if (additionalInfo) {
            contextPrompt += `\n\nThông tin bổ sung từ các nguồn khác:\n\n${additionalInfo}`;
        }
        
        contextPrompt += `\n\nHãy trả lời câu hỏi của người dùng dựa trên nội dung trang web${additionalInfo ? ' và thông tin bổ sung' : ''}. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu và chính xác. ${additionalInfo ? 'Nếu thông tin bổ sung hữu ích, hãy tích hợp nó một cách tự nhiên vào câu trả lời. ' : ''}Nếu câu hỏi không liên quan đến nội dung, hãy lịch sự đề nghị người dùng đặt câu hỏi liên quan đến nội dung trang web.`;
        
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
    
    // Hàm kiểm tra xem có cần tự động tìm kiếm thông tin bổ sung không (dựa trên phản hồi AI)
    async function shouldAutoSearchWeb(aiResponse, userQuestion) {
        // Kiểm tra cài đặt người dùng
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['enableWebSearch'], result => {
                resolve(result);
            });
        });
        
        // Nếu người dùng tắt tính năng, không tìm kiếm
        if (settings.enableWebSearch === false) {
            return false;
        }
        
        const responseLower = aiResponse.toLowerCase();
        
        // Các cụm từ cho thấy AI không thể trả lời dựa trên nội dung hiện tại
        const noInfoPhrases = [
            'nội dung không đề cập',
            'không có thông tin',
            'không được đề cập',
            'không tìm thấy thông tin',
            'trang web không cung cấp',
            'không có dữ liệu',
            'không có chi tiết',
            'không được nêu',
            'không được mô tả',
            'không có thông tin cụ thể',
            'tôi không thể tìm thấy',
            'không có trong nội dung',
            'không được trình bày',
            'không có sẵn',
            'cần thêm thông tin',
            'cần tìm hiểu thêm'
        ];
        
        // Kiểm tra xem AI có đề cập đến việc thiếu thông tin không
        const hasNoInfoPhrase = noInfoPhrases.some(phrase => responseLower.includes(phrase));
        
        // Kiểm tra xem câu trả lời có quá ngắn (có thể là do thiếu thông tin)
        const isShortResponse = aiResponse.trim().split(' ').length < 20;
        
        // Kiểm tra xem AI có gợi ý tìm kiếm thêm không
        const suggestsMoreInfo = responseLower.includes('tìm kiếm thêm') || 
                                responseLower.includes('tra cứu thêm') ||
                                responseLower.includes('cần thêm thông tin');
        
        return hasNoInfoPhrase || (isShortResponse && suggestsMoreInfo);
    }
    
    // Hàm kiểm tra xem có cần tìm kiếm thông tin bổ sung không (legacy - giữ lại để tương thích)
    async function shouldSearchWeb(userQuestion, contextText) {
        // Kiểm tra cài đặt người dùng
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['enableWebSearch'], result => {
                resolve(result);
            });
        });
        
        // Nếu người dùng tắt tính năng, không tìm kiếm
        if (settings.enableWebSearch === false) {
            return false;
        }
        
        // Các từ khóa cho thấy cần tìm kiếm thông tin mới nhất hoặc bổ sung
        const searchKeywords = [
            'mới nhất', 'cập nhật', 'hiện tại', 'gần đây', 'tin tức',
            'thống kê', 'số liệu', 'dữ liệu', 'nghiên cứu', 'báo cáo',
            'so sánh', 'khác biệt', 'tương tự', 'liên quan',
            'thêm thông tin', 'chi tiết hơn', 'giải thích thêm',
            'ví dụ', 'trường hợp', 'ứng dụng', 'thực tế'
        ];
        
        const questionLower = userQuestion.toLowerCase();
        const hasSearchKeywords = searchKeywords.some(keyword => questionLower.includes(keyword));
        
        // Kiểm tra xem câu hỏi có vượt ra ngoài nội dung hiện tại không
        const contextLower = contextText.toLowerCase();
        const questionWords = questionLower.split(' ').filter(word => word.length > 3);
        const contextWords = contextLower.split(' ');
        
        // Đếm số từ trong câu hỏi không có trong context
        const missingWords = questionWords.filter(word => !contextWords.some(cWord => cWord.includes(word)));
        const missingRatio = missingWords.length / questionWords.length;
        
        // Tìm kiếm nếu:
        // 1. Có từ khóa yêu cầu tìm kiếm
        // 2. Hoặc tỷ lệ từ không có trong context > 50%
        return hasSearchKeywords || missingRatio > 0.5;
    }
    
    // Hàm tìm kiếm thông tin cho câu hỏi
    async function searchWebForQuestion(userQuestion) {
        return new Promise((resolve, reject) => {
            // Trích xuất từ khóa chính từ câu hỏi
            const searchQuery = extractSearchKeywords(userQuestion);
            
            chrome.runtime.sendMessage({
                type: "WEB_SEARCH_REQUEST",
                query: searchQuery,
                maxResults: 3
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response.success) {
                    resolve(response.results);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    // Hàm trích xuất từ khóa tìm kiếm từ câu hỏi
    function extractSearchKeywords(question) {
        // Loại bỏ các từ không cần thiết
        const stopWords = ['là', 'gì', 'như', 'thế', 'nào', 'tại', 'sao', 'có', 'thể', 'được', 'cho', 'về', 'của', 'và', 'hoặc', 'nhưng', 'mà', 'để'];
        const words = question.toLowerCase().split(' ').filter(word => 
            word.length > 2 && !stopWords.includes(word)
        );
        
        // Lấy 3-5 từ quan trọng nhất
        return words.slice(0, 5).join(' ');
    }
    
    // Hàm định dạng kết quả tìm kiếm
    function formatSearchResults(results) {
        if (!results || results.length === 0) {
            return "";
        }
        
        let formatted = "=== THÔNG TIN BỔ SUNG ===\n\n";
        results.forEach((result, index) => {
            formatted += `${index + 1}. **${result.title}** (${result.source})\n`;
            formatted += `${result.snippet}\n`;
            if (result.url) {
                formatted += `Nguồn: ${result.url}\n`;
            }
            formatted += "\n";
        });
        
        return formatted;
    }
});