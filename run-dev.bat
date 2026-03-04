@echo off
REM 設定編碼為 UTF-8 以解決中文字亂碼問題
chcp 65001 > nul

TITLE Seonize Dev Server
echo ========================================
echo   Seonize Development Environment
echo ========================================

SET "ROOT_DIR=%~dp0"

REM 清理 Python 快取以確保代碼更新生效
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

REM 清除殘留的後端 Python 程序（避免 port 衝突）
echo [0/2] 清除舊有後端程序...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM 啟動後端 (加入 --reload 以便開發時自動生效)
echo [1/2] 正在啟動後端服務 (FastAPI) http://localhost:8000...
start /b cmd /c "cd /d "%ROOT_DIR%seonize-backend" && ".\venv\Scripts\python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

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
