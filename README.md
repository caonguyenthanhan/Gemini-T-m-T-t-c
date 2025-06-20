# Gemini Tóm Tắt & Đọc

Tiện ích mở rộng Chrome cho phép tóm tắt nội dung trang web, YouTube và Google Doc bằng Google Gemini API và đọc văn bản bằng tiếng Việt với nhiều tùy chọn giọng đọc.

## Tính năng

- Trích xuất nội dung có ý nghĩa từ trang web, YouTube và Google Doc bằng thư viện Readability.
- Tóm tắt nội dung bằng Google Gemini API.
- Đọc văn bản tóm tắt bằng 2 công cụ:
  - **Giọng đọc của trình duyệt (mặc định)**: Sử dụng API `speechSynthesis` có sẵn.
  - **Giọng đọc Google Cloud**: Sử dụng Google Cloud Text-to-Speech API cho chất lượng giọng đọc tiếng Việt cao hơn.
- Lưu trữ an toàn các khóa API của người dùng.
- Truy cập nhanh trang lấy Gemini API key.
- Menu chuột phải để tóm tắt trang hoặc văn bản đã chọn.

## Cài đặt

1. Tải xuống hoặc clone repository này.
2. Mở Chrome và truy cập `chrome://extensions/`.
3. Bật **Developer mode** (Chế độ nhà phát triển) ở góc trên bên phải.
4. Nhấp vào **"Load unpacked"** (Tải tiện ích đã giải nén) và chọn thư mục chứa mã nguồn của extension.

## Sử dụng

### 1. Cấu hình API

- **Gemini API (Bắt buộc để tóm tắt)**:
  1. Mở tiện ích, nhấp vào nút **"🔑 Lấy Key"** để truy cập trang lấy Gemini API key.
  2. Tạo và sao chép API key từ trang Google AI Studio.
  3. Dán API key vào ô nhập trong tiện ích.
  4. Nhấp **"Lưu Key"**.

- **Google Cloud API (Tùy chọn để có giọng đọc nâng cao)**:
  1. Tạo dự án Google Cloud và kích hoạt Text-to-Speech API (xem hướng dẫn bên dưới).
  2. Tạo API key cho dự án của bạn.
  3. Mở tiện ích, dán API key vào ô "Google Cloud API Key".
  4. Nhấp **"Lưu Google TTS Key"**.

### 2. Tóm tắt và Đọc

1. Truy cập trang web, YouTube hoặc Google Doc bạn muốn tóm tắt.
2. Nhấp vào biểu tượng của tiện ích trên thanh công cụ.
3. Nhấn nút **"Tóm tắt trang này"**. Chờ trong giây lát để nhận bản tóm tắt.
4. Chọn công cụ đọc từ menu thả xuống:
   - `Giọng đọc của trình duyệt`: Nhanh, không cần cấu hình thêm.
   - `Giọng đọc Google Cloud`: Chất lượng cao hơn, yêu cầu cấu hình API.
5. Sử dụng các nút ▶️ **Đọc**, ⏸️ **Tạm dừng**, và ⏹️ **Dừng** để điều khiển việc đọc.

### 3. Sử dụng menu chuột phải

1. Nhấp chuột phải vào trang web để tóm tắt toàn bộ trang.
2. Hoặc chọn văn bản, nhấp chuột phải và chọn "Tóm tắt văn bản đã chọn".
3. Kết quả tóm tắt sẽ hiển thị trong cửa sổ mới.

## Thiết lập dự án Google Cloud và kích hoạt Text-to-Speech API

1. **Tạo dự án Google Cloud**:
   - Truy cập [Google Cloud Console](https://console.cloud.google.com/).
   - Nhấp vào menu thả xuống ở góc trên cùng bên trái và chọn "Dự án mới".
   - Đặt tên cho dự án và nhấp "Tạo".

2. **Kích hoạt Text-to-Speech API**:
   - Trong Google Cloud Console, mở menu bên trái và chọn "API & Dịch vụ" > "Thư viện".
   - Tìm kiếm "Text-to-Speech" và chọn "Cloud Text-to-Speech API".
   - Nhấp vào nút "Kích hoạt".

3. **Tạo API key**:
   - Trong Google Cloud Console, mở menu bên trái và chọn "API & Dịch vụ" > "Thông tin xác thực".
   - Nhấp vào "Tạo thông tin xác thực" và chọn "Khóa API".
   - Sao chép API key được tạo.

4. **Hạn chế API key (Khuyến nghị)**:
   - Trong trang "Thông tin xác thực", nhấp vào API key vừa tạo.
   - Trong phần "Hạn chế API key", chọn "Hạn chế khóa".
   - Chọn "Cloud Text-to-Speech API" từ danh sách.
   - Lưu thay đổi.

## Kiểm tra kết nối Google Cloud Text-to-Speech API

Tiện ích bao gồm tệp `test-google-tts.html` để kiểm tra kết nối với Google Cloud Text-to-Speech API:

1. Mở tệp `test-google-tts.html` trong trình duyệt.
2. Nhập Google Cloud API Key của bạn.
3. Nhập văn bản tiếng Việt để kiểm tra.
4. Nhấp "Kiểm tra API" để xác nhận kết nối hoạt động.

## Yêu cầu

- Trình duyệt Chrome phiên bản mới nhất.
- Google Gemini API key (để tóm tắt).
- Google Cloud API key với Text-to-Speech API đã kích hoạt (tùy chọn, để có giọng đọc chất lượng cao).

## Lưu ý

- Đảm bảo bạn đã kích hoạt Text-to-Speech API trong dự án Google Cloud trước khi sử dụng tính năng giọng đọc Google Cloud.
- Trích xuất nội dung từ YouTube chỉ lấy được mô tả, không lấy được nội dung video.
- Trích xuất nội dung từ Google Doc phụ thuộc vào cấu trúc trang và quyền truy cập.