from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_admin
from app.models.db_models import CMSConfig
from app.services.cms_service import cms_manager
from app.core.security import encrypt_value

router = APIRouter(dependencies=[Depends(get_current_admin)])

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
async def list_cms_configs(db: Session = Depends(get_db)):
    configs = db.query(CMSConfig).all()
    return [c.to_dict() for c in configs]

@router.post("/configs", response_model=CMSConfigResponse)
async def create_cms_config(request: CMSConfigRequest, db: Session = Depends(get_db)):
    config = CMSConfig(
        name=request.name,
        platform=request.platform,
        api_url=request.api_url,
        username=request.username,
        api_key=encrypt_value(request.api_key) if request.api_key else None,
        auto_publish_enabled=request.auto_publish_enabled,
        frequency_type=request.frequency_type,
        frequency_count=request.frequency_count
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config.to_dict()

@router.delete("/configs/{config_id}")
async def delete_cms_config(config_id: str, db: Session = Depends(get_db)):
    config = db.query(CMSConfig).filter(CMSConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    db.delete(config)
    db.commit()
    return {"success": True}

@router.put("/configs/{config_id}", response_model=CMSConfigResponse)
async def update_cms_config(config_id: str, request: CMSConfigRequest, db: Session = Depends(get_db)):
    config = db.query(CMSConfig).filter(CMSConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
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
async def test_cms_connection(config_id: str, db: Session = Depends(get_db)):
    config = db.query(CMSConfig).filter(CMSConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    client = cms_manager.get_client(config)
    if not client:
        return {"success": False, "message": "Invalid platform"}
    
    success = await client.test_connection()
    return {"success": success}

@router.post("/publish")
async def publish_to_cms(request: CMSPublishRequest, db: Session = Depends(get_db)):
    import datetime
    scheduled_at = None
    if request.scheduled_at:
        try:
            scheduled_at = datetime.datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    result = await cms_manager.publish_article(
        db, 
        request.target_type, 
        request.target_id, 
        request.config_id, 
        request.status, 
        scheduled_at
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("message", "Publish failed"))
    
    return result
