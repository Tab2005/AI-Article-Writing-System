import logging
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Any
from sqlalchemy.orm import Session
from app.models.project import ProjectState, ProjectCreate, ProjectUpdate, ProjectBatchCreate
from app.models.db_models import Project, KeywordCache
from app.core.database import get_db
from app.core.auth import get_current_user
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# 修改為僅需登入，但在路由內部過濾數據
router = APIRouter(dependencies=[Depends(get_current_user)])


def db_to_project_state(db_project: Project) -> ProjectState:
    """將資料庫模型轉換為 ProjectState"""
    # 確保 candidate_titles 始終為字串列表 (相容舊版物件格式)
    raw_titles = db_project.candidate_titles or []
    candidate_titles = []
    for t in raw_titles:
        if isinstance(t, dict):
            candidate_titles.append(t.get('title', ''))
        else:
            candidate_titles.append(str(t))

    return ProjectState(
        project_id=db_project.id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        primary_keyword=db_project.primary_keyword,
        country=db_project.country,
        language=db_project.language,
        intent=db_project.intent,
        style=db_project.style,
        optimization_mode=db_project.optimization_mode,
        serp_results=[],
        keywords=db_project.keywords or {"secondary": [], "lsi": []},
        research_data=db_project.research_data or {"paa": [], "related_searches": [], "ai_overview": None},
        candidate_titles=candidate_titles,
        selected_title=db_project.selected_title,
        outline=db_project.outline,
        content=db_project.full_content, # 統一為 content
        full_content=db_project.full_content,
        meta_title=db_project.meta_title,
        meta_description=db_project.meta_description,
        word_count=db_project.word_count,
        keyword_density=db_project.keyword_density or {},
        eeat_score=db_project.eeat_score,
        quality_report=db_project.quality_report,
        last_audit_at=db_project.last_audit_at,
    )


@router.post("/", response_model=ProjectState, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """建立新專案"""
    # 建立資料庫記錄，並關聯使用者
    db_project = Project(
        primary_keyword=project_data.primary_keyword,
        country=project_data.country,
        language=project_data.language,
        optimization_mode=project_data.optimization_mode,
        user_id=current_user.id  # 注入使用者 ID
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_to_project_state(db_project)


@router.post("/batch", response_model=List[ProjectState], status_code=status.HTTP_201_CREATED)
async def batch_create_projects(
    request: ProjectBatchCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """批量建立多個專案 (針對同一關鍵字不同標題)"""
    # 1. 如果有提供 KeywordCache ID，嘗試從中提取研究數據
    research_data = {}
    candidate_titles_raw = []
    
    # 嘗試從共享 SERP 快取取得最新的競爭對手與 PAA 數據 (GEO 核心)
    from app.models.db_models import SerpCache
    serp_cache = db.query(SerpCache).filter(
        SerpCache.keyword == request.primary_keyword.strip()
    ).order_by(SerpCache.created_at.desc()).first()
    
    if serp_cache and serp_cache.results:
        research_data = serp_cache.results.copy() if isinstance(serp_cache.results, dict) else {"results": serp_cache.results}
    
    if request.keyword_cache_id:
        cache = db.query(KeywordCache).filter(
            KeywordCache.id == request.keyword_cache_id,
            KeywordCache.user_id == current_user.id
        ).first()
        if cache:
            # 如果已有 SERP 數據則不覆蓋，否則可作為備位
            if not research_data and cache.seed_data:
                research_data = cache.seed_data.copy() if cache.seed_data else {}
            candidate_titles_raw = cache.ai_suggestions or []
    
    created_projects = []
    
    # 2. 為每個選定的標題建立專案
    for title in request.selected_titles:
        db_project = Project(
            primary_keyword=request.primary_keyword,
            country=request.country,
            language=request.language,
            optimization_mode=request.optimization_mode,
            selected_title=title,
            user_id=current_user.id,
            intent=request.intent,
            style=request.style,
            research_data=research_data,
            candidate_titles=candidate_titles_raw # 儲存原始物件列表，交由 db_to_project_state 處理顯示
        )
        db.add(db_project)
        created_projects.append(db_project)
    
    db.commit()
    
    # 3. 重新整理對象並回傳清單
    return [db_to_project_state(p) for p in created_projects]


@router.get("/", response_model=List[ProjectState])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """取得所有專案清單"""
    # 管理員權限不需要看到所有用戶的專案，僅看到自己的
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    return [db_to_project_state(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectState)
async def get_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """取得專案詳情 (僅限擁有者)"""
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found or access denied"
        )
    return db_to_project_state(db_project)


@router.patch("/{project_id}", response_model=ProjectState)
async def update_project(
    project_id: str, 
    project_update: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """更新專案 (僅限擁有者)"""
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found or access denied"
        )
    
    update_data = project_update.model_dump(exclude_unset=True)
    
    # 統一欄位名稱處理
    if "content" in update_data:
        update_data["full_content"] = update_data.pop("content")

    for field, value in update_data.items():
        if hasattr(db_project, field):
            setattr(db_project, field, value)
    
    db_project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_project)
    
    return db_to_project_state(db_project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """刪除專案 (僅限擁有者)"""
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found or access denied"
        )
    
    db.delete(db_project)
    db.commit()
