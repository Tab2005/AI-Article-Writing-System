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
        """處理本機圖片上傳並轉換為 WebP"""
        cls.ensure_upload_dir()
        
        from PIL import Image
        import io
        
        # 產出新的檔名 (統一使用 .webp)
        file_name = f"{uuid.uuid4()}.webp"
        file_path = os.path.join(cls.UPLOAD_DIR, file_name)
        
        try:
            content = await file.read()
            image = Image.open(io.BytesIO(content))
            
            # 轉換為 RGB (處理 RGBA -> WebP 可能的透明度問題)
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            
            # 儲存為 WebP 並進行壓縮 (quality=80)
            image.save(file_path, "WEBP", quality=80, optimize=True)
            
            url = f"/{cls.UPLOAD_DIR}/{file_name}"
            return {
                "url": url,
                "filename": f"{os.path.splitext(file.filename)[0]}.webp",
                "source": "manual_upload"
            }
        except Exception as e:
            logger.error(f"Failed to upload and convert image: {e}")
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
    async def suggest_metadata(cls, content: str, topic: str = "") -> dict:
        """根據文章內容，利用 AI 產出 SEO 友好的 Alt Text 與 Caption"""
        from app.services.ai_service import AIService
        
        prompt = f"""請針對以下文章段落以及圖片主題，產出一個 SEO 友善的圖片 Alt Text (視覺描述) 與 Caption (圖說)。
        
        # 文章段落：
        {content[:1000]}
        
        # 建議圖片主題：
        {topic}
        
        # 輸出格式 (JSON)：
        {{
            "alt": "視覺化描述，包含關鍵字",
            "caption": "吸引人的圖說文字"
        }}
        """
        
        try:
            result = await AIService.generate_content(prompt, temperature=0.6)
            import json, re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            logger.error(f"Failed to suggest metadata: {e}")
            
        return {
            "alt": f"{topic or '文章配件'} 實戰圖解",
            "caption": f"深入解析 {topic or '本章節'} 的關鍵要點"
        }

    @classmethod
    async def generate_alt_text(cls, content: str, keyword: str) -> str:
        """根據內容產出 SEO 友善的 Alt Text (升級版)"""
        metadata = await cls.suggest_metadata(content, topic=keyword)
        return metadata.get("alt", f"{keyword} 實戰指南")
