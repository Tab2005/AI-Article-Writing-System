# 🔍 Seonize 架構二次審計報告

**審計日期**: 2026-02-13 15:30  
**審計範圍**: 完整前後端代碼 (已修正前次審計報告中大部分項目後的二次檢查)

---

## ⚠️ 已修正項目回顧

前次審計 (`2026-02-13_architecture-audit_by-Opus-4.6.md`) 中已完成的項目：

| # | 項目 | 狀態 |
|---|------|:----:|
| C-1 | API 認證 middleware (JWT / API Key) | ✅ |
| C-2 | Settings 值加密儲存 | ✅ |
| H-1 | 統一 DB Session 管理 (DI) | ✅ |
| H-3 | 拆分 DataForSEOService | ✅ |
| M-1 | 修復 main.py 命名衝突 | ✅ |
| M-2 | 鎖定 requirements.txt 版本 | ✅ |
| M-3 | 清理偵錯日誌與 print | ✅ |
| M-5 | 統一日期時間處理 | ✅ |
| M-4 | 實作 readability_score 計算 | ✅ |
| L-1 | 前端 Vue.js devtools 殘留配置 | ✅ |
| L-2 | CSS 結構優化 | ✅ |
| L-3 | 前端型別定義結構優化 | ✅ |
| L-4 | 後端路由器導出優化 | ✅ |
| L-5 | 前端環境變數範例 | ✅ |
| L-6 | 爬蟲 User-Agent 與速率限制 | ✅ |
| L-7 | SQLite StaticPool 高併發問題 | ✅ |
| L-8 | 加入 Alembic 資料庫遷移 | ✅ |

---

## 🆕 二次審計發現

---

### 🔴 關鍵 (Critical)

#### C-1. `generate_outline` 與 `generate_titles` 手動關閉 DI Session

