# Seonize AI 後端 API 路由詳細說明 (2026-03-17)

本文件詳列 `seonize-backend` 所有已掛載的 API 路由，包含路徑前綴、HTTP 方法、認證需求、點數消耗與功能說明。

> **基底 URL**：`https://your-backend.zeabur.app`  
> **認證方式**：Bearer JWT，登入後取得 Token，加入 Header `Authorization: Bearer <token>`  
> **文件自動產生**：後端啟動後可前往 `/api/docs` 查看 Swagger 互動文件

---

## 認證等級說明

| 符號 | 說明 |
| :---: | :--- |
| 🌐 | 公開路由，無需登入 |
| 🔑 | 需要登入（任何角色） |
| 👑 | 需要超級管理員 (super_admin) |
| ⭐ | 需要特定會員等級才能使用 |

---

## 路由總表

| 模組 | 路由前綴 |
| :--- | :--- |
| 認證 / 使用者 | `/api/auth` |
| 專案管理 | `/api/projects` |
| 關鍵字研究 | `/api/research` |
| 意圖分析 | `/api/analysis` |
| 內容寫作 | `/api/writing` |
| 指令模板 | `/api/prompts` |
| 系統設定 | `/api/settings` |
| 劫之眼術 (Kalpa) | `/api/kalpa` |
| CMS 發布 | `/api/cms` |
| 管理員 - 使用者 | `/api/admin/users` |
| 圖片工具 | `/api/images` |
| 健康檢查 | `/api/health` |

---

## 1. 認證 `/api/auth`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/auth/register` | 🌐 | — | 使用者自行註冊帳號 |
| `POST` | `/api/auth/login` | 🌐 | — | 登入並取得 JWT Token |
| `GET` | `/api/auth/validate` | 🔑 | — | 驗證目前 Token 有效性，同時回傳使用者完整資料 |
| `GET` | `/api/auth/me` | 🔑 | — | 取得目前使用者簡要資訊（診斷用） |
| `PATCH` | `/api/auth/profile` | 🔑 | — | 修改個人顯示名稱或更換密碼 |
| `GET` | `/api/auth/credits/history` | 🔑 | — | 取得點數交易紀錄（支援分頁：`?page=1&per_page=20`） |
| `GET` | `/api/auth/membership/levels` | 🌐 | — | 取得目前配置的會員等級名稱清單 |
| `POST` | `/api/auth/membership/mock-upgrade` | 🔑 | — | **測試用**：模擬升級會員等級（含補點） |

---

## 2. 專案管理 `/api/projects`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/projects/` | 🔑 | — | 建立新的文章專案 |
| `GET` | `/api/projects/` | 🔑 | — | 列出專案清單（管理員可看全部，一般使用者只看自己的） |
| `GET` | `/api/projects/{project_id}` | 🔑 | — | 取得單一專案詳情 |
| `PATCH` | `/api/projects/{project_id}` | 🔑 | — | 更新專案內容（關鍵字、大綱、文章等） |
| `DELETE` | `/api/projects/{project_id}` | 🔑 | — | 刪除專案（管理員或擁有者） |

---

## 3. 關鍵字研究 `/api/research`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/research/serp` | 🔑 | **2 點** (快取免費) | 執行 SERP 搜尋研究；命中快取時記錄 0 點操作 |
| `POST` | `/api/research/keyword-ideas` | 🔑 | — | 透過 DataForSEO 取得關鍵字建議與流量數據 |
| `GET` | `/api/research/keywords` | 🔑 ⭐Lv.2 | **3 點** | 取得指定關鍵字詳細成交數據（搜尋量、CPC） |
| `POST` | `/api/research/keywords` | 🔑 | — | 批量取得關鍵字數據（直接透過 DataForSEO，無快取） |
| `GET` | `/api/research/history` | 🔑 | — | 取得目前使用者的關鍵字研究歷史清單 |
| `DELETE` | `/api/research/history/{record_id}` | 🔑 | — | 刪除指定歷史紀錄 |
| `POST` | `/api/research/crawl` | 🔑 | — | 爬取指定 URL 清單的網頁內容（最多 10 筆，並行限 3） |
| `POST` | `/api/research/intent` | 🔑 | **2 點** | AI 意圖分析（透過關鍵字判斷搜尋意圖） |
| `POST` | `/api/research/generate-titles` | 🔑 | — | 基於 SERP 資料使用 AI 生成標題建議 |

---

## 4. 意圖分析與大綱 `/api/analysis`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/analysis/intent` | 🔑 | **2 點** | 執行搜尋意圖分析、關鍵字抽取與標題建議（含 TF-IDF） |
| `POST` | `/api/analysis/outline` | 🔑 | **5 點** | AI 生成文章大綱（含章節架構與邏輯鏈） |
| `POST` | `/api/analysis/content-gap` | 🔑 | **3 點** | AI 執行內容缺口分析與 E-E-A-T 建議（命中快取免費） |

