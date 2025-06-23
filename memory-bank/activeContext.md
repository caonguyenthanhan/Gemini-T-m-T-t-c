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

## Thay đổi gần đây

1. Đã thêm khả năng trích xuất nội dung từ YouTube và Google Doc
2. Đã thay thế Google Cloud TTS API bằng phiên bản mới
3. Đã thêm menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
4. Đã thêm cửa sổ mới để hiển thị kết quả tóm tắt
5. Đã tích hợp chức năng đọc văn bản vào cửa sổ chat, cho phép người dùng nghe các phản hồi của AI

## Các bước tiếp theo

1. Thêm tùy chọn ngôn ngữ (Việt/Anh) cho kết quả tóm tắt
2. Cải thiện xử lý lỗi và thông báo người dùng
3. Thêm tùy chọn độ dài tóm tắt (ngắn/vừa/dài)
4. Thêm chức năng lưu bản tóm tắt
5. Cải thiện trích xuất nội dung từ YouTube và Google Doc

## Quyết định và cân nhắc đang hoạt động

- Đã quyết định sử dụng Google Cloud Text-to-Speech API thay vì iFLYTEK TTS API do tính ổn định và dễ tích hợp hơn
- Đang cân nhắc cách cải thiện trích xuất nội dung từ YouTube và Google Doc
- Đang xem xét các phương pháp tối ưu hóa prompt cho Gemini API để cải thiện chất lượng tóm tắt
- Đang nghiên cứu cách cải thiện giao diện người dùng để dễ sử dụng hơn