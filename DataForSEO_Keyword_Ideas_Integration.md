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
