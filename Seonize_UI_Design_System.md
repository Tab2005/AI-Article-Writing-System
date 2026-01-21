# Seonize 系統 UI 設計系統

**專案名稱**：Seonize System  
**關鍵字**：AI SEO content writing SaaS dashboard data-driven  
**生成日期**：2026年1月19日  

## 設計系統總結

### Pattern（頁面結構）
- **類型**：Newsletter / Content First
- **轉換元素**：打字機效果（typewriter effect）
- **CTA**：Hero內嵌表單 + Sticky header表單
- **區段結構**：
  1. Hero（價值主張 + 表單）
  2. 近期問題/檔案
  3. 社交證明（訂閱者數量）
  4. 作者介紹

### Style（UI風格）
- **類型**：Data-Dense Dashboard
- **關鍵字**：多圖表/小工具、數據表格、KPI卡片、最小填充、網格布局、空間高效、最大數據可見性
- **最佳適用**：商業智慧dashboard、金融分析、企業報告、數據倉儲
- **性能**：⚡ 優秀
- **無障礙**：✓ WCAG AA

### Colors（調色板）
- **Primary**：#2563EB（藍色，信任感）
- **Secondary**：#3B82F6（淺藍）
- **CTA**：#F97316（橙色，對比）
- **Background**：#F8FAFC（淺灰）
- **Text**：#1E293B（深灰）
- **註記**：信任藍 + 強調對比

### Typography（字體）
- **字體組合**：Fira Code / Fira Sans
- **心情**：dashboard、數據、分析、代碼、技術、精確
- **最佳適用**：Dashboards、分析、數據視覺化、管理面板
- **Google Fonts鏈接**：https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700
- **CSS Import**：
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
  ```

### Key Effects（關鍵效果）
- Hover tooltips
- 圖表縮放點擊
- 行高亮懸停
- 平滑過濾動畫
- 數據載入旋轉

### Avoid（避免的反模式）
- 華麗設計
- 無過濾

### Pre-Delivery Checklist（交付檢查）
- [ ] 無emoji圖標（使用SVG：Heroicons/Lucide）
- [ ] 所有可點擊元素有cursor-pointer
- [ ] Hover狀態平滑過渡（150-300ms）
- [ ] 明亮模式對比至少4.5:1
- [ ] 焦點狀態可見（鍵盤導航）
- [ ] 尊重prefers-reduced-motion
- [ ] 響應式：375px, 768px, 1024px, 1440px

## 應用建議
- **整體風格**：採用Data-Dense Dashboard，重點在數據視覺化（如SEO指標圖表、關鍵字密度顯示）。
- **顏色應用**：使用藍色調建立信任感，橙色CTA突出行動按鈕。
- **字體**：Fira Code用於代碼/數據顯示，Fira Sans用於UI文字。
- **布局**：Hero區顯示價值主張（AI SEO優化），下方添加數據dashboard（關鍵字分析、AEO/GEO建議）。
- **實現**：使用html-tailwind棧，添加hover效果和圖表（Chart.js或D3.js）。
- **測試**：確保無障礙和響應式，遵循檢查清單。

此設計系統由UI/UX Pro Max生成，適用於Seonize AI SEO撰寫系統的前端開發。