# Zeabur 部署指南

本指南詳細說明如何將 Seonize AI 文章寫作系統部署至 Zeabur 雲端平台，並從本地 SQLite 遷移至生產環境的 PostgreSQL。

## 1. 環境準備

在 Zeabur 上，您需要建立以下服務：
1. **PostgreSQL** 服務：用於持久化存儲。
2. **Backend (FastAPI)** 服務：部署 `seonize-backend`。
3. **Frontend (Vite/React)** 服務：部署 `seonize-frontend`。

---

## 2. 環境變數配置

### 後端 (Backend)
請在 Zeabur Backend 服務的環境變數設置中加入以下各項：

| 變數名稱 | 說明 | 範例值 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 連線字串 (由 Zeabur 自動產生) | `postgresql://user:pass@host:port/db` |
| `ALLOWED_ORIGINS` | 允許的前端網址 (跨域) | `["https://your-frontend.zeabur.app"]` |
| `AI_PROVIDER` | 使用的 AI 供應商 | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GOOGLE_SEARCH_API_KEY` | Google Search API Key | `...` |
| `GOOGLE_SEARCH_CX` | Google Search Engine ID | `...` |
| `DATAFORSEO_LOGIN` | DataForSEO 帳號 | `...` |
| `DATAFORSEO_PASSWORD` | DataForSEO 密碼 | `...` |

### 前端 (Frontend)
請在 Zeabur Frontend 服務的環境變數設置中加入：

| 變數名稱 | 說明 | 範例值 |
| :--- | :--- | :--- |
| `VITE_API_URL` | 後端 API 的公開網址 | `https://your-backend.zeabur.app` |

---

## 3. 資料庫自動轉換與遷移

由於生產環境使用 PostgreSQL，而本地開發使用 SQLite，您可以透過以下兩種方式進行數據遷移：

### 方法 A：自動初始化 (僅結構)
如果您不需要遷移舊數據，系統在啟動時會自動偵測 `DATABASE_URL`：
*   如果為 `postgresql://`，系統會自動在 PostgreSQL 中建立所有必要的表格。
*   **優點**：簡單、無痛啟動。
*   **缺點**：原本在本地的專案記錄、研究歷史將遺失。

### 方法 B：數據遷移腳本 (Data Migration)
如果您需要將本地 `seonize.db` 的數據移至 Zeabur，我們提供了一個簡單的遷移腳本 `migrate_to_pg.py` (需手動執行)：

1. 安裝必要套件：`pip install sqlalchemy psycopg2-binary`
2. 配置 `DATABASE_URL` 指向遠端 PostgreSQL。
3. 執行 `python scripts/migrate_to_pg.py`。
*(腳本將逐筆讀取 SQLite 資料並寫入 PostgreSQL)*

---

## 4. 部署步驟

1. **連接 GitHub**：在 Zeabur 選擇您的專案倉庫。
2. **設置 Root Directory**：
   - 後端設為 `seonize-backend`。
   - 前端設為 `seonize-frontend`。
3. **配置部署指令**：
   - 後端：`pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - 前端：`npm install && npm run build` (Zeabur 會自動識別靜態站點)。
4. **綁定域名**：分別為前後端生成 `.zeabur.app` 網域名稱。

---

> [!IMPORTANT]
> 請確保後端的 `ALLOWED_ORIGINS` 包含前端的最終網址，否則登入與 API 調用將被瀏覽器阻擋。
