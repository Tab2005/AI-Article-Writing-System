# Seonize 系統檢查與優化紀錄

更新日期：2026-01-30

## 1) 全面檢查與可優化項目（含位置）

A. Debug/敏感資訊輸出過多
- 設定測試 API 內含調試輸出與敏感片段顯示：
  - [seonize-backend/app/api/settings.py](seonize-backend/app/api/settings.py)
- SERP 設定讀取與 providers 狀態大量 debug print：
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)

B. SERP 失敗時使用 mock 回傳，容易掩蓋真實錯誤
- SERP 搜尋失敗後直接回 mock：
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)
- 前端關鍵字研究失敗後使用 mock：
  - [seonize-frontend/src/pages/KeywordPage.tsx](seonize-frontend/src/pages/KeywordPage.tsx)

C. SERP Provider fallback 行為可能與使用者選擇不一致
- 指定 provider 不完整仍 fallback 到其他 provider：
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)

D. 核心功能仍是 mock/TODO
- 關鍵字抽取仍為 mock：
  - [seonize-backend/app/api/analysis.py](seonize-backend/app/api/analysis.py)
- SERP 內容爬取為 mock：
  - [seonize-backend/app/api/research.py](seonize-backend/app/api/research.py)
- 內容生成為 mock：
  - [seonize-backend/app/api/writing.py](seonize-backend/app/api/writing.py)

E. 前端錯誤提示未完成
- 新建專案錯誤提示 TODO：
  - [seonize-frontend/src/pages/ProjectNewPage.tsx](seonize-frontend/src/pages/ProjectNewPage.tsx)
- 專案列表刪除錯誤提示 TODO：
  - [seonize-frontend/src/pages/ProjectsPage.tsx](seonize-frontend/src/pages/ProjectsPage.tsx)

F. DataForSEO 語言/地區參數使用固定值
- DataForSEO 服務固定語言與地區碼：
  - [seonize-backend/app/services/dataforseo_service.py](seonize-backend/app/services/dataforseo_service.py)

## 2) 系統使用流程（端到端）

1. 啟動系統
   - Windows：執行 .\run-dev.bat
2. 進入設定頁
   - 填入 Google/Serper/SerpApi/DataForSEO 金鑰
   - 測試連線後儲存
   - 選擇 SERP 提供者
3. 關鍵字研究
   - 輸入關鍵字並執行 SERP 研究
4. 意圖分析與標題建議
   - 取得意圖、關鍵字抽取、標題建議
5. 建立專案
   - 依分析結果建立專案
6. 生成內容
   - 分段生成與整文生成
7. 專案管理
   - 檢視、更新或刪除專案

## DataForSEO SERP 規劃（Google SERP / Google AI Mode）

### 目標範圍
- Google Organic SERP（Advanced）
- Google AI Mode SERP（Advanced）

### 主要端點（Live）
- Google Organic Live Advanced
  - https://api.dataforseo.com/v3/serp/google/organic/live/advanced
- Google AI Mode Live Advanced
  - https://api.dataforseo.com/v3/serp/google/ai_mode/live/advanced

### 批次端點（需要時才用）
- task_post → tasks_ready → task_get/advanced
  - /v3/serp/google/organic/task_post
  - /v3/serp/google/organic/tasks_ready
  - /v3/serp/google/organic/task_get/advanced/$id
  - /v3/serp/google/ai_mode/task_post
  - /v3/serp/google/ai_mode/tasks_ready
  - /v3/serp/google/ai_mode/task_get/advanced/$id

### 系統設定
- 新增 DataForSEO SERP 模式設定：
  - google_organic（預設）
  - google_ai_mode

### 參數映射
- language_code：由 language 映射（例如 zh-TW → zh_TW）
- location_code：由 country 映射（例如 TW → 2158）

## A~F 優化完成紀錄

A. 移除敏感 debug 輸出，改用 logging
- [seonize-backend/app/api/settings.py](seonize-backend/app/api/settings.py)
- [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)
- [seonize-backend/app/services/dataforseo_service.py](seonize-backend/app/services/dataforseo_service.py)

B. SERP 失敗回傳明確錯誤訊息，不再使用 mock 掩蓋
- SERP 服務改回傳 error 欄位
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)
- 研究 API 回傳 error
  - [seonize-backend/app/api/research.py](seonize-backend/app/api/research.py)
- 前端顯示錯誤訊息
  - [seonize-frontend/src/pages/KeywordPage.tsx](seonize-frontend/src/pages/KeywordPage.tsx)
  - [seonize-frontend/src/pages/KeywordPage.css](seonize-frontend/src/pages/KeywordPage.css)

C. SERP Provider fallback 行為調整
- 僅依使用者設定 provider，若未配置直接回報 error
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)

D. 取代 mock/TODO
- 關鍵字抽取改用 jieba + TF-IDF
  - [seonize-backend/app/api/analysis.py](seonize-backend/app/api/analysis.py)
- SERP 內容爬取改用 httpx + BeautifulSoup
  - [seonize-backend/app/api/research.py](seonize-backend/app/api/research.py)
- 寫作 API 改用 AIService 生成
  - [seonize-backend/app/api/writing.py](seonize-backend/app/api/writing.py)

E. 補上前端錯誤提示
- 新建專案錯誤提示
  - [seonize-frontend/src/pages/ProjectNewPage.tsx](seonize-frontend/src/pages/ProjectNewPage.tsx)
  - [seonize-frontend/src/pages/ProjectNewPage.css](seonize-frontend/src/pages/ProjectNewPage.css)
- 專案列表錯誤提示
  - [seonize-frontend/src/pages/ProjectsPage.tsx](seonize-frontend/src/pages/ProjectsPage.tsx)
  - [seonize-frontend/src/pages/ProjectsPage.css](seonize-frontend/src/pages/ProjectsPage.css)

F. DataForSEO 語言/地區參數動態映射
- 新增 language_code/location_code 映射
  - [seonize-backend/app/services/dataforseo_service.py](seonize-backend/app/services/dataforseo_service.py)
- 研究 API 使用映射值
  - [seonize-backend/app/api/research.py](seonize-backend/app/api/research.py)
- SERP 服務使用映射值
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)

G. DataForSEO SERP 模式設定（Google SERP / Google AI Mode）
- 後端設定新增 dataforseo_serp_mode
  - [seonize-backend/app/api/settings.py](seonize-backend/app/api/settings.py)
- SERP 服務與 DataForSEO Service 支援模式切換
  - [seonize-backend/app/services/serp_service.py](seonize-backend/app/services/serp_service.py)
  - [seonize-backend/app/services/dataforseo_service.py](seonize-backend/app/services/dataforseo_service.py)
- 前端設定 UI 下拉
  - [seonize-frontend/src/pages/SettingsPage.tsx](seonize-frontend/src/pages/SettingsPage.tsx)

## 刪除不必要測試/診斷檔
- 已移除測試/診斷檔：test_serp_service.py、seonize-backend/test_providers.py、seonize-backend/diagnose_serper.py
