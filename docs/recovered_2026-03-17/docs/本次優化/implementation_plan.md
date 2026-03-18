# P1~P4 剩餘項補完實作計劃

本計劃旨在完成 `code_review_2026-03-17.md` 中剩餘的重要優化項，重點在於減少組件耦合與提升型別安全。

---

## Proposed Changes

### [P2-6] 拆分 KalpaPage.tsx

#### [NEW] [TiandaoPanel.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/kalpa/TiandaoPanel.tsx)
- 抽取「天道解析」相關邏輯與 UI。

#### [NEW] [MatrixConfigPanel.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/kalpa/MatrixConfigPanel.tsx)
- 抽取「矩陣配置」相關 UI（實體、動作、痛點輸入）。

#### [NEW] [NodeTable.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/kalpa/NodeTable.tsx)
- 抽取「節點列表」與篩選邏輯。

#### [MODIFY] [KalpaPage.tsx](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/pages/KalpaPage.tsx)
- 重構主頁面以組合上述子組件。

---

### [P2-2] AI Service 重構

#### [MODIFY] [ai_service.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/ai_service.py)
- 新增 `_clean_json_string` 與 `_parse_ai_json` 統一解析邏輯。
- 將 `generate_outline` 與 `generate_ai_titles` 拆分為 Prompt 建立與邏輯呼叫。

---

### [P2-3] 前端 API 型別安全

#### [NEW] [admin.ts](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/types/admin.ts)
- 定義 `AdminStats` 與使用者更新介面。

#### [MODIFY] [api.ts](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-frontend/src/services/api.ts)
- 取代 `writingApi.analyzeQuality`、`adminApi` 等處的 `any` 型別。

---

### [P1-6] ORM 關聯加強

#### [MODIFY] [db_models.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/models/db_models.py)
- 為 `Project`、`KalpaNode` 等 Model 新增 `ForeignKey` 與 `relationship`。

---

## Verification Plan

### 自動化驗證
- 執行 `npm run build` 確保前端型別無誤。
- 執行後端導入測試確保 `AIService` 重構後語法正確。

### 手動驗證
- 進入 Kalpa 頁面確認 UI 模組化後功能依然正常。
