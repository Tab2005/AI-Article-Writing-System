# Seonize 多使用者與權限架構 (RBAC) 實作規劃

## 1. 核心目標
將系統從目前的「單一管理員模式」轉型為支援「多租戶、等級權限、點數計費」的工業級 SaaS 基礎架構。確保最高管理員具備全域控制權，而一般使用者僅能存取其自有資產。

---

## 2. 資料庫模型進化 (Database Schema)

### 2.1 新增 User 資料表
- `id`: 主鍵 (UUID/Integer)
- `email`: 登入郵箱 (Unique, Indexed) - **主要登入憑證**
- `username`: 顯示名稱 (預設可用 Email 前綴)
- `hashed_password`: 雜湊後的密碼
- `role`: 權限角色 (`super_admin` | `vip` | `user`)
- `credits`: 目前可用點數 (Integer)
- `membership_level`: 會員等級 (1: Basic, 2: Pro, 3: Business)
- `created_at` / `updated_at`: 時間標記

### 2.2 現有資料表關聯強化 (Asset Ownership)
為了實現數據隔離，以下資料表將新增 `user_id` 外鍵：
- `Project`: 每個專案歸屬於特定使用者。
- `KalpaNode`: 靈感成稿歸屬於使用者。
- `KeywordHistory`: 關鍵字研究歷史。
- `CMSConfig`: 站點設定 (使用者可設定自己的 WordPress/Ghost 等)。

> [!IMPORTANT]
> **超級管理員** 可以查看所有人的資料；**一般使用者** 僅能透過 `WHERE user_id = current_user_id` 讀取資料。

---

## 3. 權限層級設計 (RBAC Matrix)

| 功能模組 | 超級管理員 (Super Admin) | 一般會員 (User/VIP) |
| :--- | :---: | :---: |
| **關鍵字研究 / 文章撰寫** | ✅ | ✅ |
| **專案管理 (自有)** | ✅ | ✅ |
| **管理頁面 (使用者清單)** | ✅ (新功能) | ❌ |
| **系統全域設定 (API Keys)** | ✅ | ❌ |
| **點數調整 / 會員審核** | ✅ | ❌ |
| **站點管理 (自有)** | ✅ | ✅ |

---

## 4. 後端架構重構 (Backend)

### 4.1 認證引擎升級
- 廢除 `app.core.config` 中的單一 `ADMIN_PASSWORD` 驗證。
- 修改 `get_current_user` 攔截器，從 JWT 的 `sub` 欄位解析使用者 ID 並從資料庫提取完整 User 物件。

### 4.2 權限裝飾器 (Decorators)
實作 `RoleChecker` 依賴項：
```python
@router.get("/admin/users")
async def list_users(admin = Depends(RoleChecker(["super_admin"]))):
    # 僅限超管訪問
    pass
```

### 4.3 點數扣減邏輯 (Credits System)
- 新增 `CreditService`，負責在執行昂貴操作（如 AI 生成）前檢查點數並執行扣減。

---

## 5. 前端介面優化 (Frontend)

### 5.1 登入與註冊入口重構 (LoginPage)
- **雙模式切換**：登入頁面新增「註冊帳號」連結，點擊後平滑切換為註冊表單。
- **欄位驗證**：實作前端 Email 格式檢查與密碼一致性驗證。
- **視覺優化**：延續 Glassmorphism 風格，增加「歡迎回來」與「加入我們」的視覺導引。

### 5.2 側邊欄使用者小卡 (Sidebar User Card)
- **視覺位置**：位於左側導覽列的最下方。
- **展示內容**：
    - **信箱**：縮略顯示登入的 Email。
    - **角色徽章**：根據權限顯示不同顏色的標籤 (Admin: 紫色, VIP: 金色, User: 藍色)。
- **快速導航**：點擊小卡可快速跳轉至「個人設定頁面」。

### 5.3 個人資訊頁面 (Profile Page) - **[NEW]**
- **基礎資料修改**：允許使用者修改「顯示名稱 (Username)」。
- **安全性操作**：提供「變更密碼」功能（需輸入舊密碼驗證）。
- **資產概覽**：顯示目前點數餘額、會員等級與註冊日期。
- **權限說明**：條列目前帳號擁有的功能權限範圍。

### 5.4 權限感知選單 (Permission-Aware Sidebar)
- **管理中樞**：僅當 `user.role === 'super_admin'` 時顯示左側導覽列。
- **設定頁面過濾**：
    - 超管：顯示 AI API Keys、搜尋 API 設定、使用者管理入口。
    - 一般會員：隱藏敏感系統設定，僅保留個人設定與專屬配置。

### 5.2 全域狀態管理
- 在前端 `AuthContext` 中新增 `role` 與 `credits` 資訊，便於組件內進行條件渲染。

---

## 6. 實作路徑與階段

### 第一階段：基礎多人架構與註冊 (Migration & Signup)
1. 建立具有 `email` 唯一性約束的 `User` 表格。
2. 遷移現成資料（將現有專案歸屬於預設的管理者 Email）。
3. 實作後端 `/api/auth/register` 端點。
4. 重構前端 `LoginPage`，包含註冊功能與狀態切換。

### 第二階段：權限封鎖 (Gatekeeping)
1. 實作全域權限攔截器。
2. 鎖定 API Key 設定頁面，僅限超管訪問。
3. 實作後台「使用者管理」基礎功能。

### 第三階段：點數與等級 (Monetization)
1. 實作點數扣減系統。
2. 根據等級設定使用限制（如：每日產文上限）。

---

## 7. 待確認事項
1. **點數規則**：產生一篇大綱扣幾點？生成一段內文扣幾點？
2. **開放註冊**：是否開放使用者自行註冊，還是需由管理員建立？
3. **數據共享**：是否允許同團隊的使用者共享專案？ (目前的規劃是完全隔離)

> [!TIP]
> 建議先實作「超級管理員 vs 一般使用者」的隔離，點數邏輯可稍後封裝。
