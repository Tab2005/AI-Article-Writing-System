"""
Seonize Backend - Prompts API Router
指令模板管理 API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.db_models import PromptTemplate
from app.core.auth import get_current_admin
from datetime import datetime

router = APIRouter(dependencies=[Depends(get_current_admin)])

# Schema
class PromptTemplateBase(BaseModel):
    category: str
    name: str
    content: str

class PromptTemplateCreate(PromptTemplateBase):
    pass

class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class PromptTemplateResponse(PromptTemplateBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

@router.get("/templates", response_model=List[PromptTemplateResponse])
async def list_templates(category: Optional[str] = None, db: Session = Depends(get_db)):
    """列出指令模板"""
    query = db.query(PromptTemplate)
    if category:
        query = query.filter(PromptTemplate.category == category)
    return query.order_by(PromptTemplate.updated_at.desc()).all()

@router.post("/templates", response_model=PromptTemplateResponse)
async def create_template(template_data: PromptTemplateCreate, db: Session = Depends(get_db)):
    """建立指令模板"""
    db_template = PromptTemplate(
        category=template_data.category,
        name=template_data.name,
        content=template_data.content,
        is_active=False
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.patch("/templates/{template_id}", response_model=PromptTemplateResponse)
async def update_template(template_id: int, template_update: PromptTemplateUpdate, db: Session = Depends(get_db)):
    """更新指令模板"""
    db_template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="找不到該指令模板")
    
    update_data = template_update.model_dump(exclude_unset=True)
    
    # 如果要啟用，先將同類別的其他模板設為不啟用
    if update_data.get("is_active"):
        db.query(PromptTemplate).filter(
            PromptTemplate.category == db_template.category,
            PromptTemplate.id != template_id
        ).update({"is_active": False})
    
    for field, value in update_data.items():
        setattr(db_template, field, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    """刪除指令模板"""
    db_template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="找不到該指令模板")
    
    db.delete(db_template)
    db.commit()
    return {"message": "指令模板已刪除"}
