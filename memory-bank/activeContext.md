# Bối cảnh hiện tại

## Trạng thái hiện tại

Tiện ích mở rộng "Gemini Tóm Tắt & Đọc" đã hoàn thiện các chức năng cốt lõi và đang trong giai đoạn phát triển các tính năng nâng cao. Hiện tại, tiện ích có thể:

- Trích xuất nội dung từ trang web thông thường, YouTube và Google Doc
- Tóm tắt nội dung bằng Google Gemini API
- Đọc văn bản tiếng Việt bằng Web Speech API hoặc Google Cloud Text-to-Speech API
- Lưu trữ API key cho Gemini và Google Cloud
- Cung cấp menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
- Hiển thị kết quả tóm tắt trong cửa sổ mới khi sử dụng menu chuột phải

## Thay đổi gần đây

1. Đã thêm hỗ trợ trích xuất nội dung từ YouTube và Google Doc
2. Đã thay thế iFLYTEK TTS API bằng Google Cloud Text-to-Speech API để cải thiện chất lượng đọc tiếng Việt
3. Đã thêm menu chuột phải để tóm tắt trang hoặc văn bản đã chọn
4. Đã thêm tính năng mở kết quả tóm tắt trong cửa sổ mới khi sử dụng menu chuột phải
5. Đã thêm tệp kiểm tra Google Cloud TTS API (test-google-tts.html)

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