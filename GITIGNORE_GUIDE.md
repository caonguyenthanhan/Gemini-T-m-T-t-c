# 📋 HƯỚNG DẪN .GITIGNORE CHO CHROME EXTENSION

## 🎯 Mục đích

File `.gitignore` được cập nhật để loại trừ những file không cần thiết khỏi Git repository, giúp:
- Giữ repository sạch sẽ và nhẹ
- Bảo vệ thông tin nhạy cảm (API keys, passwords)
- Tránh upload file tạm thời và cache
- Loại trừ file test và development

## 📂 Các loại file được loại trừ

### 🔒 **Files nhạy cảm và private**
```
private/              # Thư mục chứa file private
*.key                 # API keys
*.secret              # Secret files
api_keys.txt          # File chứa API keys
config.json           # Config files có thể chứa sensitive data
.env*                 # Environment variables
```

### 🧪 **Files test và development**
```
test_*.py             # Python test files
test_*.html           # HTML test files  
test_*.js             # JavaScript test files
*_test.*              # Các file test khác
coverage/             # Test coverage reports
```

### 🐍 **Python environment**
```
venv/                 # Virtual environment
__pycache__/          # Python cache
*.pyc, *.pyo, *.pyd   # Python compiled files
```

### 📝 **IDE và editor files**
```
.vscode/              # VS Code settings
.idea/                # IntelliJ IDEA
*.swp, *.swo          # Vim temporary files
.DS_Store             # macOS system files
Thumbs.db             # Windows thumbnail cache
```

### 📊 **Logs và temporary files**
```
*.log                 # All log files
server_log.txt        # Server logs
*.tmp, *.temp         # Temporary files
```

### 🏗️ **Build và distribution**
```
dist/                 # Distribution folder
build/                # Build folder
*.zip, *.tar.gz       # Archive files
*.crx                 # Chrome extension packages
*.pem                 # Private keys
```

### 🎵 **Audio files (TTS output)**
```
*.mp3, *.wav, *.ogg   # Audio files
audio_output/         # Audio output folder
```

### 💾 **Cache và backup**
```
.cache/               # Cache folders
*.cache               # Cache files
backup/               # Backup folder
*.bak, *.backup       # Backup files
```

## 📋 Files hiện tại bị loại trừ

Sau khi cập nhật `.gitignore`, các files sau sẽ **KHÔNG** được track bởi Git:

### ✅ **Đã bị loại trừ:**
- `memory-bank/` - Cursor AI context files
- `private/` - Thư mục private
- `server_log.txt` - Server logs
- `simple_long_test.py` - Test files
- `simple_test.py`
- `test_api.py`
- `test_chat.py`
- `test_chunking.py`
- `test_direct.py`
- `test_gemini_performance.py`
- `test_long_text.py`
- `test_performance_improvements.py`
- `test_port_5000.py`
- `test_port_8765.py`
- `test_summary_syntax.html`
- `test_tts_optimization.html`

### ✅ **Sẽ được track (Core extension files):**
- `manifest.json` - Extension manifest
- `background.js` - Background script
- `popup.html`, `popup.js` - Popup interface
- `content.js` - Content script
- `summary.html`, `summary.js` - Summary page
- `read.html`, `read.js` - Reading page
- `chat.html`, `chat.js` - Chat interface
- `local_tts_server.py` - TTS server
- `requirements.txt` - Python dependencies
- `README.md` - Documentation
- `icon.png` - Extension icon

## 🚀 Lợi ích của .gitignore mới

### 1. **Bảo mật tốt hơn**
- Không upload API keys hoặc sensitive data
- Bảo vệ thông tin cá nhân trong private folder

### 2. **Repository sạch sẽ**
- Loại trừ file test và development
- Không có file log hoặc temporary files
- Kích thước repository nhỏ hơn

### 3. **Collaboration tốt hơn**
- Mỗi developer có thể có config riêng
- Không conflict về IDE settings
- Không upload file cache cá nhân

### 4. **Performance tốt hơn**
- Git operations nhanh hơn
- Clone/pull nhanh hơn
- Ít file cần check status

## 📝 Lưu ý quan trọng

### ⚠️ **Files cần chú ý:**
1. **API Keys**: Luôn đặt trong `private/` hoặc `.env`
2. **Test files**: Tự động bị loại trừ, không cần lo
3. **Logs**: Sẽ không được upload, an toàn
4. **Cache**: Tự động bị loại trừ

### 🔧 **Nếu cần add file bị ignore:**
```bash
git add -f filename    # Force add specific file
```

### 📋 **Check files bị ignore:**
```bash
git status --ignored   # Xem files bị ignore
```

## 🎉 Kết luận

File `.gitignore` mới đã được tối ưu hóa cho Chrome Extension project, đảm bảo:
- ✅ Bảo mật thông tin nhạy cảm
- ✅ Repository sạch sẽ và professional
- ✅ Collaboration hiệu quả
- ✅ Performance tốt

**Repository của bạn bây giờ đã sẵn sàng để upload lên GitHub một cách an toàn!** 🚀