// Kiểm tra xem Readability đã được tải chưa
if (typeof Readability !== 'undefined') {
    // Kiểm tra URL hiện tại
    const currentUrl = window.location.href;
    let content = "";
    
    // Xử lý YouTube
    if (currentUrl.includes('youtube.com/watch')) {
        // Lấy tiêu đề video
        const videoTitle = document.querySelector('h1.title')?.textContent || 
                          document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 
                          document.querySelector('h1')?.textContent || "";
        
        // Lấy mô tả video - Cập nhật bộ chọn để phù hợp với cấu trúc mới của YouTube
        const videoDescription = document.querySelector('#description-text')?.textContent || 
                               document.querySelector('#description')?.textContent || 
                               document.querySelector('ytd-text-inline-expander')?.textContent || 
                               document.querySelector('[itemprop="description"]')?.textContent || "";
        
        // Lấy thông tin kênh
        const channelName = document.querySelector('#channel-name')?.textContent || 
                           document.querySelector('#owner-name')?.textContent || 
                           document.querySelector('.ytd-channel-name')?.textContent || "";
        
        // Kiểm tra nếu không lấy được mô tả
        if (!videoDescription || videoDescription.trim() === "") {
            // Thông báo lỗi
            chrome.runtime.sendMessage({
                type: "CONTENT_RESULT",
                content: `Video YouTube: ${videoTitle}\n\nKênh: ${channelName}\n\nKhông thể lấy mô tả video. Vui lòng mở rộng phần mô tả video trên YouTube trước khi tóm tắt.`
            });
        } else {
            // Tổng hợp thông tin
            content = `Video YouTube: ${videoTitle}\n\nKênh: ${channelName}\n\nMô tả: ${videoDescription}`;
            
            // Gửi nội dung về popup
            chrome.runtime.sendMessage({
                type: "CONTENT_RESULT",
                content: content
            });
        }
    }
    // Xử lý Google Doc
    else if (currentUrl.includes('docs.google.com/document')) {
        // Lấy tiêu đề tài liệu
        const docTitle = document.querySelector('.docs-title-input')?.value || "";
        
        // Lấy nội dung tài liệu (phần hiển thị)
        const docContent = document.querySelector('.kix-appview-editor')?.innerText || "";
        
        // Tổng hợp thông tin
        content = `Google Doc: ${docTitle}\n\n${docContent}`;
        
        // Gửi nội dung về popup
        chrome.runtime.sendMessage({
            type: "CONTENT_RESULT",
            content: content
        });
    }

    // Xử lý các trang web thông thường
    else {
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
}