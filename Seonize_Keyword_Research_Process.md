# Seonize 關鍵字研究與意圖分析流程架構

本文件定義了系統在處理關鍵字分析時的後端邏輯流程，包含 **關鍵字擴充 (Keyword Ideas)** 與 **語義意圖獲取 (SERP Intent)** 兩大核心模組。

---

## 1. 總體流程圖

```mermaid
graph TD
    A[使用者輸入關鍵字] --> B{檢查資料庫快取}
    
    subgraph "第一階段：關鍵字擴充 (Google Keywords API)"
    B -- 快取失效/不存在 --> C1[調用 Keyword Ideas API]
    C1 --> D1[提取主要關鍵字數據]
    C1 --> E1[獲取相關長尾詞清單]
    D1 & E1 --> F1[更新 KeywordCache 資料表]
    B -- 快取有效 --> G1[從資料庫讀取 KeywordCache]
    end
    
    subgraph "第二階段：語義意圖 (Google SERP API)"
    B -- 快取失效/不存在 --> C2[調用 SERP Advanced API]
    C2 --> D2[解析 PAA 問題清單]
    C2 --> E2[解析相關搜尋詞彙]
    D2 & E2 --> F2[更新 SerpCache 資料表]
    B -- 快取有效 --> G2[從資料庫讀取 SerpCache]
    end
    
    F1 & G1 & F2 & G2 --> H[整合數據並回傳前端]
```

---

## 2. 模組詳細說明

### 模組 A：關鍵字擴充與數據獲取
*   **用途**：獲取商業價值數據（搜尋量、CPC、競爭度）並自動生成長尾詞。
*   **API 節點**：`keywords_data/google_ads/keyword_ideas/live`
*   **快取策略**：使用 `KeywordCache` 表。
    *   **生命週期**：預設為 30 天。
    *   **儲存結構**：核心數據 (`seed_data`) + 建議清單 (`suggestions`)。

### 模組 B：語義意圖與知識點獲取
*   **用途**：透過 SERP 反向工程，獲取用戶真實問題 (PAA) 與搜尋聯想。
*   **API 節點**：`serp/google/organic/live/advanced`
*   **快取策略**：使用 `SerpCache` 表。
    *   **生命週期**：預設為 7 天（SERP 變動較快）。
    *   **儲存結構**：包含有機結果、AI Overview、PAA 問答、相關搜尋。

---

## 3. 性能與成本優化
1.  **快取優先 (Cache-First)**：系統會先詢問資料庫，這將 90% 以上的重複搜尋成本降至 0。
2.  **異步處理 (Asynchronous)**：兩段 API 調用均使用 `httpx` 進行非同步處理，確保系統在高併發下的效率。
3.  **單筆計費極大化**：透過正確配置參數，一次 API 調用即可抓取最完整的資料（例如 Keyword Ideas 一次抓取 1000 個詞，SERP Advanced 一次抓取所有廣告、有機與擴展元件）。

---

## 4. 未來擴展方向
*   **一鍵式 API (Consolidated API)**：未來可開發一個單一的 Backend Endpoint，同時啟動這兩個任務並整合後回傳，減少前端發送多次 Request 的負擔。
*   **自動更新機制**：偵測到快取過期時，可於背景自動重新抓取最新的 SEO 指標。
