@echo off
echo 🚀 ADDING ESSENTIAL FILES TO GIT
echo ================================

echo.
echo 📋 Adding core extension files...
git add .gitignore
git add manifest.json
git add background.js
git add popup.html
git add popup.js
git add content.js
git add icon.png

echo.
echo 📄 Adding interface files...
git add summary.html
git add summary.js
git add read.html
git add read.js
git add chat.html
git add chat.js

echo.
echo 🐍 Adding Python server...
git add local_tts_server.py
git add requirements.txt

echo.
echo 📚 Adding documentation...
git add README.md
git add "HƯỚNG_DẪN_TEST_PERFORMANCE.md"
git add "KHẮC_PHỤC_LỖI_SUMMARY.md"
git add GITIGNORE_GUIDE.md

echo.
echo 🔧 Adding utility files...
git add Readability.js
git add crypto-js.min.js
git add text-chunker.js
git add Start_Gemini_TTS_Server.bat

echo.
echo ✅ COMPLETED! Files added to Git staging area.
echo.
echo 📊 Current Git status:
git status --short

echo.
echo 💡 Next steps:
echo    1. Review changes: git status
echo    2. Commit changes: git commit -m "Update extension with performance improvements"
echo    3. Push to GitHub: git push origin main
echo.
pause