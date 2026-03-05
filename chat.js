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
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const captureAreaBtn = document.getElementById('captureAreaBtn');
    
    // Settings
    const enableWebSearchCheckbox = document.getElementById('enableWebSearch');
    const allowExternalKnowledgeCheckbox = document.getElementById('allowExternalKnowledge');
    const ttsEngineSelect = document.getElementById('ttsEngine');
    
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
    
    // TTS State
    let ttsState = { isPlaying: false, isPaused: false, utterance: null, audioContext: null, audioSource: null };

    // --- INITIALIZATION ---
    loadSettingsAndContent();
    setupEventListeners();

    // --- LOAD DATA ---
    function loadSettingsAndContent() {
        // Load Settings
        chrome.storage.sync.get(['geminiApiKeys', 'geminiApiKey', 'userPersona', 'systemPrompt', 'enableWebSearch', 'ttsEngine'], (res) => {
            apiKeys = res.geminiApiKeys || (res.geminiApiKey ? [res.geminiApiKey] : []);
            userPersona = res.userPersona || "";
            systemPrompt = res.systemPrompt || "";
            if (res.enableWebSearch !== undefined) enableWebSearchCheckbox.checked = res.enableWebSearch;
            if (res.ttsEngine) ttsEngineSelect.value = res.ttsEngine;
            
            if (apiKeys.length === 0) {
                addSystemMessage("⚠️ Chưa có API Key. Vui lòng cài đặt trong Popup.");
            }
        });

        // Load Content & History
        chrome.storage.local.get(['fullPageContent', 'currentTabUrl', 'currentTabTitle'], (res) => {
            if (res.fullPageContent) {
                pageContent = res.fullPageContent;
                currentTabUrl = res.currentTabUrl || "";
                currentTabTitle = res.currentTabTitle || "Trang Web";
                
                // Summarize immediately
                if (apiKeys.length > 0) summarizeContent();
                
                // Load specific history
                loadHistory();
            } else {
                contentSummary.textContent = "Không tìm thấy nội dung trang.";
                addSystemMessage("⚠️ Không tìm thấy nội dung. Vui lòng tải lại trang và thử lại.");
            }
        });
    }

    function getHistoryKey() {
        // Create a safe key from URL
        // Simple hash or encoding. Using encodeURIComponent might be too long.
        // Let's use a simple hash function for brevity, or just btoa but truncate if too long.
        // Chrome storage keys are strings. 
        if (!currentTabUrl) return 'chatHistory_default';
        let hash = 0;
        for (let i = 0; i < currentTabUrl.length; i++) {
            const char = currentTabUrl.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'chatHistory_' + Math.abs(hash);
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

    async function sendMessage() {
        const text = chatInput.value.trim();
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
            const response = await callGeminiWithRotation(prompt);
            
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
            let prompt = "Tóm tắt nội dung trang web này một cách ngắn gọn, súc tích (khoảng 3-5 câu). ";
            if (userPersona) prompt += `Phong cách tóm tắt phù hợp cho: ${userPersona}.`;
            prompt += `\n\nNội dung:\n"""${pageContent.substring(0, 20000)}"""`; // Limit for summary

            const summary = await callGeminiWithRotation(prompt);
            contentSummary.textContent = summary;
        } catch (error) {
            contentSummary.textContent = `Không thể tóm tắt: ${error.message}`;
        }
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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

    // --- TTS (Simplified) ---
    function toggleTTS(text) {
        if (ttsState.isPlaying) {
            stopTTS();
        } else {
            // Start TTS
            if (ttsEngineSelect.value === 'browser') {
                ttsState.utterance = new SpeechSynthesisUtterance(text);
                ttsState.utterance.lang = 'vi-VN';
                ttsState.utterance.onend = () => { ttsState.isPlaying = false; };
                window.speechSynthesis.speak(ttsState.utterance);
                ttsState.isPlaying = true;
            } else {
                // Call Background/Popup for Google TTS?
                // For simplicity in this refactor, sticking to Browser TTS or Basic Local.
                // Google TTS requires API call logic similar to Popup.
                alert("Hiện tại Chat chỉ hỗ trợ Browser TTS trong phiên bản này. Vui lòng sử dụng Popup cho Google TTS.");
                startBrowserTTS(text);
            }
        }
    }
    
    function startBrowserTTS(text) {
        ttsState.utterance = new SpeechSynthesisUtterance(text);
        ttsState.utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(ttsState.utterance);
        ttsState.isPlaying = true;
    }

    function stopTTS() {
        window.speechSynthesis.cancel();
        ttsState.isPlaying = false;
    }
});