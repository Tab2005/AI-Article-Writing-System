# Seonize 進階版 (Professional Edition) 升級規劃

本文件詳述如何將目前的「單一管理員模式」升級為支援「多使用者、團隊協作與權限控管」的進階版系統架構。

## 1. 資料庫架構變更 (Database Schema)

目前的架構僅有 `Project` 與 `Settings` 等表，升級至進階版需引入以下實體：

### 1.1 使用者管理
- **Users 表**: 儲存使用者帳號、密碼雜湊、電子郵件、狀態（啟用/停用）。
- **Organization/Team 表**: 支援多租戶 (Multi-tenancy)，使用者屬於特定的組織。
- **Roles 表**: 定義角色 (如 Admin, Editor, Viewer)。

### 1.2 關聯調整
- `Project` 表新增 `user_id` 或 `org_id` 欄位，實作資料隔離。
- `Settings` 分為「系統層級 (System)」與「使用者層級 (User)」。

## 2. 認證與授權系統 (Auth & RBAC)

### 2.1 擴展 JWT 邏輯
- Token 載荷 (Payload) 應包含 `user_id`, `role`, `org_id`。
- 實作刷新權杖 (Refresh Token) 機制，提升安全性與使用者體驗。

### 2.2 基於角色的存取控制 (RBAC)
- 實作 `PermissionChecker` 裝飾器：
```python
@router.post("/projects")
async def create_project(
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(checker.require_permission("project:create"))
):
    ...
```

## 3. 前端界面升級

### 3.1 帳戶管理
- 實作使用者設定頁面 (Profile Settings)。
- 建立團隊管理面板 (Team Management)，支援邀請新成員。

### 3.2 視圖隔離
- 儀表板根據權限顯示不同的功能按鈕。
- 實作更細緻的 API 錯誤處理（如 403 Forbidden 提示）。

## 4. 基礎設施考量

- **遷移至 PostgreSQL**: SQLite 不適合多使用者頻繁並發寫入。
- **引入 Redis Session**: 用於管理使用者登入狀態與速率限制 (Rate Limiting per User)。
- **資料加密 (C-2)**: 每個組織應擁有獨立的加密金鑰 (KMS/Envelope Encryption)。

---

> [!TIP]
> 建議在完成 `C-2 (Settings 加密)` 後，再開始規劃此部分的具體實作，以確保安全基礎穩固。
