# AI 文章圖片整合升級計劃 (Image Integration Strategy)

目前系統已具備強大的文字生成與策略織入能力。為了進一步提升文章的吸引力並符合搜尋引擎對豐富媒體內容 (Rich Media) 的偏好，以下是將系統升級為「圖文並茂」架構的實作計劃。

## 1. 核心架構升級 (Backend Architecture)

### 📸 圖片獲取途徑 (Tiered Sourcing)
升級後的系統應支援三種獲取圖片的方式：
1.  **AI 圖片生成 (AI Generation)**：整合 DALL-E 3 或 Flux API，根據章節內容自動生成專屬示意圖（適用於抽象概念、趨勢圖等）。
2.  **圖庫 API 檢索 (Stock Photos)**：整合 Unsplash、Pexels 或 Pixabay API，根據關鍵字檢索高品質的 CC0 免費圖庫（適用於具象產品、風景、人物等）。
3.  **用戶手動上傳 (User Upload)**：提供介面讓使用者上傳本地圖片或輸入圖片 URL。

### 🌩️ 儲存與處理 (Storage & Management)
*   **雲端存儲 (Object Storage)**：整合 AWS S3、Cloudinary 或 GCP Storage。圖片上傳或生成後儲存於雲端，並在資料庫中保留 URL。
*   **即時處理**：透過 Cloudinary 或後端 Sharp 模組，自動進行 WebP 格式轉換、縮圖處理 (Lazy Load) 與 CDN 分發。

## 2. 功能流整合 (Workflow Integration)

### 階段一：大綱規劃與佔位 (Outline Stage)
*   **AI 圖片位置推薦**：AI 在產生成大綱時，會自動在適當位置加入 `[圖片預留點]`，並標註「建議圖片主題 (Topic)」與「SEO Alt Text 建議」。
*   **樣式與比例規劃**：預設文章中需要的圖片比例（如 16:9 景觀圖或 1:1 特色圖）。

### 階段二：內容撰寫與視覺化 (Writing Stage)
*   **一鍵圖文生成**：在撰寫章節時，使用者可以點擊「AI 選圖」或「AI 繪圖」。
*   **圖說 (Caption) 自動生成**：AI 會根據段落上下文，為圖片生成引人入勝的圖說。
*   **預覽模式**：`WritingPage` 加入真正的圖片呈現，並支援簡單的圖片拖拽對齊（左縮排、置中、右縮排）。

## 3. 資料結構異動 (Schema Changes)

### 📄 資料庫模型 (DB Models)
*   `OutlineSection`：新增 `images` 陣列欄位。
    ```json
    {
      "id": "sec-123",
      "heading": "...",
      "content": "...",
      "images": [
        {
          "url": "https://...",
          "alt": "SEO 關鍵字描述",
          "caption": "圖片說明文字",
          "position": "top",
          "source": "ai_generated"
        }
      ]
    }
    ```

## 4. 外部發布整合 (CMS & Export)

*   **WordPress 深度整合**：在發布至 CMS 時，將圖片檔案透過 API 上傳至 WordPress 媒體庫，確保圖片不會因為外部連結失效而遺失。
*   **Markdown 增強**：匯出時支援標準 `![Alt](Url)` 格式，並附加 `figcaption` HTML 標籤。

## 5. UI/UX 介面優化

*   **圖片庫組件 (Image Gallery)**：類似 WordPress 的媒體選取器，讓使用者管理目前專案已選用的圖片。
*   **拖拽佈局**：在撰寫視窗中，讓使用者能直覺地將圖片插入到段落之間。
*   **提示視窗 (Progress Modal)**：因為 AI 繪圖可能需要 15-20 秒，需沿用目前的進度視窗邏輯，顯示「正在為您構思視覺化內容...」。

---
> [!IMPORTANT]
> **搜尋引擎偏好 (SEO Impact)**：
> 加入圖片不僅能降低文章跳出率 (Bounce Rate)，正確的 `alt` 標籤亦能爭取 Google 圖片搜尋的流量。這將是本系統從「工具」進化為「完整內容工作站」的關鍵一步。
