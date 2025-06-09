document.addEventListener('DOMContentLoaded', function () {
    // Khai báo các đối tượng giao diện
    const summarizeBtn = document.getElementById('summarizeBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultBox = document.getElementById('result-box');
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');

    // Biến để lưu nội dung thực của trang web
    let fullPageContent = '';
    let utterance = null;

    // --- CÁC HÀM XỬ LÝ GIAO DIỆN VÀ API ---

    // Tải API key đã lưu khi mở popup
    chrome.storage.sync.get(['geminiApiKey'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Lưu API key
    saveKeyBtn.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, function () {
                resultBox.textContent = 'Đã lưu API Key thành công!';
                setTimeout(() => { resultBox.textContent = 'Trạng thái: Sẵn sàng.'; }, 2000);
            });
        }
    });

    // Nhận tin nhắn từ các script khác
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "CONTENT_RESULT") { // Nhận nội dung từ content.js
            fullPageContent = request.content; // Lưu nội dung thật vào biến này
            resultBox.textContent = "Đã lấy nội dung. Sẵn sàng để tóm tắt.";
            summarizeBtn.disabled = false;
        } else if (request.type === "SUMMARY_RESULT") { // Nhận kết quả từ background.js
            if (request.success) {
                resultBox.textContent = request.summary;
            } else {
                resultBox.textContent = `Lỗi: ${request.error}`;
            }
            summarizeBtn.textContent = 'Tóm tắt trang này';
            summarizeBtn.disabled = false;
        }
    });

    // Sự kiện nhấn nút Tóm tắt
    summarizeBtn.addEventListener('click', function () {
        stopReading(); // Dừng đọc nếu đang đọc dở
        chrome.storage.sync.get(['geminiApiKey'], function (result) {
            const apiKey = result.geminiApiKey;
            if (!apiKey) {
                resultBox.textContent = 'Vui lòng nhập và lưu API Key trước.';
                return;
            }

            // **SỬA LỖI QUAN TRỌNG Ở ĐÂY**
            // Kiểm tra xem đã có nội dung trang web chưa
            if (!fullPageContent) {
                resultBox.textContent = "Chưa lấy được nội dung trang web. Vui lòng thử lại hoặc tải lại trang.";
                return;
            }

            summarizeBtn.textContent = 'Đang xử lý...';
            summarizeBtn.disabled = true;

            // Gửi nội dung ĐÚNG (fullPageContent) đi để tóm tắt
            chrome.runtime.sendMessage({
                type: "SUMMARIZE_REQUEST",
                apiKey: apiKey,
                content: fullPageContent // Gửi nội dung đã lưu, không phải nội dung trong ô trạng thái
            });
        });
    });

    // --- PHẦN LOGIC ĐIỀU KHIỂN ĐỌC (Giữ nguyên) ---

    playPauseBtn.addEventListener('click', function() {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            playPauseBtn.textContent = '⏸️ Tạm dừng';
        } else if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            playPauseBtn.textContent = '▶️ Tiếp tục';
        } else {
            const textToRead = resultBox.textContent;
            if (textToRead && !textToRead.startsWith("Trạng thái:") && !textToRead.startsWith("Lỗi:")) {
                startReading(textToRead);
            }
        }
    });

    stopBtn.addEventListener('click', function() {
        stopReading();
    });

    function startReading(text) {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = function() {
            playPauseBtn.textContent = '▶️ Đọc';
        };
        speechSynthesis.speak(utterance);
        playPauseBtn.textContent = '⏸️ Tạm dừng';
    }

    function stopReading() {
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
        }
        playPauseBtn.textContent = '▶️ Đọc';
    }

    // --- HÀM KHỞI ĐỘNG ---
    function init() {
        summarizeBtn.disabled = true;
        // Tự động lấy nội dung khi mở popup
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['Readability.js', 'content.js']
                });
            }
        });
    }

    init();
});