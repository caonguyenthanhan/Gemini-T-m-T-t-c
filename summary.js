document.addEventListener('DOMContentLoaded', function () {
    const summaryContent = document.getElementById('summary-content');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const ttsEngineSelect = document.getElementById('ttsEngine');
    
    let utterance = null;
    let audioContext = null;
    let audioSource = null;
    let port = null;

    // Hàm để đảm bảo port kết nối luôn hoạt động
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "summary"});
                
                // Lắng nghe tin nhắn từ background script
                port.onMessage.addListener((message) => {
                    if (message.type === "TTS_RESULT") {
                        if (message.success) {
                            playAudioFromBase64(message.audioData);
                        } else {
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

    // Thay thế đoạn code này:
    // port = chrome.runtime.connect({name: "summary"});
    // Bằng:
    ensureConnected();

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

    // Tải kết quả tóm tắt từ storage
    chrome.storage.local.get(['contextMenuSummary'], function(result) {
        if (result.contextMenuSummary) {
            summaryContent.textContent = result.contextMenuSummary;
        } else {
            summaryContent.textContent = "Không tìm thấy kết quả tóm tắt.";
        }
    });

    // Lắng nghe tin nhắn từ background script
    port.onMessage.addListener((message) => {
        if (message.type === "TTS_RESULT") {
            if (message.success) {
                playAudioFromBase64(message.audioData);
            } else {
                summaryContent.textContent += "\n\nLỗi đọc: " + message.error;
                resetPlayButton();
            }
        }
    });
    
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
        } else { // Google TTS
            chrome.storage.sync.get('googleTtsConfig', function(result) {
                if (!result.googleTtsConfig || !result.googleTtsConfig.apiKey) {
                    summaryContent.textContent += "\n\nVui lòng nhập và lưu Google Cloud API Key trong popup của tiện ích.";
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
                summaryContent.textContent += '\n\nLỗi giải mã audio.';
                resetPlayButton();
            });
        } catch (error) {
            console.error('Lỗi khi phát audio:', error);
            summaryContent.textContent += '\n\nLỗi phát audio.';
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
});