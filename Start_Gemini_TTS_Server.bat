@echo off
title Gemini TTS Server Starter
setlocal
set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%private\venv"
echo Khởi động Local TTS server bằng Python venv...
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$scriptDir = '%SCRIPT_DIR%'; $venvDir = Join-Path $scriptDir 'private\\venv'; if (-not (Test-Path $venvDir)) { & 'py' -3 -m venv $venvDir }; $pythonExe = Join-Path $venvDir 'Scripts\\python.exe'; if (-not (Test-Path $pythonExe)) { $pythonExe = 'python' }; $serverScript = Join-Path $scriptDir 'local_tts_server.py'; try { & $pythonExe -c 'import flask, flask_cors, gtts' } catch { & $pythonExe -m pip install --upgrade pip; & $pythonExe -m pip install flask flask-cors gTTS }; Start-Process -FilePath $pythonExe -ArgumentList ('\"' + $serverScript + '\"') -WorkingDirectory $scriptDir -WindowStyle Hidden"
echo Đã khởi chạy server nền. Cửa sổ này sẽ đóng ngay.