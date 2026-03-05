# Gemini Tóm Tắt & Đọc - Trợ lý AI Thông Minh Cho Web

## 🎯 Mục Đích Thiết Kế
Dự án được xây dựng với triết lý **"AI tại chỗ" (On-site AI)**:
- **Triển khai nhanh**: Mang sức mạnh của AI (Gemini) trực tiếp vào trang web bạn đang xem.
- **Không rời ngữ cảnh**: Loại bỏ thao tác copy link/nội dung sang tab khác. Không cần mở cửa sổ mới của ChatGPT/Gemini để hỏi.
- **Giảm thiểu "rác"**: Mỗi đoạn chat gắn liền với trang web cụ thể, không làm lộn xộn lịch sử chat chung của bạn.
- **Tối ưu hiển thị**: Giao diện Sidebar thông minh tự động điều chỉnh kích thước trang web gốc, giúp bạn vừa đọc web vừa chat với AI mà không bị che khuất nội dung.

## ✨ Tính Năng Nổi Bật

### 1. Trợ Lý Chat Thông Minh (Sidebar)
- **Luôn hiển thị bên cạnh**: Mở khung chat ngay bên phải màn hình. Trang web gốc sẽ tự động thu nhỏ lại để nhường chỗ, giúp bạn đối chiếu thông tin dễ dàng.
- **Lịch sử theo trang (Tab-specific)**: Nội dung chat được lưu riêng biệt cho từng URL. Khi bạn quay lại trang web cũ, lịch sử chat của trang đó vẫn còn.
- **Xuất dữ liệu**: Lưu lại cuộc trò chuyện và thông tin hữu ích ra file **Word (.doc)** hoặc **Text (.txt)**, kèm theo đường dẫn nguồn để tiện tra cứu sau này.

### 2. Tóm Tắt & Phân Tích Đa Dạng
- **Tóm tắt trang web**: Phân tích nội dung chính chỉ với 1 cú click.
- **Chụp & Hỏi (Vision)**: Tính năng "Chụp vùng màn hình" cho phép bạn khoanh vùng bất kỳ nội dung nào (biểu đồ, ảnh, lỗi code...) và hỏi AI ngay lập tức.
- **Hỗ trợ đa nguồn**: Hoạt động tốt trên Web, YouTube (lấy mô tả/caption), Google Docs.

### 3. Quản Lý API Key Mạnh Mẽ & An Toàn
- **Multi-Key Failover**: Cho phép nhập nhiều API Key (tối đa 10 key). Nếu một key bị lỗi (hết quota, rate limit), hệ thống tự động chuyển sang key tiếp theo để đảm bảo trải nghiệm không gián đoạn.
- **Cá nhân hóa (Persona)**: Thiết lập vai trò cho AI (ví dụ: "Bạn là chuyên gia lập trình", "Giải thích cho học sinh lớp 5") để nhận câu trả lời phù hợp nhất.
- **Bảo mật**: Key được lưu trữ cục bộ (encrypted) trên trình duyệt của bạn.

### 4. Đọc Văn Bản (Text-to-Speech)
- **Giọng đọc trình duyệt**: Miễn phí, nhanh chóng.
- **Google Cloud TTS**: Hỗ trợ giọng đọc AI cao cấp (Wavenet) tự nhiên như người thật (yêu cầu API Key riêng).

## 🚀 Cài Đặt & Sử Dụng

1. **Cài đặt**:
   - Tải mã nguồn về.
   - Vào `chrome://extensions/`, bật **Developer mode**.
   - Chọn **Load unpacked** và trỏ đến thư mục extension.

2. **Cấu hình (Lần đầu)**:
   - Mở tiện ích, vào tab **Cài đặt (Settings)**.
   - Nhập **Gemini API Key** (có thể nhập nhiều key để dự phòng). Lấy key tại [Google AI Studio](https://aistudio.google.com/).
   - (Tùy chọn) Nhập thông tin "Cá nhân hóa" để AI hiểu bạn hơn.

3. **Sử dụng**:
   - **Chat/Tóm tắt**: Mở popup, chọn "Chat với AI" hoặc "Tóm tắt".
   - **Chụp màn hình**: Chọn "Chụp & Hỏi", kéo chuột chọn vùng cần hỏi.
   - **Menu chuột phải**: Bôi đen văn bản -> Chuột phải -> "Tóm tắt/Giải thích với Gemini".

## 🛠️ Yêu cầu hệ thống
- Trình duyệt lõi Chromium (Chrome, Edge, Brave...) phiên bản mới.
- Kết nối Internet ổn định.

## 📝 Giấy phép
Dự án mã nguồn mở theo giấy phép MIT.
