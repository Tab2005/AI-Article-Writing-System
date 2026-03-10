import os
import uuid
import httpx
import logging
from typing import List, Optional
from fastapi import UploadFile
from app.core.config import settings

logger = logging.getLogger(__name__)

class ImageService:
    UPLOAD_DIR = "uploads"
    
    @classmethod
    def ensure_upload_dir(cls):
        if not os.path.exists(cls.UPLOAD_DIR):
            os.makedirs(cls.UPLOAD_DIR)
            logger.info(f"Created upload directory: {cls.UPLOAD_DIR}")

    @classmethod
    async def handle_upload(cls, file: UploadFile) -> dict:
        """處理本機圖片上傳"""
        cls.ensure_upload_dir()
        
        file_ext = os.path.splitext(file.filename)[1]
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(cls.UPLOAD_DIR, file_name)
        
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # 這裡之後可以加入 WebP 轉換邏輯
            url = f"/{cls.UPLOAD_DIR}/{file_name}"
            return {
                "url": url,
                "filename": file.filename,
                "source": "manual_upload"
            }
        except Exception as e:
            logger.error(f"Failed to upload image: {e}")
            raise e

    @classmethod
    async def search_stock_photos(cls, query: str, limit: int = 5) -> List[dict]:
        """從 Pexels/Unsplash 搜尋圖片 (範例實作)"""
        # 暫時使用 Pexels 作為範例，若無 API Key 則回傳空清單
        api_key = os.getenv("PEXELS_API_KEY", "")
        if not api_key:
            logger.warning("PEXELS_API_KEY not found, returning empty results.")
            return []
            
        url = f"https://api.pexels.com/v1/search?query={query}&per_page={limit}"
        headers = {"Authorization": api_key}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return [
                        {
                            "url": img["src"]["large"],
                            "alt": img.get("alt", query),
                            "source": "pexels",
                            "creator": img.get("photographer", "Unknown")
                        }
                        for img in data.get("photos", [])
                    ]
            except Exception as e:
                logger.error(f"Failed to search stock photos: {e}")
        return []

    @classmethod
    def generate_alt_text(cls, content: str, keyword: str) -> str:
        """根據內容產出 SEO 友善的 Alt Text (簡化版)"""
        # 之後可以整合 LLM 做更精確的視覺描述
        return f"{keyword} 實戰指南：關鍵流程與解決方案"
