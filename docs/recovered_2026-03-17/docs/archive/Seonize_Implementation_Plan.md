# Seonize 前端實作計劃

## 概述

基於 **Seonize 開發規格步驟 v2.1**、**Seonize_UI_Design_System.md** 和 **frontend-design skill**，建構一個數據驅動的 AI SEO 撰寫系統前端。採用 Data-Dense Dashboard 風格，強調數據視覺化、高效布局和專業美感。

**技術棧**：React + Vite + TypeScript + FastAPI

---

## 設計方向

### 美學定位
- **風格**：Data-Dense Dashboard + 專業信任感
- **調性**：技術精確、數據驅動、現代企業級
- **差異化**：打字機動態效果 + 圖表互動縮放 + 流暢的過濾動畫

### 色彩系統
| 用途 | 色碼 | 說明 |
|------|------|------|
| Primary | `#2563EB` | 信任藍 |
| Secondary | `#3B82F6` | 淺藍 |
| CTA | `#F97316` | 橙色對比 |
| Background | `#F8FAFC` | 淺灰背景 |
| Text | `#1E293B` | 深灰文字 |

### 字體系統
- **Fira Code**: 代碼、數據顯示、關鍵字標註
- **Fira Sans**: UI 文字、標題、內容

---

## 專案結構

### Frontend
```
seonize-frontend/
├── public/
├── src/
│   ├── assets/           # 靜態資源
│   ├── components/       # 可重用元件
│   │   ├── ui/           # 基礎 UI 元件
│   │   ├── charts/       # 圖表元件
│   │   └── layout/       # 布局元件
│   ├── pages/            # 頁面元件
│   ├── hooks/            # 自定義 Hooks
│   ├── services/         # API 服務
│   ├── styles/           # 全域樣式
│   ├── types/            # TypeScript 類型
│   └── utils/            # 工具函數
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Backend
```
seonize-backend/
├── app/
│   ├── api/              # API 路由
│   ├── core/             # 核心配置
│   ├── models/           # Pydantic 模型
│   ├── services/         # 業務邏輯
│   └── main.py           # FastAPI 入口
├── requirements.txt
└── .env
```

---

## 開發階段

### Phase 1: 專案初始化
- [x] 保存實作計劃到專案
- [ ] 初始化 React + Vite + TypeScript 專案
- [ ] 初始化 FastAPI 後端
- [ ] 設置 CSS 變數和 Google Fonts

### Phase 2: 設計系統元件
- [ ] KPICard 元件
- [ ] DataTable 元件
- [ ] Button/CTA 元件
- [ ] ChartWrapper 元件

### Phase 3: 核心頁面
- [ ] Landing/Hero 頁面
- [ ] Dashboard 儀表板
- [ ] 關鍵字輸入控制台
- [ ] 意圖策略面板
- [ ] 大綱編輯器
- [ ] 撰寫預覽器

### Phase 4: 後端 API
- [ ] 專案狀態管理 API
- [ ] SERP 研究 API
- [ ] 意圖分析 API
- [ ] 內容生成 API

### Phase 5: 整合與測試
- [ ] 前後端整合
- [ ] 響應式測試
- [ ] 無障礙測試

---

## 預計開發時間

| Phase | 預計時間 |
|-------|---------|
| Phase 1: 專案初始化 | 0.5 天 |
| Phase 2: 設計系統 | 1 天 |
| Phase 3: 頁面開發 | 2-3 天 |
| Phase 4: 後端 API | 2 天 |
| Phase 5: 整合測試 | 1 天 |

**總計**：約 6-7 天
