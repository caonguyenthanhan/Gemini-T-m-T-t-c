# Bối cảnh kỹ thuật: Gemini Tóm Tắt & Đọc

## Công nghệ sử dụng
- JavaScript (ES6+)
- Chrome Extension API
- Readability.js (Mozilla)
- Google Gemini API
- Web Speech API
- iFLYTEK TTS API
- CryptoJS (cho xác thực iFLYTEK API)

## Thiết lập phát triển
- Không yêu cầu build tool đặc biệt
- Có thể phát triển trực tiếp với trình soạn thảo văn bản và Chrome
- Script test-iflytek.js để kiểm tra kết nối với iFLYTEK TTS API (sử dụng Node.js)

## Phụ thuộc
- Readability.js: Thư viện trích xuất nội dung
- Google Gemini API: Dịch vụ AI để tóm tắt nội dung
- Chrome Extension API: chrome.tabs, chrome.scripting, chrome.runtime, chrome.storage
- Web Speech API: SpeechSynthesis (tích hợp sẵn trong trình duyệt)
- iFLYTEK TTS API: Dịch vụ chuyển văn bản thành giọng nói chất lượng cao
- CryptoJS: Thư viện mã hóa để tạo chữ ký xác thực cho iFLYTEK API

## Ràng buộc kỹ thuật
- Yêu cầu người dùng cung cấp Google Gemini API key
- Yêu cầu người dùng cung cấp iFLYTEK APPID, APIKey và APISecret cho tính năng đọc nâng cao
- Chỉ hoạt động trên các trang web mà Chrome cho phép content script chạy
- Phụ thuộc vào khả năng của Readability.js để trích xuất nội dung chính xác
- Chất lượng giọng đọc với Web Speech API phụ thuộc vào hỗ trợ tiếng Việt của trình duyệt
- Cần kết nối internet để sử dụng các API bên ngoài