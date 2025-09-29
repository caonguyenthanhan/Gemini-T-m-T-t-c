# Tiến độ dự án

## Đã hoàn thành

1. Trích xuất nội dung trang web bằng Readability.js
2. Tích hợp Google Gemini API để tóm tắt nội dung
3. Giao diện popup cơ bản
4. Đọc văn bản bằng Web Speech API
5. Lưu trữ API key
6. Tích hợp Google Cloud Text-to-Speech API
7. Trích xuất nội dung từ YouTube và Google Doc
8. Menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
9. Cửa sổ mới để hiển thị kết quả tóm tắt
10. Tệp kiểm tra Google Cloud TTS API (test-google-tts.html)
11. Tích hợp chức năng đọc văn bản vào cửa sổ chat
12. **[MỚI]** Chat chuyên sâu với tra cứu thông tin bổ sung tự động:
    - Di chuyển tính năng từ popup chính vào cửa sổ chat chuyên sâu (chat.html)
    - Tự động phát hiện khi AI trả lời "nội dung không đề cập" hoặc thiếu thông tin
    - Tích hợp DuckDuckGo Search API và Wikipedia API
    - Logic tự động tra cứu và tích hợp thông tin bổ sung vào prompt
    - UI control trong chat để bật/tắt tính năng
    - Cập nhật README.md với hướng dẫn sử dụng tính năng mới

## Đang tiến hành

- Cải thiện xử lý lỗi kết nối API
- Tạo tài liệu hướng dẫn sử dụng
- Cập nhật README với hướng dẫn thiết lập dự án Google Cloud

## Cần làm

- Thêm tùy chọn ngôn ngữ (Việt/Anh) cho kết quả tóm tắt
- Cải thiện xử lý lỗi và thông báo người dùng
- Thêm tùy chọn độ dài tóm tắt (ngắn/vừa/dài)
- Thêm chức năng lưu bản tóm tắt
- Cải thiện trích xuất nội dung từ YouTube và Google Doc

## Vấn đề đã biết

- Trích xuất nội dung có thể không hoạt động tốt trên các trang web có cấu trúc phức tạp
- Chất lượng giọng đọc tiếng Việt của Web Speech API còn hạn chế
- Giới hạn của Gemini API về độ dài văn bản đầu vào
- Trích xuất nội dung từ YouTube chỉ lấy được mô tả, không lấy được nội dung video
- Trích xuất nội dung từ Google Doc phụ thuộc vào cấu trúc trang và quyền truy cập
- Cần kích hoạt Google Cloud Text-to-Speech API trong dự án Google Cloud trước khi sử dụng