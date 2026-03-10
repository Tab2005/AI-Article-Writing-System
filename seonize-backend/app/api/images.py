from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from typing import List
from app.api.auth import get_current_user
from app.services.image_service import ImageService
from app.models.db_models import User

router = APIRouter()

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """上傳本機圖片"""
    try:
        result = await ImageService.handle_upload(file)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_images(
    q: str = Query(..., description="搜尋關鍵字"),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user)
):
    """搜尋圖庫圖片"""
    try:
        results = await ImageService.search_stock_photos(q, limit)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
