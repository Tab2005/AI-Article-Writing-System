# Seonize 系統 DataForSEO API 整合手冊

本文件整理了目前系統中使用的三大核心 API 及其能抓取的詳細資料欄位。

---

## 1. SERP Advanced API
**路徑**: `serp/google/organic/live/advanced`
**預算消耗**: $0.002 / 關鍵字
**觸發時機**: 建立專案後、執行意圖分析。

### 可抓取數據內容：
*   **搜尋引擎特徵 (SERP Features)**: 偵測頁面中是否有購物廣告、地圖、評論、影片、知識圖譜等。
*   **有機搜尋結果 (Organic Items)**:
    *   `Title` & `URL`: 網頁標題與連結。
    *   `Description`: Google 產生的網頁摘要。
    *   `Rank Absolute`: 考慮廣告與特徵後的絕對排名位置。
    *   `Sitelinks`: 該結果下的子鏈接清單。
    *   `FAQ`: 該結果在搜尋頁直接展開的常見問答清單。
    *   `Rating`: 評論分數、星級與投票總數。
    *   `Price`: 商品價格、幣別與庫存狀態。
*   **大家也常問 (People Also Ask)**: 一組相關問題、簡答與來源 URL。
*   **相關搜尋 (Related Searches)**: 頁面底部的相關意圖詞。
*   **流量指標數據**: 該網址的預估月流量與平均點擊成本 (Estimated Traffic)。

---

## 2. Keywords for Keywords API
**路徑**: `keywords_data/google_ads/keywords_for_keywords/live`
**預算消耗**: $0.002 / 請求 (可包含大量建議詞)
**觸發時機**: 關鍵字研究分頁、尋找相關詞。

### 可抓取數據內容：
*   **建議詞清單**: 基於核心詞延伸出的上百個相關關鍵字。
*   **搜尋趨勢數據 (Search Volume)**:
    *   `Monthly Searches`: 過去 12 個月的月均搜尋量趨勢。
    *   `Average Monthly Searches`: 年度月均值。
*   **競爭與商業指標**:
    *   `Competition`: 近似競爭難度（0-100）。
    *   `CPC (Low/High Band)`: Google Ads 廣告的出價範圍。
*   **關聯度評分 (Relevance)**: 該詞與核心種子詞的語意關聯分數。

---

## 3. On-Page API
**路徑**: `on_page/task_get` (Real-time Parsing)
**預算消耗**: $0.002 / URL
**觸發時機**: 點擊「執行深度拆解」按鈕。

### 可抓取數據內容：
*   **HTML 結構拆解**:
    *   `H-Tags (H1-H6)`: 完整抓取該網址所有的標題層級與文字內容。
    *   `Title Tag`: 原始 HTML 中的標題。
    *   `Meta Description`: 原始 HTML 中的描述。
*   **內容統計 (Content Stats)**:
    *   `Word Count`: 整篇網頁的預估總字數。
    *   `Images Count`: 頁面內的圖片總數量。
*   **技術數據**:
    *   `Response Time`: 該伺服器的響應時間。
    *   `Content Encoding`: 網頁編碼格式。
*   **頁面健康度**: 偵測死鏈接、重定向狀態等。

---

## 💡 整合建議邏輯表

| 指標需求 | 推薦 API | 成本 | 備註 |
| :--- | :--- | :--- | :--- |
| 我該選哪個關鍵字？ | **Keywords for Keywords** | $0.002 | 依據流量與 CPC 決定。 |
| 對手是誰？排第幾？ | **SERP Advanced** | $0.002 | 了解市場競爭格局。 |
| 對手文章怎麼寫的？ | **On-Page API** | $0.002 | 拆解對手文章骨架 (H2/H3)。 |
| 這個詞有商機嗎？ | **SERP Advanced** | $0.002 | 查看是否有價格、評論與購物廣告。 |
