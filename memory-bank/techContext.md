# Bối cảnh kỹ thuật: Gemini Tóm Tắt & Đọc

## Công nghệ sử dụng
- JavaScript (ES6+)
- Chrome Extension API
- Readability.js (Mozilla)
- Google Gemini API
- Web Speech API
- Google Cloud Text-to-Speech API
- Web Audio API (để phát âm thanh từ base64)

## Thiết lập phát triển
- Không yêu cầu build tool đặc biệt
- Có thể phát triển trực tiếp với trình soạn thảo văn bản và Chrome
- Tệp test-google-tts.html để kiểm tra kết nối với Google Cloud TTS API

## Phụ thuộc
- Readability.js: Thư viện trích xuất nội dung
- Google Gemini API: Dịch vụ AI để tóm tắt nội dung
- Chrome Extension API: chrome.tabs, chrome.scripting, chrome.runtime, chrome.storage, chrome.contextMenus
- Web Speech API: SpeechSynthesis (tích hợp sẵn trong trình duyệt)
- Google Cloud Text-to-Speech API: Dịch vụ chuyển văn bản thành giọng nói chất lượng cao
- Web Audio API: AudioContext, AudioBufferSourceNode (để phát âm thanh từ dữ liệu base64)

## Ràng buộc kỹ thuật
- Yêu cầu người dùng cung cấp Google Gemini API key
- Yêu cầu người dùng cung cấp Google Cloud API key và kích hoạt Text-to-Speech API
- Chỉ hoạt động trên các trang web mà Chrome cho phép content script chạy
- Phụ thuộc vào khả năng của Readability.js để trích xuất nội dung chính xác
- Chất lượng giọng đọc với Web Speech API phụ thuộc vào hỗ trợ tiếng Việt của trình duyệt
- Cần kết nối internet để sử dụng các API bên ngoài
- Trích xuất nội dung từ YouTube chỉ lấy được mô tả, không lấy được nội dung video
- Trích xuất nội dung từ Google Doc phụ thuộc vào cấu trúc trang và quyền truy cập