# AI 文章圖片整合升級計劃 (Image Integration Strategy)

目前系統已具備強大的文字生成與策略織入能力。為了進一步提升文章的吸引力並符合搜尋引擎對豐富媒體內容 (Rich Media) 的偏好，以下是將系統升級為「圖文並茂」架構的實作計劃。

## 1. 核心架構：低成本優先策略 (Cost-Efficient Sourcing)

為了降低營運成本並維持高品質視覺，系統將採取「圖庫優先、AI 補充」的策略：

### 📸 圖片獲取途徑 (Tiered Sourcing)
1.  **圖庫 API 檢索 (Primary: Low Cost)**：
    - **整合對象**：Unsplash, Pexels, Pixabay。
    - **邏輯**：AI 根據文章內容生成「英文關鍵字」，自動拉取 3-5 張符合主題的 CC0 免費圖。
2.  **用戶手動上傳 (User Controlled: No Cost)**：
    - 提供文件上傳與 URL 貼上功能，並具備簡單的裁切與壓縮工具。
3.  **AI 圖片生成 (Fallback: High Cost)**：
    - **整合對象**：DALL-E 3 或 Flux (可在「劫之眼」進階模式中手動觸發)。
    - **邏輯**：僅當圖庫找不到合適圖片，或需要精確表達抽象「心靈地圖」或「因果矩陣」時使用。

### 🌩️ 儲存與處理 (Storage Management)
*   **本地/雲端混合存儲**：圖片統一上傳至本地 `/uploads` 或 S3，並自動轉為 **WebP** 格式以節省空間並加速載入。
*   **自動 ALT 標籤**：系統將自動根據 AI 生成的 Alt Text 寫入 HTML，這對 Google 圖片 SEO 至關重要。

## 2. 數據驅動與流程整合 (Contextual Integration)

### 階段一：AI 視覺化建議 (Outline Stage)
AI 在生成大綱或因果節點時，會根據資料內容自動標註：
*   **視覺類型建議**：判斷該段落適合「具象圖 (Stock)」還是「抽象概念圖 (AI)」。
*   **多語言關鍵字**：自動生成適合圖庫 API 檢索的英文關鍵字 (例如：*cryptocurrency protection, cybersecurity expert*)。

### 階段二：撰寫與嵌入 (Writing Stage)
*   **內容對齊**：在 `WritingPage` 支援將選定的圖片一鍵插入到指定的 `[圖片預留點]`。
*   **自動圖說 (Caption)**：AI 從內容中擷取最精華的一句話作為圖片說明，引導讀者視線。

## 3. 成本管理與點數消耗 (Credit Management)
| 途徑 | 資源成本 | 點數消耗 |
| :--- | :--- | :--- |
| 手動上傳 | 最低 (僅空間) | 0 點 / 張 |
| 圖庫 API | 低 (API 限制) | 1-2 點 / 張 (檢索費) |
| AI 生成 | 高 (GPU 成本) | 20+ 點 / 張 |

---
> [!TIP]
> **搜尋引擎偏好 (SEO Impact)**：
> 系統整合「自動 ALT」與「懶載入 (Lazy Load)」機制，能讓文章在 Google 圖片搜尋中獲得額外曝光，同時不影響頁面載入速度。

---
> [!IMPORTANT]
> **搜尋引擎偏好 (SEO Impact)**：
> 加入圖片不僅能降低文章跳出率 (Bounce Rate)，正確的 `alt` 標籤亦能爭取 Google 圖片搜尋的流量。這將是本系統從「工具」進化為「完整內容工作站」的關鍵一步。
