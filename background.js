// Hàm hỗ trợ chuyển đổi bytes sang base64
function bytesToBase64(bytes) {
  const chunkSize = 32768;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// --- CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "summarizePage", title: "Tóm tắt trang này", contexts: ["page"] });
  chrome.contextMenus.create({ id: "summarizeSelection", title: "Tóm tắt văn bản đã chọn", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "explainSelection", title: "🔍 Giải thích từ/đoạn này", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "translateSelection", title: "🌐 Dịch sang Tiếng Việt", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "captureAreaChat", title: "Chụp vùng màn hình và chat", contexts: ["page"] });
});

// Xử lý sự kiện context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizePage") {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['Readability.js', 'content.js'] })
      .then(() => chrome.action.openPopup());
  } 
  else if (["summarizeSelection", "explainSelection", "translateSelection"].includes(info.menuItemId) && info.selectionText) {
    chrome.storage.sync.get(['geminiApiKey', 'geminiApiKeys'], function(result) {
      const keys = result.geminiApiKeys || (result.geminiApiKey ? [result.geminiApiKey] : []);
      if (keys.length > 0) {
        let mode = 'selection_processing';
        if (info.menuItemId === 'explainSelection') mode = 'explain_processing';
        if (info.menuItemId === 'translateSelection') mode = 'translate_processing';

        // Save to Tab-Specific State
        const key = `sidebar_state_${tab.id}`;
        chrome.storage.local.set({ 
            [key]: {
                selectedText: info.selectionText, 
                chatMode: mode 
            }
        }, function() {
          // Open Sidebar directly, let chat.js handle the prompt
          if (chrome.sidePanel && chrome.sidePanel.open) {
              chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
                  chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
              });
          } else {
              chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
          }
        });
      } else {
        alert("Vui lòng nhập Gemini API Key trong popup.");
        chrome.action.openPopup();
      }
    });
  } 
  else if (info.menuItemId === "captureAreaChat") {
    injectCaptureOverlay(tab.id);
  }
  // ... (Other handlers kept simple or similar)
});

function injectCaptureOverlay(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function() {
      const id = 'gemini-capture-overlay';
      if (document.getElementById(id)) return;
      const overlay = document.createElement('div');
      overlay.id = id;
      Object.assign(overlay.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '2147483647', cursor: 'crosshair', background: 'rgba(0,0,0,0.05)' });
      
      const rectEl = document.createElement('div');
      Object.assign(rectEl.style, { position: 'fixed', border: '2px solid #8e44ad', background: 'rgba(142,68,173,0.15)' });
      
      let startX = 0, startY = 0, dragging = false;
      
      overlay.addEventListener('mousedown', function(e) { 
        dragging = true; startX = e.clientX; startY = e.clientY; 
        rectEl.style.left = startX + 'px'; rectEl.style.top = startY + 'px'; 
        rectEl.style.width = '0px'; rectEl.style.height = '0px'; 
        if (!rectEl.parentNode) document.body.appendChild(rectEl); 
      });
      
      overlay.addEventListener('mousemove', function(e) { 
        if (!dragging) return; 
        const x = Math.min(e.clientX, startX); const y = Math.min(e.clientY, startY); 
        const w = Math.abs(e.clientX - startX); const h = Math.abs(e.clientY - startY); 
        rectEl.style.left = x + 'px'; rectEl.style.top = y + 'px'; 
        rectEl.style.width = w + 'px'; rectEl.style.height = h + 'px'; 
      });
      
      function finish() { 
        if (!dragging) return; dragging = false; 
        const rect = { 
          x: parseInt(rectEl.style.left), y: parseInt(rectEl.style.top), 
          width: parseInt(rectEl.style.width), height: parseInt(rectEl.style.height), 
          dpr: window.devicePixelRatio 
        };
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay); 
        if (rectEl.parentNode) rectEl.parentNode.removeChild(rectEl); 
        chrome.runtime.sendMessage({ type: 'CAPTURE_AREA_RESULT', rect: rect }); 
      }
      
      overlay.addEventListener('mouseup', finish);
      overlay.addEventListener('mouseleave', finish);
      document.body.appendChild(overlay);
    }
  });
}

