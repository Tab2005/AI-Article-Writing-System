# **Seonize (析優) 系統結構設計文件 v2.0**

## **1\. 系統願景與核心價值**

Seonize 是一款「數據驅動」的 AI SEO 撰寫系統。不同於一般的 AI 寫作工具，它透過反向工程 (Reverse Engineering) 搜尋引擎結果頁面 (SERP)，自動判定搜尋意圖並建立知識圖譜，確保生成的文章具備極高的競爭力與 GSC 擴散潛力。

## **2\. 系統架構圖 (System Architecture)**

### **A. 模組化層級**

1. **用戶交互層 (UI/UX)**:  
   * **關鍵字輸入控制台**: 提供核心關鍵字輸入框，以及動態延伸的次要關鍵字勾選區。支援設定搜尋國家與語言語系。  
   * **意圖與策略確認面板**: 顯示 SERP 分析結果，包含自動判定的搜尋意圖（如資訊型）、建議的寫作風格（如教育風）及 AI 優化後的候選標題。  
   * **互動式大綱編輯器**: 視覺化呈現 H2 與 H3 結構，支援拖拽排序、標題文字編輯及邏輯鏈條提示。  
   * **分段撰寫實時預覽器**: 採用雙欄式設計，左側顯示生成進度，右側即時渲染 Markdown 文章內容，並標註已嵌入的關鍵字。  
2. **業務邏輯層 (Backend)**: 採用 FastAPI 作為核心，管理 State 物件。  
3. **大數據研究層 (Research Engine)**: 串接 Google Search API、網頁爬蟲、以及 Google Ads 數據狀態檢查 (Data Status Check)。  
4. **AI 策略層 (Intelligence Engine)**: 意圖分析器、關鍵字提取器 (TF-IDF)、邏輯 Prompt 工廠。  
5. **內容生成層 (Writing Engine)**: 分段撰寫器 (Iteration Controller)。

## **3\. 詳細工作流程 (The Seonize Workflow)**

### **第一階段：數據採集與研究 (Research)**

* **輸入端**: 接收一個「核心關鍵字」。  
* **執行任務**:  
  * 透過 API 獲取 Google Top 10 網址、標題與 Snippet。  
  * 異步爬取 Top 10 網頁內容 (H1-H3 標籤及全文)。  
* **輸出**: Raw Competitor Data (原始競品數據)。

### **第二階段：意圖分析與策略建議 (Analysis & Strategy)**

* **意圖偵測**: 分析標題特徵語法 (如「如何」vs「推薦」)，判定四大意圖（資訊、商業、導航、交易）。  
* **關鍵字提取**: 使用 jieba.analyse 從競品內文提取高頻相關詞 (LSI Keywords)。  
* **風格匹配**: 根據意圖建議對應的寫作口吻（如教育風、評論風）。  
* **標題優化**: 生成 3-5 個具備高點擊率 (CTR) 的 H1 標題。  
* **用戶動作**: 使用者確認「意圖、風格、標題、及勾選延伸關鍵字」。

### **第三階段：知識圖譜大綱規劃 (Planning)**

* **邏輯鏈條生成**: 根據意圖類別（如 Informational），自動生成特定思考路徑（定義 \-\> 原理 \-\> 步驟）。  
* **大綱佈局**: 將關鍵字按權重分配至 H2/H3。  
* **AI 指令**: 呼叫 Prompt Engine 生成包含「因果連結」要求的高級指令。

### **第四階段：分段迭代撰寫 (Iterative Writing)**

* **Context 控制**: 每次僅撰寫一個 H2 章節，並帶入前文摘要 (State Caching)。  
* **關鍵字強制嵌入**: 確保 AI 在該段落中使用了預設的次要關鍵字。

### **第五階段：SEO 體檢與優化 (Optimization)**

* **指標檢查**: 字數、關鍵字密度、E-E-A-T 信號偵測。  
* **Meta 產出**: 生成 Meta Title/Description。

## **4\. 資料結構設計 (Data Schema)**

### **4.1 專案狀態物件 (ProjectState)**

{  
  "project\_id": "uuid",  
  "primary\_keyword": "想學減脂",  
  "intent": "informational",  
  "style": "專業教育風",  
  "selected\_title": "想學減脂必看！2026 最新科學指南",  
  "keywords": {  
    "secondary": \["減脂菜單", "蛋白質"\],  
    "lsi": \["熱量赤字", "BMR", "胰島素"\]  
  },  
  "outline": { "h1": "...", "sections": \[...\] },  
  "full\_content": ""  
}

## **5\. 核心演算法邏輯**

### **5.1 意圖判定邏輯 (Intent Logic)**

* **公式**: Score \= Σ (Title\_Keywords \* Weight) \+ Page\_Structure\_Signals  
* **範例**: 標題含「推薦」且頁面含大量 Link \-\> 重點標記為 Commercial。

### **5.2 關鍵字提取演算法 (Keyword Extraction Component)**

*   **次要關鍵字 (Secondary Keywords)**：
    *   **機制**：對 SERP Top 10 標題進行詞頻統計，提取能代表競品切入點的特徵修飾詞（如：公司、比較、評價）。
    *   **技術**：jieba 斷詞 + 詞頻過濾。
*   **LSI 關鍵字 (Latent Semantic Indexing)**：
    *   **機制**：從搜尋結果摘要 (Snippets) 中提取強相關背景詞。
    *   **技術**：TF-IDF (詞頻-逆文件頻率)，找出主題專屬詞。

### **5.3 關鍵字應用與價值**

*   **內容架構**：提供 H2/H3 副標題的切入點建議（例如：費用、流程）。
*   **語義深度**：透過嵌入 LSI 關鍵字，提高搜尋引擎對文章「專業度」與「主題涵蓋面」的評分。
*   **AI 寫作引導**：作為内容大綱生成與撰寫階段的關鍵參考數據，強制要求 AI 將這些詞融入生成內容中。


### **5.4 SEO 指標監測：動態關鍵字覆蓋率 (Dynamic Keyword Coverage)**

*   **指標公式**：Coverage % = (已出現在內容中的目標關鍵字組數 / 總目標關鍵字清單) * 100%
*   **清單組成**：整合核心關鍵字 (Primary)、次要關鍵字 (Secondary)、LSI 關鍵字以及大綱分配詞 (Outline Keywords)。
*   **實作機制**：
    *   **實時掃描**：前端每渲染一次內容，即執行一次 O(n*m) 的正則比對，計算原文中獨立出現的目標詞組。
    *   **高亮配合**：比對成功的詞組會被封裝在 `<mark class="keyword-highlight">` 標籤中，具象化 SEO 達成度。
*   **業務價值**：作為內容生成的質量門檻（Quality Gate），確保 AI 產出的內容不只是文筆流暢，更具備完整的知識圖譜涵蓋度。

## **6\. 技術棧 (Tech Stack) 建議**

* **Backend**: Python (FastAPI / Pydantic)  
* **Crawler**: Playwright (動態網頁) / httpx \+ BeautifulSoup  
* **NLP**: jieba (中文分詞) / Scikit-learn (TF-IDF)  
* **AI API**: Gemini 2.5 Flash / OpenAI GPT-4o  
* **Cache**: Redis (儲存 SERP 研究結果以節省費用)