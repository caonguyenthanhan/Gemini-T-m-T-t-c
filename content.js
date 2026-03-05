// Kiểm tra xem Readability đã được tải chưa
if (typeof Readability !== 'undefined') {
    // Kiểm tra URL hiện tại
    const currentUrl = window.location.href;
    let content = "";
    
    // Xử lý YouTube
    if (currentUrl.includes('youtube.com/watch')) {
        // Lấy tiêu đề video
        const videoTitle = document.querySelector('h1.title')?.textContent || document.title;
        
        // Thử lấy Transcript (Subtitle)
        // Lưu ý: Transcript không phải lúc nào cũng có sẵn trong DOM nếu người dùng chưa mở nó.
        // Cách tốt nhất là hướng dẫn người dùng mở Transcript hoặc thử tìm nút mở nó.
        
        // Tuy nhiên, việc lấy transcript từ DOM YouTube rất phức tạp vì nó load động.
        // Giải pháp đơn giản hơn: Lấy metadata (Title, Channel, Description) và nhắc người dùng.
        // Nếu muốn lấy Transcript thực sự, cần gọi API nội bộ của YouTube hoặc parse XML subtitle (phức tạp).
        // Ở đây chúng ta sẽ nâng cấp việc lấy Description và Metadata chi tiết hơn.
        
        const channelName = document.querySelector('#channel-name a')?.textContent || "";
        
        // Click "More" button in description if exists to load full description
        const moreBtn = document.querySelector('#expand');
        if (moreBtn) moreBtn.click();
        
        setTimeout(() => {
             const description = document.querySelector('#description-inline-expander')?.innerText || 
                                 document.querySelector('#description')?.innerText || "";
             
             // Check for transcript container?
             // Not easy without user interaction.
             
             content = `[YouTube Video]\nTiêu đề: ${videoTitle}\nKênh: ${channelName}\n\nMô tả Video:\n${description}\n\n(Lưu ý: Để tóm tắt chi tiết nội dung nói, Gemini cần Transcript. Hiện tại tiện ích chỉ lấy được mô tả và metadata. Bạn có thể copy Transcript dán vào khung chat nếu cần.)`;
             
             chrome.runtime.sendMessage({
                type: "CONTENT_RESULT",
                content: content
            });
        }, 1000); // Wait for expansion
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
    // Xử lý Gmail
    else if (currentUrl.includes('mail.google.com')) {
        // Lấy tiêu đề email (Subject)
        const subject = document.querySelector('h2.hP')?.innerText || document.title;
        
        // Lấy nội dung email đang mở
        // Gmail dùng nhiều class dynamic, nhưng .a3s.aiGrid thường chứa body của email message
        // Hoặc tìm div[role="listitem"] chứa email
        const emailBodies = document.querySelectorAll('.a3s.aiGrid, .a3s');
        let emailContent = "";
        
        if (emailBodies.length > 0) {
            // Lấy email cuối cùng (thường là cái đang mở hoặc mới nhất trong thread)
            // Hoặc lấy tất cả để tóm tắt cả thread
            emailBodies.forEach((body, index) => {
                emailContent += `--- Email ${index + 1} ---\n${body.innerText}\n\n`;
            });
        } else {
            // Fallback nếu không tìm thấy class cụ thể, thử lấy vùng chính
            const mainRole = document.querySelector('[role="main"]');
            emailContent = mainRole ? mainRole.innerText : document.body.innerText;
        }

        content = `[Gmail Thread]\nSubject: ${subject}\n\nContent:\n${emailContent}`;
        
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