from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from app.services.kalpa_service import kalpa_service
from app.core.auth import get_current_admin
from app.core.database import get_db

router = APIRouter()

class BrainstormRequest(BaseModel):
    topic: str

@router.post("/brainstorm")
async def brainstorm_kalpa_elements(
    request: BrainstormRequest,
    current_admin: str = Depends(get_current_admin)
):
    """
    天道解析：根據主題生成矩陣要素建議
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received brainstorm request for topic: {request.topic}")
    
    try:
        results = await kalpa_service.brainstorm_elements(request.topic)
        return results
    except Exception as e:
        logger.error(f"Brainstorm failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"解析失敗: {str(e)}")

@router.delete("/delete/{matrix_id}")
async def delete_kalpa_matrix(
    matrix_id: str,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    刪除指定的矩陣及其所有節點
    """
    success = kalpa_service.delete_matrix(db, matrix_id)
    if not success:
        raise HTTPException(status_code=404, detail="找不到該矩陣")
    return {"success": True, "message": "專案已刪除"}

class KalpaGenerateRequest(BaseModel):
    project_name: str = "Default_Project"
    entities: List[str]
    actions: List[str]
    pain_points: List[str]
    title_template: Optional[str] = None
    exclusion_rules: Optional[Dict[str, List[str]]] = None

class KalpaNodeSchema(BaseModel):
    entity: str
    action: str
    pain_point: str
    target_title: str
    status: str

class KalpaSaveRequest(BaseModel):
    project_name: str
    industry: str = "Crypto"
    money_page_url: str = ""
    entities: List[str]
    actions: List[str]
    pain_points: List[str]
    nodes: List[dict]

@router.post("/generate", response_model=List[KalpaNodeSchema])
async def generate_kalpa_matrix(
    request: KalpaGenerateRequest,
    current_admin: str = Depends(get_current_admin)
):
    """
    生成因果矩陣端點 (不存檔)
    """
    if not request.entities or not request.actions or not request.pain_points:
        raise HTTPException(status_code=400, detail="實體、動作與痛點列表均不能為空。")
        
    try:
        results = kalpa_service.generate_matrix(
            entities=request.entities,
            actions=request.actions,
            pain_points=request.pain_points,
            project_name=request.project_name,
            title_template=request.title_template,
            exclusion_rules=request.exclusion_rules
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"矩陣生成失敗: {str(e)}")

@router.post("/save")
async def save_kalpa_matrix(
    request: KalpaSaveRequest,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    儲存因果矩陣與節點到資料庫
    """
    try:
        matrix = kalpa_service.save_matrix(
            db=db,
            project_name=request.project_name,
            industry=request.industry,
            money_page_url=request.money_page_url,
            entities=request.entities,
            actions=request.actions,
            pain_points=request.pain_points,
            nodes=request.nodes
        )
        return {"success": True, "matrix_id": matrix.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"儲存失敗: {str(e)}")

@router.get("/list")
async def list_kalpa_matrices(
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    列出所有已儲存的矩陣
    """
    from app.models.db_models import KalpaMatrix
    matrices = db.query(KalpaMatrix).order_by(KalpaMatrix.created_at.desc()).all()
    return [m.to_dict() for m in matrices]


@router.post("/weave/{node_id}")
async def weave_kalpa_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    啟動「神諭編織」為節點生成文章
    """
    try:
        node = await kalpa_service.weave_node(db, node_id)
        return {"success": True, "node": node.to_dict()}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"編織失敗: {str(e)}")

@router.get("/articles/all")
async def list_all_woven_articles(
    matrix_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    列出所有已編導完成的文章 (跨專案)
    """
    try:
        articles = kalpa_service.list_all_articles(db, matrix_id)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文章查詢失敗: {str(e)}")

@router.get("/{matrix_id}")
async def get_kalpa_matrix(
    matrix_id: str,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    """
    取得特定矩陣的詳細內容與節點
    """
    result = kalpa_service.get_matrix(db, matrix_id)
    if not result:
        raise HTTPException(status_code=404, detail="找不到該矩陣")
    return result

KalpaGenerateRequest.model_rebuild()
