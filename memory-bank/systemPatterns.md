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
4. Lưu trữ API key trong chrome.storage.sync

## Mối quan hệ thành phần
- popup.js: Xử lý giao diện người dùng và điều khiển luồng chính
- content.js: Trích xuất nội dung trang web bằng Readability.js
- background.js: Gọi Gemini API và xử lý kết quả
- Readability.js: Thư viện bên thứ ba để phân tích và trích xuất nội dung

## Luồng dữ liệu
1. content.js trích xuất nội dung và gửi đến popup.js
2. popup.js lưu nội dung và gửi yêu cầu tóm tắt đến background.js
3. background.js gọi Gemini API và gửi kết quả về popup.js
4. popup.js hiển thị kết quả và xử lý chức năng đọc văn bản