# Seonize AI Article Writing System

此專案是 Seonize（析優）AI SEO 撰寫系統的開發版，聚焦數據驅動的 SERP 研究、意圖判定與分段內容生成。

## 專案結構
- `seonize-backend/`：FastAPI 後端伺服器 (核心邏輯、AI 生成)
- `seonize-frontend/`：Vite + React 前端介面
- `skills/`：專案技能與範例

## 快速啟動 (Windows)

本專案提供了一個批次檔，可以同時在同一個終端機啟動後端與前端伺服器：

1. **開啟終端機** (CMD 或 PowerShell)。
2. **執行啟動腳本**：
   ```cmd
   .\run-dev.bat
   ```
3. **訪問服務**：
   - 前端介面：`http://localhost:5173`
   - 後端 API：`http://localhost:8000`
   - API 文檔：`http://localhost:8000/api/docs`

> [!TIP]
> 如果您仍想使用 PowerShell 腳本但遇到權限錯誤，可以執行：
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` 來解除限制。

## 手動啟動

如果不想使用腳本，可以分別啟動：

### 啟動後端
```bash
cd seonize-backend
.\venv\Scripts\python -m uvicorn app.main:app --reload
```

### 啟動前端
```bash
cd seonize-frontend
npm run dev
```

> [!NOTE]
> 首次啟動前請確保已依照各目錄下的 `.env.example` 完成 `.env` 配置。
