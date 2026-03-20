from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.db_models import CMSConfig
from app.services.cms_service import cms_manager
from app.core.security import encrypt_value

# 配置路由依賴為全域登入
router = APIRouter(dependencies=[Depends(get_current_user)])

class CMSConfigRequest(BaseModel):
    name: str
    platform: str
    api_url: str
    api_key: Optional[str] = None
    username: Optional[str] = None
    auto_publish_enabled: bool = False
    frequency_type: str = "day"
    frequency_count: int = 1

class CMSConfigResponse(BaseModel):
    id: str
    name: str
    platform: str
    api_url: str
    username: Optional[str]
    is_active: bool
    auto_publish_enabled: bool
    frequency_type: str
    frequency_count: int
    last_auto_published_at: Optional[str]

class CMSPublishRequest(BaseModel):
    target_type: str  # project or kalpa_node
    target_id: str
    config_id: str
    status: str = "draft"
    scheduled_at: Optional[str] = None # ISO format

@router.get("/configs", response_model=List[CMSConfigResponse])
async def list_cms_configs(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """取得當前使用者所有 CMS 設定 (管理員可看全部)"""
    import logging
    logger = logging.getLogger("app.api.cms")
    logger.info(f"🔍 list_cms_configs called by User(id={current_user.id}, role={current_user.role})")
    
    query = db.query(CMSConfig)
    total_in_db = query.count()
    
    # 無論角色，均僅能看到自己的或系統共用的 (user_id is None)
    from sqlalchemy import or_
    query = query.filter(or_(CMSConfig.user_id == current_user.id, CMSConfig.user_id == None))
    
    configs = query.all()
    logger.info(f"✅ Found {len(configs)} CMS configs for user {current_user.id}")
    
    # 診斷用途：如果超管看不到任何東西，回傳一個虛擬提示項，以便前端觀察
    if not configs and current_user.role == "super_admin":
        return [{
            "id": "debug",
            "name": f"角色={current_user.role}, UID={current_user.id[:8]}",
            "platform": "system",
            "api_url": "debug",
            "username": "debug_user",
            "is_active": True,
            "auto_publish_enabled": False,
            "frequency_type": "day",
            "frequency_count": 1,
            "last_auto_published_at": None
        }]
        
    return [c.to_dict() for c in configs]

@router.post("/configs", response_model=CMSConfigResponse)
async def create_cms_config(
    request: CMSConfigRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """建立 CMS 設定 (關聯使用者)"""
    config = CMSConfig(
        name=request.name,
        platform=request.platform,
        api_url=request.api_url,
        username=request.username,
        api_key=encrypt_value(request.api_key) if request.api_key else None,
        auto_publish_enabled=request.auto_publish_enabled,
        frequency_type=request.frequency_type,
        frequency_count=request.frequency_count,
        user_id=current_user.id
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config.to_dict()

@router.delete("/configs/{config_id}")
async def delete_cms_config(
    config_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """刪除 CMS 設定 (管理員或擁有者)"""
    query = db.query(CMSConfig).filter(CMSConfig.id == config_id)
    # 僅限擁有者或系統共用設定的操作
    query = query.filter(CMSConfig.user_id == current_user.id)
        
    config = query.first()
    
    if not config:
        raise HTTPException(status_code=404, detail="找不到設定或權限不足")
    
    db.delete(config)
    db.commit()
    return {"success": True}

@router.put("/configs/{config_id}", response_model=CMSConfigResponse)
async def update_cms_config(
    config_id: str, 
    request: CMSConfigRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """更新 CMS 設定 (管理員或擁有者)"""
    query = db.query(CMSConfig).filter(CMSConfig.id == config_id)
    # 僅限擁有者或系統共用設定的操作
    query = query.filter(CMSConfig.user_id == current_user.id)
        
    config = query.first()
    
    if not config:
        raise HTTPException(status_code=404, detail="找不到設定或權限不足")
    
    config.name = request.name
    config.platform = request.platform
    config.api_url = request.api_url
    config.username = request.username
    config.auto_publish_enabled = request.auto_publish_enabled
    config.frequency_type = request.frequency_type
    config.frequency_count = request.frequency_count
    
    # 只有在提供了新的 key 時才更新並加密
    if request.api_key and request.api_key.strip():
        config.api_key = encrypt_value(request.api_key.strip())
        
    db.commit()
    db.refresh(config)
    return config.to_dict()

@router.post("/test-connection/{config_id}")
async def test_cms_connection(
    config_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """測試 CMS 連線 (管理員或擁有者)"""
    query = db.query(CMSConfig).filter(CMSConfig.id == config_id)
    # 僅限擁有者或系統共用設定的操作
    query = query.filter(CMSConfig.user_id == current_user.id)
        
    config = query.first()
    
    if not config:
        raise HTTPException(status_code=404, detail="找不到設定或權限不足")
    
    client = cms_manager.get_client(config)
    if not client:
        return {"success": False, "message": "無效的平台"}
    
    success = await client.test_connection()
    return {"success": success}

@router.post("/publish")
async def publish_to_cms(
    request: CMSPublishRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """發布文章至 CMS (僅限擁有者)"""
    import datetime
    scheduled_at = None
    if request.scheduled_at:
        try:
            scheduled_at = datetime.datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="無效的時間格式")

    result = await cms_manager.publish_article(
        db, 
        request.target_type, 
        request.target_id, 
        request.config_id, 
        current_user.id, # 傳遞使用者 ID
        request.status, 
        scheduled_at
    )
    
    # 不要在這裡拋出 HTTPException(500)，直接回傳 result，由前端處理 success=False
    # 這能避免全域異常處理器遺漏 CORS 標頭導致的抓不到錯誤訊息問題
    return result