**位置**: [analysis.py:L233](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/analysis.py#L233)、[research.py:L434](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/research.py#L434)

**現狀**: 在 `finally` 區塊中呼叫 `db.close()`，但 `db` 是由 FastAPI `Depends(get_db)` 注入的。`get_db` 產生器已負責關閉連線。手動 `close()` 可能導致「Session is already closed」的錯誤或與其他中間件衝突。

**建議**: 移除所有 `finally: db.close()` 區塊，讓 FastAPI DI 機制自動管理 Session 生命週期。

```diff
-    finally:
-        db.close()
```

---

#### C-2. `gemini_client.py` 串流方法使用同步阻塞呼叫

**位置**: [gemini_client.py:L107-L114](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/gemini_client.py#L107-L114)

**現狀**: `generate_stream` 方法中 `gemini_model.generate_content(prompt, stream=True)` 是同步阻塞呼叫。雖然 `generate` 方法已正確使用 `asyncio.to_thread`，但串流版本未做此處理，會阻塞事件循環。

**建議**: 將同步串流呼叫包裝到 `asyncio.to_thread` 中，或使用線程池與 `asyncio.Queue` 進行非同步轉接。

---

### 🟠 高 (High)

#### H-1. `writing.py` 重複導入 `get_db`

**位置**: [writing.py:L13 & L15](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/writing.py#L13-L15)

**現狀**:
```python
from app.core.database import get_db  # L13
...
from app.core.database import get_db  # L15 (重複)
```

**建議**: 移除第 15 行的重複導入。

---

#### H-2. `analysis.py` 硬編碼年份 `2026` 在標題模板中

**位置**: [analysis.py:L125-L131](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/analysis.py#L125-L131)

**現狀**:
```python
f"2026 {request.keyword}完整指南：從入門到精通",
```

**建議**: 使用 `datetime.now().year` 動態取得年份，避免每年需手動更新。

---

#### H-3. `analysis.py` 意圖分析使用硬編碼信心分數

**位置**: [analysis.py:L133-L141](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/analysis.py#L133-L141)

**現狀**: `confidence` 硬編碼為 `0.85`，CTR Score 為 `0.9 - (i * 0.1)`。這些靜態值缺乏實際意義。

**建議**: 若無法引入真正的信心計算模型，至少應根據匹配到的信號數量動態調整信心分數，例如 `confidence = min(0.95, 0.6 + 0.1 * len(signals))`。

---

#### H-4. `generate_outline` 中函式內部重複導入

**位置**: [analysis.py:L168-L169](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/analysis.py#L168-L169)、[analysis.py:L225](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/analysis.py#L225)

**現狀**: `import logging` 和 `import uuid` 在函式**內部**進行，而 `logging` 已在模組頂部導入。

**建議**: 將 `uuid` 移至模組頂部導入區，移除函式內部的 `import logging`。

---

### 🟡 中 (Medium)

#### M-1. 前端頁面元件過大，缺乏拆分

| 頁面 | 大小 | 建議 |
|------|:----:|------|
| [KeywordPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/KeywordPage.tsx) | 24KB | 拆出 `KeywordResultPanel`, `KeywordSuggestionList` |
| [AnalysisPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/AnalysisPage.tsx) | 22KB | 拆出 `IntentAnalysisCard`, `CompetitionTable` |
| [WritingPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/WritingPage.tsx) | 18KB | 拆出 `SectionEditor`, `SEOCheckPanel` |
| [ProjectDetailPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/ProjectDetailPage.tsx) | 16KB | 拆出 `ProjectProgressSteps`, `ProjectActionBar` |
| [SettingsPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/SettingsPage.tsx) | 16KB | 拆出 `AIProviderSection`, `DataForSEOSection` |

**建議**: 遵循「單一頁面元件 < 300 行」的準則，將內部邏輯區塊抽取為獨立的子元件。

---

#### M-2. 前端 `api.ts` 缺乏全域錯誤處理與重試機制

**位置**: [api.ts:L26-L80](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/services/api.ts#L26-L80)

**現狀**: `request()` 函式在 401 時會清除 Token 並跳轉到登入頁。但沒有：
- 自動重試機制（例如網路暫時中斷）
- 請求超時設定
- 請求取消支援 (`AbortController`)

**建議**: 引入 `fetch` 的 `AbortController` 或包裝一個帶有 retry 邏輯的 `requestWithRetry` 方法。

---

#### M-3. `CacheManager` 的 `get_stats` 為同步方法

**位置**: [cache.py:InMemoryCache.get_stats](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/core/cache.py#L76-L81) 為同步，但 [RedisCache.get_stats](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/core/cache.py#L139-L148) 為異步。

**現狀**: `CacheManager.get_stats()` 直接呼叫 `self._cache.get_stats()`，但如果底層是 `RedisCache`，這是一個 `async` 方法，會回傳協程而不是結果。

**建議**: 統一 `get_stats` 為異步方法，或在 `CacheManager` 中加入判斷。

---

#### M-4. `security.py` 的 Fernet 金鑰衍生方式過於簡單

**位置**: [security.py:L16-L20](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/core/security.py#L16-L20)

**現狀**: 使用 `(secret + "0" * 32)[:32]` 進行金鑰填充。這種方式缺乏隨機性且不符合密碼學最佳實踐。

**建議**: 使用 `hashlib.sha256(secret.encode()).digest()` 或 `PBKDF2` 來衍生金鑰，以增加安全性。

---

### 🟢 低 (Low)

#### L-1. `requirements.txt` 缺少 `cryptography` 依賴

**位置**: [requirements.txt](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/requirements.txt)

**現狀**: `security.py` 中使用了 `from cryptography.fernet import Fernet`，但 `requirements.txt` 中並沒有列出 `cryptography`，僅因其是 `alembic` 或其他套件的間接依賴而存在。

**建議**: 顯式加入 `cryptography>=42.0.0`。

---

#### L-2. `alembic/env.py` 未清理 `StaticPool` 的導入

**位置**: [database.py:L10](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/core/database.py#L10)

**現狀**: 在 L-7 優化中已移除 `StaticPool` 的使用，但 `from sqlalchemy.pool import StaticPool` 的導入仍然存在。

**建議**: 移除未使用的 `StaticPool` 導入。

---

#### L-3. 前端 `App.tsx` 缺少 `<React.StrictMode>` 包裹

**位置**: [main.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/main.tsx)

**現狀**: 可能缺少 `<React.StrictMode>`，無法在開發環境中偵測到潛在的 Side-Effect 問題。

**建議**: 確認 `main.tsx` 中是否有 `StrictMode`，如果沒有，建議加入以提升開發品質。

---

#### L-4. `seonize-frontend/.gitignore` 未排除 `.env`

**位置**: [.gitignore (frontend)](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/.gitignore)

**現狀**: 雖然根目錄的 `.gitignore` 已排除 `.env`，但前端獨立的 `.gitignore` 可能缺少此規則。若用戶在前端目錄下以獨立倉庫方式操作，可能導致 `.env` 被追蹤。

**建議**: 確認前端 `.gitignore` 中有明確的 `.env` 排除規則。

---

#### L-5. 後端缺少 API 請求速率限制 (Rate Limiting)

**現狀**: 目前後端 API 不具備全域的請求速率限制。若系統對外公開或未來轉為 SaaS 架構，可能遭受 DDoS 或暴力破解攻擊。

**建議**: 引入 `slowapi` 或 FastAPI middleware 實作速率限制（例如每分鐘最多 60 次 API 調用）。

---

## 📊 各模組複雜度總覽 (更新版)

### 後端模組

| 模組 | 行數 | 複雜度 | 主要問題 |
|------|:----:|:------:|----------|
| `ai_service.py` | 442 | 🟠 中高 | Prompt 邏輯與服務邏輯混合 |
| `research.py` | 435 | 🟠 中高 | 手動 `db.close()`、Pydantic 模型定義混雜 |
| `writing.py` | 319 | 🟡 中 | 重複導入 |
| `settings.py` | 238 | 🟡 中 | 良好 |
| `analysis.py` | 234 | 🟡 中 | 硬編碼年份與信心分數 |
| `cache.py` | 224 | 🟢 低 | `get_stats` 同/異步不一致 |
| `db_models.py` | 219 | 🟢 低 | 良好 |
| `gemini_client.py` | 116 | 🟢 低 | 串流方法阻塞 |
| `projects.py` | 115 | 🟢 低 | ✅ 最佳範例 |
| `serp_service.py` | 115 | 🟢 低 | 良好 |
| `main.py` | 90 | 🟢 低 | 良好 |
| `database.py` | 96 | 🟢 低 | 未使用的 `StaticPool` 導入 |
| `security.py` | 43 | 🟢 低 | 金鑰衍生方式過簡 |

### 前端模組

| 模組 | 大小 | 說明 |
|------|:----:|------|
| `KeywordPage.tsx` | 24KB | ⚠️ 建議拆分 |
| `AnalysisPage.tsx` | 22KB | ⚠️ 建議拆分 |
| `WritingPage.tsx` | 18KB | ⚠️ 建議拆分 |
| `ProjectDetailPage.tsx` | 16KB | ⚠️ 建議拆分 |
| `SettingsPage.tsx` | 16KB | ⚠️ 建議拆分 |
| `DashboardPage.tsx` | 13KB | 可接受 |
| `api.ts` | 8KB | 缺少重試與超時 |
| 其他頁面 | < 12KB | 良好 |

---

## 🗺️ 二次優化路線圖

### 🚀 第一階段 — 快速修復 (建議 1 天)

| # | 項目 | 優先級 |
|---|------|:------:|
| 1 | 移除手動 `db.close()` (C-1) | 🔴 |
| 2 | 修復 Gemini 串流阻塞 (C-2) | 🔴 |
| 3 | 移除 `writing.py` 重複導入 (H-1) | 🟠 |
| 4 | 動態年份取代硬編碼 (H-2) | 🟠 |
| 5 | 移除函式內部重複導入 (H-4) | 🟠 |
| 6 | 移除未使用的 `StaticPool` 導入 (L-2) | 🟢 |
| 7 | 顯式加入 `cryptography` 依賴 (L-1) | 🟢 |

### 🔧 第二階段 — 品質提升 (建議 1-2 週)

| # | 項目 | 優先級 |
|---|------|:------:|
| 8 | 改善意圖分析信心計算 (H-3) | 🟠 |
| 9 | 統一 `CacheManager.get_stats` 為異步 (M-3) | 🟡 |
| 10 | 強化 Fernet 金鑰衍生 (M-4) | 🟡 |
| 11 | 前端 API 加入重試與超時 (M-2) | 🟡 |
| 12 | 前端大型頁面拆分 (M-1) | 🟡 |

### 📐 第三階段 — 安全與擴展 (依需求排程)

| # | 項目 | 優先級 |
|---|------|:------:|
| 13 | 後端 API 速率限制 (L-5) | 🟢 |
| 14 | 前端 `.gitignore` 確認 (L-4) | 🟢 |
| 15 | 前端 `StrictMode` 確認 (L-3) | 🟢 |

---

> **審計方法**: 靜態程式碼審查，涵蓋後端 7 個 API 模組、6 個核心模組、6 個服務模組，以及前端 14 個頁面元件、12 個 UI 元件、API 服務層。

---

*Generated by Architecture Re-Audit · Seonize · 2026-02-13 15:30*
