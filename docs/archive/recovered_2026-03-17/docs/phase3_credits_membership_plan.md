# Seonize 第三階段：點數扣減系統與會員等級規劃

> 文件建立日期：2026-03-03 | 適用版本：Seonize v2.0+

---

## 1. 核心設計理念

系統以**「點數 (Credits)」**作為統一的使用貨幣，讓不同等級的會員取得不同數量的點數配額與功能權限。每個耗費 AI 算力或外部 API 的操作都會對應一個點數成本，確保系統資源的公平分配與商業可持續性。

---

## 2. 三級會員等級定義

| 等級 | 識別符 | 說明 | 點數來源 |
|:---|:---:|:---|:---|
| **暫時試用** | `trial` | 新用戶預設等級，有限體驗 | 初始贈送 **30 點** |
| **一般會員** | `basic` | 付費基礎訂閱，適合個人使用 | 每月補充 **200 點** |
| **深度會員** | `pro` | 付費進階訂閱，適合專業操作 | 每月補充 **1000 點** |
| **超級管理員** | `super_admin` | 系統管理者，不受點數限制 | 無限制 |

### 2.1 等級對應現有資料庫欄位

```
User.membership_level:
  1 = trial（暫時試用）
  2 = basic（一般會員）
  3 = pro（深度會員）
  * super_admin 角色不受等級限制
```

---

## 3. 各功能點數消耗設計

### 3.1 關鍵字研究模組（`/api/research`）

| 操作 | 點數消耗 | 說明 |
|:---|:---:|:---|
| SERP 查詢（有快取命中） | **0 點** | 讀取快取，不耗費外部 API |
| SERP 查詢（無快取，首次） | **2 點** | 呼叫搜尋引擎 API |
| DataForSEO 關鍵字數據 | **3 點** | 呼叫付費 API |
| AI 意圖分析 | **2 點** | Gemini AI 推論 |

### 3.2 大綱 / SEO 分析模組（`/api/analysis`）

| 操作 | 點數消耗 | 說明 |
|:---|:---:|:---|
| 建立 Outline 大綱 | **5 點** | AI 生成結構 |
| 競品頁面分析 | **3 點** | 抓取 + AI 分析 |

### 3.3 文章撰寫模組（`/api/writing`）

| 操作 | 點數消耗 | 說明 |
|:---|:---:|:---|
| 生成單段落內文 | **5 點** | AI 寫作 |
| 生成完整文章（全段落） | **20 點** | 批次 AI 生成 |
| 文章優化（改寫/潤稿） | **5 點** | AI 改寫 |

### 3.4 劫之眼術 - Kalpa 因果矩陣（`/api/kalpa`）

| 操作 | 點數消耗 | 說明 |
|:---|:---:|:---|
| AI 要素聯想（Brainstorm） | **3 點** | AI 發想建議 |
| 單節點成稿 | **8 點** | AI 文章生成 |
| 批量節點成稿（每節點） | **6 點** | 批次折扣 |

### 3.5 站點管理 / CMS（`/api/cms`）

| 操作 | 點數消耗 | 說明 |
|:---|:---:|:---|
| 手動發布文章 | **0 點** | 僅 API 呼叫 |
| AI 輔助排程優化 | **2 點** | AI 分析最佳時間 |

---

## 4. 各等級功能限制矩陣

| 功能 | 暫時試用 | 一般會員 | 深度會員 |
|:---|:---:|:---:|:---:|
| **關鍵字研究**（每日次數） | 3 次 | 20 次 | 無限 |
| **SERP 查詢**（有快取） | ✅ | ✅ | ✅ |
| **DataForSEO 關鍵字數據** | ❌ | ✅ | ✅ |
| **大綱生成** | ✅ 限 2 次/日 | ✅ | ✅ |
| **文章生成（段落）** | ✅ 限 5 次/日 | ✅ | ✅ |
| **文章生成（完整文章）** | ❌ | ✅ | ✅ |
| **Kalpa 矩陣 - 要素聯想** | ✅ 限 1 次/日 | ✅ | ✅ |
| **Kalpa 矩陣 - 節點成稿** | ❌ | ✅ 限 5 節/日 | ✅ 無限 |
| **Kalpa 批量成稿** | ❌ | ❌ | ✅ |
| **站點管理 (CMS)** | ❌ | ✅ | ✅ |
| **同時管理站點數** | 0 | 1 | 5 |
| **專案數量上限** | 3 | 20 | 無限 |
| **歷史記錄保留天數** | 7 天 | 90 天 | 365 天 |

---

## 5. 後端實作規劃

### 5.1 新增 `CreditService`（`app/services/credit_service.py`）

```python
class CreditService:
    @staticmethod
    def check_and_deduct(db, user: User, cost: int, operation: str) -> bool:
        """
        檢查用戶是否有足夠點數並執行扣減。
        super_admin 永遠返回 True 且不扣點。
        """
        if user.role == "super_admin":
            return True
        if user.credits < cost:
            raise HTTPException(
                status_code=402,
                detail=f"點數不足（需要 {cost} 點，目前剩餘 {user.credits} 點）"
            )
        user.credits -= cost
        db.commit()
        return True

    @staticmethod  
    def check_feature_access(user: User, feature: str) -> bool:
        """
        根據會員等級檢查功能存取權限。
        """
        # ...
```

