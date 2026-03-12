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
import json
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── 預設配置 (當資料庫未設定時使用) ──────────────────────────────
DEFAULT_CREDIT_CONFIG = {
    "costs": {
        "serp_query": 2,
        "dataforseo_keywords": 3,
        "ai_intent_analysis": 2,
        "create_outline": 5,
        "competitor_analysis": 3,
        "content_gap_analysis": 3,
        "writing_section": 5,
        "writing_full": 20,
        "writing_optimize": 5,
        "kalpa_brainstorm": 3,
        "kalpa_weave_node": 8,
        "kalpa_batch_weave": 8,
        "cms_ai_schedule": 2,
        "quality_audit": 3,
        "image_stock_search": 1,
    },
    "feature_access": {
        "writing_full": 2,          # Lv2 一般會員
        "kalpa_batch_weave": 3,     # Lv3 深度會員
        "cms_access": 2,
        "dataforseo_keywords": 2,
    },
    "batch_discounts": [
        {"threshold": 20, "rate": 0.70},
        {"threshold": 6, "rate": 0.80},
        {"threshold": 2, "rate": 0.85}
    ],
    "level_names": {
        "1": "暫時試用",
        "2": "一般會員",
        "3": "深度會員"
    }
}

class CreditService:
    """
    點數管理核心服務（無狀態，靜態方法）
    """
    _config_cache = None
    _last_cache_time = 0
    CACHE_TTL = 60  # 配置快取 1 分鐘

    @staticmethod
    def get_config(db: Session) -> Dict[str, Any]:
        """從資料庫獲取動態配置，含快取機制"""
        now = datetime.now().timestamp()
        if CreditService._config_cache and (now - CreditService._last_cache_time < CreditService.CACHE_TTL):
            return CreditService._config_cache

        try:
            from app.models.db_models import Settings
            config_json = Settings.get_value(db, "credit_config")
            if config_json:
                config = json.loads(config_json)
                CreditService._config_cache = config
                CreditService._last_cache_time = now
                return config
        except Exception as e:
            logger.warning(f"[Credits] Failed to load config from DB: {e}")
        
        return DEFAULT_CREDIT_CONFIG

    @staticmethod
    def get_cost(db: Session, key: str) -> int:
        """獲取特定操作點數成本"""
        config = CreditService.get_config(db)
        return config.get("costs", {}).get(key, DEFAULT_CREDIT_CONFIG["costs"].get(key, 0))

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
    def calculate_batch_kalpa_cost(db: Session, user, node_count: int) -> int:
        """
        計算 Kalpa 批量成稿的點數（含階梯折扣）。
        """
        config = CreditService.get_config(db)
        base_cost_per_node = config.get("costs", {}).get("kalpa_batch_weave", 8)
        total_base = base_cost_per_node * node_count

        # 只有 Lv.3 深度會員享有折扣 (或超管)
        # 這裡等級判斷也動態嗎？暫時維持 Lv3 門檻，但折扣率可動態
        if user.role == "super_admin" or user.membership_level < 3:
            return total_base

        discounts = config.get("batch_discounts", DEFAULT_CREDIT_CONFIG["batch_discounts"])
        # 由高到低排序以匹配門檻
        sorted_discounts = sorted(discounts, key=lambda x: x["threshold"], reverse=True)
        
        rate = 1.0
        for d in sorted_discounts:
            if node_count >= d["threshold"]:
                rate = d["rate"]
                break

        return math.ceil(total_base * rate)

    @staticmethod
    def check_feature_access(db: Session, user, feature: str) -> None:
        """
        根據會員等級檢查功能存取權限。
        super_admin 永遠通過。
        """
        if user.role == "super_admin":
            return

        config = CreditService.get_config(db)
        required_level = config.get("feature_access", {}).get(feature, 1)
        user_level = getattr(user, "membership_level", 1)

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
