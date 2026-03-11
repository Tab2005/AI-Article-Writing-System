import os
import uuid
import httpx
import logging
import asyncio
from typing import List, Optional
from fastapi import UploadFile
from app.core.config import settings
from app.models.db_models import Settings
from app.core.database import SessionLocal
from app.services.ai_service import AIService

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
    async def download_image(cls, url: str) -> dict:
        """從遠端 URL 下載圖片並轉換為 WebP 存入 uploads (回傳本地路徑與網址)"""
        if not url or url.startswith("/uploads/"):
            return {"url": url, "local_path": url.lstrip("/") if url else ""}

        cls.ensure_upload_dir()
        from PIL import Image
        import io
        import httpx

        file_name = f"remote_{uuid.uuid4().hex[:12]}.webp"
        file_path = os.path.join(cls.UPLOAD_DIR, file_name)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    image_data = response.content
                    image = Image.open(io.BytesIO(image_data))
                    
                    if image.mode in ("RGBA", "P"):
                        image = image.convert("RGB")
                    
                    image.save(file_path, "WEBP", quality=80, optimize=True)
                    logger.info(f"Downloaded and converted remote image to {file_path}")
                    
                    return {
                        "url": f"/{cls.UPLOAD_DIR}/{file_name}",
                        "local_path": file_path,
                        "filename": file_name
                    }
                else:
                    logger.warning(f"Failed to download image from {url}, status: {response.status_code}")
            except Exception as e:
                logger.error(f"Error downloading image from {url}: {e}")
        
        return {"url": url, "local_path": ""}

    @classmethod
    async def search_stock_photos(cls, query: str, limit: int = 10) -> List[dict]:
        """同時從 Pexels 與 Pixabay 搜尋圖片 (自動翻譯中文)"""
        # 1. 如果包含中文字符，自動翻譯為英文以提升準確度
        search_query = query
        if any('\u4e00' <= char <= '\u9fff' for char in query):
            search_query = await cls._translate_query(query)
            logger.info(f"Translated query: '{query}' -> '{search_query}'")

        db = SessionLocal()
        try:
            # 優先次序：環境變數 > 資料庫
            pexels_key = settings.PEXELS_API_KEY or Settings.get_value(db, "pexels_api_key", "")
            pixabay_key = settings.PIXABAY_API_KEY or Settings.get_value(db, "pixabay_api_key", "")
        finally:
            db.close()

        tasks = []
        if pexels_key:
            tasks.append(cls._search_pexels(search_query, pexels_key, limit))
        if pixabay_key:
            tasks.append(cls._search_pixabay(search_query, pixabay_key, limit))
        
        if not tasks:
            logger.warning("No stock photo API keys found.")
            return []

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        combined_results = []
        for res in results:
            if isinstance(res, list):
                combined_results.extend(res)
            elif isinstance(res, Exception):
                logger.error(f"Stock photo search task failed: {res}")

        # 簡單平衡一下結果 (依來源交錯顯示)
        return combined_results

    @classmethod
    async def _search_pexels(cls, query: str, api_key: str, limit: int) -> List[dict]:
        url = f"https://api.pexels.com/v1/search?query={query}&per_page={limit}"
        headers = {"Authorization": api_key}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return [
                        {
                            "url": img["src"]["large"],
                            "alt": img.get("alt", query),
                            "source": "pexels",
                            "creator": img.get("photographer", "Unknown"),
                            "link": img.get("url", "")
                        }
                        for img in data.get("photos", [])
                    ]
            except Exception as e:
                logger.error(f"Pexels search failed: {e}")
        return []

    @classmethod
    async def _search_pixabay(cls, query: str, api_key: str, limit: int) -> List[dict]:
        url = "https://pixabay.com/api/"
        params = {
            "key": api_key,
            "q": query,
            "per_page": limit,
            "image_type": "photo",
            "safesearch": "true"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return [
                        {
                            "url": img["largeImageURL"],
                            "alt": img.get("tags", query),
                            "source": "pixabay",
                            "creator": img.get("user", "Unknown"),
                            "link": img.get("pageURL", "")
                        }
                        for img in data.get("hits", [])
                    ]
            except Exception as e:
                logger.error(f"Pixabay search failed: {e}")
        return []

    @classmethod
    async def _translate_query(cls, query: str) -> str:
        """將搜尋字詞翻譯為精簡的英文關鍵字"""
        prompt = f"將以下中文搜尋詞翻譯為適合圖片搜尋的 1-3 個英文關鍵字（只需輸出英文單字，不要標點符號）：{query}"
        try:
            translated = await AIService.generate_content(prompt, temperature=0.3)
            # 簡單清理結果，只保留英文、空格和連字號
            import re
            clean_val = re.sub(r'[^a-zA-Z0-9\s\-]', '', translated).strip()
            return clean_val or query
        except Exception as e:
            logger.error(f"Failed to translate query: {e}")
            return query

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
