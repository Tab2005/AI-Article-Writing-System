# 系統優化實作計劃 — 第二階段 (安全性與架構強化)

本階段將針對 `code_review_2026-03-17.md` 中剩餘的高優先級與品質改進項目進行實作，並優先處理安全性 (P0) 問題。

## 待執行優化項目清單

### [P0] 安全性問題 (優先處理)
- **P0-3**: JWT 使用已棄用的 `datetime.utcnow()`，切換至 `timezone.utc`。
- **P0-2**: 全域異常處理洩漏內部資訊，引入追蹤 ID 機制。
- **P0-1**: 強制設定金鑰，防止預設值洩漏。

### [P1] 架構與邏輯修正
- **P1-3**: 統一資料庫 Session 管理，改用 `get_db_context`。
- **P1-4**: 前端 `AuthContext` 改進，移除 `(window as any)` 反模式。
- **P1-5**: 修正 `kalpa_service.py` 遺漏的 `math` 導入。

### [P2] 程式碼品質建議
- **P2-1**: 移除 API 路由層內部的重複 import。
- **P2-4**: 統一 ORM `to_dict()` 的 ISO 時區處理邏輯。
- **P2-5**: 引入 `ExpirableMixin` 以減少 Cache Model 的重複代碼。
- **P2-7**: 確保 `httpx.AsyncClient` 始終使用 `async with`。

### [P4] 可維護性與清理
- **P4-1**: 清理遺留的除錯檔案與暫存資料庫。
- **P4-2**: 移除 `print()` 呼叫，統一使用 `logger`。

---

## 實作細節

### [Backend] 安全性與基礎設施

#### [MODIFY] [auth.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/core/auth.py)
- 更新 `create_access_token` 與 `decode_access_token` 以使用 `datetime.now(timezone.utc)`。

#### [MODIFY] [main.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/main.py)
- 更新全域異常處理器以隱藏具體錯誤堆疊，僅顯示 `error_id`。
- 重構 `lifespan` 以使用 `get_db_context()` 管理 Session。

#### [MODIFY] [db_models.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/models/db_models.py)
- 實作 `ExpirableMixin` 與 `_dt_to_iso` 輔助函數。
- 更新所有 Model 的 `to_dict` 方法。

### [Frontend] 認證與架構

#### [MODIFY] [AuthContext.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/context/AuthContext.tsx)
- 移除 `window.refreshAuthUser` 賦值。

#### [MODIFY] [KalpaPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/KalpaPage.tsx)
- 確保調用 `refreshUser()` 而非全域函數。

---

## 驗證計劃

### 自動化測試 (模擬)
- 檢查 JWT Token 生成的時區標籤。
- 刻意觸發後端錯誤，驗證 JSON 回傳中是否僅包含 `error_id` 而無代碼片段。

### 手動驗證
- 登入系統，檢查點數更新（驗證 `refreshUser` 正常運作）。
- 執行批量編織，確認無 `NameError: math`。
- 檢查 `seonize-backend` 目錄，確認除錯檔案已移除。
