# AI 動態矩陣過濾器：【慧眼識珠】 (Dynamic Keyword Filter) 實作計畫

本計畫旨在將「慧眼識珠」過濾器從硬編碼模式轉向**AI 動態驅動模式**。系統將在「天道解析」階段自動識別產業邏輯，生成專屬的排除規則，確保跨產業的矩陣推演皆能維持高度的邏輯嚴密性。

## 核心優化目標
1. **產業自適應**：不再侷限於加密貨幣，任何主題（如：電商、房產、法律）皆能自動產生邏輯排除規則。
2. **用戶可控性**：前端將展示 AI 建議的過濾規則，用戶可進行微調，增加靈活性。
3. **流程自動化**：在「一鍵推演」過渡中，自動捕捉並應用這些動態規則。

## 提議變更

### [Backend]

#### [MODIFY] [kalpa_service.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/kalpa_service.py)
- **`brainstorm_elements`**：
    - 更新 System Prompt，要求 AI 回傳第 5 個欄位：`exclusion_rules` (JSON Object)。
    - 指導 AI 識別實體與動作/痛點間的邏輯矛盾（例如：手機 -> 入金）。
- **`generate_matrix`**：
    - 移除硬編碼的 `EXCLUSION_RULES` 常數。
    - 函式簽名增加 `exclusion_rules: Optional[Dict[str, List[str]]]` 參數。
    - 優先使用傳入的規則進行過濾，若無則不執行過濾（或使用最小通用集）。

#### [MODIFY] [kalpa.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/api/kalpa.py)
- **`KalpaGenerateRequest`**：增加 `exclusion_rules` 欄位。

### [Frontend]

#### [MODIFY] [KalpaPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/KalpaPage.tsx)
- **狀態管理**：新增 `exclusionRules` state。
- **天道解析整合**：
    - 接收 AI 回傳的建議規則並即時展示。
    - `applyTiandaoSuggestions` 邏輯包含同步規則至主狀態。
- **進階設定 UI**：
    - 在「進階標題設定」折疊區內增加「過濾邏輯設定」區塊。
    - 使用代碼區塊或 Tag 形式呈現當前過濾規則。
- **API 呼叫**：在生成矩陣時將 `exclusionRules` 傳送至後端。

## Verification Plan

### Automated Verification
- 測試多種主題（如：法律諮詢、線上教學），檢查 AI 是否能產出合理的 `exclusion_rules`（例如：法律諮詢 -> 入金：不合理）。

### Manual Verification
- 執行「天道解析」，檢查「進階設定」中是否出現對應的動態規則。
- 修改規則，手動加入一條排除規則（如：實體 A -> 動作 B），執行生成後確認 B 動作從 A 實體下消失。
