# SERP 競爭對手情報與搜尋意圖解析實作計畫

本計畫旨在深度整合 **DataForSEO Google Organic SERP API**，將「現狀競爭分析」引入 Seonize 的寫作流程中，使 AI 產出的內容不僅具備流量潛力，更能精準擊敗目前的搜尋結果。

## 🎯 核心目標

1.  **競爭對手標題結構反查**：自動抓取 SERP 前 10 名的文章架構（H2/H3），供 AI 大綱生成時參考。
2.  **精確搜尋意圖驗證**：分析 Google 搜尋結果頁面（SERP）出現的元素（如影片、百科、購買連結），精準判定意圖。
3.  **內容缺口 (Content Gap) 預判**：對比前人不足之處，自動生成「獨家觀點」建議。

## 🛠️ 預計變更

### 1. 後端服務層 (Backend)

#### [MODIFY] [dataforseo_service.py](file:///d:/users/Qoo/Documents/python/AI-Article-Writing-System/seonize-backend/app/services/dataforseo_service.py)
- 新增 `get_competitive_intelligence` 方法，調用 `serp/google/organic/live/advanced`。
- 提取 `items` 中的 `title`、`url` 以及 `description`。
- **功能擴充**：評估是否能利用 DataForSEO 的 `html_content` 抓取功能來解析競爭對手的 H 標籤結構。

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

## 📅 未來路線圖

- [ ] 第一階段：實作 SERP 前十名標題結構抓取。
- [ ] 第二階段：整合搜尋意圖自動校正邏輯。
- [ ] 第三階段：實作「內容缺口」AI 建議功能。
