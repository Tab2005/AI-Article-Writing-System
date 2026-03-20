"""
Seonize Backend - Projects API Router
專案管理 API
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Any
from sqlalchemy.orm import Session
from app.models.project import ProjectState, ProjectCreate, ProjectUpdate
from app.models.db_models import Project
from app.core.database import get_db
from app.core.auth import get_current_user
from datetime import datetime, timezone

# 修改為僅需登入，但在路由內部過濾數據
router = APIRouter(dependencies=[Depends(get_current_user)])


def db_to_project_state(db_project: Project) -> ProjectState:
    """將資料庫模型轉換為 ProjectState"""
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
        candidate_titles=db_project.candidate_titles or [],
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


@router.get("/", response_model=List[ProjectState])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """列出專案清單 (管理員可看全部)"""
    query = db.query(Project)
    if current_user.role not in ["super_admin", "admin"]:
        query = query.filter(Project.user_id == current_user.id)
    
    db_projects = query.order_by(Project.created_at.desc()).all()
    return [db_to_project_state(db_project) for db_project in db_projects]


@router.get("/{project_id}", response_model=ProjectState)
async def get_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """取得專案詳情 (管理員或擁有者)"""
    query = db.query(Project).filter(Project.id == project_id)
    if current_user.role not in ["super_admin", "admin"]:
        query = query.filter(Project.user_id == current_user.id)
        
    db_project = query.first()
    
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
    """更新專案 (管理員或擁有者)"""
    query = db.query(Project).filter(Project.id == project_id)
    if current_user.role not in ["super_admin", "admin"]:
        query = query.filter(Project.user_id == current_user.id)
        
    db_project = query.first()
    
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
    """刪除專案 (管理員或擁有者)"""
    query = db.query(Project).filter(Project.id == project_id)
    if current_user.role != "super_admin":
        query = query.filter(Project.user_id == current_user.id)
        
    db_project = query.first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found or access denied"
        )
    
    db.delete(db_project)
    db.commit()