// --- HISTORY CLEANUP ---
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Clear Popup state
  chrome.storage.local.remove(`popup_state_${tabId}`);
  
  // We can't get URL after tab is removed, but we can't easily map ID to URL hash without storing map.
  // Alternative: Iterate all keys and remove those associated with this tab if we stored tabId in key.
  // But we stored hash(URL).
  // Strategy: In popup.js, we stored 'currentTabUrl'.
  // Ideally, we should use tabId as key suffix if we want to clear by tabId.
  // But user might want history to persist if they reopen the URL?
  // User Requirement: "khi tắt web thì mất không tạo rác bộ nhớ".
  // So session-based history.
  // Actually, sessionStorage is per tab and clears on close.
  // But extension popup/sidebar runs in extension process, not tab process.
  // So we must manage it manually.
  // Let's store a map of tabId -> urlHash in memory (background page).
  // When tab closes, look up hash and remove from storage.
});

// Map to track history keys per tab
const tabHistoryKeys = new Map();

// --- MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Helper to track history key
  if (sender.tab) {
    // If message comes from content script or sidebar related to a tab
    // We can infer context. But chat.js sends messages.
  }

  if (request.type === "SUMMARIZE_REQUEST") {
    // Determine prompt with persona
    let prompt = request.content; // Default
    if (request.persona || request.systemPrompt) {
        prompt = `[System: ${request.systemPrompt || ''}]\n[Persona: ${request.persona || ''}]\n\n${request.content}`;
    }
    if (request.outputLanguage) {
        prompt = `Hãy trả lời bằng ngôn ngữ: ${request.outputLanguage}. \n\n${prompt}`;
    }
    
    // Notify Popup that process started (redundant if popup handles it, but safe)
    if (request.tabId) {
        const key = `popup_state_${request.tabId}`;
        chrome.storage.local.set({ [key]: { isLoading: true, status: "Đang xử lý..." } });
    }

    callGeminiApiWithRotation(request.apiKeys || [request.apiKey], prompt, false, null, request.tabId)
      .then(summary => {
          // Handled in callGeminiApiSingle
      })
      .catch(err => {
          console.error(err);
          if (request.tabId) {
              const key = `popup_state_${request.tabId}`;
              chrome.storage.local.set({ [key]: { isLoading: false, status: "Lỗi", result: null, error: err.message } });
          }
      });
      return false; 
  }
  else if (request.type === "START_CAPTURE_AREA") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        if(tabs[0]) injectCaptureOverlay(tabs[0].id);
    });
    return false;
  }
  else if (request.type === "CAPTURE_AREA_RESULT" || request.type === "CAPTURE_AREA") {
    const rect = request.rect;
    const windowId = sender.tab ? sender.tab.windowId : undefined;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, function(dataUrl) {
      if (!dataUrl) return;
      // Save to local and Open Sidebar
      chrome.storage.local.set({ 
          capturedScreenshot: dataUrl, 
          capturedRect: rect, 
          chatMode: 'vision_capture_ready' 
      }, function() {
          // Open Sidebar
          const tabId = sender.tab.id;
          if (chrome.sidePanel && chrome.sidePanel.open) {
              chrome.sidePanel.open({ tabId }).catch(err => {
                  chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
              });
          } else {
              chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
          }
      });
    });
    return false;
  }
  // ... (Keep existing TTS/WebSearch logic)
  else if (request.type === "WEB_SEARCH_REQUEST") {
      handleWebSearchRequest(request, sendResponse);
      return true;
  }
  return false;
});

// --- PORT LISTENER ---
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    port.onMessage.addListener((msg) => {
      if (msg.type === "SUMMARIZE_REQUEST") {
        let prompt = msg.content;
        if (msg.persona) prompt = `Tóm tắt cho người dùng là ${msg.persona}. ${prompt}`;
        if (msg.outputLanguage) prompt = `Hãy trả lời bằng ngôn ngữ: ${msg.outputLanguage}. \n\n${prompt}`;
        callGeminiApiWithRotation(msg.apiKeys || [msg.apiKey], prompt, false, port);
      }
    });
  }
});

