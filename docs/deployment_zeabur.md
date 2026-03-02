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
| `SECRET_KEY` | 系統加密金鑰 (用於 API Key 加密) | `任意隨機長字串` |
| `ADMIN_PASSWORD` | 後端管理員預設密碼 | `預設為 admin123` |
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

## 3. 自動化排程發布說明

Seonize 的自動循環排程引擎（每小時、每天派發文章）**已整合在後端服務的啟動流程中**：
*   **無需額外配置 Worker**：只要後端服務在線，排程掃描就會自動運作。
*   **資料庫一致性**：排程狀態儲存在 PostgreSQL 中，因此即使服務重啟，排程也會自動恢復。

---

## 4. 資料庫數據遷移 (SQLite to PG)

如果您需要將本地數據移至雲端：
1. **本地執行**：在根目錄找到 `migrate_to_pg.py`。
2. **環境準備**：`pip install SQLAlchemy psycopg2-binary`。
3. **遷移指令**：
   ```bash
   # 設定環境變數指向遠端 PG (從 Zeabur 獲取 Connection String)
   $env:DATABASE_URL="postgresql://user:pass@host:port/db" 
   python migrate_to_pg.py
   ```

---

## 5. 部署具體步驟

1. **連接 GitHub**：在 Zeabur 選擇您的專案倉庫。
2. **設置 Root Directory**：
   - 後端專案：`seonize-backend`
   - 前端專案：`seonize-frontend`
3. **配置部署指令**：
   - 後端 (Start Command): `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - 前端: Zeabur 會自動識別 `package.json` 並執行 `npm run build`。
4. **綁定域名**：分別為前後端生成 `.zeabur.app` 網域。

---

> [!IMPORTANT]
> 部署完成後，請務必先訪問後端 `/api/docs` 驗證 API 是否正常連通，再進入前端進行操作。
