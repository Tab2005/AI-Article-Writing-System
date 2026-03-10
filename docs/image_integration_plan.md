# AI 文章圖片整合升級計劃 (Image Integration Strategy)

目前系統已具備強大的文字生成與策略織入能力。為了進一步提升文章的吸引力並符合搜尋引擎對豐富媒體內容 (Rich Media) 的偏好，以下是將系統升級為「圖文並茂」架構的實作計劃。

## 1. 核心架構：低成本優先策略 (Cost-Efficient Sourcing)

為了降低營運成本並維持高品質視覺，系統將採取「圖庫優先、AI 補充」的策略：

### 📸 圖片獲取途徑 (Tiered Sourcing)
1.  **圖庫 API 檢索 (Primary: Low Cost)**：
    - **整合對象**：Unsplash, Pexels, Pixabay。
    - **邏輯**：AI 根據文章內容生成「英文關鍵字」，自動拉取 3-5 張符合主題的 CC0 免費圖。

> [!NOTE]
> **環境變數設置**：
> 本功能需要設置 `PEXELS_API_KEY` 環境變數。
2.  **用戶手動上傳 (User Controlled: No Cost)**：
    - 提供文件上傳與 URL 貼上功能，並具備簡單的裁切與壓縮工具。
3.  **CMS 自動同步 (Phase 3: CMS Sync & Optimization)**：
    - **邏輯**：當文章發布至 Wordpress 時，系統自動偵測本地圖片並上傳至 WP 媒體庫，替換為遠端 URL。
    - **特色**：自動將第一張圖設為「特色圖片 (Featured Image)」。

### 🌩️ 儲存與處理 (Storage Management)
*   **自動轉 WebP**：上傳時自動利用 Pillow 進行 WebP 轉換與壓縮，符合 Google Core Web Vitals 要求。
*   **自動 ALT 標籤**：已實作。

## 2. 實作進度
- [x] 階段一：基礎設施與靜態存取 (Done)
- [x] 階段二：AI 建議與自動標籤 (Done)
- [/] 階段三：CMS 媒體同步與 WebP 優化 (Next)

---
> [!TIP]
> **搜尋引擎偏好 (SEO Impact)**：
> 系統整合「自動 ALT」與「懶載入 (Lazy Load)」機制，能讓文章在 Google 圖片搜尋中獲得額外曝光，同時不影響頁面載入速度。

---
> [!IMPORTANT]
> **搜尋引擎偏好 (SEO Impact)**：
> 加入圖片不僅能降低文章跳出率 (Bounce Rate)，正確的 `alt` 標籤亦能爭取 Google 圖片搜尋的流量。這將是本系統從「工具」進化為「完整內容工作站」的關鍵一步。
