# Gemini Tóm Tắt & Đọc

Tiện ích mở rộng Chrome mạnh mẽ giúp tóm tắt thông minh nội dung từ trang web, YouTube và Google Doc sử dụng công nghệ AI của Google Gemini API. Hỗ trợ đọc văn bản bằng tiếng Việt với nhiều tùy chọn giọng đọc chất lượng cao, giúp người dùng tiết kiệm thời gian và tăng hiệu quả đọc thông tin.

## Tính năng chính

- **Trích xuất thông minh**: Tự động phân tích và trích xuất nội dung có ý nghĩa từ trang web, YouTube và Google Doc bằng thư viện Readability tiên tiến.
- **Tóm tắt bằng AI**: Sử dụng sức mạnh của Google Gemini API để tạo bản tóm tắt ngắn gọn, chính xác và dễ hiểu.
- **Đa dạng giọng đọc**:
  - **Giọng đọc của trình duyệt (mặc định)**: Tích hợp sẵn với API `speechSynthesis`, không cần cấu hình thêm.
  - **Giọng đọc Google Cloud**: Chất lượng cao, tự nhiên với nhiều tùy chọn giọng đọc tiếng Việt thông qua Google Cloud Text-to-Speech API.
- **Đọc văn bản trong cửa sổ chat**: Nghe các phản hồi của AI trong cửa sổ chat bằng cách nhấp vào tin nhắn và sử dụng các nút điều khiển đọc.
- **Bảo mật cao**: Lưu trữ an toàn các khóa API của người dùng với mã hóa cục bộ.
- **Tiện lợi**: Truy cập nhanh trang lấy Gemini API key và tích hợp menu chuột phải để tóm tắt trang hoặc văn bản đã chọn.

## Cài đặt nhanh chóng

1. Tải xuống hoặc clone repository này về máy tính của bạn.
2. Mở trình duyệt Chrome và truy cập `chrome://extensions/`.
3. Bật **Developer mode** (Chế độ nhà phát triển) ở góc trên bên phải màn hình.
4. Nhấp vào **"Load unpacked"** (Tải tiện ích đã giải nén) và chọn thư mục chứa mã nguồn của extension.
5. Tiện ích sẽ được cài đặt và hiển thị biểu tượng trên thanh công cụ của trình duyệt.

## Hướng dẫn sử dụng chi tiết

### 1. Cấu hình API (Thiết lập ban đầu)

- **Gemini API (Bắt buộc để sử dụng tính năng tóm tắt)**:
  1. Mở tiện ích bằng cách nhấp vào biểu tượng trên thanh công cụ.
  2. Nhấp vào nút **"🔑 Lấy Key"** để truy cập trang lấy Gemini API key.
  3. Tạo tài khoản hoặc đăng nhập vào Google AI Studio và tạo API key mới.
  4. Sao chép API key và dán vào ô nhập trong tiện ích.
  5. Nhấp **"Lưu Key"** để hoàn tất cấu hình.

- **Google Cloud API (Tùy chọn - Để sử dụng giọng đọc chất lượng cao)**:
  1. Tạo dự án Google Cloud và kích hoạt Text-to-Speech API (xem hướng dẫn chi tiết bên dưới).
  2. Tạo API key cho dự án của bạn và thiết lập các hạn chế phù hợp.
  3. Mở tiện ích, dán API key vào ô "Google Cloud API Key".
  4. Nhấp **"Lưu Google TTS Key"** để lưu cấu hình.

### 2. Tóm tắt và Đọc nội dung

1. Truy cập trang web, video YouTube hoặc tài liệu Google Doc bạn muốn tóm tắt.
2. Nhấp vào biểu tượng của tiện ích trên thanh công cụ Chrome.
3. Nhấn nút **"Tóm tắt trang này"** và chờ trong giây lát để AI phân tích và tạo bản tóm tắt.
4. Sau khi nhận được bản tóm tắt, bạn có thể chọn công cụ đọc từ menu thả xuống:
   - `Giọng đọc của trình duyệt`: Phương pháp nhanh chóng, không cần cấu hình thêm, sử dụng ngay.
   - `Giọng đọc Google Cloud`: Chất lượng cao hơn với giọng đọc tự nhiên, yêu cầu cấu hình Google Cloud API.
5. Điều khiển việc đọc bằng các nút:
   - ▶️ **Đọc**: Bắt đầu đọc bản tóm tắt
   - ⏸️ **Tạm dừng**: Tạm dừng việc đọc
   - ⏹️ **Dừng**: Dừng hoàn toàn và đặt lại vị trí đọc
   - 🔊 **Âm lượng**: Điều chỉnh âm lượng đọc

### 3. Sử dụng tính năng đọc trong cửa sổ chat

1. Sau khi nhận được bản tóm tắt, bạn có thể đặt câu hỏi hoặc yêu cầu thêm thông tin trong cửa sổ chat.
2. Khi AI trả lời, bạn có thể nhấp vào tin nhắn của AI để chọn nó cho tính năng đọc.
3. Sử dụng các nút điều khiển đọc ở phía trên cửa sổ chat:
   - Chọn giọng đọc từ menu thả xuống (Giọng đọc của trình duyệt hoặc Google Cloud).
   - Nhấn nút **Phát/Tạm dừng** để bắt đầu hoặc tạm dừng việc đọc tin nhắn.
   - Nhấn nút **Dừng** để dừng hoàn toàn và đặt lại vị trí đọc.
