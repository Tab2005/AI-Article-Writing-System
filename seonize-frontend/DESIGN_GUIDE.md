# Seonize 專案設計系統 (Project Design System)

為了確保未來所有新增功能在視覺與操作體驗上保持高度一致，本文件定義了 `Seonize` 系列產品的核心 UI/UX 規範。

---

## 🎨 核心色彩體系 (Color Palette)

所有色彩均來自 `index.css` 與全系統變數。

- **Primary Blue (信任藍)**：`#2563eb` (主要按鈕、標題強調、數據高亮)
- **Contrast Orange (喚起橘)**：`#f97316` (關鍵字高亮、CTA 動作、警示提醒)
- **Background (深邃背景)**：`#0f172a` (頁面背景層)
- **Card Background (細緻卡片)**：`#1e293b` (區塊容器、導航與列表背景)
- **Success/Error**：`#10b981` (完成、成功、正常) / `#ef4444` (報錯、失敗、必填)

## 🏗️ 佈局原則 (Layout Principles)

1. **玻璃質感 (Glassmorphism Lite)**：
   - 容器應帶有細微的 1px 邊框 (`var(--color-border)`) 與圓角 (`var(--radius-xl)`)。
   - 浮動視窗 (Modal) 或選取區應帶有背景模糊 (`backdrop-filter: blur(8px)`)。

2. **空間呼吸感**：
   - 區塊間距統一使用 `var(--space-6)` (24px)。
   - 大標題下方應留有足夠的餘白，避免資訊過度擁擠。

3. **寬屏優先 (Full-Width First)**：
   - 核心數據或全域編輯區 (如全文編輯器) 應享有獨立的整行寬度，不應侷限於側邊欄中。

## 🧩 標準組件規範 (Standard Components)

- **按鈕 (Buttons)**：
  - `variant="primary"`：主藍色實心。
  - `variant="cta"`：橘色實心，用於極其重要的動作 (如「一鍵生成」、「儲存全文」)。
  - `variant="secondary"`：深灰色背景與細邊框，用於次要操作。
- **輸入框與 TextArea**：
  - 統一使用深色底背景、圓角與 1px 邊框。
  - **Focus 狀態**：邊框應轉為 `var(--color-primary)` 並帶有微光效果。
- **自定義滾動條 (Scrollbar)**：
  - 全域統一為 8px 寬度，圓角 Thumb (`var(--color-border)`)，無 Track 背景色的透明風格。

## 🖋️ 內容渲染規範 (Content Rendering)

- **Markdown 支持**：
  - 標題使用 `##` (H2) 作為章節標頭，並在下方加一條邊框分隔。
  - 關鍵字高亮：統一包覆在 `<mark class="keyword-highlight">` 標籤中。
- **Mermaid 圖表**：
  - 使用自定義的 `.mermaid-container`，帶有深色背景與虛線邊框。

---

## 💡 如何使用這份規範？

1. **AI 協作**：在之後跟我 (AI 助手) 溝通新功能時，您可以直接提及「請遵照專案設計系統規範」或「使用規範中的全寬佈局」。
2. **手動開發**：當您在前端程式碼中新增樣式時，請盡可能引用 `:root` 中的變數 (如 `var(--color-primary)`) 而非寫死十六進位色彩代碼。
