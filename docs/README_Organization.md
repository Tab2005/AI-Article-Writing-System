# 系統架構文檔整理計畫

為了提升文檔可讀性，我們將 `docs` 資料夾內的內容進行分類與封存。

## 分類邏輯

### 1. 核心規格與架構 (Core)
這些文件定義了系統的現狀與開發路徑。
- `Seonize 系統結構設計文件 (SSD) v2.0.md`
- `Seonize 開發規格步驟 v2.1.md`
- `system_review.md`

### 2. 功能開發計畫 (Active Features)
目前正在進行或規劃中的功能。
- `multi_user_rbac_plan.md`
- `phase3_credits_membership_plan.md`
- `serp_intelligence_plan.md`
- `cms_integration_plan.md`

### 3. 技術整合指南 (Guides)
外部 API 或具體功能的整合說明。
- `deployment_zeabur.md`
- `image_integration_guide.md`
- `DataForSEO_API_Reference.md`
- `DataForSEO_Keyword_Ideas_Integration.md`

### 4. 歷史與審計封存 (Archive)
已過期、已實施完畢或特定時間點的審計報告，將移動至 `docs/archive/`。

---

## 預計移動至 archive 的文件

1. `2026-02-13_architecture-audit_by-Opus-4.6.md` (歷史審計)
2. `2026-02-13_architecture-reaudit.md` (歷史審計)
3. `Seonize_Implementation_Plan.md` (舊版實作計畫)
4. `implementation_plan_skills.md` (已整合之計畫)
5. `m1_page_refactor_strategy.md` (早期的重構策略)
6. `skills-summary.md` (早期摘要)
7. `professional-upgrade-path.md` (早期規劃)
8. `image_integration_plan.md` (舊版計畫)
9. `credits_table.md` (已整合至 Phase3)
10. `pricing_model.md` (已整合至 Phase3)

---

## 動作執行
- [ ] 建立 `docs/archive/` 目錄。
- [ ] 執行文件移動命令。
- [ ] 檢查 `docs/impl/` 內容是否也需整理。
