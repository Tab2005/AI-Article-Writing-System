# SERP 競爭對手情報與搜尋意圖解析實作計畫

本計畫旨在深度整合 **DataForSEO Google Organic SERP API**，將「現狀競爭分析」引入 Seonize 的寫作流程中，使 AI 產出的內容不僅具備流量潛力，更能精準擊敗目前的搜尋結果。

## 🎯 核心目標

1.  **競爭對手標題結構反查**：透過 **兩階段抓取 (Two-Stage Crawling)**，先取得搜尋網址，再深入對手網頁內部提取 H2/H3 大綱結構。
2.  **精確搜尋意圖驗證**：利用 **Advanced SERP Features**（如購物卡片、影片清單、本地地圖）進行物證分析，自動判定搜尋意圖。
3.  **內容缺口 (Content Gap) 預判**：對比前人不足之處，自動生成「獨家觀點」建議。

## 🔬 技術原理說明

### 現有 API (Advanced) vs. 規劃功能
目前系統使用的 `serp/google/organic/live/advanced` 被稱為「進階 (Advanced)」，是因為它提供了 Google 搜尋頁面上的 **所有特徵元 (SERP Features)**，例如 PAA (People Also Ask)、AI Overviews、相關搜尋。

然而，要抓取對手文章內部的「骨架」，需要整合 **DataForSEO On-Page API**。

| 層次 | 調用 API 端點 | 獲取數據內容 |
| :--- | :--- | :--- |
| **第一層：搜尋情報** | `serp/google/organic/live/advanced` | 標題、描述、PAA、AI Overviews、SERP 特徵 |
| **第二層：站內結構** | `on_page/task_post` 或 `on_page/live/html` |文章內部的 H2、H3、內文長度、圖片數量 |

## 🛠️ 預計變更

### 1. 後端服務層 (Backend)

#### [MODIFY] [dataforseo_service.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/dataforseo_service.py)
- **第一階段**：封裝 `get_serp_features`，解析 PAA 之外的 SERP 特徵（如購物、地圖、影片）以供意圖判定。
- **第二階段**：實作 `get_page_structure(url)`，調用 On-Page API 取得特定 URL 的 H 標籤列表。
- 提取 `items` 中的 `title`、`url` 以及 `description`。

#### [MODIFY] [ai_service.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/ai_service.py)
- 更新 `generate_outline` 指令邏輯：將抓取到的競爭對手標題清單作為「避開雷同」或「包含核心內容」的參考基準。

### 2. 前端開發 UI

#### [NEW] `CompetitiveAnalysisCard.tsx`
- 在關鍵字研究或意圖分析頁面新增一個卡片，展示目前排名前十名的網站及其預估價值。

---

## 📈 預期效益

- **大綱品質提升**：AI 不再是閉門造車，而是根據目前搜尋引擎「喜歡」的內容結構進行優化。
- **差異化競爭**：系統能指出：「前五名都沒提到 X 點，建議您的文章包含這部分以獲得競爭優勢」。
- **決策輔助**：透過 `estimated_paid_traffic_cost` 等指標，讓使用者判斷投入該關鍵字寫作的經濟價值。

## � API 點數與成本優化 (Cost & Optimization)

是的，這採取 **「分開計費」** 模式。SERP API 與 On-Page API 是不同的產品，消耗點數的路徑如下：

- **第一階段 (SERP)**：消耗 1 次 SERP API 點數（約 $0.0006 - $0.002）。
- **第二階段 (On-Page)**：根據您要分析的對手數量，每個網址消耗約 1 次 On-Page 點數（約 $0.000125 / 頁）。

### 成本優化策略：
為了節省您的額度，計畫中預計採用以下機制：
1.  **按需分析 (On-Demand)**：預設不開啟深度抓取，僅當使用者點擊「深度分析競爭對手」按鈕時才執行。
2.  **精確採樣**：僅分析 SERP 排名前 **3 或 5 名** 的核心對手，而非全部 10 名。
3.  **持久化快取**：同一關鍵字的對手結構一旦抓取，將儲存在資料庫 30 天，避免短期內重複點費。

---

## �📅 未來路線圖

- [ ] 第一階段：實作 SERP 前十名標題結構抓取。
- [ ] 第二階段：整合搜尋意圖自動校正邏輯。
- [ ] 第三階段：實作「內容缺口」AI 建議功能。