### 5.2 新增 `DailyLimitService`（計數限制）

在 `User` 資料表或 Redis/快取中記錄每日使用次數，跨日自動重置。

```python
# 實作方案：在 cache 中以 key 儲存
# key: f"daily:{user_id}:{feature}:{today}"
# value: 使用次數（int）
# TTL: 到當日 23:59
```

### 5.3 各 API 端點掛鉤點數扣減

在現有端點中注入 `CreditService`：

```python
# 範例：writing.py
@router.post("/generate-section")
async def generate_section(
    ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. 功能存取檢查（等級）
    check_feature_access(current_user, "writing_section")
    # 2. 每日次數檢查
    check_daily_limit(current_user, "writing_section")
    # 3. 點數扣減
    CreditService.check_and_deduct(db, current_user, cost=5, operation="生成段落")
    # 4. 執行原始邏輯
    ...
```

### 5.4 新增 `CreditLog` 點數異動記錄表（可選）

```sql
CREATE TABLE credit_logs (
    id          INTEGER PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL,
    delta       INTEGER NOT NULL,  -- 正數=入帳, 負數=扣除
    balance     INTEGER NOT NULL,  -- 操作後餘額
    operation   VARCHAR(100),      -- 操作名稱
    created_at  DATETIME
);
```

---

## 6. 前端實作規劃

### 6.1 點數餘額顯示強化

- 側邊欄使用者小卡：顯示剩餘點數 + 低點數警示（< 20 點顯示橘色）
- 操作前友善提示：執行昂貴操作前顯示「本次將消耗 X 點」確認提示
- 點數不足攔截：API 返回 402 時顯示引導升級的 Modal

### 6.2 個人資訊頁面強化

在個人資訊頁加入：
- **點數使用明細**：最近 10 筆扣點記錄
- **等級升級引導**：顯示下一等級的功能差異
- **每日配額儀表**：進度條顯示今日各功能的使用情況

### 6.3 功能入口鎖定 UI

- 不可用功能改為「灰底 + 鎖定圖示」
- 懸停顯示「升級至 XXX 解鎖此功能」
- 點擊鎖定功能彈出「升級說明」Modal

---

## 7. 資料庫遷移計畫

### Step 1：更新 User 資料表
```python
# 將 membership_level 語義對應更新
# 1 = trial, 2 = basic, 3 = pro
# 新增：daily_usage 欄位（JSON，記錄今日各功能次數）
# 或使用 Cache 管理（推薦）
```

### Step 2：新增 CreditLog 表
```python
class CreditLog(Base):
    __tablename__ = "credit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), index=True, nullable=False)
    delta = Column(Integer, nullable=False)
    balance = Column(Integer, nullable=False)
    operation = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

---

## 8. 實作優先順序

### Phase 3-A（核心基礎，建議優先完成）
1. `CreditService` 核心邏輯（扣點 + 檢查）
2. `writing.py` 生成段落 / 完整文章端點接入點數
3. `kalpa.py` 節點成稿接入點數
4. 前端：點數不足 402 錯誤的友善 Modal 顯示

### Phase 3-B（使用限制）
5. `DailyLimitService` + Cache 計數
6. 各端點接入每日次數限制
7. 前端：功能鎖定 UI 與每日配額顯示

### Phase 3-C（完整體驗）
8. `CreditLog` 資料表 + 記錄寫入
9. 個人頁面點數明細
10. 升級引導 Modal

---

## 9. 已確認政策

### 9.1 點數方案：月費制（自動補點）

每月訂閱成功後，系統自動將點數補充至對應等級上限。後續可擴充「加購點數包」方案（非訂閱制，一次性購買額外點數）。

```
每月補點邏輯：
- 一般會員：每月 1 日，credits += 200（累積上限 400 點）
- 深度會員：每月 1 日，credits += 1000（累積上限 2000 點）
- 暫時試用：僅首次贈送 30 點，不自動補充
```

> [!NOTE]
> 點數採**累積制**，未用完的點數保留到下個月（設定上限以避免囤積）。

---

### 9.2 試用期限：無時間限制，點數用完即止

暫時試用會員享有 30 點初始點數，使用完畢後即無法執行任何 AI 操作，但仍可：
- 瀏覽歷史記錄（7 天內）
- 查看已生成的文章（摘要）
- 升級至付費方案

```python
# 試用期邏輯：不需追蹤時間，只需判斷點數是否 > 0
if user.membership_level == 1 and user.credits <= 0:
    raise HTTPException(
        status_code=402,
        detail="試用點數已用完，請升級為一般會員以繼續使用。"
    )
