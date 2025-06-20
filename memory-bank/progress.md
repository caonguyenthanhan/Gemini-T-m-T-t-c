# Tiến độ dự án

## Đã hoàn thành

- Trích xuất nội dung trang web sử dụng Readability.js
- Kết nối với Google Gemini API để tóm tắt nội dung
- Giao diện popup cơ bản
- Đọc văn bản với Web Speech API
- Lưu trữ API key
- Tích hợp Google Cloud Text-to-Speech API
- Hỗ trợ trích xuất nội dung từ YouTube và Google Doc
- Thêm menu chuột phải (context menu) để tóm tắt trang hoặc văn bản đã chọn
- Thêm tính năng mở kết quả tóm tắt trong cửa sổ mới khi sử dụng menu chuột phải
- Tạo tệp kiểm tra Google Cloud TTS API (test-google-tts.html)

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