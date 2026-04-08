from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.topical_map import TopicalMapCreate, TopicalMapResponse, TopicalMapDetailResponse
from app.models.db_models import TopicalMap, TopicalCluster, TopicalKeyword
from app.services.topical_map_service import topical_map_service
from app.services.credit_service import CreditService

router = APIRouter(dependencies=[Depends(get_current_user)])

COST_PER_MAP = 50

@router.post("/generate", response_model=TopicalMapResponse)
async def create_topical_map(
    request: TopicalMapCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """建立主題地圖並啟動非同步生成任務"""
    # 1. 檢查點數
    if current_user.credits < COST_PER_MAP:
        raise HTTPException(status_code=400, detail="點數不足，生成主題地圖需要 50 點")
    
    # 2. 扣除點數
    CreditService.deduct(db, current_user, COST_PER_MAP, f"生成主題地圖: {request.topic}")
    
    # 3. 建立紀錄
    new_map = TopicalMap(
        user_id=current_user.id,
        name=request.name,
        topic=request.topic,
        country=request.country,
        language=request.language,
        status="processing"
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    # 4. 啟動非同步生成任務
    background_tasks.add_task(topical_map_service.generate_map_task, db, new_map.id, current_user.id)
    
    return new_map

@router.get("/list", response_model=List[TopicalMapResponse])
async def list_topical_maps(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """獲取使用者的所有地圖列表"""
    maps = db.query(TopicalMap).filter(TopicalMap.user_id == current_user.id).order_by(TopicalMap.created_at.desc()).all()
    return maps

@router.get("/{map_id}", response_model=TopicalMapDetailResponse)
async def get_topical_map(
    map_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """獲取特定地圖的詳細結構"""
    topical_map = db.query(TopicalMap).filter(
        TopicalMap.id == map_id,
        TopicalMap.user_id == current_user.id
    ).first()
    
    if not topical_map:
        raise HTTPException(status_code=404, detail="主題地圖不存在")
    
    return topical_map

@router.delete("/{map_id}")
async def delete_topical_map(
    map_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """刪除主題地圖"""
    topical_map = db.query(TopicalMap).filter(
        TopicalMap.id == map_id,
        TopicalMap.user_id == current_user.id
    ).first()
    
    if not topical_map:
        raise HTTPException(status_code=404, detail="主題地圖不存在")
    
    db.delete(topical_map)
    db.commit()
    return {"success": True, "message": "已刪除主題地圖"}
