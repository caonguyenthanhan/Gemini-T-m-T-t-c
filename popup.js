document.addEventListener('DOMContentLoaded', function () {
    // Khai báo các đối tượng giao diện
    const summarizeBtn = document.getElementById('summarizeBtn');
    const chatBtn = document.getElementById('chatBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultBox = document.getElementById('result-box');
    const imageUpload = document.getElementById('imageUpload');
    const imageContextText = document.getElementById('imageContextText');
    const summarizeImageBtn = document.getElementById('summarizeImageBtn');
    
    // Gemini
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const getKeyBtn = document.getElementById('getKeyBtn');
    const clearKeysBtn = document.getElementById('clearKeysBtn');

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

    if (clearKeysBtn) {
        clearKeysBtn.addEventListener('click', function() {
            const ok = window.confirm('Xóa API Key và dữ liệu liên quan?');
            if (!ok) return;
            try {
                chrome.storage.sync.remove(['geminiApiKey','googleTtsConfig'], function(){
                    chrome.storage.local.get(null, function(all){
                        const keys = Object.keys(all||{}).filter(function(k){ return k && (k.indexOf('chatHistory_summary')===0); });
                        const removeKeys = keys.concat(['capturedScreenshot','capturedRect','visionSummarySessions','contextMenuSummary','selectedText','originalContent','fullPageContent']);
                        chrome.storage.local.remove(removeKeys, function(){
                            apiKeyInput.value = '';
                            googleTtsApiKeyInput.value = '';
                            resultBox.textContent = 'Đã xóa API Key và dữ liệu liên quan.';
                            setTimeout(function(){ resultBox.textContent = 'Trạng thái: Sẵn sàng.'; }, 2000);
                        });
                    });
                });
            } catch(e) {
                resultBox.textContent = 'Lỗi khi xóa: ' + (e && e.message ? e.message : 'Không xác định');
            }
        });
    }
    
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
            // Clear timeout warning nếu có
            if (summarizeBtn.warningTimeout) {
                clearTimeout(summarizeBtn.warningTimeout);
                summarizeBtn.warningTimeout = null;
            }
            
            if (request.success) {
                resultBox.textContent = request.summary;
            } else {
                resultBox.textContent = `Lỗi tóm tắt: ${request.error}`;
            }
            summarizeBtn.textContent = 'Tóm tắt trang này';
            summarizeBtn.disabled = false;
            if (summarizeImageBtn) {
                summarizeImageBtn.textContent = 'Tóm tắt ảnh';
                summarizeImageBtn.disabled = false;
            }
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
                        // Clear timeout warning nếu có
                        if (summarizeBtn.warningTimeout) {
                            clearTimeout(summarizeBtn.warningTimeout);
                            summarizeBtn.warningTimeout = null;
                        }
                        
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
            // Hiển thị loading với progress
            summarizeBtn.textContent = 'Đang xử lý...';
            summarizeBtn.disabled = true;
            resultBox.textContent = '🔄 Đang gửi yêu cầu tóm tắt đến Gemini AI...\n⏱️ Thời gian dự kiến: 10-30 giây';
            
            // Thêm timeout warning sau 15 giây
            const warningTimeout = setTimeout(() => {
                if (summarizeBtn.disabled) {
                    resultBox.textContent += '\n⚠️ Đang mất nhiều thời gian hơn dự kiến. Vui lòng đợi thêm...';
                }
            }, 15000);
            
            // Lưu timeout để có thể clear sau này
            summarizeBtn.warningTimeout = warningTimeout;
            
            // Gửi tin nhắn qua kết nối
            port.postMessage({
                type: "SUMMARIZE_REQUEST",
                apiKey: result.geminiApiKey,
                content: fullPageContent
            });
        });
    });

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    if (summarizeImageBtn) {
        summarizeImageBtn.addEventListener('click', async function () {
            if (!imageUpload || !imageUpload.files || imageUpload.files.length === 0) {
                resultBox.textContent = 'Vui lòng chọn một ảnh.';
                return;
            }

            const file = imageUpload.files[0];
            const mime = file.type || 'image/png';

            summarizeImageBtn.disabled = true;
            summarizeImageBtn.textContent = 'Đang xử lý ảnh...';
            resultBox.textContent = 'Đang gửi ảnh đến Gemini, vui lòng chờ...';

            chrome.storage.sync.get(['geminiApiKey'], async function (result) {
                const apiKey = result.geminiApiKey;
                if (!apiKey) {
                    resultBox.textContent = 'Vui lòng nhập và lưu Gemini API Key.';
                    summarizeImageBtn.disabled = false;
                    summarizeImageBtn.textContent = 'Tóm tắt ảnh';
                    return;
                }

                try {
                    const base64 = await readFileAsBase64(file);
                    const activePort = ensureConnected();
                    const additionalText = (imageContextText && imageContextText.value ? imageContextText.value.trim() : '');
                    if (activePort) {
                        activePort.postMessage({
                            type: 'SUMMARIZE_IMAGE_REQUEST',
                            apiKey: apiKey,
                            image: { mime_type: mime, data: base64 },
                            additionalText: additionalText
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            type: 'SUMMARIZE_IMAGE_REQUEST',
                            apiKey: apiKey,
                            image: { mime_type: mime, data: base64 },
                            additionalText: additionalText
                        });
                    }
                } catch (e) {
                    resultBox.textContent = 'Lỗi khi đọc ảnh: ' + e.message;
                    summarizeImageBtn.disabled = false;
                    summarizeImageBtn.textContent = 'Tóm tắt ảnh';
                }
            });
        });
    }
    
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
                // Ưu tiên mở trong Side Panel nếu API khả dụng
                if (chrome.sidePanel && chrome.sidePanel.setOptions && chrome.sidePanel.open) {
                    try {
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (!tabs || !tabs[0]) return;
                            const tabId = tabs[0].id;
                            chrome.sidePanel.setOptions({ tabId, path: 'chat.html', enabled: true }, function() {
                                chrome.sidePanel.open({ tabId });
                            });
                        });
                    } catch (e) {
                        // Fallback sang sidebar in-page nếu Side Panel lỗi
                        openInPageSidebar();
                    }
                } else {
                    // Fallback: chèn sidebar trong trang hiện tại
                    openInPageSidebar();
                }
            });
        });
    });

    function openInPageSidebar() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || !tabs[0]) return;
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId },
                func: function (chatUrl) {
                    const SIDEBAR_ID = 'gemini-chat-sidebar';
                    const EXISTING = document.getElementById(SIDEBAR_ID);
                    if (EXISTING) {
                        EXISTING.style.display = 'block';
                        return;
                    }
                    const container = document.createElement('div');
                    container.id = SIDEBAR_ID;
                    container.style.position = 'fixed';
                    container.style.top = '0';
                    container.style.right = '0';
                    container.style.height = '100vh';
                    container.style.width = '38vw';
                    container.style.minWidth = '360px';
                    container.style.maxWidth = '90vw';
                    container.style.boxShadow = '0 0 12px rgba(0,0,0,0.2)';
                    container.style.background = '#fff';
                    container.style.zIndex = '2147483646';
                    container.style.borderLeft = '1px solid #e5e7eb';
                    container.style.display = 'flex';
                    container.style.flexDirection = 'column';
                    container.style.transition = 'width 0.15s ease';

                    const header = document.createElement('div');
                    header.style.flex = '0 0 auto';
                    header.style.height = '40px';
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'space-between';
                    header.style.padding = '0 8px';
                    header.style.background = '#f9fafb';
                    header.style.borderBottom = '1px solid #e5e7eb';
                    header.style.userSelect = 'none';
                    header.innerHTML = '<strong>Gemini Chat</strong>';

                    const controls = document.createElement('div');
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '✕';
                    closeBtn.style.border = 'none';
                    closeBtn.style.background = 'transparent';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.style.fontSize = '16px';
                    closeBtn.title = 'Đóng';
                    closeBtn.onclick = () => container.remove();

                    controls.appendChild(closeBtn);
                    header.appendChild(controls);

                    const resizer = document.createElement('div');
                    resizer.style.position = 'absolute';
                    resizer.style.left = '-6px';
                    resizer.style.top = '0';
                    resizer.style.width = '12px';
                    resizer.style.height = '100%';
                    resizer.style.cursor = 'col-resize';
                    resizer.style.zIndex = '2147483647';

                    let isResizing = false;
                    resizer.addEventListener('mousedown', (e) => {
                        isResizing = true;
                        e.preventDefault();
                    });
                    window.addEventListener('mousemove', (e) => {
                        if (!isResizing) return;
                        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 360), window.innerWidth * 0.9);
                        container.style.width = newWidth + 'px';
                    });
                    window.addEventListener('mouseup', () => { isResizing = false; });

                    const iframe = document.createElement('iframe');
                    iframe.src = chatUrl;
                    iframe.style.border = 'none';
                    iframe.style.flex = '1 1 auto';
                    iframe.style.width = '100%';
                    iframe.style.height = 'calc(100vh - 40px)';

                    container.appendChild(header);
                    container.appendChild(iframe);
                    container.appendChild(resizer);
                    document.documentElement.appendChild(container);
                },
                args: [chrome.runtime.getURL('chat.html')]
            });
        });
    }

    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', function() {
        const textToRead = resultBox.textContent;
        if (!textToRead || textToRead.startsWith("Trạng thái:") || textToRead.startsWith("Lỗi")) {
            return;
        }
        stopReading();
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
        } else if (ttsEngineSelect.value === 'google') {
            chrome.storage.sync.get('googleTtsConfig', function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    resultBox.textContent = "Vui lòng nhập và lưu Google Cloud API Key.";
                    return;
                }
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                const activePort = ensureConnected();
                const config = Object.assign({}, result.googleTtsConfig, { engine: 'google' });
                if (activePort) {
                    activePort.postMessage({ type: "TTS_REQUEST", config: config, text: textToRead });
                } else {
                    chrome.runtime.sendMessage({ type: "TTS_REQUEST", config: config, text: textToRead });
                }
            });
        } else if (ttsEngineSelect.value === 'local') {
            playPauseBtn.disabled = true;
            playPauseBtn.textContent = 'Đang tải...';
            const activePort = ensureConnected();
            const config = { engine: 'local', languageCode: 'vi-VN' };
            if (activePort) {
                activePort.postMessage({ type: "TTS_REQUEST", config: config, text: textToRead });
            } else {
                chrome.runtime.sendMessage({ type: "TTS_REQUEST", config: config, text: textToRead });
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
    chrome.storage.sync.get(['contextMenuSummary'], function(result) {
        if (result.contextMenuSummary) {
            // Hiển thị kết quả tóm tắt
            resultBox.textContent = result.contextMenuSummary;
            // Xóa kết quả từ storage
            chrome.storage.sync.remove(['contextMenuSummary']);
        } else {
            // Tiếp tục khởi tạo bình thường
            init();
        }
    });
    
    init();
});
