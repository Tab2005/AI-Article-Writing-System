"""
Seonize Backend - Projects API Router
專案管理 API
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from app.models.project import ProjectState, ProjectCreate, ProjectUpdate
import uuid
from datetime import datetime

router = APIRouter()

# In-memory storage (replace with Redis in production)
projects_db: Dict[str, ProjectState] = {}


@router.post("/", response_model=ProjectState, status_code=status.HTTP_201_CREATED)
async def create_project(project_data: ProjectCreate):
    """建立新專案"""
    project = ProjectState(
        project_id=str(uuid.uuid4()),
        primary_keyword=project_data.primary_keyword,
        country=project_data.country,
        language=project_data.language,
        optimization_mode=project_data.optimization_mode,
    )
    projects_db[project.project_id] = project
    return project


@router.get("/", response_model=List[ProjectState])
async def list_projects():
    """列出所有專案"""
    return list(projects_db.values())


@router.get("/{project_id}", response_model=ProjectState)
async def get_project(project_id: str):
    """取得專案詳情"""
    if project_id not in projects_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    return projects_db[project_id]


@router.patch("/{project_id}", response_model=ProjectState)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """更新專案"""
    if project_id not in projects_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    project = projects_db[project_id]
    update_data = project_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.now()
    projects_db[project_id] = project
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    """刪除專案"""
    if project_id not in projects_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    del projects_db[project_id]
