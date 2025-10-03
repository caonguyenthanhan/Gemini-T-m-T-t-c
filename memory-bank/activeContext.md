# Bối cảnh hiện tại

## Trạng thái hiện tại

Tiện ích mở rộng Chrome "Gemini Tóm Tắt & Đọc" hiện đã có các tính năng cơ bản:

1. Trích xuất nội dung từ trang web thông thường
2. Trích xuất nội dung từ YouTube và Google Doc
3. Tóm tắt nội dung bằng Google Gemini API
4. Đọc văn bản tóm tắt bằng Web Speech API (giọng đọc của trình duyệt)
5. Đọc văn bản tóm tắt bằng Google Cloud Text-to-Speech API (giọng đọc chất lượng cao)
6. Lưu trữ API key của người dùng
7. Menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
8. Cửa sổ mới để hiển thị kết quả tóm tắt
9. Đọc văn bản trong cửa sổ chat với cả hai tùy chọn giọng đọc
10. **[MỚI]** Chat chuyên sâu với tra cứu thông tin bổ sung tự động
11. **[MỚI]** Tích hợp engine TTS cục bộ (Flask + gTTS) chạy tại http://127.0.0.1:5001/ để đọc văn bản khi chọn engine 'local'

## Thay đổi gần đây

1. **[MỚI NHẤT - 2024]** Đã chuyển tính năng tra cứu thông tin bổ sung vào chat chuyên sâu:
   - Di chuyển UI control từ popup chính vào cửa sổ chat chuyên sâu (chat.html)
   - Thay đổi logic từ phát hiện trước khi gọi API sang phát hiện tự động sau khi AI trả lời
   - Tự động phát hiện khi AI trả lời "nội dung không đề cập" hoặc thiếu thông tin
   - Tự động tra cứu thông tin từ DuckDuckGo và Wikipedia khi cần thiết
   - Tích hợp kết quả tìm kiếm vào prompt và yêu cầu AI trả lời lại với thông tin đầy đủ hơn
   - Cập nhật README.md với hướng dẫn sử dụng tính năng mới
2. Đã thêm khả năng trích xuất nội dung từ YouTube và Google Doc
3. Đã thay thế Google Cloud TTS API bằng phiên bản mới
4. Đã thêm menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
5. Đã thêm cửa sổ mới để hiển thị kết quả tóm tắt
6. Đã tích hợp chức năng đọc văn bản vào cửa sổ chat, cho phép người dùng nghe các phản hồi của AI
7. **[MỚI]** Đã thêm nhánh xử lý engine 'local' trong background.js, popup.js, summary.js, chat.js để gửi/nhận TTS qua server cục bộ, có cache và xử lý lỗi kết nối
8. **[MỚI]** Cửa sổ đọc (read.html + read.js) tự động bắt đầu đọc ngay khi mở và tự đóng sau khi đọc xong
9. **[MỚI]** Start_Gemini_TTS_Server.bat khởi động server bằng PowerShell Start-Process chạy nền, ghi log và tự đóng cửa sổ sau khi kích hoạt
10. **[MỚI]** Batch đã được nâng cấp: tự tạo venv trong thư mục private, tự kiểm tra/cài đặt phụ thuộc (flask, flask-cors, gTTS) nếu thiếu, và khởi chạy server bằng python.exe trong venv ở chế độ nền; đã xác nhận port 5001 mở và gọi POST /tts trả về audioContent thành công
11. **[MỚI]** Khi kiểm thử bằng PowerShell, gửi body JSON dạng UTF-8 bytes (Content-Type: application/json; charset=utf-8) để tránh lỗi "Invalid JSON" từ Flask (đối với một số cấu hình PowerShell)
12. **[MỚI]** Đã di chuyển local_tts_server.py ra thư mục gốc dự án; batch cập nhật để chạy từ thư mục gốc và vẫn sử dụng venv tại private/venv

## Các bước tiếp theo

1. Thêm tùy chọn ngôn ngữ (Việt/Anh) cho kết quả tóm tắt
2. Cải thiện xử lý lỗi và thông báo người dùng
3. Thêm tùy chọn độ dài tóm tắt (ngắn/vừa/dài)
4. Thêm chức năng lưu bản tóm tắt
5. Cải thiện trích xuất nội dung từ YouTube và Google Doc
6. Kiểm thử liên hoàn TTS cục bộ từ popup, summary và chat; tinh chỉnh thông báo lỗi/fallback khi server không chạy

## Quyết định và cân nhắc đang hoạt động

- Đã quyết định sử dụng Google Cloud Text-to-Speech API thay vì iFLYTEK TTS API do tính ổn định và dễ tích hợp hơn
- Đang cân nhắc cách cải thiện trích xuất nội dung từ YouTube và Google Doc
- Đang xem xét các phương pháp tối ưu hóa prompt cho Gemini API để cải thiện chất lượng tóm tắt
- Đang nghiên cứu cách cải thiện giao diện người dùng để dễ sử dụng hơn
- Cân nhắc mở rộng engine 'local' hỗ trợ thêm ngôn ngữ và giọng đọc nếu gTTS phù hợp