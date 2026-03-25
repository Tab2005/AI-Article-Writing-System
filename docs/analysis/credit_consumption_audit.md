# 點數消耗配置與 API 接口對照審計報告 (Audit Report)

本報告針對系統中的「等級與點數消耗配置 (DEFAULT_CREDIT_CONFIG)」與「後端 API 實際執行路徑」進行交叉比對，旨在找出目前計費系統中的定義、實際扣點情況及潛在的漏項。

---

## 1. 已映射功能 (已定義點數並有 API 扣點)

以下功能已在 `DEFAULT_CREDIT_CONFIG` 中定義，且後端 API 已實作 `CreditService.deduct()` 邏輯。

| 功能名稱 (Config Key) | 點數消耗 | 資源消耗類型 | 對應 API 接口 (Method & Path) | 備註 |
| :--- | :---: | :--- | :--- | :--- |
| **serp_query** | 2 | DataForSEO / SERP API | `POST /research/serp` | 僅在非快取命中 (Cache Miss) 時扣點 |
| **dataforseo_keywords**| 3 | DataForSEO | `GET /research/keywords` | 僅限 Lv.2 一般會員以上存取 |
| **ai_intent_analysis** | 2 | **AI 模型** | `POST /analysis/intent` | 與 `/research/intent` 共用此配置 |
| **create_outline** | 5 | **AI 模型** | `POST /analysis/outline` | AI 完整大綱生成 |
| **competitor_analysis**| 3 | 伺服器抓取 / DataForSEO | `POST /writing/projects/{id}/analyze-competition` | 深度競品頁面抓取與結構分析 |
| **content_gap_analysis**| 3 | **AI 模型** | `POST /analysis/content-gap` | AI 內容缺口與 EEAT 建議報告 |
| **writing_section** | 5 | **AI 模型** | `POST /writing/generate-section` | AI 單段文章撰寫 |
| **writing_full** | 20 | **AI 模型** | `POST /writing/generate-full` | 四階段一致性生成，限 Lv.2 以上 |
| **writing_optimize** | 5 | **AI 模型** | `POST /writing/seo-check` | 即時 SEO 體檢與 AI 優化建議 |
| **quality_audit** | 3 | **AI 模型** | `POST /writing/analyze-quality` | 深度文章品質與 AI 偵測審計 |
| **kalpa_brainstorm** | 3 | **AI 模型** | `POST /kalpa/brainstorm` | 天道解析：AI 矩陣要素建議 |
| **kalpa_weave_node** | 8 | **AI 模型** | `POST /kalpa/weave/{node_id}` | Kalpa 單節點文章編織 |
| **kalpa_batch_weave** | 8 | **AI 模型** | `POST /kalpa/batch-weave` | 批量編織，Lv.3 深度會員享階梯折扣 |
| **image_stock_search** | 1 | Pexels / Pixabay API | `GET /images/search` | 對接 Pexels/Pixabay 等圖庫搜尋 |

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
| **關鍵字清單建議** | `POST /research/keyword-ideas` | DataForSEO | 此接口會獲取大量關聯詞數據，建議計費。 |
| **AI 標題建議生成** | `POST /research/generate-titles` | **AI 模型** | 使用 AI 產出 5-10 組標題，目前免費。 |
| **文章戰略藍圖生成** | `POST /writing/blueprint` | **AI 模型** | 雖然 `generate_full` 會用到，但此為獨立接口。 |
| **全篇集成審核** | `POST /writing/review` | **AI 模型** | 進行全篇潤色與優化，消耗大量 Token。 |
| **圖片 Alt/Caption 建議** | `GET /images/metadata-suggestion`| **AI 模型** | 使用 AI 分析內容並產出圖片中繼資料。 |
| **CMS 文章正式發布** | `POST /cms/publish` | 伺服器 I/O / 第三方 API | 目前發布至 WP/Ghost 不扣點。 |

---

## 4. 特殊規則說明 (Feature Access)

除了點數消耗外，系統還實作了「等級門檻限制」：

*   **全文生成 (writing_full)**：限 Lv.2 (一般會員) 以上。
*   **關鍵字數據 (dataforseo_keywords)**：限 Lv.2 (一般會員) 以上。
*   **Kalpa 批量編織 (kalpa_batch_weave)**：限 Lv.3 (深度會員) 以上，且享有 70%~85% 的折扣。
*   **CMS 存取 (cms_access)**：定義於配置但 API 目前未強制擋掉 Lv.1。

---
*審計執行時間：2026-03-25*
