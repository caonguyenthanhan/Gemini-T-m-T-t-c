document.addEventListener('DOMContentLoaded', function () {
    // Khai báo các đối tượng giao diện
    const summarizeBtn = document.getElementById('summarizeBtn');
    const chatBtn = document.getElementById('chatBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultBox = document.getElementById('result-box');
    
    // Gemini
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const getKeyBtn = document.getElementById('getKeyBtn');

    // Google TTS
    const googleTtsApiKeyInput = document.getElementById('googleTtsApiKey');
    const saveGoogleTtsBtn = document.getElementById('saveGoogleTtsBtn');
    const ttsEngineSelect = document.getElementById('ttsEngine');

    let fullPageContent = '';
    let utterance = null;
    let audioContext = null;
    let audioSource = null;
    let port = null;
    let isPlaying = false;

    // --- CÁC HÀM TẢI VÀ LƯU KEY ---

    // Tải các key đã lưu khi mở popup
    chrome.storage.sync.get(['geminiApiKey', 'googleTtsConfig', 'ttsEngine'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
        if (result.googleTtsConfig) {
            googleTtsApiKeyInput.value = result.googleTtsConfig.apiKey || '';
        }
        if (result.ttsEngine) {
            ttsEngineSelect.value = result.ttsEngine;
        }
        // Hiển thị/ẩn phần cài đặt Google TTS dựa trên giá trị đã lưu
        toggleGoogleTtsSection();
    });

    // Lưu Gemini API key
    saveKeyBtn.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, function () {
                resultBox.textContent = 'Đã lưu Gemini API Key!';
                setTimeout(() => { resultBox.textContent = 'Trạng thái: Sẵn sàng.'; }, 2000);
            });
        }
    });
    
    // Mở trang lấy Gemini API key
    getKeyBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://aistudio.google.com/apikey' });
    });
    
    // Lưu Google TTS config
    saveGoogleTtsBtn.addEventListener('click', function() {
        const config = {
            apiKey: googleTtsApiKeyInput.value.trim()
        };
        if (config.apiKey) {
            chrome.storage.sync.set({ googleTtsConfig: config }, function() {
                resultBox.textContent = 'Đã lưu Google TTS Key thành công!';
                setTimeout(() => { resultBox.textContent = 'Trạng thái: Sẵn sàng.'; }, 2000);
            });
        }
    });
    
    // Lưu lựa chọn công cụ TTS và hiển thị/ẩn phần cài đặt Google TTS
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
        toggleGoogleTtsSection();
    });
    
    // Hàm hiển thị/ẩn phần cài đặt Google TTS
    function toggleGoogleTtsSection() {
        const googleTtsSection = document.getElementById('googleTtsSection');
        if (ttsEngineSelect.value === 'google') {
            googleTtsSection.style.display = 'block';
        } else {
            googleTtsSection.style.display = 'none';
        }
    }


    // --- XỬ LÝ TIN NHẮN TỪ BACKGROUND/CONTENT SCRIPT ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "CONTENT_RESULT") {
            fullPageContent = request.content;
            resultBox.textContent = "Đã lấy nội dung. Sẵn sàng để tóm tắt.";
            summarizeBtn.disabled = false;
        } else if (request.type === "SUMMARY_RESULT") {
            if (request.success) {
                resultBox.textContent = request.summary;
            } else {
                resultBox.textContent = `Lỗi tóm tắt: ${request.error}`;
            }
            summarizeBtn.textContent = 'Tóm tắt trang này';
            summarizeBtn.disabled = false;
        } else if (request.type === "TTS_RESULT") {
            if (request.success) {
                playAudioFromBase64(request.audioData);
            } else {
                resultBox.textContent = `Lỗi đọc: ${request.error}`;
                resetPlayButton();
            }
        }
    });
    

    // --- SỰ KIỆN NHẤN NÚT ---

    // Hàm để đảm bảo port kết nối luôn hoạt động
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "popup"});
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    if (message.type === "SUMMARY_RESULT") {
                        if (message.success) {
                            resultBox.textContent = message.summary;
                        } else {
                            resultBox.textContent = `Lỗi tóm tắt: ${message.error}`;
                        }
                        summarizeBtn.textContent = 'Tóm tắt trang này';
                        summarizeBtn.disabled = false;
                    } else if (message.type === "TTS_RESULT") {
                        if (message.success) {
                            playAudioFromBase64(message.audioData);
                        } else {
                            resultBox.textContent = `Lỗi đọc: ${message.error}`;
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
    
    // Tạo kết nối với background script khi popup mở
    // Thay thế đoạn code này:
    // port = chrome.runtime.connect({name: "popup"});
    // Bằng:
    ensureConnected();
    
    // Sự kiện nhấn nút Tóm tắt
    summarizeBtn.addEventListener('click', function () {
        stopReading(); // Dừng đọc nếu đang đọc
        chrome.storage.sync.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                resultBox.textContent = 'Vui lòng nhập và lưu Gemini API Key.';
                return;
            }
            if (!fullPageContent) {
                resultBox.textContent = "Chưa lấy được nội dung trang. Vui lòng thử lại.";
                return;
            }
            summarizeBtn.textContent = 'Đang xử lý...';
            summarizeBtn.disabled = true;
            
            // Gửi tin nhắn qua kết nối
            port.postMessage({
                type: "SUMMARIZE_REQUEST",
                apiKey: result.geminiApiKey,
                content: fullPageContent
            });
        });
    });
    
    // Sự kiện nhấn nút Chat
    chatBtn.addEventListener('click', function () {
        chrome.storage.sync.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                resultBox.textContent = 'Vui lòng nhập và lưu Gemini API Key.';
                return;
            }
            if (!fullPageContent) {
                resultBox.textContent = "Chưa lấy được nội dung trang. Vui lòng thử lại.";
                return;
            }
            
            // Lưu nội dung trang vào storage để chat.html có thể truy cập
            chrome.storage.local.set({ 
                fullPageContent: fullPageContent,
                chatMode: 'fullPage'
            }, function() {
                // Mở trang chat.html trong cửa sổ mới
                chrome.windows.create({
                    url: chrome.runtime.getURL('chat.html'),
                    type: 'popup',
                    width: 800,
                    height: 600
                });
            });
        });
    });

    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', function() {
        const textToRead = resultBox.textContent;
        if (!textToRead || textToRead.startsWith("Trạng thái:") || textToRead.startsWith("Lỗi")) {
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
        } else { // Google TTS
            chrome.storage.sync.get('googleTtsConfig', function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    resultBox.textContent = "Vui lòng nhập và lưu Google Cloud API Key.";
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
                        text: textToRead
                    });
                } else {
                    // Nếu không thể kết nối, sử dụng chrome.runtime.sendMessage thay thế
                    chrome.runtime.sendMessage({
                        type: "TTS_REQUEST",
                        config: result.googleTtsConfig,
                        text: textToRead
                    });
                }
            });
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
            resultBox.textContent = "Lỗi giọng đọc trình duyệt: " + event.error;
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
            if (audioContext) {
                audioContext.close();
            }
            
            // Tạo AudioContext mới chỉ khi cần thiết
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Sử dụng Uint8Array trực tiếp từ base64
            const binaryString = atob(base64String);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            // Tối ưu vòng lặp
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Sử dụng Promise để xử lý decodeAudioData
            audioContext.decodeAudioData(bytes.buffer)
                .then(buffer => {
                    audioSource = audioContext.createBufferSource();
                    audioSource.buffer = buffer;
                    audioSource.connect(audioContext.destination);
                    audioSource.start(0);
                    playPauseBtn.textContent = '⏹️ Dừng';
                    playPauseBtn.disabled = false;
                    audioSource.onended = resetPlayButton;
                })
                .catch(err => {
                    console.error('Lỗi giải mã audio:', err);
                    resultBox.textContent = 'Lỗi giải mã audio.';
                    resetPlayButton();
                });
        } catch (error) {
            console.error('Lỗi khi phát audio:', error);
            resultBox.textContent = 'Lỗi phát audio.';
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

    // --- HÀM KHỞI ĐỘNG ---
    function init() {
        summarizeBtn.disabled = true;
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['Readability.js', 'content.js']
                }).catch(err => console.log("Lỗi inject script:", err));
            }
        });
    }

    // Kiểm tra xem có kết quả tóm tắt từ context menu không
    chrome.storage.local.get(['contextMenuSummary'], function(result) {
        if (result.contextMenuSummary) {
            // Hiển thị kết quả tóm tắt
            resultBox.textContent = result.contextMenuSummary;
            // Xóa kết quả từ storage
            chrome.storage.local.remove(['contextMenuSummary']);
        } else {
            // Tiếp tục khởi tạo bình thường
            init();
        }
    });
    
    init();
});