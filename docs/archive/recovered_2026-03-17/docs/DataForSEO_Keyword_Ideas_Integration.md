# DataForSEO Keyword Ideas & Cache 實作紀錄與計劃

本文件整合了關鍵字建議 (Keyword Ideas) 功能的設計計劃與實作細節。

---

## 1. 實作概述
本功能升級了 `DataForSEOService`，使其能夠透過單一 API 調用獲取核心關鍵字的精準數據以及相關的長尾關鍵字建議，並實作了資料庫快取機制以優化成本與效能。

### 核心變更內容
#### [Backend]
- **`db_models.py`**: 新增了 `KeywordCache` 資料表，用於儲存關鍵字研究結果。
- **`dataforseo_service.py`**: 新增了 `get_keyword_ideas` 方法，實作了「檢查快取 -> API 調用 -> 自動存入快取」的完整流程。

---

## 2. 資料庫模型 (Database Model)
`KeywordCache` 資料表欄位設計：
- `keyword`: 核心關鍵字。
- `location_code` & `language_code`: 搜尋維度。
- `seed_data`: 核心詞的搜尋量、CPC、競爭度等精準數據 (JSON)。
- `suggestions`: 相關長尾關鍵字建議清單 (JSON)。
- `expires_at`: 快取過期時間（預設為 30 天）。

---

## 3. 調用說明 (Usage Guide)

未來在專案流程中調整時，可直接調用以下非同步方法：

```python
from app.services.dataforseo_service import DataForSEOService

# 示例：獲取關鍵字建議
results = await DataForSEOService.get_keyword_ideas(
    keyword="你的關鍵字",
    db=db_session  # 傳入 SQLAlchemy Session 以啟用快取
)

# 回傳結果結構：
# {
#     "seed_keyword_data": {...}, # 原關鍵字精準數據
#     "suggestions": [...],        # 長尾詞建議列表
#     "from_cache": True/False    # 是否來自資料庫
# }
```

---

## 4. 階段二：語義意圖獲取 (SERP Intent Extraction)

### 需求目標
從 Google SERP 結果中提取 **People Also Ask (PAA)** 與 **相關搜尋 (Related Searches)**，作為 AI 撰寫文章時的知識點參考。

### 實作內容
#### [Backend]
- **`dataforseo_service.py`**: 
  - 修改 `_parse_serp_response` 方法，增加對 `people_also_ask` 與 `related_searches` 類型的解析。
  - 確保 `get_serp_results` 回傳內容包含 `paa` (問題清單) 與 `related_searches` (詞彙清單)。

### 調用範例
```python
results = await DataForSEOService.get_serp_results(keyword="SEO 技巧")
paa_list = results.get("paa") # ["PAA 問題 1", "PAA 問題 2", ...]
related_searches = results.get("related_searches") # ["相關搜尋 1", "相關搜尋 2", ...]
```

---

## 5. 驗證計劃
- **自動化測試**：撰寫測試腳本驗證 PAA 與相關搜尋的欄位是否有正確提取。
- **人工驗證**：檢查回傳的 JSON 結構是否符合 DataForSEO 最新規範。

---

## 6. 數據量規約與優化參考 (Data Volume Specs)

本節紀錄單次 API 抓取的數據深度，作為未來系統優化與前端顯示壓力測試的參考。

| 功能類別 | 數據來源 | 單次抓取量 (現行) | 優化建議 |
| :--- | :--- | :--- | :--- |
| **長尾建議詞** | Google Ads API | **100~700+ 筆** | 若資料庫膨脹過快，可於後端加入 `limit` 限制。 |
| **PAA 問題** | Google SERP | **3~5 題** | 第一頁原始數據，數量穩定，適合做摘要生成。 |
| **相關搜尋** | Google SERP | **8 筆** | 適合用於 LSI 關鍵字擴充，數量固定。 |

### 優化方向
1. **清理機制**：目前快取預設 30 天，當 `KeywordCache` 超過一定筆數時，可實作 LRU 清理。
2. **分頁加載**：前端 `DataTable` 目前一次渲染所有建議詞，若單次關鍵字產生超過 1000 筆時，應考慮後端分頁。
3. **數據過濾**：可根據 `search_volume` 設定門檻，僅儲存大於一定值的長尾詞以節省空間。
---

## 7. Google Ads 數據更新狀態 (Google Ads Data Status)

本功能整合了 Google 官方數據庫的發佈進度，幫助使用者判斷當前搜尋量指標的時效性。

### 數據定義
系統同時呈現兩種「時間」維度：
1. **全域狀態 (Global Status)**：指 Google 整個關鍵字資料庫目前完整統計至哪一個月份。
2. **個體抓取時間 (Fetch Time)**：指本系統上一次與 DataForSEO 對接並獲取該特定關鍵字數據的時間。

### 實作細節 [Backend]
- **API 端點**：`/keywords_data/google_ads/status`
- **觸發機制**：每次執行關鍵字研究請求時，異步併發調用狀態端點。
- **回傳內容**：
  - `actual_data`: 布林值。`True` 代表上個月數據已發佈；`False` 代表 Google 正在更新中。
  - `date_update`: Google 最後寫入資料庫的實際日期。
  - `last_year` & `last_month`: 目前資料庫統計涵蓋的最新月份。

### 前端指標 [Frontend]
- **顯示位置**：關鍵字研究結果頁面的狀態列。
- **狀態標籤**：
  - `(已更新)`：對應 `actual_data: True`。
  - `(發佈中)`：對應 `actual_data: False`，提示目前數據可能存在延遲。
- **時效性提示**：若「數據抓取時間」晚於「Google 資料庫更新時間」或超過 7 天，系統將提示使用者點擊「重新整理」。
