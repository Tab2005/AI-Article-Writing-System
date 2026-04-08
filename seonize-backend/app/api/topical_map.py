from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from sqlalchemy.orm import Session, selectinload
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
    if current_user.credits < COST_PER_MAP:
        raise HTTPException(status_code=400, detail="點數不足，生成主題地圖需要 50 點")
    
    CreditService.deduct(db, current_user, COST_PER_MAP, f"生成主題地圖: {request.topic}")
    
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
    
    # 修改：不要傳遞 request session 'db'，改由 task 內部自行建立
    background_tasks.add_task(topical_map_service.generate_map_task, new_map.id, current_user.id)
    return new_map

@router.get("/list", response_model=List[TopicalMapResponse])
async def list_topical_maps(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """獲取使用者的所有地圖列表"""
    try:
        maps = db.query(TopicalMap).filter(TopicalMap.user_id == current_user.id).order_by(TopicalMap.created_at.desc()).all()
        return maps
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{map_id}", response_model=TopicalMapDetailResponse)
async def get_topical_map(
    map_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """獲取特定地圖的詳細結構"""
    # 1. 先確認地圖存在
    topical_map = db.query(TopicalMap).filter(
        TopicalMap.id == map_id,
        TopicalMap.user_id == current_user.id
    ).first()
    
    if not topical_map:
        raise HTTPException(status_code=404, detail="主題地圖不存在")
    
    # 2. 查詢所有屬於此地圖的群聚 (L1 & L2)
    # 使用 selectinload 確保關鍵字與子群聚被載入
    all_clusters = db.query(TopicalCluster).options(
        selectinload(TopicalCluster.keywords),
        selectinload(TopicalCluster.subclusters)
    ).filter(
        TopicalCluster.topical_map_id == map_id
    ).all()
    
    # 3. 篩選出 L1 作為根節點 (L2 會透過 subclusters 關係自動顯示)
    root_clusters = [c for c in all_clusters if c.level == 1]
    
    # 4. 手動構建回應以確保格式正確
    return {
        "id": topical_map.id,
        "user_id": topical_map.user_id,
        "name": topical_map.name,
        "topic": topical_map.topic,
        "country": topical_map.country,
        "language": topical_map.language,
        "total_keywords": topical_map.total_keywords,
        "total_search_volume": topical_map.total_search_volume,
        "status": topical_map.status,
        "created_at": topical_map.created_at,
        "updated_at": topical_map.updated_at,
        "clusters": root_clusters
    }

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
