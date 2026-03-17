# Seonize 專案程式碼審查報告 — 2026-03-17

> **審查範圍**：全端架構（`seonize-backend` + `seonize-frontend`）  
> **審查方向**：安全性、架構設計、程式碼品質、效能、可維護性、測試覆蓋率

---

## 目錄

1. [審查總覽](#審查總覽)
2. [🔴 P0 — 安全性問題](#p0--安全性問題)
3. [🟠 P1 — 架構設計缺陷](#p1--架構設計缺陷)
4. [🟡 P2 — 程式碼品質問題](#p2--程式碼品質問題)
5. [🔵 P3 — 效能優化建議](#p3--效能優化建議)
6. [🟢 P4 — 可維護性與開發體驗](#p4--可維護性與開發體驗)
7. [⚪ P5 — 測試與品質保證](#p5--測試與品質保證)
8. [實作優先排序建議](#實作優先排序建議)

---

## 審查總覽

| 面向 | 優勢 | 待改善項目數 |
|------|------|:----------:|
| 安全性 | Fernet 加密、JWT Token 機制 | **4** |
| 架構設計 | 前後端分離、Service 層抽象 | **6** |
| 程式碼品質 | 模組化程度高、中文註解詳盡 | **7** |
| 效能 | 快取機制、SQLite WAL 模式 | **3** |
| 可維護性 | Alembic 遷移、docs 文件目錄 | **5** |
| 測試 | Vitest 設定已就緒 | **3** |

---

## P0 — 安全性問題

### 🔴 1. 預設密碼與金鑰硬編碼

**檔案**：`seonize-backend/app/core/config.py` (L31-36)

```python
SECRET_KEY: str = "your-super-secret-key-change-it-in-env"
ADMIN_PASSWORD: str = "admin123"
ADMIN_EMAIL: str = "admin@example.com"
```

**風險**：若忘記配置 `.env` 覆蓋，生產環境將使用弱密碼與可預測的 JWT 金鑰。

**實作方案**：

```python
# config.py
import secrets

class Settings(BaseSettings):
    SECRET_KEY: str = ""  # 強制必填
    ADMIN_PASSWORD: str = ""  # 強制必填

    @model_validator(mode="after")
    def validate_secrets(self):
        if not self.SECRET_KEY or self.SECRET_KEY == "your-super-secret-key-change-it-in-env":
            raise ValueError(
                "❌ SECRET_KEY 未設定或使用了預設值！"
                "請在 .env 中使用 `python -c \"import secrets; print(secrets.token_hex(32))\"` 產生安全金鑰。"
            )
        if not self.ADMIN_PASSWORD or self.ADMIN_PASSWORD == "admin123":
            import logging
            logging.warning("⚠️ ADMIN_PASSWORD 使用預設值，請在 .env 中修改為強密碼！")
        return self
```

---

### 🔴 2. 全域異常處理洩漏內部資訊

**檔案**：`seonize-backend/app/main.py` (L188-194)

```python
response = JSONResponse(
    status_code=500,
    content={
        "detail": str(exc)  # ← 洩漏內部錯誤堆疊
    },
)
```

**風險**：`str(exc)` 可能包含資料庫連線字串、檔案路徑等敏感資訊。

**實作方案**：

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())[:8]  # 生成追蹤 ID
    logger.error(f"[{error_id}] 全域異常: {exc}", exc_info=True)
    
    response = JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "伺服器內部錯誤",
            "error_id": error_id,  # 僅回傳追蹤 ID，不洩漏細節
        },
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response
```

---

### 🔴 3. JWT 使用已棄用的 `datetime.utcnow()`

**檔案**：`seonize-backend/app/core/auth.py` (L32-34)

```python
expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
```

**風險**：`datetime.utcnow()` 在 Python 3.12+ 已被棄用，可能導致時區相關 bug。

**實作方案**：

```python
from datetime import datetime, timedelta, timezone

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

---

### 🔴 4. CORS Allow-Origin 動態回傳任意 Origin

**檔案**：`seonize-backend/app/main.py` (L173-176)

```python
origin = request.headers.get("origin")
if origin:
    response.headers["Access-Control-Allow-Origin"] = origin  # ← 信任任何來源
```

**風險**：在 exception handler 中直接回傳請求的 origin，等於繞過 CORS 中介軟體白名單。

**實作方案**：

```python
# 在 exception handler 中校驗 origin
ALLOWED_ORIGINS_SET = set(_parse_allowed_origins(app_settings.ALLOWED_ORIGINS))

def _safe_cors_origin(request: Request) -> Optional[str]:
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS_SET:
        return origin
    return None
```

---

## P1 — 架構設計缺陷

### 🟠 1. 前端 KalpaPage.tsx 過於龐大（1179 行 / 61KB）

**檔案**：`seonize-frontend/src/pages/KalpaPage.tsx`

**問題**：單一組件承載了天道解析、矩陣配置、節點管理、預覽、發布等五大功能，違反單一職責原則。

**實作方案 — 拆分為以下子組件**：

```
src/pages/kalpa/
├── KalpaPage.tsx           # 主頁面佈局與狀態管理 (< 200 行)
├── TiandaoPanel.tsx        # 天道解析面板 (L594-735)
├── MatrixConfigPanel.tsx   # 矩陣配置區塊 (L737-860)
├── NodeTable.tsx           # 節點表格 + 篩選 (L424-574)
├── NodePreviewModal.tsx    # 文章預覽 Modal
├── hooks/
│   ├── useKalpaMatrix.ts   # 矩陣 CRUD 邏輯
│   ├── useTiandao.ts       # 天道解析邏輯
│   └── useNodeWeaving.ts   # 編織操作邏輯
└── KalpaPage.css           # 保持現有樣式
```

**估計工時**：4-6 小時

---

### 🟠 2. AI Service 缺乏統一的 JSON 回應解析器

**檔案**：`seonize-backend/app/services/ai_service.py`

**問題**：每個生成方法（`analyze_search_intent`、`generate_ai_titles`、`analyze_article_quality` 等）內部都有重複的 JSON 解析邏輯：

```python
# 此模式在 6 個方法中重複出現
import json, re
json_match = re.search(r'\{[\s\S]*\}', result)
if json_match:
    return json.loads(json_match.group())
```

**實作方案**：

```python
# 新增統一解析方法到 AIService
@staticmethod
def _parse_ai_json(raw: str, expect_array: bool = False, fallback: Any = None) -> Any:
    """統一 AI 回傳 JSON 解析器"""
    import json, re
    cleaned = AIService._clean_json_string(raw)
    
    pattern = r'\[[\s\S]*\]' if expect_array else r'\{[\s\S]*\}'
    match = re.search(pattern, cleaned)
    
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            # 嘗試激進清理後重試
            radical = re.sub(r',\s*([\]}])', r'\1', match.group())
            try:
                return json.loads(radical)
            except json.JSONDecodeError:
                pass
    
    logger.warning(f"AI JSON 解析失敗，回傳 fallback 值")
    return fallback

# 使用方式（大幅簡化）
result = await cls.generate_content(prompt)
return cls._parse_ai_json(result, fallback={"intent": "informational", ...})
```

**估計工時**：2 小時

---

### 🟠 3. 資料庫 Session 管理不一致

**檔案**：`seonize-backend/app/main.py` (L76-95, L88-95)、`ai_service.py` (L74-92, L489-504)

**問題**：多處手動建立 `SessionLocal()` 並使用 `try/finally: db.close()`，未使用專案已定義的 `get_db_context()`：

```python
# main.py lifespan 中出現兩次
db = SessionLocal()
try:
    ...
finally:
    db.close()
```

**實作方案**：

```python
# 統一改用 context manager
from app.core.database import get_db_context

async def lifespan(app: FastAPI):
    with get_db_context() as db:
        current_provider = DBSettings.get_value(db, "ai_provider")
        if not current_provider:
            DBSettings.set_value(db, "ai_provider", app_settings.AI_PROVIDER)
    
    with get_db_context() as db:
        initialize_default_prompts(db)
    # ...
```

**估計工時**：1 小時

---

### 🟠 4. 前端使用 `(window as any).refreshAuthUser` 反模式

**檔案**：`seonize-frontend/src/context/AuthContext.tsx` (L84-88)、`KalpaPage.tsx` (L152, 353, 416)

**問題**：透過掛載全域函數來跨組件通信，破壞 React 資料流。

**實作方案**：

```typescript
// 1. AuthContext 已提供 refreshUser，不需要掛載到 window
// 移除 AuthContext.tsx L84-88 的 useEffect

// 2. 在需要的頁面中直接使用 useAuth hook
// KalpaPage.tsx
const { refreshUser } = useAuth();

// 替換所有 `(window as any).refreshAuthUser()` 為：
await refreshUser();
```

**估計工時**：0.5 小時

---

### 🟠 5. `batch_weave_task` 引用了未導入的模組

**檔案**：`seonize-backend/app/services/kalpa_service.py` (L474)

```python
refund_amount = math.ceil(refund_per_node * results["failed"])
# ← math 未在此檔案頂部 import
```

**風險**：批量編織失敗退款邏輯將拋出 `NameError`，導致使用者遺失點數。

**實作方案**：

```python
# 在 kalpa_service.py 頂部新增
import math
```

**估計工時**：5 分鐘

---

### 🟠 6. ORM Model 缺乏外鍵關聯（Relationship）

**檔案**：`seonize-backend/app/models/db_models.py`

**問題**：`Project.user_id`、`KalpaNode.matrix_id` 等欄位只是普通 Column，沒有宣告 `ForeignKey` 與 `relationship`，導致：
- 無法使用 SQLAlchemy 的 eager/lazy loading
- 資料庫層面無參照完整性檢查
- 刪除 User 不會級聯刪除其 Project

**實作方案**：

```python
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

class Project(Base):
    __tablename__ = "projects"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # 加入 relationship
    user = relationship("User", backref="projects", lazy="select")

class KalpaNode(Base):
    __tablename__ = "kalpa_nodes"
    matrix_id = Column(String(36), ForeignKey("kalpa_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    matrix = relationship("KalpaMatrix", backref="nodes", lazy="select")
```

> ⚠️ **注意**：此變更需搭配 Alembic 遷移腳本，並在遷移前備份資料庫。

**估計工時**：3-4 小時（含 Alembic 遷移與測試）

---

## P2 — 程式碼品質問題

### 🟡 1. API 路由層函數內部 import 重複

**檔案**：`seonize-backend/app/services/cms_service.py` (L322, 332, 345)

```python
# 同一方法內出現三次
from sqlalchemy import or_
```

**實作方案**：將 `or_` 移至檔案頂部統一 import。

---

### 🟡 2. AI Service 方法過長

**檔案**：`seonize-backend/app/services/ai_service.py`

| 方法 | 行數 | 建議 |
|------|:----:|------|
| `generate_outline` | 120 行 | 拆分為 prompt 建構 + AI 呼叫 + 回應解析 |
| `generate_ai_titles` | 107 行 | 拆分為模板載入 + prompt 建構 + 解析 |
| `generate_section_content` | 70 行 | 拆分 prompt 建構 |

**實作方案**：

```python
class AIService:
    @classmethod
    async def generate_outline(cls, ...) -> dict:
        prompt = cls._build_outline_prompt(keyword, intent, ...)  # 新方法
        result = await cls.generate_content(prompt, temperature=0.7)
        return cls._parse_ai_json(result, fallback={...})  # 統一解析

    @staticmethod
    def _build_outline_prompt(keyword, intent, ...) -> str:
        """純函數：建構大綱提示詞"""
        ...
```

---

### 🟡 3. 前端 `api.ts` 型別使用 `any` 過多

**檔案**：`seonize-frontend/src/services/api.ts`

以下位置使用了 `any` 型別（嚴重影響 TypeScript 型別安全）：

| 位置 | 行數 | 建議型別 |
|------|:----:|---------|
| `adminApi.getStats` | L531 | `AdminStats` |
| `adminApi.updateUser` | L533 | `{role?: string; credits?: number; membership_level?: number}` |
| `cmsApi.createConfig` | L561 | `CMSConfigCreate` |
| `writingApi.analyzeQuality` | L347 | `QualityReport` |
| `KalpaNode.images` | L361 | `ImageData[]` |

**實作方案**：在 `src/types/` 下建立對應的 interface 檔案，取代所有 `any`。

---

### 🟡 4. `to_dict()` 重複的時區處理邏輯

**檔案**：`seonize-backend/app/models/db_models.py`

```python
# 此模式在每個 model 的 to_dict() 中重複出現（約 20 次）
"created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
```

**實作方案**：

```python
# 新增工具函數
def _dt_to_iso(dt: Optional[datetime]) -> Optional[str]:
    """統一 datetime → ISO string 轉換"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()

# 使用
class Project(Base):
    def to_dict(self):
        return {
            ...
            "created_at": _dt_to_iso(self.created_at),
            "updated_at": _dt_to_iso(self.updated_at),
        }
```

---

### 🟡 5. `SerpCache` / `KeywordCache` / `CompetitiveCache` 的 `is_expired` 邏輯重複

**檔案**：`seonize-backend/app/models/db_models.py` (L205-216, L235-245, L260-270)

三個 Model 都有幾乎相同的 `is_expired` property，只有預設行為不同。

**實作方案**：

```python
# 使用 Mixin 類別
class ExpirableMixin:
    """通用過期檢查 Mixin"""
    @property
    def is_expired(self) -> bool:
        expires_at = getattr(self, "expires_at", None)
        if not expires_at:
            return self._default_expired  # 子類別覆蓋

        now = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        return now > expires_at

    _default_expired = True  # SerpCache 預設過期, 其他預設不過期

class SerpCache(ExpirableMixin, Base):
    _default_expired = True

class KeywordCache(ExpirableMixin, Base):
    _default_expired = False
```

---

### 🟡 6. 前端 CSS 檔案過多且缺乏設計系統整合

**檔案**：`seonize-frontend/src/pages/` 目錄下有 22 個獨立 `.css` 檔案

**問題**：
- 每個頁面有獨立的 CSS 檔，但共用大量相同的樣式變量
- `KalpaPage.css` 達 15,767 bytes，可能存在重複的樣式定義
- 缺乏統一的 component-level 樣式封裝方案

**實作方案**：
1. 將通用元件樣式（card、badge、table、modal）抽取到 `src/styles/components/` 目錄
2. 頁面 CSS 僅保留頁面特有的佈局與間距
3. 考慮引入 CSS Modules 或 styled-components 以實現樣式隔離

---

### 🟡 7. `CMS Service` 的 httpx client 未使用 `async with` 管理生命週期

**檔案**：`seonize-backend/app/services/cms_service.py` (L25, L101)

```python
class GhostService(CMSBase):
    def __init__(self, ...):
        self.client = httpx.AsyncClient(timeout=30.0)  # ← 從不關閉
```

**風險**：連線不會被正確關閉，可能造成連線池洩漏。

**實作方案**：

```python
class GhostService(CMSBase):
    def __init__(self, ...):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key

    async def publish(self, ...) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(...)
```

---

## P3 — 效能優化建議

### 🔵 1. AI Config 快取未設 TTL 過期機制

**檔案**：`seonize-backend/app/services/ai_service.py` (L68-104)

```python
_config: Optional[AIConfig] = None  # ← 一旦載入永不更新
```

**問題**：在管理員切換 AI Provider 後，需要重啟服務才會生效。

**實作方案**：

```python
class AIService:
    _config: Optional[AIConfig] = None
    _config_time: float = 0
    CONFIG_TTL = 60  # 快取 60 秒

    @classmethod
    def get_config(cls) -> AIConfig:
        import time
        now = time.monotonic()
        if cls._config and (now - cls._config_time < cls.CONFIG_TTL):
            return cls._config
        
        # 重新載入...
        cls._config = loaded_config
        cls._config_time = now
        return cls._config
    
    @classmethod
    def invalidate_config(cls):
        """管理員更新設定後主動失效快取"""
        cls._config = None
```

---

### 🔵 2. Kalpa 批量編織共用 Session 可能產生競態

**檔案**：`seonize-backend/app/services/kalpa_service.py` (L434-453)

```python
async def batch_weave_nodes(db: Session, node_ids, user_id):
    semaphore = asyncio.Semaphore(3)
    # 每個並發 Task 都用相同的 db session ← 危險
```

**問題**：SQLAlchemy Session 不是執行緒安全的，並發 coroutine 共享同一 Session 可能導致資料不一致。

**實作方案**：

```python
async def batch_weave_nodes(cls, node_ids, user_id):
    semaphore = asyncio.Semaphore(3)
    results = {"success": 0, "failed": 0, "total": len(node_ids)}

    async def task(node_id):
        async with semaphore:
            # 每個任務使用獨立 Session
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                await KalpaService.weave_node(db, node_id, user_id)
                results["success"] += 1
            except Exception as e:
                logger.error(f"Weaving failed: {e}")
                results["failed"] += 1
            finally:
                db.close()

    await asyncio.gather(*(task(nid) for nid in node_ids))
    return results
```

---

### 🔵 3. 前端 API 服務未實作請求取消機制

**檔案**：`seonize-frontend/src/services/api.ts`

**問題**：使用者快速切換頁面時，前一個頁面的 API 請求不會被取消，可能導致記憶體洩漏和狀態錯亂。

**實作方案**：

```typescript
// 新增 AbortController 支援
interface RequestOptions {
    // ... 現有欄位
    signal?: AbortSignal;  // 新增
}

// 在 Page 組件中使用
useEffect(() => {
    const controller = new AbortController();
    fetchData({ signal: controller.signal });
    return () => controller.abort();  // 清理
}, []);
```

---

## P4 — 可維護性與開發體驗

### 🟢 1. 遺留除錯檔案應清理

**檔案**：
- `seonize-backend/audit_cms_fix.py` — 一次性修復腳本
- `seonize-backend/debug_logs.py` — 除錯用腳本
- `seonize-backend/seonize_tmp.db` — 暫存資料庫
- `seonize-frontend/ .prettierrc` — 檔名有多餘空格

**實作方案**：
```bash
# 刪除遺留檔案
rm seonize-backend/audit_cms_fix.py
rm seonize-backend/debug_logs.py
rm seonize-backend/seonize_tmp.db
rm "seonize-frontend/ .prettierrc"  # 保留正確的 .prettierrc
```

---

### 🟢 2. 缺乏統一的日誌等級策略

**問題**：部分 service 使用 `print()` 而非 `logger`：

| 檔案 | 行號 | 問題 |
|------|:----:|------|
| `kalpa_service.py` | L556 | `print(f"Brainstorm failed: {str(e)}")` |
| `main.py` | L11 | `print("🚀 Seonize Backend...")` |

**實作方案**：統一改用 `logger.info/warning/error`，移除所有 `print()` 呼叫。

---

### 🟢 3. 前端缺乏路由級別的程式碼分割 (Lazy Loading)

**檔案**：`seonize-frontend/src/App.tsx`

**問題**：所有頁面在 `App.tsx` 中同步 import，首次載入時會下載全部 JavaScript 程式碼。

**實作方案**：

```tsx
import { lazy, Suspense } from 'react';

// 將每個頁面改為動態載入
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const KalpaPage = lazy(() => import('./pages/KalpaPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
// ...

function App() {
    return (
        <Suspense fallback={<div className="loading-screen">載入中...</div>}>
            <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* ... */}
            </Routes>
        </Suspense>
    );
}
```

---

### 🟢 4. 後端缺乏 Pydantic Request/Response Schema

**問題**：API 路由層大量使用字典傳入傳出，缺乏型別校驗：

```python
# 現狀：直接使用 dict
@router.post("/save")
async def save_matrix(data: dict, ...):
    project_name = data.get("project_name")  # 可能為 None
```

**實作方案**：

```python
# 建立 schemas/ 目錄
# app/schemas/kalpa.py
from pydantic import BaseModel, Field
from typing import List, Optional

class MatrixSaveRequest(BaseModel):
    id: Optional[str] = None
    project_name: str = Field(min_length=1, max_length=255)
    industry: str = "Crypto"
    money_page_url: str = ""
    entities: List[str]
    actions: List[str]
    pain_points: List[str]
    nodes: List[dict]
    cms_config_id: Optional[str] = None

class MatrixSaveResponse(BaseModel):
    success: bool
    matrix_id: str
```

---

### 🟢 5. `.gitignore` 應補充更多條目

**目前遺漏的項目**：

```gitignore
# 新增建議
*.db            # 所有 SQLite 資料庫
*.db-journal
*.db-wal
.env            # 確保環境變數不被提交
uploads/        # 使用者上傳檔案
__pycache__/
*.pyc
```

---

## P5 — 測試與品質保證

### ⚪ 1. 後端完全缺乏自動化測試

**現狀**：`seonize-backend` 沒有任何 `tests/` 目錄或測試檔案。

**實作方案（優先順序）**：

```
seonize-backend/tests/
├── conftest.py              # 測試夾具 (SQLite in-memory, mock AI)
├── test_auth.py             # 登入、註冊、Token 驗證
├── test_credit_service.py   # 扣點、退款、餘額檢查
├── test_kalpa_service.py    # 矩陣生成、合法性篩選
└── test_ai_service.py       # JSON 解析器、config 載入
```

**重點測試場景**：
1. `CreditService.deduct()` 扣點後餘額正確、`super_admin` 不扣點
2. `KalpaService.generate_matrix()` 排除規則過濾是否正確
3. `AIService._clean_json_string()` 各種邊界情況
4. API 認證中介軟體：無 Token / 過期 Token 應回傳 401

---

### ⚪ 2. 前端測試目錄為空

**現狀**：`seonize-frontend/src/test/` 目錄存在但沒有測試檔案，`vitest.config.ts` 已設定。

**實作方案（優先順序）**：

```
src/test/
├── setup.ts                    # Vitest 初始化
├── services/
│   └── api.test.ts             # API 層 mock 測試
├── context/
│   └── AuthContext.test.tsx     # 認證流程測試
└── components/
    └── CostConfirmModal.test.tsx
```

---

### ⚪ 3. 缺乏 E2E 測試與 CI/CD 整合

**建議**：
- 加入 Playwright 進行關鍵流程（登入 → 建立專案 → 生成大綱 → 寫作）的端到端測試
- GitHub Actions 設定 PR 檢查：lint + unit test + type check

---

## 實作優先排序建議

以下為建議的修復順序，依「影響範圍 × 風險等級」排列：

| 優先級 | 項目 | 估計工時 | 影響面 |
|:------:|------|:--------:|--------|
| 🔴 **1** | 修復預設密碼硬編碼 + 環境變數校驗 | 1h | 安全性 |
| 🔴 **2** | 修復全域異常洩漏內部資訊 | 0.5h | 安全性 |
| 🔴 **3** | 修復 CORS origin 校驗 | 0.5h | 安全性 |
| 🔴 **4** | 修復 JWT `utcnow()` 棄用 | 15m | 安全性 |
| 🟠 **5** | 新增 Kalpa Service `import math` | 5m | 執行錯誤 |
| 🟠 **6** | 移除 `window.refreshAuthUser` 反模式 | 30m | 架構 |
| 🟠 **7** | 統一 JSON 解析器 | 2h | 程式碼品質 |
| 🟠 **8** | 統一 DB Session 管理 | 1h | 架構 |
| 🔵 **9** | AI Config 加入 TTL 快取失效 | 1h | 效能 |
| 🟡 **10** | 拆分 KalpaPage.tsx | 4-6h | 可維護性 |
| 🟡 **11** | 新增 Pydantic Request Schema | 3-4h | 型別安全 |
| 🟡 **12** | ORM 加入 ForeignKey + Relationship | 3-4h | 資料完整性 |
| 🟢 **13** | 清理遺留檔案 + 統一 logger | 1h | 整潔度 |
| 🟢 **14** | 前端 Lazy Loading | 1h | 載入效能 |
| ⚪ **15** | 建立後端核心測試 | 4-6h | 品質保證 |
| ⚪ **16** | 建立前端測試 | 3-4h | 品質保證 |

> **總估計工時**：約 25-35 小時（建議分 3-4 Sprint 逐步實施）

---

*報告產出日期：2026-03-17*  
*審查工具：Antigravity AI Code Reviewer*
