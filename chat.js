document.addEventListener('DOMContentLoaded', function () {
    // --- UI ELEMENTS ---
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const contentSummary = document.getElementById('content-summary');
    const toggleSummary = document.getElementById('toggleSummary');
    const summaryIcon = document.getElementById('summary-toggle-icon');
    
    // Controls
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportDocxBtn = document.getElementById('exportDocxBtn');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const captureAreaBtn = document.getElementById('captureAreaBtn');
    const mindmapBtn = document.getElementById('mindmapBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    // Settings
    const enableWebSearchCheckbox = document.getElementById('enableWebSearch');
    const allowExternalKnowledgeCheckbox = document.getElementById('allowExternalKnowledge');
    const ttsEngineSelect = document.getElementById('ttsEngine'); // Keeping for legacy, though we moved it
    const ttsSpeedInput = document.getElementById('ttsSpeed');
    const ttsVoiceSelect = document.getElementById('ttsVoice');
    
    // TTS
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    // --- STATE ---
    let pageContent = "";
    let currentTabUrl = "";
    let currentTabTitle = "";
    let chatHistory = [];
    let apiKeys = [];
    let userPersona = "";
    let systemPrompt = "";
    let outputLanguage = "Vietnamese";
    
    // TTS State
    let ttsState = { isPlaying: false, isPaused: false, utterance: null };
    let availableVoices = [];

    // --- INITIALIZATION ---
    setupEventListeners();
    setupSPAListener();
    loadVoices();
    loadSettingsAndContent();

    // Listen for tab activation to reload context
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        // When user switches tab, reload content for that tab
        loadSettingsAndContent();
    });
    
    // --- LOAD DATA ---
    function loadSettingsAndContent() {
        // Load Settings
        chrome.storage.sync.get(['geminiApiKeys', 'geminiApiKey', 'userPersona', 'systemPrompt', 'outputLanguage', 'enableWebSearch', 'ttsEngine'], (res) => {
            apiKeys = res.geminiApiKeys || (res.geminiApiKey ? [res.geminiApiKey] : []);
            userPersona = res.userPersona || "";
            systemPrompt = res.systemPrompt || "";
            outputLanguage = res.outputLanguage || "Vietnamese";
            if (res.enableWebSearch !== undefined) enableWebSearchCheckbox.checked = res.enableWebSearch;
            if (res.ttsEngine) ttsEngineSelect.value = res.ttsEngine;
            
            if (apiKeys.length === 0) {
                addSystemMessage("⚠️ Chưa có API Key. Vui lòng cài đặt trong Popup.");
            }
        });

        // Identify current tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs[0]) return;
            const tabId = tabs[0].id;
            const currentUrl = tabs[0].url; // Local var first
            
            // 1. Load Tab-Specific Context Menu State
            const sidebarKey = `sidebar_state_${tabId}`;
            chrome.storage.local.get([sidebarKey, 'fullPageContent', 'currentTabUrl', 'currentTabTitle'], (res) => {
                const sidebarState = res[sidebarKey];
                
                // Update global vars
                // Note: fullPageContent might still be global if we didn't refactor content.js saving.
                // But let's check if we have better persistence.
                // ideally content.js should save to `content_${tabId}`.
                // For now, we rely on sidebarState for 'actions' and global for 'page content' (which updates on switch).
                // Actually, if we switch tabs, 'fullPageContent' in storage might be from previous tab if content script didn't run yet.
                // But content script runs on load.
                
                // Let's rely on sidebarState if available for immediate actions.
                if (sidebarState) {
                    if (sidebarState.chatMode === 'vision_capture_ready' && sidebarState.capturedScreenshot) {
                         handleVisionState(sidebarState, tabId);
                    } else if (sidebarState.chatMode === 'summary_display' && sidebarState.summaryFromContextMenu) {
                         contentSummary.textContent = sidebarState.summaryFromContextMenu;
                         contentSummary.classList.add('open');
                         summaryIcon.textContent = '▲';
                         // Persistence: We don't remove it here, so it stays.
                         // But if we switch tabs, we load other state.
                    } else if (['selection_processing', 'explain_processing', 'translate_processing'].includes(sidebarState.chatMode)) {
                         handleSelectionState(sidebarState, tabId);
                    }
                }
                
                // 2. Load General Content
                // We should use `currentTabUrl` from the TAB, not storage, to key history.
                window.currentTabUrl = currentUrl;
                window.currentTabTitle = tabs[0].title;
                
                // Load History for this URL
                loadHistory(); 
                
                // Check if we have content
                if (res.fullPageContent && res.currentTabUrl === currentUrl) {
                    pageContent = res.fullPageContent;
                } else {
                    // Try to get content?
                }
            });
        });
    }

    function handleVisionState(state, tabId) {
        // Only add if not already in history (simplified check)
        // Ideally we check if last message is this image?
        // But for now, we just show it.
        addMessageToUI('ai', 'Đã chụp màn hình! Bạn muốn hỏi gì về hình ảnh này?');
        const imgDiv = document.createElement('div');
        imgDiv.className = 'chat-message ai-message';
        imgDiv.innerHTML = `<div class="message-content"><img src="${state.capturedScreenshot}" style="max-width: 100%; border-radius: 8px;"></div>`;
        chatContainer.appendChild(imgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        window.pendingImage = state.capturedScreenshot;
        
        // Consume mode to avoid re-adding on reload?
        // Actually, if user switches tabs and back, we might re-add it.
        // We should check if we already handled it.
        // Or remove from storage.
        chrome.storage.local.remove(`sidebar_state_${tabId}`);
    }
    
    function handleSelectionState(state, tabId) {
         if (state.chatMode === 'selection_processing') {
            contentSummary.textContent = "Đang tóm tắt đoạn văn bản đã chọn...";
            contentSummary.classList.add('open');
            summarizeSelection(state.selectedText);
         } else if (state.chatMode === 'explain_processing') {
            const userMsg = `Giải thích: "${state.selectedText}"`;
            const prompt = `Giải thích chi tiết ý nghĩa của đoạn văn/từ ngữ sau trong ngữ cảnh bài viết: "${state.selectedText}". Trả lời bằng ngôn ngữ: ${outputLanguage}.`;
            processContextAction(userMsg, prompt);
         } else if (state.chatMode === 'translate_processing') {
            const userMsg = `Dịch: "${state.selectedText}"`;
            const prompt = `Dịch đoạn văn sau sang Tiếng Việt (hoặc ngôn ngữ đích là ${outputLanguage} nếu được yêu cầu): "${state.selectedText}"`;
            processContextAction(userMsg, prompt);
         }
         // Consume mode
         chrome.storage.local.remove(`sidebar_state_${tabId}`);
    }
    
    // ... (Old loadSettingsAndContent removed/replaced)

    async function processContextAction(userMsg, prompt) {
        addMessageToUI('user', userMsg);
        chatHistory.push({ role: 'user', content: userMsg });
        
        // Show Loading
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai-message';
        loadingDiv.innerHTML = '<div class="message-content">⏳ Đang xử lý...</div>';
        chatContainer.appendChild(loadingDiv);
        
        try {
            if (userPersona) prompt += `\nPhong cách: ${userPersona}`;
            const response = await callGeminiWithRotation(prompt);
            
            loadingDiv.remove();
            addMessageToUI('ai', response);
            chatHistory.push({ role: 'model', content: response });
            saveHistory();
        } catch (error) {
            loadingDiv.remove();
            addMessageToUI('ai', `Lỗi: ${error.message}`);
        }
    }

    async function summarizeSelection(text) {
        contentSummary.textContent = "Đang tóm tắt đoạn văn bản...";
        try {
            let prompt = `Tóm tắt đoạn văn bản sau một cách ngắn gọn (khoảng 2-3 câu). Trả lời bằng ngôn ngữ: ${outputLanguage}. \n\n"${text}"`;
            if (userPersona) prompt += `\nPhong cách: ${userPersona}`;
            
            const summary = await callGeminiWithRotation(prompt);
            contentSummary.textContent = summary;
            
            // Add to chat history as a Q&A
            addMessageToUI('user', `Tóm tắt đoạn: "${text.substring(0, 50)}..."`);
            addMessageToUI('ai', summary);
            chatHistory.push({ role: 'user', content: `Tóm tắt đoạn: "${text}"` });
            chatHistory.push({ role: 'model', content: summary });
            saveHistory();
            
        } catch (error) {
            contentSummary.textContent = `Lỗi tóm tắt: ${error.message}`;
        }
    }

    function getHistoryHash(url) {
        if (!url) return 'default';
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    function getHistoryKey() {
        return 'chatHistory_' + getHistoryHash(currentTabUrl);
    }
    
    function getSummaryKey() {
        return 'summary_' + getHistoryHash(currentTabUrl);
    }

    function loadHistory() {
        const key = getHistoryKey();
        chrome.storage.local.get([key], (res) => {
            const history = res[key] || [];
            if (history.length > 0) {
                chatHistory = history;
                chatHistory.forEach(msg => addMessageToUI(msg.role, msg.content));
            } else {
                // Welcome message
                addSystemMessage(`Xin chào! Tôi có thể giúp gì về nội dung trang "${currentTabTitle}"?`);
            }
        });
    }

    function saveHistory() {
        const key = getHistoryKey();
        // Limit history to last 50 messages to save space
        const toSave = chatHistory.slice(-50);
        const data = {};
        data[key] = toSave;
        chrome.storage.local.set(data);
    }

    // --- UI LOGIC ---
    function setupEventListeners() {
        // Toggle Summary
        toggleSummary.addEventListener('click', () => {
            contentSummary.classList.toggle('open');
            summaryIcon.textContent = contentSummary.classList.contains('open') ? '▲' : '▼';
        });

        // Input Auto-resize
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = 'auto';
        });

        // Send Message
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        sendBtn.addEventListener('click', sendMessage);

        // Exports
        exportTxtBtn.addEventListener('click', () => exportChat('txt'));
        exportDocxBtn.addEventListener('click', () => exportChat('doc'));
        if(exportMdBtn) exportMdBtn.addEventListener('click', () => exportChat('md'));
        if(exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportChat('json'));
        
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm("Xóa toàn bộ lịch sử chat của trang này?")) {
                chatHistory = [];
                chatContainer.innerHTML = '';
                const key = getHistoryKey();
                chrome.storage.local.remove(key);
                addSystemMessage("Đã xóa lịch sử chat.");
            }
        });

        // Capture
        captureAreaBtn.addEventListener('click', startCapture);
        
        // Mindmap
        if(mindmapBtn) mindmapBtn.addEventListener('click', generateMindmap);
        
        // Upload File
        if(uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileUpload);
        }

        // TTS Controls
        playPauseBtn.addEventListener('click', () => toggleTTS(contentSummary.textContent));
        stopBtn.addEventListener('click', stopTTS);
    }

    function addMessageToUI(role, content) {
        const div = document.createElement('div');
        div.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = role === 'ai' ? renderMarkdown(content) : escapeHtml(content);
        
        // Actions for AI message
        if (role === 'ai' || role === 'assistant') {
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            const readBtn = document.createElement('button');
            readBtn.textContent = '🔊 Đọc';
            readBtn.onclick = () => toggleTTS(content);
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋 Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content);
                copyBtn.textContent = '✅ Đã copy';
                setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
            };
            
            actions.appendChild(readBtn);
            actions.appendChild(copyBtn);
            div.appendChild(actions);
        }

        div.appendChild(contentDiv);
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.fontSize = '12px';
        div.style.color = '#888';
        div.style.margin = '10px 0';
        div.textContent = text;
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- CORE LOGIC ---

    async function sendMessage(text = null) { // Updated signature
        if (!text) text = chatInput.value.trim();
        if (!text) return;
        
        if (apiKeys.length === 0) {
            alert("Vui lòng nhập API Key trong phần Cài đặt.");
            return;
        }

        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Add User Message
        addMessageToUI('user', text);
        chatHistory.push({ role: 'user', content: text });
        saveHistory();

        // Show Loading
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai-message';
        loadingDiv.innerHTML = '<div class="message-content">⏳ Đang suy nghĩ...</div>';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            // Prepare Prompt
            let prompt = `Bạn là trợ lý AI hữu ích. `;
            if (userPersona) prompt += `Người dùng là: ${userPersona}. Hãy trả lời phù hợp với vai trò này. `;
            if (systemPrompt) prompt += `${systemPrompt}. `;
            prompt += `Hãy trả lời bằng ngôn ngữ: ${outputLanguage}. `;
            
            prompt += `Dựa vào nội dung trang web dưới đây:\n\n"""${pageContent.substring(0, 30000)}"""\n\n`; // Limit content size
            
            // Web Search Logic check
            if (enableWebSearchCheckbox.checked) {
                // Simple heuristic: check if question asks for recent info
                // For now, we rely on the user setting. If checked, we append instruction.
                prompt += `Nếu nội dung trang không đủ để trả lời, bạn có thể sử dụng kiến thức bên ngoài (Web Search) để bổ sung. `;
            } else if (!allowExternalKnowledgeCheckbox.checked) {
                prompt += `Chỉ trả lời dựa trên nội dung trang web được cung cấp. `;
            }

            // Chat History
            const historyPrompt = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Model'}: ${m.content}`).join('\n');
            prompt += `\nLịch sử chat:\n${historyPrompt}\n\nUser: ${text}\nModel:`;

            // Call API with Rotation
            let response;
            if (window.pendingImage) {
                // Vision Request
                response = await callGeminiVisionWithRotation(prompt, window.pendingImage);
                window.pendingImage = null; // Clear after use
            } else {
                response = await callGeminiWithRotation(prompt);
            }
            
            // Remove Loading
            loadingDiv.remove();
            
            // Add AI Message
            addMessageToUI('ai', response);
            chatHistory.push({ role: 'model', content: response });
            saveHistory();

        } catch (error) {
            loadingDiv.remove();
            addSystemMessage(`❌ Lỗi: ${error.message}`);
        }
    }

    async function summarizeContent() {
        contentSummary.textContent = "Đang tóm tắt...";
        try {
            let prompt = `Tóm tắt nội dung trang web này một cách ngắn gọn, súc tích (khoảng 3-5 câu). `;
            prompt += `Hãy làm nổi bật (bôi đậm bằng Markdown) các từ khóa quan trọng. `;
            prompt += `Sau khi tóm tắt, hãy đề xuất 3 câu hỏi ngắn gọn mà người dùng có thể muốn hỏi tiếp, định dạng theo JSON: {"summary": "...", "questions": ["Q1", "Q2", "Q3"]}. `;
            prompt += `Trả lời bằng ngôn ngữ: ${outputLanguage}. `;
            
            if (userPersona) prompt += `Phong cách tóm tắt phù hợp cho: ${userPersona}.`;
            prompt += `\n\nNội dung:\n"""${pageContent.substring(0, 20000)}"""`; // Limit for summary

            const rawResponse = await callGeminiWithRotation(prompt);
            
            // Parse JSON if possible, else fallback
            let summaryText = rawResponse;
            let questions = [];
            
            try {
                // Try to extract JSON block
                const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    summaryText = data.summary;
                    questions = data.questions || [];
                }
            } catch (e) {
                console.warn("Could not parse summary JSON", e);
            }

            contentSummary.innerHTML = renderMarkdown(summaryText);
            
            // Render suggestions
            if (questions.length > 0) {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.style.marginTop = '10px';
                suggestionDiv.style.display = 'flex';
                suggestionDiv.style.flexWrap = 'wrap';
                suggestionDiv.style.gap = '5px';
                
                questions.forEach(q => {
                    const btn = document.createElement('button');
                    btn.textContent = q;
                    btn.className = 'tool-btn'; // reuse class
                    btn.style.border = '1px solid #ddd';
                    btn.style.fontSize = '12px';
                    btn.onclick = () => sendMessage(q);
                    suggestionDiv.appendChild(btn);
                });
                contentSummary.appendChild(suggestionDiv);
            }
            
            // Save Summary
            const key = getSummaryKey();
            const data = {};
            // We save raw HTML/Text or structured? 
            // Saving raw text loses buttons.
            // Let's save the HTML content of summary div? Or simpler: save text and questions separately.
            // For simplicity/compatibility, just save the text summary for now. 
            // Or better: store object.
            data[key] = summaryText; // Just text for now to avoid complexity with persistence of buttons
            chrome.storage.local.set(data);
        } catch (error) {
            contentSummary.textContent = `Không thể tóm tắt: ${error.message}`;
        }
    }

    async function callGeminiVisionWithRotation(prompt, base64Image) {
        // Strip prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
        
        let lastError = null;
        for (const key of apiKeys) {
            if (!key) continue;
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: "image/png", data: cleanBase64 } }
                            ]
                        }]
                    })
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || response.statusText);
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.warn(`Key ...${key.slice(-4)} failed:`, error);
                lastError = error;
            }
        }
        throw new Error("Vision API failed: " + (lastError ? lastError.message : "Unknown"));
    }

    async function callGeminiWithRotation(prompt) {
        let lastError = null;
        for (const key of apiKeys) {
            if (!key) continue;
            try {
                return await callGeminiSingle(key, prompt);
            } catch (error) {
                console.warn(`Key ...${key.slice(-4)} failed:`, error);
                lastError = error;
                // If it's a safety error, maybe don't retry? But generic retry is safer.
            }
        }
        throw new Error("Tất cả API Key đều bị lỗi. Vui lòng kiểm tra lại key hoặc quota. Lỗi cuối: " + (lastError ? lastError.message : "Unknown"));
    }

    async function callGeminiSingle(apiKey, prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || response.statusText);
        }
        return data.candidates[0].content.parts[0].text;
    }

    // --- EXPORT ---
    function exportChat(format) {
        if (chatHistory.length === 0) {
            alert("Chưa có nội dung chat để xuất.");
            return;
        }
        
        let content = "";
        let filename = "chat_log";
        let mimeType = "text/plain";

        if (format === 'txt') {
            content = `CHAT LOG - ${currentTabTitle}\nURL: ${currentTabUrl}\nDate: ${new Date().toLocaleString()}\n\n`;
            chatHistory.forEach(msg => {
                content += `[${msg.role === 'user' ? 'YOU' : 'AI'}]: ${msg.content}\n\n`;
            });
            filename += ".txt";
        } else if (format === 'doc') {
            mimeType = "application/msword";
            filename += ".doc";
            content = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>${currentTabTitle}</title></head>
                <body>
                    <h1>Chat Log: ${currentTabTitle}</h1>
                    <p><a href="${currentTabUrl}">${currentTabUrl}</a></p>
                    <p><i>${new Date().toLocaleString()}</i></p>
                    <hr/>
                    ${chatHistory.map(msg => `
                        <div style="margin-bottom: 15px; padding: 10px; background: ${msg.role === 'user' ? '#e8f0fe' : '#f1f3f4'}; border-radius: 5px;">
                            <strong>${msg.role === 'user' ? 'YOU' : 'AI'}:</strong>
                            <div style="white-space: pre-wrap;">${msg.content.replace(/\n/g, '<br>')}</div>
                        </div>
                    `).join('')}
                </body></html>`;
        } else if (format === 'md') {
            filename += ".md";
            content = `# Chat Log: ${currentTabTitle}\nURL: ${currentTabUrl}\nDate: ${new Date().toLocaleString()}\n\n---\n\n`;
            chatHistory.forEach(msg => {
                content += `### ${msg.role === 'user' ? 'YOU' : 'AI'}\n${msg.content}\n\n`;
            });
        } else if (format === 'json') {
            mimeType = "application/json";
            filename += ".json";
            content = JSON.stringify({
                title: currentTabTitle,
                url: currentTabUrl,
                date: new Date().toISOString(),
                history: chatHistory
            }, null, 2);
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- CAPTURE ---
    function startCapture() {
        // Trigger capture in main page
        // Since we are in a sidebar/popup, we need to communicate with background or content script.
        // We can send message to runtime.
        chrome.runtime.sendMessage({ type: 'START_CAPTURE_AREA' }, (response) => {
           if (chrome.runtime.lastError) {
               addSystemMessage("Lỗi khởi động chụp: " + chrome.runtime.lastError.message);
           } else {
               // Capture started, UI might close if it's a popup, but Sidebar stays open.
               // If popup, it closes, but overlay appears.
           }
        });
    }

    // --- FILE UPLOAD ---
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai-message';
        loadingDiv.innerHTML = `<div class="message-content">📂 Đang đọc file: ${file.name}...</div>`;
        chatContainer.appendChild(loadingDiv);
        
        try {
            let text = "";
            if (file.type === "application/pdf") {
                // PDF processing requires a library like pdf.js. 
                // Since we cannot easily include external libs in this environment without complex setup,
                // we will fallback to text/plain or ask user to copy paste for now, or assume text extraction.
                // However, Chrome has a built-in PDF viewer but not an API to extract text directly from file object easily without libs.
                // Alternative: Use Gemini 1.5 Flash native PDF support via API (Multimodal).
                // Gemini API supports PDF upload via File API but requires uploading to Google File API first (File Manager).
                // For direct "inline_data" (base64), only images are supported well. PDF support via base64 is limited/experimental in some endpoints.
                // Let's try basic text reading for now or warn.
                
                // Real implementation would use pdf.js. 
                // As a fallback/placeholder for this exercise:
                loadingDiv.innerHTML = `<div class="message-content">⚠️ Hiện tại chưa hỗ trợ đọc trực tiếp file PDF trong tiện ích (cần thư viện ngoài). Vui lòng copy văn bản từ PDF và dán vào đây, hoặc dùng file .txt/.md.</div>`;
                return;
            } else {
                // Text file
                text = await file.text();
            }
            
            loadingDiv.remove();
            
            // Add file content to chat context
            addMessageToUI('user', `[Đã tải lên file: ${file.name}]`);
            chatHistory.push({ role: 'user', content: `[User uploaded file: ${file.name}]\n\nContent:\n${text.substring(0, 30000)}` });
            
            // Ask AI to summarize the file
            const prompt = `Tôi vừa tải lên file "${file.name}". Hãy tóm tắt nội dung chính của file này. Trả lời bằng ngôn ngữ: ${outputLanguage}. \n\nNội dung file:\n"""${text.substring(0, 30000)}"""`;
            
            const aiLoading = document.createElement('div');
            aiLoading.className = 'chat-message ai-message';
            aiLoading.innerHTML = '<div class="message-content">⏳ Đang phân tích file...</div>';
            chatContainer.appendChild(aiLoading);
            
            const response = await callGeminiWithRotation(prompt);
            aiLoading.remove();
            addMessageToUI('ai', response);
            chatHistory.push({ role: 'model', content: response });
            saveHistory();
            
        } catch (error) {
            loadingDiv.remove();
            addSystemMessage(`❌ Lỗi đọc file: ${error.message}`);
        } finally {
            fileInput.value = ''; // Reset
        }
    }

    // --- MINDMAP ---
    async function generateMindmap() {
        if (!pageContent) {
            addSystemMessage("⚠️ Chưa có nội dung để tạo Mindmap.");
            return;
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai-message';
        loadingDiv.innerHTML = '<div class="message-content">🧠 Đang tạo sơ đồ tư duy...</div>';
        chatContainer.appendChild(loadingDiv);
        
        try {
            let prompt = `Dựa vào nội dung trang web, hãy tạo sơ đồ tư duy (Mindmap) dưới dạng code Mermaid.js. 
            Yêu cầu:
            1. Sử dụng cú pháp 'graph TD' hoặc 'mindmap'.
            2. Chỉ trả về khối code Mermaid, không kèm lời dẫn.
            3. Nội dung ngắn gọn, súc tích.
            4. Ngôn ngữ: ${outputLanguage}.
            
            Nội dung: """${pageContent.substring(0, 15000)}"""`;
            
            const response = await callGeminiWithRotation(prompt);
            
            loadingDiv.remove();
            
            // Extract Mermaid code
            let mermaidCode = response;
            const match = response.match(/```mermaid([\s\S]*?)```/);
            if (match) mermaidCode = match[1].trim();
            else {
                // Try to cleanup if no code blocks
                mermaidCode = response.replace(/```/g, '').trim();
            }
            
            addMessageToUI('ai', `Đây là sơ đồ tư duy (bạn có thể copy vào [Mermaid Live Editor](https://mermaid.live/)):\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\``);
            chatHistory.push({ role: 'model', content: `[Mermaid Code Generated]` });
            saveHistory();
            
            // TODO: Auto render if we can inject mermaid library
            // For now, we display code.
            
        } catch (error) {
            loadingDiv.remove();
            addMessageToUI('ai', `Lỗi tạo Mindmap: ${error.message}`);
        }
    }

    // --- HELPERS ---
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
    }

    function renderMarkdown(text) {
        if (!text) return '';
        // Basic Markdown parser
        let html = escapeHtml(text);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        return html;
    }

    // --- TTS (Enhanced) ---
    function toggleTTS(text) {
        if (ttsState.isPlaying) {
            stopTTS();
        } else {
            startBrowserTTS(text);
        }
    }
    
    function startBrowserTTS(text) {
        if (!text) return;
        stopTTS(); // Ensure previous is stopped
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Voice Selection
        const selectedVoiceIndex = ttsVoiceSelect.value;
        if (selectedVoiceIndex && availableVoices[selectedVoiceIndex]) {
            utterance.voice = availableVoices[selectedVoiceIndex];
        } else {
            // Auto-select Vietnamese voice if available and output is Vietnamese
            if (outputLanguage === 'Vietnamese') {
                const viVoice = availableVoices.find(v => v.lang.includes('vi'));
                if (viVoice) utterance.voice = viVoice;
            }
        }
        
        // Speed Control
        utterance.rate = parseFloat(ttsSpeedInput.value) || 1.0;
        
        utterance.onend = () => { ttsState.isPlaying = false; };
        utterance.onerror = (e) => { console.error("TTS Error:", e); ttsState.isPlaying = false; };
        
        window.speechSynthesis.speak(utterance);
        ttsState.isPlaying = true;
        ttsState.utterance = utterance;
    }

    function stopTTS() {
        window.speechSynthesis.cancel();
        ttsState.isPlaying = false;
        ttsState.utterance = null;
    }
});