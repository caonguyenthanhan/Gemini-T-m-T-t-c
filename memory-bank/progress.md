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
13. Cấu hình .gitignore để bỏ memory-bank/ và private/ khỏi repo Git
14. **[MỚI]** Tích hợp engine TTS cục bộ (Flask + gTTS), thêm nhánh xử lý 'local' trong background.js, popup.js, summary.js, chat.js
15. **[MỚI]** Cửa sổ đọc tự động bắt đầu đọc và tự đóng sau khi đọc xong
16. **[MỚI]** Start_Gemini_TTS_Server.bat chạy nền bằng PowerShell, ghi log và tự đóng sau khi khởi chạy
17. **[MỚI]** Batch nâng cấp: tự tạo venv, tự cài đặt phụ thuộc nếu thiếu, khởi chạy server bằng python.exe trong venv; đã kiểm thử mở port 5001 thành công
18. **[MỚI]** POST /tts kiểm thử thành công từ PowerShell khi gửi JSON UTF-8 bytes, nhận audioContent và phát được ở read window
19. **[MỚI]** Di chuyển local_tts_server.py ra thư mục gốc dự án và cập nhật batch để chạy từ thư mục gốc

## Đang tiến hành

- Cải thiện xử lý lỗi kết nối API
- Tạo tài liệu hướng dẫn sử dụng
- Cập nhật README với hướng dẫn thiết lập dự án Google Cloud
- Kiểm thử liên hoàn TTS cục bộ và tinh chỉnh thông báo lỗi/fallback
- Kiểm thử autoplay/CSP trong read window và fallback Web Speech
- Đảm bảo batch khởi chạy ổn định trên các máy không có Python trong PATH (ưu tiên venv)