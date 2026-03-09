from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from app.services.kalpa_service import kalpa_service
from app.core.auth import get_current_user
from app.core.database import get_db
from app.services.credit_service import CreditService, CREDIT_COSTS

# 配置路由依賴為全域登入
router = APIRouter(dependencies=[Depends(get_current_user)])

class BrainstormRequest(BaseModel):
    topic: str

class BatchWeaveRequest(BaseModel):
    node_ids: List[str]

@router.post("/brainstorm")
async def brainstorm_kalpa_elements(
    request: BrainstormRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    天道解析：根據主題生成矩陣要素建議
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"User {current_user.email} brainstorm topic: {request.topic}")
    
    try:
        results = await kalpa_service.brainstorm_elements(db, request.topic, current_user.id)
        return results
    except Exception as e:
        logger.error(f"Brainstorm failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"解析失敗: {str(e)}")

@router.delete("/delete/{matrix_id}")
async def delete_kalpa_matrix(
    matrix_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    刪除指定的矩陣及其所有節點 (管理員或擁有者)
    """
    from app.models.db_models import KalpaMatrix
    query = db.query(KalpaMatrix).filter(KalpaMatrix.id == matrix_id)
    if current_user.role != "super_admin":
        query = query.filter(KalpaMatrix.user_id == current_user.id)
        
    matrix = query.first()
    if not matrix:
        raise HTTPException(status_code=404, detail="找不到該矩陣或權限不足")
    
    db.delete(matrix)
    db.commit()
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
    id: Optional[str] = None
    project_name: str
    industry: str = "Crypto"
    money_page_url: str = ""
    entities: List[str]
    actions: List[str]
    pain_points: List[str]
    nodes: List[dict]
    cms_config_id: Optional[str] = None

@router.post("/generate", response_model=List[KalpaNodeSchema])
async def generate_kalpa_matrix(
    request: KalpaGenerateRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    生成因果矩陣端點 (不存檔，僅限登入使用者)
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
    current_user: Any = Depends(get_current_user)
):
    """
    儲存因果矩陣與節點到資料庫 (支援更新，User 隔離)
    """
    try:
        matrix = kalpa_service.save_matrix(
            db=db,
            project_id=request.id,
            project_name=request.project_name,
            industry=request.industry,
            money_page_url=request.money_page_url,
            entities=request.entities,
            actions=request.actions,
            pain_points=request.pain_points,
            nodes=request.nodes,
            cms_config_id=request.cms_config_id,
            user_id=current_user.id
        )
        return {"success": True, "matrix_id": matrix.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"儲存失敗: {str(e)}")

@router.get("/list")
async def list_kalpa_matrices(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    列出已儲存的矩陣 (管理員可看全部)
    """
    from app.models.db_models import KalpaMatrix
    query = db.query(KalpaMatrix)
    if current_user.role != "super_admin":
        from sqlalchemy import or_
        query = query.filter(or_(KalpaMatrix.user_id == current_user.id, KalpaMatrix.user_id == None))
        
    matrices = query.order_by(KalpaMatrix.created_at.desc()).all()
    return [m.to_dict() for m in matrices]

@router.post("/weave/{node_id}")
async def weave_kalpa_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    啟動「神諭編織」為節點生成文章 (僅限擁有者)
    消耗 8 點，失敗時自動退還
    """
    # 1. 權限檢查：單節點編織需一般會員以上
    CreditService.check_feature_access(current_user, "kalpa_weave_node")

    # 2. 扣除點數
    COST = CREDIT_COSTS["kalpa_weave_node"]
    tx = CreditService.deduct(db, current_user, COST, f"Kalpa 節點成稿 [{node_id[:8]}]")
    try:
        node = await kalpa_service.weave_node(db, node_id, current_user.id)
        if not node or not getattr(node, 'woven_content', '').strip():
            CreditService.refund(db, current_user, COST, "Kalpa 節點成稿內容為空")
            raise HTTPException(status_code=500, detail="編織內容為空，已退還點數。")
        return {"success": True, "node": node.to_dict()}
    except HTTPException:
        raise
    except ValueError as ve:
        if not tx.get("skipped"):
            CreditService.refund(db, current_user, COST, "weave_node 權限錯誤")
        raise HTTPException(status_code=403, detail=str(ve))
    except Exception as e:
        if not tx.get("skipped"):
            CreditService.refund(db, current_user, COST, f"weave_node 異常: {str(e)[:80]}")
        raise HTTPException(status_code=500, detail=f"編織失敗，已退還點數。原因：{str(e)}")

@router.get("/node/{node_id}")
async def get_kalpa_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    取得單一編織節點詳細資訊 (管理員或擁有者)
    """
    from app.models.db_models import KalpaNode, KalpaMatrix
    # 聯表查詢以驗證所有權 (必須提供明確 Join 條件，因 Model 未定義 ForeignKey 關係)
    query = db.query(KalpaNode).join(KalpaMatrix, KalpaNode.matrix_id == KalpaMatrix.id).filter(KalpaNode.id == node_id)
    if current_user.role != "super_admin":
        query = query.filter(KalpaMatrix.user_id == current_user.id)
        
    node = query.first()
    
    if not node:
        raise HTTPException(status_code=404, detail="節點不存在或存取受限")
    return node.to_dict()

@router.post("/batch-weave")
async def batch_weave_kalpa_nodes(
    request: BatchWeaveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    批量啟動「神諭編織」(深度會員享有階梯折扣)
    """
    # 1. 權限檢查：批量編織需深度會員
    CreditService.check_feature_access(current_user, "kalpa_batch_weave")
    
    if not request.node_ids:
        raise HTTPException(status_code=400, detail="未提供要編織的節點 ID")

    node_count = len(request.node_ids)
    COST = CreditService.calculate_batch_kalpa_cost(current_user, node_count)
    user_id = current_user.id

    tx = CreditService.deduct(db, current_user, COST, f"Kalpa 批量成稿 {node_count} 節點")

    # 將任務加入背景，由背景服務精確處理部分退款
    background_tasks.add_task(kalpa_service.batch_weave_task, request.node_ids, user_id, COST)
    return {
        "success": True,
        "message": f"已將 {node_count} 個任務加入隊列",
        "cost": COST,
        "node_count": node_count
    }

@router.get("/articles/all")
async def list_all_woven_articles(
    matrix_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    列出已編導完成的文章 (管理員可看全部)
    """
    try:
        user_id_filter = current_user.id if current_user.role != "super_admin" else None
        articles = kalpa_service.list_all_articles(db, user_id_filter, matrix_id)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文章查詢失敗: {str(e)}")

@router.get("/{matrix_id}")
async def get_kalpa_matrix(
    matrix_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    取得指定矩陣的詳細內容與節點 (管理員或擁有者)
    """
    from app.models.db_models import KalpaMatrix
    query = db.query(KalpaMatrix).filter(KalpaMatrix.id == matrix_id)
    if current_user.role != "super_admin":
        query = query.filter(KalpaMatrix.user_id == current_user.id)
        
    matrix = query.first()
    if not matrix:
        raise HTTPException(status_code=404, detail="找不到該矩陣或存取受限")
        
    return kalpa_service.get_matrix(db, matrix_id, current_user.id)

KalpaGenerateRequest.model_rebuild()
KalpaSaveRequest.model_rebuild()
