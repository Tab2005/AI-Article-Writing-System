# 整合 smart-blog-skills 實作計劃

本計劃旨在將 `smart-blog-skills` 的核心功能（反幻覺寫作、品質審計、內容缺口分析）整合至現有的 `AI-Article-Writing-System` 中，提升系統的生成質量與 SEO 競爭力。

## 核心整合點

### 1. 反幻覺機制 (Anti-Hallucination)
- **現狀**: 系統目前僅擷取 SERP 數據，缺乏數據真實性驗證。
- **改進**: 
    - 實作三層驗證標籤：`[V]` (已驗證)、`[S]` (搜尋摘要)、`[F]` (讀取失敗)。
    - 新增 `research_service.py` 負責處理網頁完整抓取與數據交叉比對。
    - 在生成章節內容時，要求 AI 標註引用來源的驗證狀態。

### 2. 文章品質審計 (Quality Audit)
- **現狀**: 系統缺乏生成後的品質量化評估。
- **改進**:
    - 新增「文章健檢」功能，仿照 `/smart-blog-skills:analyze` 提供 100 分量化評分。
    - 評分項目包含：AI 偵測（句長爆發性、語態）、SEO 關鍵字密度、Answer-First 結構、數據引用比例。
    - 提供前 3 名改善建議與致命問題清單。

### 3. SERP 導向大綱與內容缺口分析
- **現狀**: 目前大綱生成基於 PAA 和相關搜尋，但缺乏深入的競品內容缺口分析。
- **改進**:
    - 強化 `generate_outline` 邏輯，分析搜尋前 5 名的標題結構與內容深度。
    - 產出「內容缺口報告」，明確指出競爭對手缺少的觀點。
    - 加入 E-E-A-T (經驗、專業、權威、信任) 策略建議。

### 4. 模板系統升級
- **現狀**: 系統已有 `PromptTemplate` 機制。
- **改進**:
    - 將 `smart-blog-skills` 中的 5 個內容模板（How-to, Comparison, News, etc.）整合進系統資料庫作為預設。
    - 升級寫作指令，強制執行 Answer-First 格式與反 AI 偵測規則。

## 預計修改檔案

### [Backend]
- [NEW] `app/services/research_service.py`: 實作數據驗證與反幻覺邏輯。
- [MODIFY] `app/services/ai_service.py`: 整合品質審計邏輯與內容缺口提示詞。
- [MODIFY] `app/services/serp_service.py`: 增加網頁深度抓取接口。
- [MODIFY] `app/alembic/versions/`: 新增資料庫遷移腳本，初始化預設模板。

### [Frontend]
- [MODIFY] `src/pages/WritingPage.tsx`: 新增「文章健檢」按鈕與分析結果顯示。
- [MODIFY] `src/pages/KalpaPage.tsx`: 在大綱生成階段顯示內容缺口分析結果。

## 驗證計劃

### 自動化測試
- 撰寫單元測試驗證 `research_service.py` 的驗證標籤邏輯。
- 模擬 SERP 數據測試 `ai_service.py` 的內容缺口分析輸出格式。

### 手動驗證
- 使用「如何用 AI 優化 SEO」作為關鍵字，產出一篇含 `[V]` 標籤的文章。
- 對現有舊文章執行「文章健檢」，驗證評分與建議的準確性。