---

## 5. 內容寫作 `/api/writing`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/writing/generate-section` | 🔑 | **5 點** | AI 生成單一章節文字（失敗自動退還點數） |
| `POST` | `/api/writing/generate-full` | 🔑 ⭐Lv.2 | **20 點** | AI 一鍵生成完整文章（含所有章節，失敗退還） |
| `POST` | `/api/writing/seo-check` | 🔑 | — | SEO 品質分析（關鍵字密度、標題結構等） |
| `POST` | `/api/writing/projects/{project_id}/analyze-competition` | 🔑 | — | 競品分析：對比競品網頁結構與內容 |
| `POST` | `/api/writing/analyze-quality` | 🔑 | **3 點** | AI 文章品質審核，產出修改建議報告 |

---

## 6. 指令模板 `/api/prompts`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `GET` | `/api/prompts/templates` | 🔑 | — | 列出系統預設與個人自定義指令模板（可按分類篩選） |
| `POST` | `/api/prompts/templates` | 🔑 | — | 建立個人指令模板 |
| `PATCH` | `/api/prompts/templates/{template_id}` | 🔑 | — | 更新指令模板內容或啟用狀態（僅限擁有者） |
| `DELETE` | `/api/prompts/templates/{template_id}` | 🔑 | — | 刪除個人指令模板（僅限擁有者） |

**模板分類 (category)**：
- `content_writing` — 文章段落生成
- `outline_generation` — 大綱生成
- `kalpa_weaving` — 因果矩陣節點文章生成
- `kalpa_brainstorm` — 天道解析（Brainstorm）
- `multi_persona` — 多角色寫作模式

---

## 7. 系統設定 `/api/settings`

> 所有路由均需 **超級管理員** 登入

| 方法 | 路徑 | 認證 | 說明 |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/settings/` | 👑 | 取得目前所有系統設定（API Key 部分遮蔽）|
| `POST` | `/api/settings/` | 👑 | 儲存系統設定（資料庫值優先於環境變數） |
| `GET` | `/api/settings/providers` | 👑 | 取得支援的 AI 供應商清單與可用模型 |
| `POST` | `/api/settings/test-ai` | 👑 | 測試 AI API 連線是否成功 |
| `POST` | `/api/settings/test-dataforseo` | 👑 | 測試 DataForSEO API 帳密是否正確 |
| `GET` | `/api/settings/database-info` | 👑 | 取得目前使用的資料庫類型資訊 |
| `GET` | `/api/settings/cache-info` | 👑 | 取得快取系統類型與大小 |

---

## 8. 劫之眼術 (Kalpa) `/api/kalpa`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/kalpa/brainstorm` | 🔑 | **3 點** | 天道解析：根據主題 AI 生成因果矩陣要素建議 |
| `POST` | `/api/kalpa/generate` | 🔑 | — | 本機計算生成因果矩陣節點（不消耗點數，不儲存） |
| `POST` | `/api/kalpa/save` | 🔑 | — | 儲存或更新因果矩陣至資料庫 |
| `GET` | `/api/kalpa/list` | 🔑 | — | 列出已儲存的矩陣（管理員可看全部） |
| `GET` | `/api/kalpa/{matrix_id}` | 🔑 | — | 取得指定矩陣及其所有節點詳情 |
| `DELETE` | `/api/kalpa/delete/{matrix_id}` | 🔑 | — | 刪除指定矩陣（管理員或擁有者） |
| `POST` | `/api/kalpa/weave/{node_id}` | 🔑 | **8 點** | 神諭編織：為指定節點生成文章（失敗自動退還） |
| `POST` | `/api/kalpa/batch-weave` | 🔑 ⭐Lv.3 | **8×N 點**（深度會員享折扣） | 批量啟動神諭編織，加入背景佇列處理 |
| `GET` | `/api/kalpa/articles/all` | 🔑 | — | 列出所有已完成編織的文章（可按矩陣篩選） |
| `GET` | `/api/kalpa/node/{node_id}` | 🔑 | — | 取得單一節點詳情 |
| `POST` | `/api/kalpa/node/{node_id}/update` | 🔑 | — | 更新節點內容、圖片或錨文本（僅限擁有者） |
| `POST` | `/api/kalpa/node/{node_id}/reset` | 🔑 | — | 手動重置節點狀態為 `pending` |

**批量折扣規則（深度會員 Lv.3）**：

