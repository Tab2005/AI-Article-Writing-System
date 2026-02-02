@echo off
REM 設定編碼為 UTF-8 以解決中文字亂碼問題
chcp 65001 > nul

TITLE Seonize Dev Server
echo ========================================
echo   Seonize Development Environment
echo ========================================

SET "ROOT_DIR=%~dp0"

REM 啟動後端 (使用 start /b 在背景執行於同一視窗)
echo [1/2] 正在啟動後端服務 (FastAPI) http://localhost:8000...
start /b cmd /c "cd /d "%ROOT_DIR%seonize-backend" && ".\venv\Scripts\python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM 等待 3 秒讓後端初始化
timeout /t 3 /nobreak > nul

REM 啟動前端 (留在前景)
echo [2/2] 正在啟動前端服務 (Vite) http://localhost:5173...
echo.
echo * 提示: 終端機將同時顯示前後端紀錄。
echo * 提示: 按 Ctrl+C 並輸入 Y 可停止服務。
echo.

cd /d "%ROOT_DIR%seonize-frontend"
npm run dev -- --host 0.0.0.0
