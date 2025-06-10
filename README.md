# Gemini Tóm Tắt & Đọc

Tiện ích mở rộng Chrome cho phép tóm tắt nội dung trang web bằng Google Gemini API và đọc văn bản bằng tiếng Việt với nhiều tùy chọn giọng đọc.

## Tính năng

- Trích xuất nội dung có ý nghĩa từ trang web bằng thư viện Readability.
- Tóm tắt nội dung bằng Google Gemini API.
- Đọc văn bản tóm tắt bằng 2 công cụ:
  - **Giọng đọc của trình duyệt (mặc định)**: Sử dụng API `speechSynthesis` có sẵn.
  - **Giọng đọc iFLYTEK**: Sử dụng API TTS của iFLYTEK cho chất lượng giọng đọc tiếng Việt cao hơn.
- Lưu trữ an toàn các khóa API của người dùng.
- Truy cập nhanh trang lấy Gemini API key.

## Cài đặt

1.  Tải xuống hoặc clone repository này.
2.  Mở Chrome và truy cập `chrome://extensions/`.
3.  Bật **Developer mode** (Chế độ nhà phát triển) ở góc trên bên phải.
4.  Nhấp vào **"Load unpacked"** (Tải tiện ích đã giải nén) và chọn thư mục chứa mã nguồn của extension.

## Sử dụng

### 1. Cấu hình API

-   **Gemini API (Bắt buộc để tóm tắt)**:
    1.  Mở tiện ích, nhấp vào nút **"🔑 Lấy Key"** để truy cập trang lấy Gemini API key.
    2.  Tạo và sao chép API key từ trang Google AI Studio.
    3.  Dán API key vào ô nhập trong tiện ích.
    4.  Nhấp **"Lưu Key"**.
-   **iFLYTEK API (Tùy chọn để có giọng đọc nâng cao)**:
    1.  Đăng ký tài khoản và tạo ứng dụng trên [nền tảng mở của iFLYTEK](https://www.xfyun.cn/) để nhận `APPID`, `APIKey`, và `APISecret`.
    2.  Mở tiện ích, dán 3 giá trị này vào các ô tương ứng trong phần "Cài đặt iFLYTEK TTS".
    3.  Nhấp **"Lưu iFLYTEK Keys"**.

### 2. Tóm tắt và Đọc

1.  Truy cập trang web bạn muốn tóm tắt.
2.  Nhấp vào biểu tượng của tiện ích trên thanh công cụ.
3.  Nhấn nút **"Tóm tắt trang này"**. Chờ trong giây lát để nhận bản tóm tắt.
4.  Chọn công cụ đọc từ menu thả xuống:
    -   `Giọng đọc của trình duyệt`: Nhanh, không cần cấu hình thêm.
    -   `Giọng đọc iFLYTEK`: Chất lượng cao hơn, yêu cầu cấu hình API.
5.  Sử dụng các nút ▶️ **Đọc**, ⏸️ **Tạm dừng**, và ⏹️ **Dừng** để điều khiển việc đọc.

## Kiểm tra kết nối iFLYTEK TTS

Tiện ích bao gồm script `test-iflytek.js` để kiểm tra kết nối với iFLYTEK TTS API:

1. Cập nhật thông tin API của bạn trong script:
   ```javascript
   const APP_ID = 'your_app_id';           // Thay bằng APPID của bạn
   const API_KEY = 'your_api_key';         // Thay bằng APIKey của bạn
   const API_SECRET = 'your_api_secret';   // Thay bằng APISecret của bạn
   ```

## Yêu cầu

-   Trình duyệt Chrome phiên bản mới nhất.
-   Google Gemini API key (để tóm tắt).
-   iFLYTEK APPID, APIKey, APISecret (tùy chọn, để có giọng đọc chất lượng cao).