| 節點數 | 折扣率 |
| :---: | :---: |
| ≥ 20 | 7 折 |
| 6–19 | 8 折 |
| 2–5 | 8.5 折 |

---

## 9. CMS 發布 `/api/cms`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `GET` | `/api/cms/configs` | 🔑 ⭐Lv.2 | — | 取得 CMS 設定清單（管理員可看全部） |
| `POST` | `/api/cms/configs` | 🔑 | — | 建立 CMS 設定（WordPress、Shopify 等） |
| `PUT` | `/api/cms/configs/{config_id}` | 🔑 | — | 更新 CMS 設定 |
| `DELETE` | `/api/cms/configs/{config_id}` | 🔑 | — | 刪除 CMS 設定 |
| `POST` | `/api/cms/test-connection/{config_id}` | 🔑 | — | 測試 CMS 連線是否成功 |
| `POST` | `/api/cms/publish` | 🔑 | — | 發布文章至指定 CMS（支援立即或排程發布） |

---

## 10. 管理員 - 使用者管理 `/api/admin/users`

> 所有路由均需 **超級管理員** 登入

| 方法 | 路徑 | 認證 | 說明 |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/admin/users` | 👑 | 取得使用者清單（支援分頁、角色篩選、Email 搜尋） |
| `GET` | `/api/admin/users/{user_id}` | 👑 | 取得單一使用者詳情 |
| `PATCH` | `/api/admin/users/{user_id}` | 👑 | 更新使用者資料（角色、點數、會員等級、密碼） |
| `DELETE` | `/api/admin/users/{user_id}` | 👑 | 刪除使用者帳號（不能刪除自己） |
| `POST` | `/api/admin/users/{user_id}/credits` | 👑 | 快速調整指定使用者點數（含原因說明） |
| `GET` | `/api/admin/users/stats/summary` | 👑 | 取得使用者統計數據（總人數、各角色分佈） |
| `GET` | `/api/admin/credits/config` | 👑 | 取得目前點數費率設定 |
| `PUT` | `/api/admin/credits/config` | 👑 | 更新點數費率設定 |

---

## 11. 圖片工具 `/api/images`

| 方法 | 路徑 | 認證 | 點數 | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| `POST` | `/api/images/upload` | 🔑 | — | 上傳本機圖片（自動轉換為 WebP 格式） |
| `GET` | `/api/images/search` | 🔑 | **1 點** | 搜尋 Pexels / Pixabay 免費圖庫（`?q=...&limit=5`） |
| `GET` | `/api/images/metadata-suggestion` | 🔑 | — | AI 建議圖片 Alt Text 與圖說（`?content=...&topic=...`） |

---

## 12. 健康檢查

| 方法 | 路徑 | 認證 | 說明 |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/health` | 🌐 | 確認後端服務存活狀態 |

---

## 點數費率速覽

| 功能 | 點數成本 | 費率鍵值 |
| :--- | :---: | :--- |
| SERP 搜尋（非快取） | **2** | `serp_query` |
| 關鍵字詳細數據 (DataForSEO) | **3** | `dataforseo_keywords` |
| AI 意圖分析 | **2** | `ai_intent_analysis` |
| 大綱生成 | **5** | `create_outline` |
| 競品分析 | **3** | `competitor_analysis` |
| 內容缺口分析 | **3** | `content_gap_analysis` |
| 段落生成 | **5** | `writing_section` |
| 完整文章生成 | **20** | `writing_full` |
| 寫作優化 | **5** | `writing_optimize` |
| 天道解析 (Brainstorm) | **3** | `kalpa_brainstorm` |
| 節點成稿 (Weave Node) | **8** | `kalpa_weave_node` |
| 批量節點成稿 | **8×N（±折扣）** | `kalpa_batch_weave` |
| CMS AI 排程發布 | **2** | `cms_ai_schedule` |
| 品質審核 | **3** | `quality_audit` |
| 圖庫搜尋 | **1** | `image_stock_search` |

> [!NOTE]
> 費率可由超級管理員在後台「系統設定 → 點數費率配置」動態修改，修改後即時生效（快取 60 秒刷新一次）。
> 所有扣點失敗時系統均會自動退還點數，且點數變動與交易紀錄採原子化提交，確保一致性。

---

## 相依說明

| 外部服務 | 用途 |
| :--- | :--- |
| DataForSEO | SERP 搜尋、關鍵字建議與流量數據 |
| Zeabur AI Hub / OpenRouter | AI 文字生成（大綱、文章、分析） |
| Pexels | 商業圖庫搜尋 |
| Pixabay | 免費圖庫搜尋 |
| PostgreSQL / SQLite | 主要資料庫（生產環境建議 PG） |
| Redis（可選） | 快取加速（留空則使用記憶體快取） |
