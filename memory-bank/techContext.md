# Bối cảnh kỹ thuật: Gemini Tóm Tắt & Đọc

## Công nghệ sử dụng
- JavaScript (ES6+)
- Chrome Extension API
- Readability.js (Mozilla)
- Google Gemini API
- Web Speech API

## Thiết lập phát triển
- Không yêu cầu build tool đặc biệt
- Có thể phát triển trực tiếp với trình soạn thảo văn bản và Chrome

## Phụ thuộc
- Readability.js: Thư viện trích xuất nội dung
- Google Gemini API: Dịch vụ AI để tóm tắt nội dung
- Chrome Extension API: chrome.tabs, chrome.scripting, chrome.runtime, chrome.storage
- Web Speech API: SpeechSynthesis (tích hợp sẵn trong trình duyệt)

## Ràng buộc kỹ thuật
- Yêu cầu người dùng cung cấp Google Gemini API key
- Chỉ hoạt động trên các trang web mà Chrome cho phép content script chạy
- Phụ thuộc vào khả năng của Readability.js để trích xuất nội dung chính xác
- Chất lượng giọng đọc phụ thuộc vào hỗ trợ tiếng Việt của trình duyệt