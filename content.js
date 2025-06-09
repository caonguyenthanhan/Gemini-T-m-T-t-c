// Kiểm tra xem Readability đã được tải chưa
if (typeof Readability !== 'undefined') {
    // Sao chép DOM để không làm ảnh hưởng đến trang gốc
    const documentClone = document.cloneNode(true);
    // Sử dụng Readability để trích xuất bài viết
    const article = new Readability(documentClone).parse();

    // Gửi nội dung đã trích xuất (chỉ text) về cho popup
    if (article && article.textContent) {
        chrome.runtime.sendMessage({
            type: "CONTENT_RESULT",
            content: article.textContent
        });
    }
}