4. Bạn có thể nhấp vào bất kỳ tin nhắn nào của AI trong lịch sử chat để nghe nội dung đó.

### 4. Sử dụng menu chuột phải (Truy cập nhanh)

1. **Tóm tắt toàn bộ trang**: Nhấp chuột phải vào bất kỳ vị trí nào trên trang web và chọn "Tóm tắt trang này với Gemini".
2. **Tóm tắt văn bản đã chọn**: Chọn đoạn văn bản cụ thể, nhấp chuột phải và chọn "Tóm tắt văn bản đã chọn với Gemini".
3. **Xem kết quả**: Kết quả tóm tắt sẽ hiển thị trong cửa sổ mới, nơi bạn cũng có thể sử dụng các tính năng đọc văn bản.

## Thiết lập dự án Google Cloud và kích hoạt Text-to-Speech API (Chi tiết)

1. **Tạo dự án Google Cloud**:
   - Truy cập [Google Cloud Console](https://console.cloud.google.com/).
   - Nhấp vào menu thả xuống ở góc trên cùng bên trái và chọn "Dự án mới".
   - Đặt tên cho dự án (ví dụ: "Gemini-TTS-Extension") và nhấp "Tạo".
   - Chờ vài giây để hệ thống tạo dự án mới.

2. **Kích hoạt Text-to-Speech API**:
   - Trong Google Cloud Console, mở menu bên trái và chọn "API & Dịch vụ" > "Thư viện".
   - Tìm kiếm "Text-to-Speech" trong ô tìm kiếm và chọn "Cloud Text-to-Speech API".
   - Nhấp vào nút "Kích hoạt" và chờ hệ thống kích hoạt API.
   - Lưu ý: Bạn có thể cần thiết lập thanh toán cho dự án, nhưng Google Cloud cung cấp gói miễn phí hàng tháng đủ cho hầu hết người dùng cá nhân.

3. **Tạo API key**:
   - Trong Google Cloud Console, mở menu bên trái và chọn "API & Dịch vụ" > "Thông tin xác thực".
   - Nhấp vào "Tạo thông tin xác thực" và chọn "Khóa API" từ menu thả xuống.
   - Hệ thống sẽ tạo và hiển thị API key mới. Sao chép key này ngay lập tức.

4. **Hạn chế API key (Biện pháp bảo mật quan trọng)**:
   - Trong trang "Thông tin xác thực", nhấp vào API key vừa tạo.
   - Trong phần "Hạn chế API key", chọn "Hạn chế khóa".
   - Chọn "Cloud Text-to-Speech API" từ danh sách API.
   - Tùy chọn: Thêm hạn chế về nguồn HTTP để chỉ cho phép các yêu cầu từ tên miền cụ thể.
   - Nhấp "Lưu" để áp dụng các hạn chế.

## Kiểm tra kết nối Google Cloud Text-to-Speech API

Tiện ích bao gồm công cụ kiểm tra tích hợp để xác minh kết nối với Google Cloud Text-to-Speech API:

1. Mở tệp `test-google-tts.html` trong trình duyệt (có thể mở trực tiếp từ thư mục tiện ích).
2. Nhập Google Cloud API Key của bạn vào ô được cung cấp.
3. Nhập một đoạn văn bản tiếng Việt ngắn vào ô kiểm tra (ví dụ: "Xin chào, đây là bài kiểm tra giọng đọc tiếng Việt").
4. Nhấp vào nút "Kiểm tra API" để gửi yêu cầu đến Google Cloud.
5. Nếu cấu hình chính xác, bạn sẽ nghe được đoạn văn bản được đọc bằng giọng đọc tiếng Việt chất lượng cao.
6. Nếu gặp lỗi, hãy kiểm tra lại API key và đảm bảo Text-to-Speech API đã được kích hoạt đúng cách.

## Yêu cầu hệ thống

- **Trình duyệt**: Chrome phiên bản 88 trở lên (khuyến nghị sử dụng phiên bản mới nhất).
- **API Keys**:
  - Google Gemini API key (bắt buộc để sử dụng tính năng tóm tắt).
  - Google Cloud API key với Text-to-Speech API đã kích hoạt (tùy chọn, để sử dụng giọng đọc chất lượng cao).
- **Kết nối Internet**: Cần có kết nối internet ổn định để giao tiếp với các API.

## Lưu ý quan trọng

- **Cấu hình API**: Đảm bảo bạn đã kích hoạt Text-to-Speech API trong dự án Google Cloud trước khi sử dụng tính năng giọng đọc Google Cloud.
- **Giới hạn trích xuất**: 
  - Trích xuất nội dung từ YouTube chỉ lấy được mô tả và thông tin hiển thị, không lấy được nội dung âm thanh của video.
  - Trích xuất nội dung từ Google Doc phụ thuộc vào cấu trúc trang và quyền truy cập của bạn.
- **Bảo mật**: API keys được lưu trữ cục bộ trong trình duyệt của bạn và không được gửi đến bất kỳ máy chủ nào khác ngoài các API của Google.
- **Giới hạn sử dụng**: Lưu ý rằng cả Gemini API và Google Cloud Text-to-Speech API đều có giới hạn sử dụng miễn phí. Kiểm tra trang web của Google để biết thông tin chi tiết về giới hạn hiện tại.

## Đóng góp

Đóng góp cho dự án này luôn được chào đón! Nếu bạn muốn cải thiện tiện ích, hãy tạo pull request hoặc báo cáo vấn đề trong phần Issues của repository.

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem tệp `LICENSE` để biết thêm thông tin.