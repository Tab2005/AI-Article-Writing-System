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
    try:
        # 手動檢查資料表是否存在 (最後防線)
        from sqlalchemy import inspect
        inspector = inspect(db.get_bind())
        if not inspector.has_table("topical_maps"):
            # 如果資料表不存在，嘗試透過 Base 建立 (這在 Alembic 失效時很有用)
            TopicalMap.__table__.create(db.get_bind(), checkfirst=True)
            TopicalCluster.__table__.create(db.get_bind(), checkfirst=True)
            TopicalKeyword.__table__.create(db.get_bind(), checkfirst=True)
            db.commit()

        maps = db.query(TopicalMap).filter(TopicalMap.user_id == current_user.id).order_by(TopicalMap.created_at.desc()).all()
        return maps
    except Exception as e:
        import traceback
        print(f"Topical Map List Error: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Database error: {str(e)}. Please contact administrator if this persists."
        )

from sqlalchemy.orm import Session, joinedload, selectinload
# ... (rest of imports)

@router.get("/{map_id}", response_model=TopicalMapDetailResponse)
async def get_topical_map(
    map_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """獲取特定地圖的詳細結構"""
    # 預先載入所有關聯資料
    topical_map = db.query(TopicalMap).options(
        selectinload(TopicalMap.clusters).selectinload(TopicalCluster.subclusters),
        selectinload(TopicalMap.clusters).selectinload(TopicalCluster.keywords)
    ).filter(
        TopicalMap.id == map_id,
        TopicalMap.user_id == current_user.id
    ).first()
    
    if not topical_map:
        raise HTTPException(status_code=404, detail="主題地圖不存在")
    
    # 為了讓前端渲染更方便，我們只回傳 level 1 的 clusters (樹狀根部)
    # SQLAlchemy 的 selectinload 會自動填充子物件
    root_clusters = [c for c in topical_map.clusters if c.level == 1]
    
    # 建立一個臨時對象來匹配 Response Schema，只包含根群聚
    # 注意：TopicalMapDetailResponse 繼承自 TopicalMapResponse
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
