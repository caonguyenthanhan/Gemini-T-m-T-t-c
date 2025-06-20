# Mẫu hệ thống: Gemini Tóm Tắt & Đọc

## Kiến trúc hệ thống
Plugin sử dụng kiến trúc Chrome Extension tiêu chuẩn với các thành phần:
- Popup (giao diện người dùng)
- Content Script (trích xuất nội dung)
- Background Script (giao tiếp API)

## Quyết định kỹ thuật chính
1. Sử dụng thư viện Readability.js để trích xuất nội dung có ý nghĩa từ trang web
2. Tích hợp với Google Gemini API để tóm tắt nội dung
3. Sử dụng Web Speech API (SpeechSynthesis) cho chức năng đọc văn bản
4. Tích hợp với Google Cloud Text-to-Speech API cho chất lượng giọng đọc tiếng Việt cao hơn
5. Lưu trữ API key trong chrome.storage.sync
6. Phát hiện và xử lý đặc biệt cho YouTube và Google Doc

## Mối quan hệ thành phần
- popup.js: Xử lý giao diện người dùng và điều khiển luồng chính
- content.js: Trích xuất nội dung trang web bằng Readability.js, phát hiện và xử lý YouTube/Google Doc
- background.js: Gọi Gemini API, Google Cloud TTS API và xử lý kết quả
- Readability.js: Thư viện bên thứ ba để phân tích và trích xuất nội dung
- summary.js/html: Xử lý hiển thị và đọc kết quả tóm tắt trong cửa sổ riêng

## Luồng dữ liệu
1. content.js trích xuất nội dung và gửi đến popup.js
2. popup.js lưu nội dung và gửi yêu cầu tóm tắt đến background.js
3. background.js gọi Gemini API và gửi kết quả về popup.js
4. popup.js hiển thị kết quả và xử lý chức năng đọc văn bản
5. Khi sử dụng Google Cloud TTS, popup.js gửi yêu cầu đọc đến background.js
6. background.js gọi Google Cloud TTS API và xử lý phản hồi âm thanh
7. Khi sử dụng menu chuột phải, background.js lưu kết quả tóm tắt vào storage và mở cửa sổ summary.html