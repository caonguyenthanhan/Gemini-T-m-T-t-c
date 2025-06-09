document.addEventListener('DOMContentLoaded', function () {
    // Khai báo các đối tượng giao diện
    const summarizeBtn = document.getElementById('summarizeBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultBox = document.getElementById('result-box');
    
    // Gemini
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');

    // iFLYTEK
    const iflytekAppIdInput = document.getElementById('iflytekAppId');
    const iflytekApiKeyInput = document.getElementById('iflytekApiKey');
    const iflytekApiSecretInput = document.getElementById('iflytekApiSecret');
    const saveIflytekBtn = document.getElementById('saveIflytekBtn');
    const ttsEngineSelect = document.getElementById('ttsEngine');

    let fullPageContent = '';
    let utterance = null;
    let audioContext = null;
    let audioSource = null;

    // --- CÁC HÀM TẢI VÀ LƯU KEY ---

    // Tải các key đã lưu khi mở popup
    chrome.storage.sync.get(['geminiApiKey', 'iflytekConfig', 'ttsEngine'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
        if (result.iflytekConfig) {
            iflytekAppIdInput.value = result.iflytekConfig.appId || '';
            iflytekApiKeyInput.value = result.iflytekConfig.apiKey || '';
            iflytekApiSecretInput.value = result.iflytekConfig.apiSecret || '';
        }
        if (result.ttsEngine) {
            ttsEngineSelect.value = result.ttsEngine;
        }
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

    // Lưu iFLYTEK config
    saveIflytekBtn.addEventListener('click', function() {
        const config = {
            appId: iflytekAppIdInput.value.trim(),
            apiKey: iflytekApiKeyInput.value.trim(),
            apiSecret: iflytekApiSecretInput.value.trim(),
        };
        if (config.appId && config.apiKey && config.apiSecret) {
            chrome.storage.sync.set({ iflytekConfig: config }, function() {
                resultBox.textContent = 'Đã lưu iFLYTEK Keys thành công!';
                setTimeout(() => { resultBox.textContent = 'Trạng thái: Sẵn sàng.'; }, 2000);
            });
        }
    });
    
    // Lưu lựa chọn công cụ TTS
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
    });


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
            chrome.runtime.sendMessage({
                type: "SUMMARIZE_REQUEST",
                apiKey: result.geminiApiKey,
                content: fullPageContent
            });
        });
    });

    // Sự kiện nhấn nút Đọc/Tạm dừng
    playPauseBtn.addEventListener('click', function() {
        const textToRead = resultBox.textContent;
        if (!textToRead || textToRead.startsWith("Trạng thái:") || textToRead.startsWith("Lỗi")) {
            return;
        }
        
        stopBrowserReading(); // Dừng mọi thứ trước khi bắt đầu

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
        } else { // iFLYTEK
            chrome.storage.sync.get('iflytekConfig', function(result) {
                if (!result.iflytekConfig || !result.iflytekConfig.appId) {
                    resultBox.textContent = "Vui lòng nhập và lưu đủ thông tin iFLYTEK API.";
                    return;
                }
                playPauseBtn.disabled = true;
                playPauseBtn.textContent = 'Đang tải...';
                chrome.runtime.sendMessage({
                    type: "TTS_REQUEST",
                    config: result.iflytekConfig,
                    text: textToRead
                });
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
                resultBox.textContent = 'Lỗi giải mã audio.';
                resetPlayButton();
            });
        } catch (error) {
            console.error('Lỗi khi phát audio:', error);
            resultBox.textContent = 'Lỗi phát audio.';
            resetPlayButton();
        }
    }

    function stopIflytekReading() {
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
        stopIflytekReading();
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

    init();
});