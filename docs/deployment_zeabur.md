# Zeabur 部署指南

本指南詳細說明如何將 Seonize AI 文章寫作系統部署至 Zeabur 雲端平台，並從本地 SQLite 遷移至生產環境的 PostgreSQL。

> [!IMPORTANT]
> **資料庫同步說明**：
> 本地開發環境使用的 `seonize.db` (SQLite) 與雲端生產環境的 PostgreSQL 是**獨立運作**的，兩者**不會自動同步**。若您希望將本地的點數設定、會員資料或已生成的專案搬移到雲端，必須執行本文第 4 節的「資料庫數據遷移」腳本。

## 1. 環境準備

在 Zeabur 上，您需要建立以下服務：
1. **PostgreSQL** 服務：用於持久化存儲。
2. **Backend (FastAPI)** 服務：部署 `seonize-backend`。
3. **Frontend (Vite/React)** 服務：部署 `seonize-frontend`。

---

## 2. 環境變數配置

### 後端 (Backend)
請在 Zeabur Backend 服務的環境變數設置中加入以下各項：

| 變數名稱 | 說明 | 是否必填 | 範例值 |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL 連線字串 (由 Zeabur 自動產生) | ✅ | `postgresql://user:pass@host:port/db` |
| `ALLOWED_ORIGINS` | 允許的前端網址 (跨域，多個網址請用逗號隔開) | ✅ | `https://your-frontend.zeabur.app` |
| `SECRET_KEY` | 系統加密金鑰 (用於 JWT & API Key 加密) | ✅ | 任意隨機長字串 |
| `ADMIN_PASSWORD` | 管理員登入密碼 (首次登入時自動建立) | ✅ | 建議設定強密碼 |
| `ADMIN_EMAIL` | 管理員登入 Email (預設為 `admin@example.com`) | ➖ | `info@sitetegy.com` |
| `ADMIN_USERNAME` | 管理員顯示名稱 | ➖ | `Admin` |
| `ZEABUR_AI_API_KEY` | Zeabur AI Hub API Key | ⭐ | `...` |
| `AI_PROVIDER` | 使用的 AI 供應商 | ➖ | `zeabur` |
| `AI_MODEL` | 預設使用的 AI 模型 | ➖ | `gpt-4o-mini` |
| `DATAFORSEO_LOGIN` | DataForSEO API 帳號 | ➖ | `info@example.com` |
| `DATAFORSEO_PASSWORD` | DataForSEO API 密碼 | ➖ | `...` |
| `REDIS_URL` | Redis 連線字串 (留空則使用記憶體快取) | ➖ | `redis://...` |

> **★ 說明**：標記 ⭐ 的項目建議透過環境變數提供初始值。系統啟動後也可在後台「系統設定」頁面修改，資料庫值優先於環境變數。

### 前端 (Frontend)
請在 Zeabur Frontend 服務的環境變數設置中加入：

| 變數名稱 | 說明 | 範例值 |
| :--- | :--- | :--- |
| `VITE_API_URL` | 後端 API 的公開網址 | `https://your-backend.zeabur.app` |

---

## 3. 配置優先權與後台連動（重要）

系統採用 **「資料庫優先，環境變數備援」** 的策略。這對部署後的管理非常重要：

1.  **環境變數 = 預設值**：您在 Zeabur 設定的 `ZEABUR_AI_API_KEY` 等變數，會在系統第一次啟動、且資料庫尚無設定時生效。
2.  **後台設定 = 最終值**：一旦您登入系統後台並在「系統設定」中修改了 API 金鑰，該設定會存入資料庫。**資料庫的值會覆蓋環境變數的值**。
3.  **修改作用**：這意味著您部署後，**依然可以直接在後台 UI 修改金鑰，並且會立即生效**，不需要重新部署 Zeabur 服務。

> [!NOTE]
> **例外項**：`DATABASE_URL` 與 `SECRET_KEY` 必須透過環境變數設定，因為系統需要這些資訊才能啟動並讀取資料庫。

## 3. 自動化排程發布說明

Seonize 的自動循環排程引擎（每小時、每天派發文章）**已整合在後端服務的啟動流程中**：
*   **無需額外配置 Worker**：只要後端服務在線，排程掃描就會自動運作。
*   **資料庫一致性**：排程狀態儲存在 PostgreSQL 中，因此即使服務重啟，排程也會自動恢復。

---

## 4. 資料庫數據遷移 (SQLite to PG)

由於本地與雲端資料庫不互通，如果您需要將本地已有的點數餘額、會員等級、以及專案紀錄移至雲端：

1. **環境準備**：在本地 `seonize-backend` 目錄下執行 `pip install psycopg2-binary`。
2. **遷移指令 (PowerShell)**：
   ```powershell
   # 1. 進入後端目錄
   cd seonize-backend
   
   # 2. 設定環境變數指向 Zeabur 的 PostgreSQL 出口網址 (Public URL)
   $env:DATABASE_URL="postgresql://user:pass@your-pg-host.zeabur.app:port/zeabur" 
   
   # 3. 執行遷移腳本
   python migrate_to_pg.py
   ```
3. **確認結果**：腳本會自動在目標資庫建立 Schema (包含新版 `credit_logs` 等表)，並將數據一一寫入。

> [!TIP]
> **為什麼不直接在雲端用 SQLite？**
> Zeabur 的容器在 redeploy 時會重置檔案系統（Ephemeral FS）。如果不搭配 Persistent Volume，您的 SQLite 檔案會在每次更新代碼時遺失。因此生產環境**強烈建議使用 PostgreSQL** 以確保數據持久性。

---

## 5. 部署具體步驟

1. **連接 GitHub**：在 Zeabur 選擇您的專案倉庫。
2. **設置 Root Directory**：
   - 後端專案：`seonize-backend`
   - 前端專案：`seonize-frontend`
3. **配置部署指令**：
   - 後端 (Start Command): **請保持空白**（系統會自動讀取 `zbpack.json` 執行 `python start.py`）。
   - 前端: Zeabur 會自動識別 `package.json` 並執行 `npm run build`。
4. **綁定域名**：分別為前後端生成 `.zeabur.app` 網域。
5. **後端啟動原理**（重要）：
   後端已內建 `zbpack.json` 與 `start.py`。其運作邏輯如下：
   - **自動偵測 Port**：`start.py` 會自動讀取 Zeabur 注入的 `PORT` 或 `WEB_PORT` 環境變數。
   - **啟動指令**：`python start.py`。
   > ⚠️ **注意**：請勿在 Zeabur 控制台手動把 Start Command 設成 `uvicorn ... --port 8000`，因為這會覆蓋自動偵測邏輯，導致 port 不匹配而啟動失敗。

---

> [!IMPORTANT]
> 部署完成後，請務必先訪問後端 `/api/docs` 驗證 API 是否正常連通，再進入前端進行操作。