```

---

### 9.3 使用限制：取消每日配額上限

系統**不設定每日使用次數限制**，完全以點數作為唯一的使用節流機制。點數用完了就無法操作，邏輯簡單透明。

移除原規劃中的 `DailyLimitService`，Phase 3-B 簡化為「點數管控」即可。

---

### 9.4 批量操作點數：階梯折扣計算

**設計原則：** 批量操作給予折扣以鼓勵深度使用，但折扣僅限**深度會員**。

#### 範例一：Kalpa 批量節點成稿

| 選取節點數 | 定價方式 | 一般會員（單價制） | 深度會員（折扣制） |
|:---:|:---:|:---:|:---:|
| 1 節點 | 單次定價 | 8 點 | 8 點 |
| 3 節點 | 批量 × 0.9 | 24 點 | 22 點（四捨五入） |
| 5 節點 | 批量 × 0.85 | 40 點 | 34 點 |
| 10 節點 | 批量 × 0.8 | 80 點 | 64 點 |
| 20 節點 | 批量 × 0.7 | 160 點 | 112 點 |

> 計算公式（深度會員批量）：
> ```
> 節點數 1：cost = n × 8
> 節點數 2–5：cost = ceil(n × 8 × 0.85)
> 節點數 6–19：cost = ceil(n × 8 × 0.80)
> 節點數 ≥ 20：cost = ceil(n × 8 × 0.70)
> ```

#### 範例二：文章完整生成 vs 逐段生成

| 操作方式 | 點數 | 說明 |
|:---|:---:|:---|
| 逐段生成（10 段 × 5 點） | 50 點 | 按次計費 |
| 完整文章一次生成 | 20 點 | 打包折扣（省 30 點）|
| 完整文章 × 深度會員加碼優化 | 25 點 | 含品質優化步驟 |

---

### 9.5 退款機制：基於 API 成功觸發判定

**設計原則：** 只要外部 AI/API 有成功返回內容，即視為操作成功，正常扣點。若操作中途失敗（例外捕獲到錯誤），則**退還全部點數**。

#### 成功/失敗定義

| 情境 | 是否扣點 | 說明 |
|:---|:---:|:---|
| AI API 正常返回內容 | ✅ 扣點 | 操作成功 |
| AI API 返回空白內容 | ❌ 退還 | 視為失敗 |
| AI API 超時（Timeout） | ❌ 退還 | 網路問題，非使用者責任 |
| 外部 API（DataForSEO）失敗 | ❌ 退還 | 外部服務故障 |
| 使用者自行取消操作 | ❌ 退還 | 尚未觸發 AI 則不扣 |
| 伺服器內部錯誤（500） | ❌ 退還 | 系統錯誤 |

#### 退款實作邏輯

```python
# CreditService 的退款設計
class CreditService:
    @staticmethod
    def deduct(db, user, cost, operation):
        """先扣點，回傳 transaction_id"""
        user.credits -= cost
        db.commit()
        return {"deducted": cost, "balance": user.credits}

    @staticmethod
    def refund(db, user, cost, reason):
        """退還點數（操作失敗時呼叫）"""
        user.credits += cost
        db.commit()
        return {"refunded": cost, "balance": user.credits}

# 在端點中的使用模式
@router.post("/generate-section")
async def generate_section(...):
    COST = 5
    # 1. 先扣點
    CreditService.deduct(db, current_user, COST, "生成段落")
    
    try:
        # 2. 執行 AI 操作
        result = await ai_service.generate(...)
        
        # 3. 驗證結果是否有效
        if not result or not result.strip():
            CreditService.refund(db, current_user, COST, "AI 返回空白")
            raise HTTPException(status_code=500, detail="AI 生成內容為空，已退還點數。")
        
        return result
        
    except (TimeoutError, ExternalAPIError) as e:
        # 4. 外部失敗自動退還
        CreditService.refund(db, current_user, COST, str(e))
        raise HTTPException(status_code=503, detail=f"操作失敗，已退還 {COST} 點。")
```

---

## 10. 修訂後實作優先順序

### Phase 3-A（核心基礎）✦ 建議優先
1. `CreditService`：`deduct()` + `refund()` + `check_balance()`
2. `writing.py` 生成段落 / 完整文章接入點數（含退款機制）
3. `kalpa.py` 節點成稿 / 批量成稿接入點數（含批量折扣計算）
4. 前端：點數不足 402 錯誤顯示友善 Modal

### Phase 3-B（批量折扣 + 批量退款）
5. Kalpa 批量操作的階梯折扣計算器
6. 批量操作的部分退款機制（部分節點失敗時按比例退還）
7. 前端：操作前顯示「本次消耗 X 點」確認提示

### Phase 3-C（完整記錄與引導）
8. `CreditLog` 資料表 + 每次扣點/退款記錄
9. 個人頁面點數明細（最近 20 筆）
10. 功能入口鎖定 UI（試用用完後的升級引導）

---

> [!IMPORTANT]
> **退款的核心判斷**：以「AI/外部 API 是否成功觸發並返回有效內容」作為標準，而非「使用者是否滿意結果」。這確保了系統公平性，同時避免被濫用。
