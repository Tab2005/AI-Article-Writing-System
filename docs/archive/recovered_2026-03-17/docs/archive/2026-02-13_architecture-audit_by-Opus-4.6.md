# Seonize 專案架構與程式碼審計報告

> **審計日期**: 2026-02-13  
> **審計者**: Opus 4.6  
> **專案版本**: 2.0.0  
> **涵蓋範圍**: 後端 (FastAPI + SQLAlchemy) · 前端 (React + TypeScript + Vite) · 基礎設施

---

## 目錄

1. [概覽與總評](#概覽與總評)
2. [🔴 嚴重問題 (Critical)](#-嚴重問題-critical)
3. [🟠 重要問題 (High)](#-重要問題-high)
4. [🟡 中等問題 (Medium)](#-中等問題-medium)
5. [🔵 建議改善 (Low)](#-建議改善-low)
6. [📊 各模組詳細分析](#-各模組詳細分析)
7. [✅ 做得不錯的地方](#-做得不錯的地方)
8. [🗺️ 優化路線圖](#️-優化路線圖)

---

## 概覽與總評

| 維度 | 評分 (1-10) | 說明 |
|------|:-----------:|------|
| **架構清晰度** | 7 | 前後端分離良好，模組職責大致清楚 |
| **程式碼品質** | 5.5 | 存在命名衝突、不一致的模式與大量偵錯碼 |
| **安全性** | 4 | API Key 儲存標記加密但未實際加密，無認證系統 |
| **可維護性** | 5 | 服務層高度耦合，DB Session 管理不統一 |
| **效能** | 6 | 具備快取機制，但有阻塞風險和資源浪費 |
| **測試覆蓋率** | 2 | 幾乎無自動化測試 |
| **部署就緒度** | 4 | 缺少 Docker/CI-CD、依賴版本過舊 |

---

## 🔴 嚴重問題 (Critical)

### C-1. 無任何認證與授權機制 ✅ [已修復]

**位置**: 整個後端 API  
**風險**: 所有 API 端點均為公開存取，任何人皆可讀寫設定、刪除專案、消耗 API 額度

**現狀**:
```python
# 任何人都可以直接呼叫
@router.post("/", response_model=SettingsResponse)
async def update_settings(request: UpdateSettingsRequest, db: Session = Depends(get_db)):
```

**建議**:
- 立即加入 JWT 或 API Key 認證中介層
- 對設定類 API 加入管理員權限檢查
- 最低限度：加入全域 API Key 驗證 middleware

---

### C-2. API Key / 密碼以明文儲存在資料庫 ✅ [已修復]

**位置**: `db_models.py` > `Settings` 模型  
**風險**: 資料庫洩漏即等同所有第三方服務金鑰洩漏

**現狀**:
```python
# 標記為 encrypted=True，但實際上沒有任何加密邏輯
setting = cls(key=key, value=value, encrypted=encrypted)
# value 為明文存入 SQLite
```

**建議**:
- 使用 `cryptography.fernet` 或 `AES-GCM` 進行對稱加密
- 金鑰可使用機器環境變數 (`SECRET_KEY`) 保護
- 讀取時解密，寫入時加密

---

### C-3. `main.py` 中的 `settings` 命名衝突 ✅ [已修復]

**位置**: `main.py` 第 17-19 行  
**風險**: `settings` 同時指向 API router (模組) 和 config 物件，可能導致不可預測的行為

**現狀**:
```python
from app.api import projects, research, analysis, settings, prompts, writing  # settings = router module
from app.api import settings as settings_router  # 重複 import
from app.core.config import settings  # settings 被覆蓋為 config 物件!
```

**建議**:
```python
from app.api import projects, research, analysis, prompts, writing
from app.api import settings as settings_router
from app.core.config import settings as app_settings
```

---

## 🟠 重要問題 (High)

### H-1. DB Session 管理不一致 — 部分 API 手動建立 Session ✅ [已修復]

**位置**: `research.py`, `writing.py`, `analysis.py` (大部分端點)  
**風險**: Session 洩漏、Transaction 不一致

**現狀**: 部分 API 使用 Depends(get_db)，另一些手動建立：
```python
# ✅ 好：projects.py 使用 Dependency Injection
async def create_project(project_data: ProjectCreate, db: Session = Depends(get_db)):

# ❌ 差：research.py 手動創建
db = SessionLocal()
try:
    ...
finally:
    db.close()
```

**建議**: 所有 API 端點統一使用 `Depends(get_db)`，Service 層接收 `db` 參數而非自行建立

---

### H-2. `requirements.txt` 嚴重過時且缺少核心依賴 ✅ [已完成]

**位置**: 根目錄 `requirements.txt`

| 套件 | 目前版本 | 最新版 | 問題 |
|------|---------|--------|------|
| fastapi | 0.104.1 | 0.115+ | 缺少重要修正 |
| uvicorn | 0.24.0 | 0.34+ | |
| httpx | 0.25.2 | 0.28+ | |
| streamlit | 1.28.1 | — | **不再使用，應移除** |
| nltk | 3.8.1 | — | **程式碼中未使用** |

**缺少的依賴**:
```
pydantic-settings    # config.py 中使用
sqlalchemy           # 核心 ORM
google-generativeai  # Gemini 客戶端
scikit-learn         # analysis.py 中的 TF-IDF
```

---

### H-3. `DataForSEOService` 超過 700 行 — God Object 反模式 ✅ [已修復]

**位置**: `services/dataforseo_service.py` (710 行)  
**風險**: 難以維護、測試和擴展

**現狀**: 一個 class 承擔了 SERP 搜尋、關鍵字研究、頁面結構分析、Google Ads 狀態查詢、數據扁平化等所有職責

**建議**: 拆分為多個焦點服務：

```
dataforseo/
├── __init__.py
├── client.py          # HTTP 客戶端 + 認證
├── serp_service.py    # SERP 搜尋相關
├── keyword_service.py # 關鍵字研究相關
├── onpage_service.py  # On-Page API 相關
└── models.py          # 共用資料結構
```

---

### H-4. Gemini 關鍵字研究的 Blocking I/O 呼叫 ✅ [已修復]

**位置**: `gemini_client.py` 第 36、69、97 行  
**風險**: `google.generativeai` SDK 的 `generate_content()` 是同步呼叫，包在 `async def` 中會阻塞事件循環

**現狀**:
```python
async def generate(self, ...):
    response = gemini_model.generate_content(prompt)  # 同步阻塞!
```

**建議**: 使用 `asyncio.to_thread()` 包裝同步呼叫：
```python
response = await asyncio.to_thread(gemini_model.generate_content, prompt)
```

---

### H-5. Redis 客戶端使用同步 API 但包裝成 async ✅ [已修復]

**位置**: `cache.py` > `RedisCache` 類別  
**風險**: 線程池阻塞，高併發下效能下降

**現狀**:
```python
async def get(self, key: str):
    value = self._client.get(...)  # 同步呼叫!
```

**建議**: 替換為 `redis.asyncio`：
```python
import redis.asyncio as aioredis
self._client = aioredis.from_url(redis_url)
# 之後所有操作都是真正的異步
value = await self._client.get(...)
```

---

## 🟡 中等問題 (Medium)

### M-1. 過多偵錯日誌與 `print()` 殘留 ✅ [已修復]

**位置**: 多處

| 檔案 | 問題 |
|------|------|
| `research.py` 330-380 | 大量 `logger.info` 輸出快取內容 |
| `analysis.py:199` | `print(f"DEBUG: AI Outline Result: ...")` |
| `gemini_client.py:39` | `print(f"Gemini connection test failed: ...")` |
| `main.py:28,31,36` | `print()` 作為日誌 |
| `database.py:79` | `print(f"Database initialized: ...")` |

**建議**: 移除 `print()` 殘留，將偵錯級別提高為 `logger.debug`，生產環境設定 INFO 級別

---

### M-2. 日期時間使用不一致 ✅ [已修復]

**位置**: `db_models.py`

```python
# KeywordCache 使用 utcnow
class Settings(Base):
    updated_at = Column(DateTime, default=datetime.utcnow)    # UTC

class KeywordCache(Base):
    def is_expired(self):
        return datetime.utcnow() > self.expires_at            # UTC

# 其他模型使用 now (本地時區)
class Project(Base):
    created_at = Column(DateTime, default=datetime.now)        # 本地

class SerpCache(Base):
    def is_expired(self):
        return datetime.now() > self.expires_at                # 本地
```

**建議**: 全面統一使用 `datetime.now(timezone.utc)` (推薦) 或始終使用 `datetime.now()`。避免混用 `utcnow()` 和 `now()`。

### 其他 M 級問題修復進度
- [x] M-1. 偵錯日誌清理
- [x] M-2. 日期時間統一
- [x] M-3. 全域錯誤處理與 Loading 狀態管理

### M-3. 前端缺少全域錯誤處理與 Loading 狀態管理 ✅ [已修復]

**位置**: `services/api.ts`

**現狀**: API 錯誤直接 throw，每個頁面各自處理 (或不處理) 錯誤

**建議**:
- 加入全域 Error boundary component
- 使用 React Context 或狀態管理函式庫 (如 Zustand) 統一管理 loading/error 狀態
- 加入 API 請求攔截器，統一處理 401/403/500 等回應碼

---

### M-4. `analysis.py` 中 `readability_score` 寫死為 75.0 ✅ [已修復]

**位置**: `analysis.py` 第 218 行

```python
readability_score=75.0,  # Mock score
```

**建議**: 實作真實的可讀性計算 (如 Flesch Reading Ease / FOG Index 改良中文版)，或至少基於字數、句長等計算一個近似值

---

### M-5. 前端路由無 404 Fallback 與守衛 ✅ [已修復]

**位置**: `App.tsx`

```tsx
<Routes>
  <Route path="/" element={<HeroPage />} />
  {/* ... */}
  {/* 缺少 404 Catch-all */}
</Routes>
```

**建議**:
```tsx
<Route path="*" element={<NotFoundPage />} />
```
同時加入路由守衛 (Route Guard)，未登入時導向 `/login`

---

### M-6. `config.py` 中的 `Settings` 幾乎未被使用 ✅ [已修復]

**位置**: `core/config.py`

**現狀**: 大多數設定 (AI Key, DataForSEO 憑證等) 都從 DB `Settings` 表讀取，`config.py` 中定義的環境變數幾乎僅在 CORS 和 DB URL 處被使用。API Keys 的重複定義容易混淆。

**建議**: 明確區分「基礎設施設定」(config.py，環境變數) 與「業務設定」(DB Settings)。移除 `config.py` 中不需要的欄位 (如 `SERP_API_KEY`, `GEMINI_API_KEY` 等)。

---

### M-7. `GeminiClient` 中的 `classify_intent` 和 `generate_titles` 是殭屍代碼 ✅ [已修復]

---

## 🔵 建議改善 (Low)

### L-1. 前端 `package.json` 缺少實用開發工具 ✅ [已修復]

```json
// 建議加入
"prettier": "^3.x",
"lint-staged": "^15.x",
"husky": "^9.x",
"@testing-library/react": "^14.x"
```

---

### L-2. 前端 CSS 拆分方式為 Page-Level CSS ✅ [已修復]

**現狀**: 每個頁面都有獨立的 CSS 檔案 (如 `KeywordPage.css`, `WritingPage.css`)，容易造成樣式重複

**建議**: 
- 抽取共用樣式到 `components/ui/*.css`
- 考慮引入 CSS Modules 或 Scoped Styles 防止命名衝突
- 利用 `index.css` 已建立的 CSS Variables 更統一地管理主題

---

### L-3. 前端 `types/index.ts` 單一檔案已達 296 行 ✅ [已修復]

**建議**: 按領域拆分：
```
types/
├── project.ts    # ProjectState, ProjectCreate, ProjectUpdate
├── research.ts   # ResearchRequest, ResearchResponse, KeywordIdea
├── analysis.ts   # IntentResult, AnalysisResponse
├── writing.ts    # WritingSection, WritingResponse
└── ui.ts         # DataTableColumn, KPICardProps
```

---

### L-4. 後端 `api/__init__.py` 應明確匯出路由器 ✅ [已修復]

**現狀**: `__init__.py` 內有隱式匯出但不完整

**建議**: 使用明確匯出確保一致性：
```python
from .projects import router as projects_router
from .research import router as research_router
# ...
```

---

### L-5. 前端缺少環境設定檔範例 ✅ [已修復]

**建議**: 在 `seonize-frontend/` 新增 `.env.example`：
```env
VITE_API_URL=http://localhost:8000
```

---

### L-6. 後端 `Crawl` 功能缺少 User-Agent 與速率限制 ✅ [已修復]

**位置**: `research.py` 第 276-317 行

```python
async def fetch_page(client: httpx.AsyncClient, url: str):
    response = await client.get(url, timeout=15.0, follow_redirects=True)
    # 無 User-Agent，可能被目標網站封鎖
```

**建議**: 加入合理的 `User-Agent` 標頭，並在併發爬取之間加入延遲

---

### L-7. SQLite 使用 `StaticPool` 在高併發下可能出問題 ✅ [已修復]

**位置**: `database.py` 第 22-27 行

**現狀**: `StaticPool` 只使用一個連線，雖然解決了 SQLite 的多執行緒問題，但在高併發環境下會成為瓶頸

**建議**: 如果預計有較高的併發量，考慮加入讀寫鎖機制或遷移到 PostgreSQL

---

## 📊 各模組詳細分析

### 後端模組

| 模組 | 行數 | 複雜度 | 主要問題 |
|------|:----:|:------:|----------|
| `dataforseo_service.py` | 710 | 🔴 高 | God Object，應拆分 |
| `ai_service.py` | 442 | 🟠 中高 | 職責略多，Prompt 與服務邏輯混合 |
| `research.py` | 432 | 🟠 中高 | Session 手動管理、過多偵錯輸出 |
| `writing.py` | 283 | 🟡 中 | Session 手動管理 |
| `settings.py` | 237 | 🟡 中 | 安全性問題（明文金鑰） |
| `analysis.py` | 230 | 🟡 中 | Mock 分數、偵錯 print |
| `cache.py` | 222 | 🟢 低 | 同步 Redis 包裝為 async |
| `db_models.py` | 203 | 🟢 低 | 時區不一致 |
| `gemini_client.py` | 173 | 🟢 低 | 殭屍方法、阻塞呼叫 |
| `project.py` | 128 | 🟢 低 | 良好 |
| `serp_service.py` | 115 | 🟢 低 | 良好 |
| `projects.py` | 115 | 🟢 低 | ✅ 最佳範例 |
| `zeabur_client.py` | 90 | 🟢 低 | 良好 |
| `main.py` | 81 | 🟢 低 | 命名衝突 |
| `database.py` | 89 | 🟢 低 | 良好 |
| `config.py` | 59 | 🟢 低 | 冗餘欄位 |

### 前端模組

| 模組 | 行數 | 說明 |
|------|:----:|------|
| `types/index.ts` | - | 已拆分為模組化檔案 |
| `services/api.ts` | 132 | 結構清楚，缺少錯誤處理 |
| `App.tsx` | 48 | 清楚，缺少 404 路由 |
| `index.css` | 235 | ✅ 設計系統定義良好 |
| 各頁面 `.tsx` | 3.5K-28K | 部分頁面過大需拆分 |

---

## ✅ 做得不錯的地方

1. **CSS 設計系統** — `index.css` 中的 CSS Variables 定義完整且規範 (色板、間距、陰影、斷點)
2. **前後端 API 契約** — TypeScript 型別與 Pydantic 模型對齊良好
3. **快取分層架構** — 同時支援 Redis 和 In-Memory 的雙層快取設計
4. **資料庫抽象** — 支援 SQLite/PostgreSQL 自動切換
5. **AI Provider 抽象** — `AIService` 統一介面支援 Gemini、Zeabur、OpenAI 三種提供者
6. **SERP 資料豐富度** — 完整擷取 PAA、Related Searches、AI Overview、SERP Features
7. **指令倉庫系統** — PromptTemplate 表允許用戶自訂 AI 生成邏輯
8. **Dark Mode 與 Reduced Motion** — 前端 CSS 已考慮無障礙設計
9. **`projects.py` 的 DI 模式** — 作為後端最佳範例，應推廣至其他 API 模組

---

## 🗺️ 優化路線圖

### 🚀 第一階段 — 安全防護 (建議 1-2 週)

| # | 項目 | 優先級 |
|---|------|:------:|
| 1 | 加入 API 認證 middleware (JWT / API Key) | ✅ |
| 2 | 實作 Settings 值加密儲存 | ✅ |
| 3 | 修復 `main.py` 命名衝突 | ✅ |
| 4 | 更新 `requirements.txt`，鎖定版本 | ✅ |

### 🔧 第二階段 — 架構重構 (建議 2-3 週)

| # | 項目 | 優先級 |
|---|------|:------:|
| 5 | 統一 DB Session 管理為 Dependency Injection | ✅ |
| 6 | 拆分 `DataForSEOService` | ✅ |
| 7 | 修復 Gemini blocking I/O | 🟠 |
| 8 | 修復 Redis async wrapper | 🟠 |
| 9 | 清理偵錯日誌與 print | ✅ |
| 10 | 統一日期時間處理 | ✅ |

### 📐 第三階段 — 品質提升 (建議 2-4 週)

| # | 項目 | 優先級 |
|---|------|:------:|
| 11 | 加入後端單元測試 (目標覆蓋率 60%+) | 🟠 |
| 12 | 前端加入 Error Boundary 與 404 頁面 | 🟡 |
| 13 | 拆分前端 types | ✅ |
| 14 | 實作 readability_score 計算 | 🔵 |
| 15 | 加入 Husky + Prettier 代碼規範 | 🔵 |

### 🚢 第四階段 — 部署與維運 (依需求排程)

| # | 項目 | 優先級 |
|---|------|:------:|
| 16 | 建立 Dockerfile 與 docker-compose.yml | 🟡 |
| 17 | 設定 CI/CD Pipeline (GitHub Actions) | 🟡 |
| 18 | 加入 Alembic 資料庫遷移 | ✅ |
| 19 | 加入健康檢查與 Metrics (Prometheus) | 🔵 |
| 20 | 移除殭屍代碼與未使用依賴 | 🔵 |
| 21 | **[進階版升級] 實作多使用者與權限系統** | 🚀 |

> [!NOTE]
> 關於進階版 (Professional Edition) 的詳細技術路線圖，請參閱：
> [professional-upgrade-path.md](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/docs/professional-upgrade-path.md)

---

> **免責聲明**: 本報告基於靜態程式碼審查，未包含動態測試或安全性滲透測試。建議在實施重要變更前進行充分的功能驗證。

---

*Generated by Opus 4.6 · Seonize Architecture Audit · 2026-02-13*
