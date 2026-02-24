# Kalpa Intent Matrix (因果矩陣) 整合計畫

此計畫旨在將 `ex.py` 中的意圖矩陣生成邏輯整合至 Seonize 系統中，並建立獨立的開發與操作介面。

## 核心邏輯：因果矩陣 (Kalpa Matrix)

基於 `ex.py` 的實作，系統將透過以下三個維度進行笛卡爾乘積運算：
- **實體 (Entity)**：主體對象（如：幣安、MetaMask）。
- **動作 (Action)**：使用者行為（如：入金、提現）。
- **痛點 (Pain Point)**：遇到的障礙（如：失敗、卡住）。

公式：$S = E \times A \times P$

## 擬議變更

### 1. 後端實作 (seonize-backend)

#### [NEW] `app/services/kalpa_service.py`
- 封裝 `KalpaMatrix` 類別。
- 提供 `generate_matrix` 方法，接收三組列表並回傳 JSON 格式的意圖節點。

#### [NEW] `app/api/kalpa.py`
- 建立全新的 API Router `/api/kalpa`。
- 端點 `POST /generate`：接收前端傳入的種子列表，觸發矩陣運算。

#### [MODIFY] `app/main.py`
- 註冊 `kalpa` 路由。

---

### 2. 前端實作 (seonize-frontend)

#### [NEW] `src/pages/KalpaPage.tsx`
- **輸入區**：提供三個標籤輸入框（Tags Input），讓使用者輸入實體、動作與痛點。
- **預覽區**：以表格形式呈現生成的「意圖標題」與「狀態」。
- **操作區**：按鈕觸發生成，並支援匯出 CSV 功能。

#### [MODIFY] `src/App.tsx`
- 新增路由 `/kalpa`。

#### [MODIFY] `src/components/layout/Sidebar.tsx`
- 導覽列新增「因果矩陣」選項，使用 🔮 圖示。

## 驗證計畫

### 功能測試
- 在前端輸入少量資料，驗證是否能正確產生對應數量的矩陣節點。
- 檢查生成的標題模板是否符合語感。

### 效能測試
- 若輸入規模過大（例如 10x10x10），確保後端運算不阻塞，且前端分頁顯示正常。
