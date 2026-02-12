# Seonize AI Article Writing System

此專案是 Seonize（析優）AI SEO 撰寫系統的開發版，聚焦數據驅動的 SERP 研究、意圖判定與分段內容生成。

## 核心功能

### 1. 數據研究引擎 (Data Research Engine)
- **Google Ads 數據時效性監控**：整合官方數據更新狀態，即時呈現搜尋量指標的最後更新月份（如：2025/12）與發佈狀態（已更新/發佈中）。
- **意圖分析診斷**：基於 SERP 競爭數據自動判定關鍵字搜尋意圖（資訊型、商業型等）並推薦寫作風格。
- **工作流導航**：支援設定搜尋國家與語言，並實作會話緩存與側邊欄專案狀態記憶。

### 2. 內容撰寫工作流
- **手動受控大綱**：支援大綱的 AI 生成與手動編輯持久化。
- **精準段落生成**：支援目標字數與關鍵字密度設定，具備前文摘要感知能力。

## 未來優化方向 (Deep AI Roadmap)

- **深度 AI 診斷模式**：升級使用大型語言模型 (LLM) 對競爭對手進行全網頁抓取分析。
- **情感色彩分析**：識別對手內容的語氣與情緒，提供客製化的品牌差異化風格建議。
- **內容空缺挖掘 (Gap Analysis)**：交叉對比 Top 10 大綱與 PAA (People Also Ask)，鎖定市場尚未被滿足的資訊空缺進行超車。

## 快速啟動 (Windows)
... (保持原樣或更新下方部分)

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
