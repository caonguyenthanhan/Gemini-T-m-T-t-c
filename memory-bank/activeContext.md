# Bối cảnh hoạt động: Gemini Tóm Tắt & Đọc

## Trọng tâm hiện tại
Plugin đã hoàn thiện với các chức năng cơ bản và đang phát triển tính năng nâng cao:
- Trích xuất nội dung trang web
- Tóm tắt bằng Google Gemini API
- Đọc văn bản bằng tiếng Việt (Web Speech API)
- Tích hợp với iFLYTEK TTS API cho chất lượng giọng đọc cao hơn
- Lưu trữ API key

## Thay đổi gần đây
- Đã cập nhật để sử dụng Manifest V3
- Đã sửa lỗi khi gửi nội dung để tóm tắt
- Đã tối ưu hóa giao diện người dùng
- Đã thêm tích hợp với iFLYTEK TTS API cho giọng đọc tiếng Việt chất lượng cao
- Đã tạo script test-iflytek.js để kiểm tra kết nối với iFLYTEK TTS API
- Đã đưa dự án lên GitHub repository

## Các bước tiếp theo
- Hoàn thiện tích hợp iFLYTEK TTS vào tiện ích chính
- Thêm tùy chọn ngôn ngữ cho tóm tắt và đọc
- Cải thiện xử lý lỗi và thông báo người dùng
- Thêm tùy chọn tùy chỉnh độ dài tóm tắt
- Thêm chức năng lưu các bản tóm tắt

## Bài học kinh nghiệm
- Cần xử lý cẩn thận việc trích xuất nội dung từ các trang web phức tạp
- Cần kiểm tra kỹ lỗi khi gọi API và hiển thị thông báo rõ ràng cho người dùng
- Web Speech API có thể hoạt động không đồng nhất trên các trình duyệt khác nhau
- Tích hợp với API bên thứ ba như iFLYTEK yêu cầu xử lý xác thực và mã hóa cẩn thận