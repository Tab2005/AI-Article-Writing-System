# 點數消耗配置與 API 接口對照審計報告 (Audit Report)

本報告針對系統中的「等級與點數消耗配置 (DEFAULT_CREDIT_CONFIG)」與「後端 API 實際執行路徑」進行交叉比對，旨在找出目前計費系統中的定義、實際扣點情況及潛在的漏項。

---

## 1. 已映射功能 (已定義點數並有 API 扣點)

以下功能已在 `DEFAULT_CREDIT_CONFIG` 中定義，且後端 API 已實作 `CreditService.deduct()` 邏輯。

| 功能名稱 (Config Key) | 點數消耗 | 資源消耗類型 | UI 顯示功能名稱 | 備註 |
| :--- | :---: | :--- | :--- | :--- |
| **serp_query** | 2 | DataForSEO / SERP API| **執行研究 (搜尋)** | 僅在非快取命中 (Cache Miss) 時扣點 |
| **dataforseo_keywords**| 3 | DataForSEO | **關鍵字成交數據** | 獲取特定關鍵字的搜尋量、CPC 與難度 |
| **research_keyword_ideas**| 3 | DataForSEO | **關鍵字建議獲取** | *(新實作)* 獲取關聯詞與 Ads 競爭狀態數據 |
| **research_generate_titles**| 2 | **AI 模型** | **AI 標題建議生成** | *(新實作)* 生成 5-10 組 AI 標題建議 |
| **ai_intent_analysis** | 2 | **AI 模型** | **AI 意圖與策略分析** | 分析關鍵字搜尋動機 (如：資訊型) 並建議風格 |
| **create_outline** | 5 | **AI 模型** | **生成大綱** | 根據研究數據產出文章階層結構 |
| **competitor_analysis**| 3 | 伺服器抓取 / DataForSEO | **競品深度分析** | 抓取搜尋結果前 5 名網頁的真實結構與內容 |
| **content_gap_analysis**| 3 | **AI 模型** | **內容缺口報告** | 分析競品沒寫到的主題並提供 EEAT 建議 |
| **writing_section** | 5 | **AI 模型** | **開始/重新撰寫 (單段)**| 生成指定章節的內容 |
| **writing_full** | 20 | **AI 模型** | **一鍵全篇生成** | 四階段一致性寫作引擎，限 Lv.2 以上 |
| **writing_blueprint** | 5 | **AI 模型** | **文章戰略藍圖生成** | *(新實作)* 四階段寫作的核心風格引導 |
| **writing_review** | 5 | **AI 模型** | **全篇集成審核** | *(新實作)* 潤色與優化全文，消耗大量 Token |
| **writing_optimize** | 5 | **AI 模型** | *(後端 API 備用)* | **SEO 體檢與建議**：目前前端僅顯示數據，尚未呼叫 AI 優化 |
| **quality_audit** | 3 | **AI 模型** | **🔍 品質健檢 (按鈕)** | **深度文章品質審計**：包含 AI 偵測、EEAT 評分與改善建議 |
| **kalpa_brainstorm** | 3 | **AI 模型** | **天道解析 (Brainstorm)** | 根據主題生成矩陣要素 (實體、動作、痛點) |
| **kalpa_weave_node** | 8 | **AI 模型** | **神諭編織 (單節點)** | 為矩陣節點生成對應文章 |
| **kalpa_batch_weave** | 8 | **AI 模型** | **神諭編織 (批量)** | 批量成稿，Lv.3 深度會員享階梯折扣 |
| **image_stock_search** | 1 | Pexels / Pixabay API | **圖庫搜尋 / 插入圖片**| 在撰寫頁面內部的圖片搜尋與獲取 |
| **image_metadata_suggestion**| 2 | **AI 模型** | **圖片 Alt/Caption 建議**| *(新實作)* AI 產出圖片中繼資料 |

---

## 2. 幽靈配置 (已定義但無 API 使用)

以下功能在配置中存在，但目前全系統 API 均**未呼叫**相關扣點邏輯，建議移除或補上功能。

| 功能名稱 (Config Key) | 點數消耗 | 資源消耗類型 | 現地狀態 |
| :--- | :---: | :--- | :--- |
| **cms_ai_schedule** | 2 | **AI 模型** | 配置中存在，但 `POST /cms/publish` 目前為免費路徑。 |

---

## 3. 缺失配置 (有 API 消耗資源但未計費)

以下功能目前**會消耗外部資源**，但在點數配置中**尚未被納入扣點**（目前為免費使用），這可能導致維運成本風險。

| 功能點名稱 | API 路徑 (Endpoint) | 資源消耗類型 | 建議 |
| :--- | :--- | :--- | :--- |
| **CMS 文章正式發布** | `POST /cms/publish` | 伺服器 I/O / 第三方 API | 發布至外部平台，目前屬維運成本。 |

---

## 4. 特殊規則說明 (Feature Access)

除了點數消耗外，系統還實作了「等級門檻限制」：

*   **全文生成 (writing_full)**：限 Lv.2 (一般會員) 以上。
*   **關鍵字數據 (dataforseo_keywords)**：限 Lv.2 (一般會員) 以上。
*   **Kalpa 批量編織 (kalpa_batch_weave)**：限 Lv.3 (深度會員) 以上，且享有 70%~85% 的折扣。
*   **CMS 存取 (cms_access)**：定義於配置但 API 目前未強制擋掉 Lv.1。

---
*審計執行時間：2026-03-25*
