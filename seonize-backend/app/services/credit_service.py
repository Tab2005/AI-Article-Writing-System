"""
Seonize Backend - Credit Service (Phase 3-A)
點數扣減、退款與余額查詢服務

設計原則：
- super_admin 永遠不扣點
- 先扣點再執行操作，失敗時呼叫 refund()
- 批量操作對深度會員提供階梯折扣
"""

import math
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── 各操作點數成本常量 ──────────────────────────────────────────
CREDIT_COSTS = {
    # 關鍵字研究
    "serp_query":           2,   # SERP 查詢（無快取）
    "dataforseo_keywords":  3,   # DataForSEO 關鍵字數據
    "ai_intent_analysis":   2,   # AI 意圖分析
    # 大綱/分析
    "create_outline":       5,   # 建立 outline 大綱
    "competitor_analysis":  3,   # 競品分析
    # 文章撰寫
    "writing_section":      5,   # 生成單段落
    "writing_full":         20,  # 生成完整文章
    "writing_optimize":     5,   # 文章優化改寫
    # Kalpa 劫之眼術
    "kalpa_brainstorm":     3,   # AI 要素聯想
    "kalpa_weave_node":     8,   # 單節點成稿
    "kalpa_batch_weave":    8,   # 批量成稿（每節點基礎價，實際會計算折扣）
    # CMS
    "cms_ai_schedule":      2,   # AI 輔助排程優化
}

# ── 會員等級識別 ──────────────────────────────────────────────
MEMBERSHIP_LEVEL_TRIAL = 1
MEMBERSHIP_LEVEL_BASIC = 2
MEMBERSHIP_LEVEL_PRO   = 3

# ── 功能權限表 (最少需要等級) ──────────────────────────────────
FEATURE_ACCESS_LEVELS = {
    "writing_full":         MEMBERSHIP_LEVEL_BASIC,  # 完整文章需一般會員
    "kalpa_batch_weave":    MEMBERSHIP_LEVEL_PRO,    # 批量編織需深度會員
    "cms_access":           MEMBERSHIP_LEVEL_BASIC,  # CMS 需一般會員
    "dataforseo_keywords":  MEMBERSHIP_LEVEL_BASIC,  # DataForSEO 需一般會員
}



class CreditService:
    """
    點數管理核心服務（無狀態，靜態方法）
    """

    @staticmethod
    def check_balance(user, cost: int) -> None:
        """
        驗證使用者是否有足夠點數，不足則拋出 402。
        super_admin 永遠通過。
        """
        if user.role == "super_admin":
            return
        if user.credits < cost:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "code": "INSUFFICIENT_CREDITS",
                    "message": f"點數不足。本次操作需要 {cost} 點，您目前剩餘 {user.credits} 點。",
                    "required": cost,
                    "available": user.credits,
                }
            )

    @staticmethod
    def deduct(db: Session, user, cost: int, operation: str) -> Optional[dict]:
        """
        扣除點數並記錄日誌。
        super_admin 不扣點但仍記錄操作。
        返回 transaction info dict 以供 refund 使用。
        """
        if user.role == "super_admin":
            logger.info(f"[Credits] SKIP deduct for super_admin {user.email}: {operation}")
            return {"deducted": 0, "balance": user.credits, "skipped": True}

        CreditService.check_balance(user, cost)

        user.credits -= cost
        balance_after = user.credits
        db.commit()

        # 寫入 CreditLog
        CreditService._write_log(db, user.id, -cost, balance_after, operation)

        logger.info(f"[Credits] -{cost} pts | {user.email} | '{operation}' | 餘額: {balance_after}")
        return {"deducted": cost, "balance": balance_after, "skipped": False}

    @staticmethod
    def refund(db: Session, user, cost: int, reason: str) -> dict:
        """
        退還點數（操作失敗時呼叫）。
        super_admin 不退點（因為沒扣）。
        """
        if user.role == "super_admin" or cost == 0:
            return {"refunded": 0, "balance": user.credits}

        user.credits += cost
        balance_after = user.credits
        db.commit()

        CreditService._write_log(db, user.id, +cost, balance_after, f"[退還] {reason}")

        logger.info(f"[Credits] +{cost} pts REFUND | {user.email} | 原因: {reason}")
        return {"refunded": cost, "balance": balance_after}

    @staticmethod
    def calculate_batch_kalpa_cost(user, node_count: int) -> int:
        """
        計算 Kalpa 批量成稿的點數（含深度會員折扣）。
        
        折扣規則（深度會員 Lv.3 限定）：
          1 節點：× 1.0（原價）
          2-5 節點：× 0.85
          6-19 節點：× 0.80
          ≥ 20 節點：× 0.70
        """
        base_cost_per_node = CREDIT_COSTS["kalpa_batch_weave"]
        total_base = base_cost_per_node * node_count

        # 只有深度會員享有折扣
        if user.role == "super_admin" or user.membership_level < MEMBERSHIP_LEVEL_PRO:
            return total_base

        if node_count == 1:
            rate = 1.0
        elif node_count <= 5:
            rate = 0.85
        elif node_count <= 19:
            rate = 0.80
        else:
            rate = 0.70

        return math.ceil(total_base * rate)

    @staticmethod
    def check_feature_access(user, feature: str) -> None:
        """
        根據會員等級檢查功能存取權限。
        super_admin 永遠通過。
        """
        if user.role == "super_admin":
            return

        required_level = FEATURE_ACCESS_LEVELS.get(feature, MEMBERSHIP_LEVEL_TRIAL)
        user_level = getattr(user, "membership_level", MEMBERSHIP_LEVEL_TRIAL)

        if user_level < required_level:
            level_names = {1: "暫時試用", 2: "一般會員", 3: "深度會員"}
            req_name = level_names.get(required_level, "更高")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "LEVEL_RESTRICTED",
                    "message": f"此功能僅限「{req_name}」以上等級使用，請升級您的方案。",
                    "required_level": required_level,
                    "current_level": user_level
                }
            )

    @staticmethod
    def _write_log(db: Session, user_id: str, delta: int, balance: int, operation: str):
        """寫入 CreditLog（安靜失敗，不影響主流程）"""
        try:
            from app.models.db_models import CreditLog
            log = CreditLog(
                user_id=user_id,
                delta=delta,
                balance=balance,
                operation=operation,
                created_at=datetime.now(timezone.utc)
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.warning(f"[Credits] 無法寫入 CreditLog: {e}")
            db.rollback()