// --- API FUNCTIONS ---
async function callGeminiApiWithRotation(apiKeys, prompt, fromContextMenu = false, port = null, tabId = null) {
  let lastError = null;
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  
  for (const key of keys) {
    if (!key) continue;
    try {
      return await callGeminiApiSingle(key, prompt, fromContextMenu, port, tabId);
    } catch (e) {
      console.warn("Key failed:", e);
      lastError = e;
    }
  }
  
  // All failed
  const errorMsg = "Tất cả API Key đều lỗi: " + (lastError ? lastError.message : "Unknown");
  
  if (tabId) {
      const key = `popup_state_${tabId}`;
      chrome.storage.local.set({ [key]: { isLoading: false, status: "Lỗi", result: null, error: errorMsg } });
  }

  try {
      if (port) port.postMessage({ type: "SUMMARY_RESULT", success: false, error: errorMsg });
      else chrome.runtime.sendMessage({ type: "SUMMARY_RESULT", success: false, error: errorMsg });
  } catch (e) { console.log("Port disconnected", e); }
}

async function callGeminiApiSingle(apiKey, prompt, fromContextMenu, port, tabId = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || response.statusText);
  
  const summary = data.candidates[0].content.parts[0].text;
  
  // Save result for Popup persistence
  if (tabId) {
      const key = `popup_state_${tabId}`;
      chrome.storage.local.set({ [key]: { isLoading: false, status: "Hoàn tất", result: summary } });
  }

  // Nếu được gọi từ context menu, lưu kết quả và gửi thông báo mở Sidebar
  if (fromContextMenu) {
      // Clear badge
      chrome.action.setBadgeText({ text: "", tabId: undefined }); // tabId unknown here without port
      
      // Save result
      const key = `sidebar_state_${sender.tab ? sender.tab.id : (tabId || 'unknown')}`;
      chrome.storage.local.set({ 
          [key]: {
              summaryFromContextMenu: summary.trim(),
              chatMode: 'summary_display'
          }
      }, function() {
          // Open Sidebar
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                  const id = tabs[0].id;
                  if (chrome.sidePanel && chrome.sidePanel.open) {
                      chrome.sidePanel.open({ tabId: id }).catch(err => {
                          chrome.tabs.sendMessage(id, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
                      });
                  } else {
                      chrome.tabs.sendMessage(id, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
                  }
              }
          });
      });
  } else {
      const msg = { type: "SUMMARY_RESULT", success: true, summary: summary };
      try {
          if (port) port.postMessage(msg);
          else chrome.runtime.sendMessage(msg);
      } catch (e) { console.log("Port disconnected", e); }
  }
  return summary;
}

// --- SHORTCUTS & SPA SUPPORT ---
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) return;
        const tabId = tabs[0].id;

        if (command === "toggle_chat") {
            if (chrome.sidePanel && chrome.sidePanel.open) {
                 // Try to open sidepanel
                 chrome.sidePanel.open({ tabId }).catch(() => {
                     chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
                 });
            } else {
                 chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
            }
        } else if (command === "summarize_page") {
            // Open sidebar and trigger summarize
            // We need to inject content script first if not present
            chrome.scripting.executeScript({ target: { tabId }, files: ['Readability.js', 'content.js'] })
                .then(() => {
                    // Open Sidebar
                    if (chrome.sidePanel && chrome.sidePanel.open) {
                        chrome.sidePanel.open({ tabId });
                    } else {
                        chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR", url: chrome.runtime.getURL('chat.html') });
                    }
                    // We rely on chat.js to auto-summarize if content is ready?
                    // Actually, chat.js checks storage.
                    // So we should wait for content script to return result?
                    // content.js sends 'CONTENT_RESULT' to runtime.
                    // But if chat.js is not open, who listens? Popup listens.
                    // Background doesn't listen for CONTENT_RESULT to save it?
                    // Let's make background save content result if received?
                    // Currently popup.js saves it.
                    // We should move saving logic to background for robustness.
                });
        } else if (command === "capture_area") {
            injectCaptureOverlay(tabId);
        }
    });
});

// SPA URL Change Detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        // URL changed (SPA navigation)
        // Notify chat.js to reload context
        chrome.runtime.sendMessage({ type: "SPA_URL_CHANGED", url: changeInfo.url, title: tab.title });
        
        // Optionally re-inject content script if needed?
        // Or just let chat.js handle it.
    }
});

// ... (Keep existing Web Search & TTS functions)
async function handleWebSearchRequest(request, sendResponse) {
    // ... (Existing logic)
    sendResponse({ success: true, results: [] }); // Placeholder
}
