let ttsEngineSelect = document.getElementById('ttsEngine');
let playPauseBtn = document.getElementById('playPauseBtn');
let stopBtn = document.getElementById('stopBtn');
let statusEl = document.getElementById('status');
let selectedTextEl = document.getElementById('selected-text');

let audio = null;
let utterance = null;
let isPlaying = false;
let isPaused = false;
let currentText = '';

function setStatus(text) { statusEl.textContent = text || ''; }
function setButtonPlay() { playPauseBtn.textContent = '▶️ Đọc'; playPauseBtn.disabled = false; }
function setButtonPause() { playPauseBtn.textContent = '⏸️ Tạm dừng'; }
function setButtonResume() { playPauseBtn.textContent = '▶️ Tiếp tục'; }

function speakBrowser(text) {
  stopAll();
  setStatus('Đang đọc bằng giọng đọc trình duyệt...');
  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.onend = function() { isPlaying = false; isPaused = false; setButtonPlay(); setStatus('Đã đọc xong.'); try { window.close(); } catch (e) {} };
  utterance.onerror = function(e) { isPlaying = false; isPaused = false; setButtonPlay(); setStatus('Lỗi giọng đọc trình duyệt: ' + (e.error || 'Không xác định')); };
  isPlaying = true; isPaused = false; setButtonPause();
  speechSynthesis.speak(utterance);
}

function playBase64(b64, fallbackText) {
  stopAll();
  try {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.onended = function() { isPlaying = false; isPaused = false; setButtonPlay(); setStatus('Đã phát xong.'); URL.revokeObjectURL(url); try { window.close(); } catch (e) {} };
    audio.onerror = function() { isPlaying = false; isPaused = false; setButtonPlay(); setStatus('Lỗi phát âm thanh, chuyển sang giọng đọc trình duyệt.'); if (fallbackText) speakBrowser(fallbackText); };
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { setStatus('Trang chặn autoplay, thử lại hoặc dùng giọng đọc trình duyệt.'); speakBrowser(fallbackText || currentText); });
    }
    isPlaying = true; isPaused = false; setButtonPause(); setStatus('Đang phát âm thanh...');
  } catch (e) {
    setStatus('Lỗi phát âm thanh: ' + e.message); speakBrowser(fallbackText || currentText);
  }
}

function stopAll() {
  if (speechSynthesis.speaking || speechSynthesis.paused) { try { speechSynthesis.cancel(); } catch (e) {} }
  if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (e) {} finally { audio = null; } }
  isPlaying = false; isPaused = false;
}

function requestLocalTTS(text) {
  setStatus('Đang gọi Local TTS...');
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  return fetch('http://127.0.0.1:8765/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, languageCode: 'vi-VN' }),
    signal: ctrl.signal
  }).then(async (res) => {
    clearTimeout(to);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.success || !data.audioContent) throw new Error(data.error || 'Không có âm thanh');
    return data.audioContent;
  }).catch((err) => {
    setStatus('Không thể kết nối Local TTS: ' + err.message + '. Hãy chạy Start_Gemini_TTS_Server.bat.');
    throw err;
  });
}

function requestGoogleTTS(text) {
  setStatus('Đang gọi Google TTS...');
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message && message.type === 'TTS_RESULT') {
        chrome.runtime.onMessage.removeListener(listener);
        if (message.success && message.audioData) { resolve(message.audioData); } else { reject(new Error(message.error || 'Google TTS lỗi')); }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'TTS_REQUEST', config: { engine: 'google', languageCode: 'vi-VN' }, text: text, readingIndex: -1 });
  });
}

function handlePlayPause() {
  if (!currentText || currentText.trim().length === 0) { setStatus('Văn bản trống.'); return; }
  const engine = ttsEngineSelect.value;
  if (engine === 'browser') {
    if (speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); isPaused = true; setButtonResume(); setStatus('Đã tạm dừng.'); return; }
    if (speechSynthesis.paused) { speechSynthesis.resume(); isPaused = false; setButtonPause(); setStatus('Tiếp tục đọc.'); return; }
    speakBrowser(currentText);
    return;
  }
  if (audio && !audio.paused) { audio.pause(); isPaused = true; setButtonResume(); setStatus('Đã tạm dừng.'); return; }
  if (audio && audio.paused) { audio.play(); isPaused = false; setButtonPause(); setStatus('Tiếp tục phát âm thanh.'); return; }
  playPauseBtn.disabled = true; playPauseBtn.textContent = 'Đang tải...';
  const req = engine === 'local' ? requestLocalTTS(currentText) : requestGoogleTTS(currentText);
  req.then((b64) => { playPauseBtn.disabled = false; playBase64(b64, currentText); }).catch(() => { playPauseBtn.disabled = false; setButtonPlay(); });
}

function init() {
  chrome.storage.local.get(['selectedReadText'], (res) => {
    currentText = (res.selectedReadText || '').trim();
    selectedTextEl.textContent = currentText || 'Không có văn bản được chọn.';
    chrome.storage.sync.get(['ttsEngine'], (res2) => {
      ttsEngineSelect.value = res2.ttsEngine || 'browser';
      if (currentText && currentText.trim().length > 0) {
        setTimeout(handlePlayPause, 50);
      }
    });
  });
  ttsEngineSelect.addEventListener('change', function() { chrome.storage.sync.set({ ttsEngine: this.value }); });
  playPauseBtn.addEventListener('click', handlePlayPause);
  stopBtn.addEventListener('click', function() { stopAll(); setButtonPlay(); setStatus('Đã dừng.'); });
}

document.addEventListener('DOMContentLoaded', init);