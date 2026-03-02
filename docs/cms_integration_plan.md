# CMS 串接與多站點排程發布功能實作規劃 (更新版)

本文件說明如何支援多個 Ghost/WordPress 站點管理，並根據專案設定發布至指定站點，支援排程發布功能。

## 1. 核心需求
- **多站點管理**：支援新增、編輯、刪除多個 CMS 站點設定。
- **CMS 支援**：Ghost (Admin API) 與 WordPress (REST API)。
- **專案關聯**：主要分析專案與矩陣寫文節點可指定發布至特定的 CMS 站點。
- **排程發布**：支援設定未來時間點自動發布至指定站點。

## 2. 系統架構設計

### 2.1 資料庫 Schema 擴充

#### [NEW] `cms_configs` (CMS 站點設定表)
- `id`: UUID (Primary Key)
- `name`: 字串 (顯示名稱，如：科技部落格-Ghost)
- `platform`: 字串 (ghost, wordpress)
- `api_url`: 字串
- `api_key`: 字串 (Encrypted)
- `username`: 字串 (WP 專用)
- `app_password`: 字串 (WP 專用，Encrypted)
- `is_active`: 佈林值
- `created_at`, `updated_at`: 時間戳記

#### [MODIFY] `projects` & `kalpa_nodes` (現有表擴充)
- `cms_config_id`: UUID (Foreign Key, 關聯至 `cms_configs.id`)
- `cms_post_id`: 字串
- `publish_status`: 字串 (draft, scheduled, published, failed)
- `published_at`: DateTime
- `scheduled_at`: DateTime
- `cms_publish_url`: 字串

### 2.2 服務層 (Services)
- **`app/services/cms_manager.py`**：處理多站點設定的 CRUD。
- **`app/services/cms_service.py`**：
    - 根據傳入的 `config` 動態實例化對應的 CMS Client。
    - 處理內容發布邏輯。

### 2.3 背景任務 (Background Worker)
- 每分鐘掃描待發布任務，根據關聯的 `cms_config_id` 抓取設定並執行發布。

## 3. 實作步驟

### 第一階段：多站點管理基礎設計
1. 建立 `cms_configs` 資料表與遷移腳本。
2. 實作 CMS 設定的 API (新增、列表、測試連線、刪除)。
3. 在前端建立「CMS 站點管理」介面。

### 第二階段：專案關聯與選取
1. 在分析寫文與矩陣編織介面，增加「選取發布站點」的下拉選單。
2. 儲存選取的至 `cms_config_id` 與排程時間。

### 第三階段：CMS 發布與排程
1. 實作動態 CMS 派發邏輯。
2. 實作背景排程發布工。

## 4. 使用者審閱事項
- [ ] **連線測試**：是否需要提供「測試連線」按鈕以驗證 API 金鑰正確性。
- [ ] **站點分類**：是否需要替站點增加標籤，以便在專案中快速過濾建議站點。
