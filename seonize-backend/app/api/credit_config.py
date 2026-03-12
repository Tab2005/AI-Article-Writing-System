from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Dict
import json
from app.core.database import get_db
from app.models.db_models import Settings
from app.core.auth import get_current_admin
from app.services.credit_service import CreditService, DEFAULT_CREDIT_CONFIG

router = APIRouter(prefix="/api/admin/credits", dependencies=[Depends(get_current_admin)])

@router.get("/config")
async def get_credit_config(db: Session = Depends(get_db)):
    """獲取目前的點數與權限配置"""
    return CreditService.get_config(db)

@router.put("/config")
async def update_credit_config(config: Dict[str, Any], db: Session = Depends(get_db)):
    """更新點數與權限配置"""
    try:
        # 簡單驗證結構
        if "costs" not in config or "feature_access" not in config or "batch_discounts" not in config:
            raise HTTPException(status_code=400, detail="無效的配置結構")
            
        Settings.set_value(db, "credit_config", json.dumps(config))
        # 清除快取
        CreditService._config_cache = None
        return {"message": "配置已更新", "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
