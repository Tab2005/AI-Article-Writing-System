from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.kalpa_service import kalpa_service
from app.core.auth import get_current_admin

router = APIRouter()

class KalpaGenerateRequest(BaseModel):
    project_name: str = "Default_Project"
    entities: List[str]
    actions: List[str]
    pain_points: List[str]

class KalpaNode(BaseModel):
    entity: str
    action: str
    pain_point: str
    target_title: str
    status: str

@router.post("/generate", response_model=List[KalpaNode])
async def generate_kalpa_matrix(
    request: KalpaGenerateRequest,
    current_admin: str = Depends(get_current_admin)
):
    """
    生成因果矩陣端點
    """
    if not request.entities or not request.actions or not request.pain_points:
        raise HTTPException(status_code=400, detail="實體、動作與痛點列表均不能為空。")
        
    try:
        results = kalpa_service.generate_matrix(
            entities=request.entities,
            actions=request.actions,
            pain_points=request.pain_points,
            project_name=request.project_name
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"矩陣生成失敗: {str(e)}")
