document.addEventListener('DOMContentLoaded', function () {
    // --- UI ELEMENTS ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const summarizeBtn = document.getElementById('summarizeBtn');
    const chatBtn = document.getElementById('chatBtn');
    const captureBtn = document.getElementById('captureBtn');
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultBox = document.getElementById('result-box');
    
    // Settings
    const keysContainer = document.getElementById('keysContainer');
    const addKeyBtn = document.getElementById('addKeyBtn');
    const saveKeysBtn = document.getElementById('saveKeysBtn');
    const userPersonaInput = document.getElementById('userPersona');
    const outputLanguageSelect = document.getElementById('outputLanguage');
    const systemPromptInput = document.getElementById('systemPrompt');
    const savePersonaBtn = document.getElementById('savePersonaBtn');
    const enableWebSearchCheckbox = document.getElementById('enableWebSearch');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    // TTS
    const ttsEngineSelect = document.getElementById('ttsEngine');
    const googleTtsApiKeyInput = document.getElementById('googleTtsApiKey');
    const saveGoogleTtsBtn = document.getElementById('saveGoogleTtsBtn');
    const googleTtsSection = document.getElementById('googleTtsSection');

    // State
    let fullPageContent = '';
    let port = null;

    // --- INITIALIZATION ---
    initTabs();
    loadSettings();
    injectContentScript();
    ensureConnected();
    restorePopupState();

    // --- STATE RESTORATION ---
    function restorePopupState() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
             const tabId = tabs[0] ? tabs[0].id : null;
             if (!tabId) return;
             
             const storageKey = `popup_state_${tabId}`;
             chrome.storage.local.get([storageKey], (res) => {
                 const state = res[storageKey];
                 if (state) {
                     if (state.result) {
                         resultBox.textContent = state.result;
                         resultBox.style.color = '#333';
                         summarizeBtn.textContent = '📝 Tóm tắt trang này';
                         summarizeBtn.disabled = false;
                     }
                     if (state.isLoading) {
                         summarizeBtn.disabled = true;
                         summarizeBtn.textContent = '⏳ Đang xử lý...';
                         showStatus(state.status || '🔄 Đang xử lý...', 'info');
                     }
                 }
             });
        });
    }

    function savePopupState(isLoading, status, result) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
             const tabId = tabs[0] ? tabs[0].id : null;
             if (!tabId) return;
             
             const storageKey = `popup_state_${tabId}`;
             const data = {
                 isLoading: isLoading
             };
             if (status) data.status = status;
             if (result) data.result = result;
             
             chrome.storage.local.set({ [storageKey]: data });
        });
    }

    // --- TAB LOGIC ---
    function initTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }

    // --- SETTINGS LOGIC ---
    function loadSettings() {
        chrome.storage.sync.get([
            'geminiApiKey', 'geminiApiKeys', 
            'userPersona', 'systemPrompt', 
            'enableWebSearch', 'ttsEngine', 'googleTtsConfig'
        ], function (res) {
            // 1. API Keys (Migration & Display)
            let keys = res.geminiApiKeys || [];
            if (keys.length === 0 && res.geminiApiKey) {
                keys = [res.geminiApiKey]; // Migrate legacy key
                chrome.storage.sync.set({ geminiApiKeys: keys });
            }
            if (keys.length === 0) keys = ['']; // Empty slot
            renderKeyInputs(keys);

            // 2. Persona & Prompt & Language
            if (res.userPersona) userPersonaInput.value = res.userPersona;
            if (res.outputLanguage) outputLanguageSelect.value = res.outputLanguage;
            if (res.systemPrompt) systemPromptInput.value = res.systemPrompt;

            // 3. Web Search
            enableWebSearchCheckbox.checked = res.enableWebSearch !== false;

            // 4. TTS
            if (res.ttsEngine) ttsEngineSelect.value = res.ttsEngine;
            toggleGoogleTtsSection();
            if (res.googleTtsConfig) googleTtsApiKeyInput.value = res.googleTtsConfig.apiKey || '';
        });
    }

    function renderKeyInputs(keys) {
        keysContainer.innerHTML = '';
        keys.forEach((key, index) => {
            addKeyInput(key, index === 0); // First one cannot be removed if it's the only one? No, allow flexible.
        });
    }

    function addKeyInput(value = '', isFirst = false) {
        const div = document.createElement('div');
        div.className = 'key-item';
        
        const input = document.createElement('input');
        input.type = 'password';
        input.placeholder = isFirst ? 'Nhập Gemini API Key chính...' : 'Nhập Key dự phòng...';
        input.value = value;
        input.className = 'api-key-input';
        
        const btn = document.createElement('button');
        btn.className = 'key-remove';
        btn.innerHTML = '×';
        btn.title = 'Xóa key này';
        btn.onclick = () => div.remove();
        
        div.appendChild(input);
        div.appendChild(btn);
        keysContainer.appendChild(div);
    }

    addKeyBtn.addEventListener('click', () => {
        const currentInputs = document.querySelectorAll('.api-key-input');
        if (currentInputs.length >= 10) {
            alert('Tối đa 10 API Key.');
            return;
        }
        addKeyInput();
    });

    saveKeysBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.api-key-input');
        const keys = [];
        const seen = new Set();
        
        inputs.forEach(input => {
            const val = input.value.trim();
            if (val && !seen.has(val)) {
                keys.push(val);
                seen.add(val);
            }
        });

        if (keys.length === 0) {
            alert('Vui lòng nhập ít nhất 1 API Key.');
            return;
        }

        chrome.storage.sync.set({ geminiApiKeys: keys, geminiApiKey: keys[0] }, () => { // Sync legacy key for compatibility
            showStatus('Đã lưu danh sách API Key!', 'success');
        });
    });

    savePersonaBtn.addEventListener('click', () => {
        chrome.storage.sync.set({
            userPersona: userPersonaInput.value.trim(),
            outputLanguage: outputLanguageSelect.value,
            systemPrompt: systemPromptInput.value.trim()
        }, () => {
            showStatus('Đã lưu thông tin cá nhân hóa!', 'success');
        });
    });

    enableWebSearchCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({ enableWebSearch: this.checked });
    });

    // TTS Settings
    ttsEngineSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ ttsEngine: this.value });
        toggleGoogleTtsSection();
    });

    saveGoogleTtsBtn.addEventListener('click', function() {
        const config = { apiKey: googleTtsApiKeyInput.value.trim() };
        chrome.storage.sync.set({ googleTtsConfig: config }, () => {
            showStatus('Đã lưu Google TTS Key!', 'success');
        });
    });

    function toggleGoogleTtsSection() {
        googleTtsSection.style.display = ttsEngineSelect.value === 'google' ? 'block' : 'none';
    }

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Bạn chắc chắn muốn xóa toàn bộ dữ liệu và cài đặt?')) {
            chrome.storage.sync.clear();
            chrome.storage.local.clear();
            location.reload();
        }
    });

    // --- MAIN FEATURES ---

    function showStatus(msg, type = 'info') {
        resultBox.textContent = msg;
        if (type === 'error') resultBox.style.color = 'red';
        else if (type === 'success') resultBox.style.color = 'green';
        else resultBox.style.color = '#333';
    }

    function injectContentScript() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['Readability.js', 'content.js']
                }).catch(err => console.log("Inject error:", err));
            }
        });
    }

    // Message Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "CONTENT_RESULT") {
            fullPageContent = request.content;
            showStatus("Đã lấy nội dung. Sẵn sàng!");
            summarizeBtn.disabled = false;
        } else if (request.type === "SUMMARY_RESULT") {
            summarizeBtn.disabled = false;
            summarizeBtn.textContent = '📝 Tóm tắt trang này';
            if (request.success) {
                resultBox.style.color = '#333';
                resultBox.textContent = request.summary;
                // Save result state
                savePopupState(false, null, request.summary);
            } else {
                showStatus(`Lỗi: ${request.error}`, 'error');
                savePopupState(false, `Lỗi: ${request.error}`, null);
            }
        } else if (request.type === "TTS_RESULT") {
            if (request.success) {
                playAudioFromBase64(request.audioData);
            } else {
                showStatus(`Lỗi đọc: ${request.error}`, 'error');
                resetPlayButton();
            }
        }
    });

    // Summarize Button
    summarizeBtn.addEventListener('click', () => {
        stopReading();
        
        chrome.storage.sync.get(['geminiApiKeys', 'geminiApiKey', 'userPersona', 'systemPrompt'], function (result) {
            const keys = result.geminiApiKeys || (result.geminiApiKey ? [result.geminiApiKey] : []);
            
            if (keys.length === 0) {
                showStatus('Vui lòng nhập API Key trong phần Cài đặt.', 'error');
                document.querySelector('[data-tab="settings"]').click();
                return;
            }

            if (!fullPageContent) {
                showStatus("Chưa lấy được nội dung trang. Vui lòng thử lại hoặc reload trang.", 'error');
                return;
            }

            summarizeBtn.disabled = true;
            summarizeBtn.textContent = '⏳ Đang xử lý...';
            const statusMsg = '🔄 Đang gửi yêu cầu đến Gemini AI...\n(Sẽ tự động thử các key khác nếu lỗi)';
            showStatus(statusMsg, 'info');

            // Save loading state
            savePopupState(true, statusMsg, null);

            // Send request with all info
            const port = ensureConnected();
            // Get tabId to include in request
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const tabId = tabs[0] ? tabs[0].id : null;
                const msg = {
                    type: "SUMMARIZE_REQUEST",
                    apiKeys: keys, // Send array
                    content: fullPageContent,
                    persona: result.userPersona,
                    outputLanguage: result.outputLanguage || 'Vietnamese',
                    systemPrompt: result.systemPrompt,
                    tabId: tabId
                };
                
                if (port) port.postMessage(msg);
                else chrome.runtime.sendMessage(msg);
            });
        });
    });

    // Chat Button
    chatBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['geminiApiKeys', 'geminiApiKey'], function (result) {
            const keys = result.geminiApiKeys || (result.geminiApiKey ? [result.geminiApiKey] : []);
            
            if (keys.length === 0) {
                showStatus('Vui lòng nhập API Key trong phần Cài đặt.', 'error');
                document.querySelector('[data-tab="settings"]').click();
                return;
            }
            if (!fullPageContent) {
                showStatus("Chưa lấy được nội dung trang.", 'error');
                return;
            }

            // Save content for chat
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentTabUrl = tabs[0] ? tabs[0].url : '';
                const currentTabTitle = tabs[0] ? tabs[0].title : '';
                
                chrome.storage.local.set({ 
                    fullPageContent: fullPageContent,
                    currentTabUrl: currentTabUrl,
                    currentTabTitle: currentTabTitle,
                    chatMode: 'fullPage'
                }, function() {
                    toggleSidebarOrPopup();
                });
            });
        });
    });

    // Capture Button
    captureBtn.addEventListener('click', () => {
        // Close popup and open chat with capture mode
        chrome.storage.local.set({ chatMode: 'capture_init' }, function() {
             toggleSidebarOrPopup();
             window.close(); // Close popup to allow selection
        });
    });

    function toggleSidebarOrPopup() {
        if (chrome.sidePanel && chrome.sidePanel.open) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (!tabs[0]) return;
                const tabId = tabs[0].id;
                // Side Panel API
                // Side panel toggle is tricky. chrome.sidePanel.open opens it.
                // To toggle, we might need to check if it's open.
                // But chrome.sidePanel API doesn't expose isOpen.
                // However, we can use the behavior: if we call open, it opens.
                // The user asked "BẤM 1 LẦN MỞ, ĐANG MỞ BẤM LẦN NỮA SẼ ĐÓNG".
                // Since we can't easily detect if side panel is open for this specific tab via API (without complex state),
                // we can rely on the In-Page Sidebar fallback which is easier to toggle.
                // For native Side Panel, Chrome handles the toggle via the toolbar icon usually.
                // But from popup button... 
                // Let's try to use the in-page sidebar for better control if the user prefers that experience, 
                // OR we accept that "Chat" button just opens it.
                // BUT, if we use the In-Page Sidebar logic (iframe), we CAN toggle it.
                
                // Let's implement toggle for the In-Page Sidebar.
                // For native SidePanel, we just open it.
                chrome.sidePanel.open({ tabId }).catch(() => toggleInPageSidebar());
            });
        } else {
            toggleInPageSidebar();
        }
    }

    function toggleInPageSidebar() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs[0]) return;
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId },
                func: function (chatUrl) {
                    const SIDEBAR_ID = 'gemini-chat-sidebar';
                    const existing = document.getElementById(SIDEBAR_ID);
                    if (existing) {
                        // Toggle logic
                        if (existing.style.display === 'none') {
                            existing.style.display = 'block';
                            document.body.style.marginRight = '400px';
                        } else {
                            existing.style.display = 'none';
                            document.body.style.marginRight = '0px';
                        }
                        return;
                    }
                    
                    // 1. Resize Body to make space
                    const sidebarWidth = 400; // px
                    document.body.style.transition = 'margin-right 0.3s ease';
                    document.body.style.marginRight = sidebarWidth + 'px';
                    
                    // 2. Create Sidebar
                    const container = document.createElement('div');
                    container.id = SIDEBAR_ID;
                    Object.assign(container.style, {
                        position: 'fixed', top: '0', right: '0', height: '100vh',
                        width: sidebarWidth + 'px', background: '#fff', zIndex: '2147483647',
                        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
                    });

                    // Header
                    const header = document.createElement('div');
                    Object.assign(header.style, {
                        padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ddd',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    });
                    header.innerHTML = '<strong>Gemini Chat</strong>';
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '✕';
                    // Fix close button style
                    closeBtn.style.border = 'none'; 
                    closeBtn.style.background = 'transparent'; 
                    closeBtn.style.cursor = 'pointer'; 
                    closeBtn.style.fontSize = '18px';
                    closeBtn.style.fontWeight = 'bold';
                    closeBtn.style.color = '#555';
                    closeBtn.style.padding = '5px 10px';
                    closeBtn.style.borderRadius = '4px';
                    
                    closeBtn.onmouseover = () => { closeBtn.style.backgroundColor = '#e0e0e0'; closeBtn.style.color = '#000'; };
                    closeBtn.onmouseout = () => { closeBtn.style.backgroundColor = 'transparent'; closeBtn.style.color = '#555'; };
                    
                    closeBtn.onclick = () => {
                        container.style.display = 'none';
                        document.body.style.marginRight = '0px'; // Restore
                    };
                    header.appendChild(closeBtn);
                    
                    const iframe = document.createElement('iframe');
                    iframe.src = chatUrl;
                    iframe.style.flex = '1'; iframe.style.border = 'none'; iframe.style.width = '100%'; iframe.style.height = '100%';

                    container.appendChild(header);
                    container.appendChild(iframe);
                    document.documentElement.appendChild(container);
                },
                args: [chrome.runtime.getURL('chat.html')]
            });
        });
    }

    // --- TTS & PORT LOGIC (Keep existing mostly) ---
    function ensureConnected() {
        if (!port || port.error) {
            try {
                port = chrome.runtime.connect({name: "popup"});
                port.onMessage.addListener((message) => {
                    if (message.type === "SUMMARY_RESULT") {
                        summarizeBtn.disabled = false;
                        summarizeBtn.textContent = '📝 Tóm tắt trang này';
                        if (message.success) resultBox.textContent = message.summary;
                        else showStatus(`Lỗi: ${message.error}`, 'error');
                    } else if (message.type === "TTS_RESULT") {
                        if (message.success) playAudioFromBase64(message.audioData);
                        else { showStatus(`Lỗi đọc: ${message.error}`, 'error'); resetPlayButton(); }
                    }
                });
                port.onDisconnect.addListener(() => { port = null; });
            } catch (e) { port = null; }
        }
        return port;
    }

    // TTS Control Listeners (Same as before)
    playPauseBtn.addEventListener('click', function() {
        const textToRead = resultBox.textContent;
        if (!textToRead || textToRead.startsWith("👋")) return;
        stopReading();
        
        if (ttsEngineSelect.value === 'browser') {
            if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); playPauseBtn.textContent = '⏸️ Tạm dừng'; }
            else if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); playPauseBtn.textContent = '▶️ Tiếp tục'; }
            else startBrowserReading(textToRead);
        } else {
            // Google/Local TTS
            chrome.storage.sync.get('googleTtsConfig', function(result) {
                const config = (ttsEngineSelect.value === 'google') ? result.googleTtsConfig : { engine: 'local', languageCode: 'vi-VN' };
                if (ttsEngineSelect.value === 'google' && (!config || !config.apiKey)) {
                    showStatus("Vui lòng nhập Google TTS API Key.", 'error'); return;
                }
                
                playPauseBtn.disabled = true; playPauseBtn.textContent = '⏳...';
                const p = ensureConnected();
                const req = { type: "TTS_REQUEST", config: Object.assign({}, config, { engine: ttsEngineSelect.value }), text: textToRead };
                if (p) p.postMessage(req); else chrome.runtime.sendMessage(req);
            });
        }
    });

    stopBtn.addEventListener('click', stopReading);

    // Browser TTS Helpers
    let utterance = null;
    function startBrowserReading(text) {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.onend = resetPlayButton;
        utterance.onerror = (e) => { showStatus("Lỗi browser TTS: " + e.error, 'error'); resetPlayButton(); };
        window.speechSynthesis.speak(utterance);
        playPauseBtn.textContent = '⏸️ Tạm dừng';
    }
    function stopBrowserReading() { if (window.speechSynthesis.speaking || window.speechSynthesis.paused) window.speechSynthesis.cancel(); }
    
    // Audio Context Helpers (Same as before)
    let audioContext = null; let audioSource = null;
    function playAudioFromBase64(base64) {
        try {
            if (audioSource) audioSource.stop();
            if (audioContext) audioContext.close();
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            audioContext.decodeAudioData(bytes.buffer).then(buffer => {
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(audioContext.destination);
                audioSource.start(0);
                playPauseBtn.textContent = '⏹️ Dừng'; playPauseBtn.disabled = false;
                audioSource.onended = resetPlayButton;
            });
        } catch (e) { showStatus("Lỗi phát audio.", 'error'); resetPlayButton(); }
    }
    function stopReading() { stopBrowserReading(); if (audioSource) { audioSource.stop(); audioSource = null; } resetPlayButton(); }
    function resetPlayButton() { playPauseBtn.textContent = '▶️ Đọc'; playPauseBtn.disabled = false; }
});