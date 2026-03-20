# Oracle Weaver V3 升級計劃 (Oracle Weaver V3 Upgrade Plan)

本計劃旨在深度優化「神諭編織」系統，實現「全產業動態人格」切換邏輯，並強化 GEO (Generative Engine Optimization) 與 AIO (AI Overview Optimization) 結構。

## 1. 全產業動態人格 (Dynamic Multi-Personality)

根據 `產業主題 (industry)` 與 `痛點 (pain_point)` 雙重維度動態模板化人格設定。解決目前人格過於偏向加密貨幣的問題。

### 動態人格矩陣模板
| 痛點類別 | 通用角色模板 | 語氣說明 |
| :--- | :--- | :--- |
| **失敗/故障** | {industry} 技術專家 | 專業、簡潔、邏輯性極強，專注於『錯誤碼解讀』與『逐步修復』。 |
| **風險/安全** | {industry} 安全顧問 | 嚴謹、安撫性強、極具權威感，專注於針對 {industry} 的安全協議。 |
| **效率/延遲** | {industry} 進度引路人 | 口語化、耐心，使用生活化比喻（如塞車）化解焦慮。 |
| **預設** | {industry} 領域專家 | 專業、平衡、全面，提供 2026 年最新優化建議。 |

## 2. GEO & AIO 結構化優化

優化 `system_prompt` 以要求 AI 生成更具針對性的結構：
- **📋 摘要卡片 (TL;DR Summary)**：置於文章最開頭，提供 100 字內的核心解答。
- **🎯 直接答案片段 (Direct Answer Snippet)**：在 H2/H3 下方緊接著提供精煉回答，提高搜尋引擎抓取機率。
- **💡 專家洞察 (Expert Insight)**：隨機插入具有深度的專業見解。
- **❓ 結構化 FAQ**：結尾前增加常見解答區塊，符合 AIO 摘要偏好。

## 3. 實作步驟

### 後端實作 (`seonize-backend/app/services/kalpa_service.py`)

- **更新 `_get_weaving_persona(pain_point, industry)`**：改為接受兩個參數，並使用動態模板。
- **更新 `weave_node`**：整合產業變數，升級寫作指令。

## 4. 驗證

- 使用美妝、法律、母嬰等不同行業進行測試。
- 檢查生成的內容是否完全去除了硬編碼的加密貨幣術語。
