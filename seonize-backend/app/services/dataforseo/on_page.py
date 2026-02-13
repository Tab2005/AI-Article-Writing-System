import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from .base import DataForSEOBase
from app.models.db_models import CompetitiveCache

logger = logging.getLogger(__name__)

class DataForSEOOnPageService(DataForSEOBase):
    """On-Page 相關服務"""

    @classmethod
    async def get_page_structure(cls, url: str, login = None, password = None, db = None) -> Dict[str, Any]:
        if not url: return {"error": "Invalid URL"}
        if db:
            cache = db.query(CompetitiveCache).filter(CompetitiveCache.url == url).first()
            if cache and not cache.is_expired:
                return {"h_tags": cache.h_tags or [], "content_stats": cache.content_stats or {}, "meta_info": cache.meta_info or {}, "from_cache": True}

        api_url = f"{cls.BASE_URL}/on_page/instant_pages"
        post_data = [{"url": url, "enable_content_parsing": True, "calculate_keyword_density": False}]
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(api_url, json=post_data, headers=cls._get_auth_header(login, password), timeout=25.0)
                if response.status_code != 200: return {"error": f"On-Page API HTTP Error: {response.status_code}"}
                parsed = cls._parse_onpage_response(response.json())
                if db and not parsed.get("error"):
                    db.query(CompetitiveCache).filter(CompetitiveCache.url == url).delete()
                    db.add(CompetitiveCache(url=url, h_tags=parsed.get("h_tags"), content_stats=parsed.get("content_stats"), meta_info=parsed.get("meta_info"), expires_at=datetime.now() + timedelta(days=30)))
                    db.commit()
                return parsed
        except Exception as e:
            return {"error": str(e)}

    @classmethod
    def _parse_onpage_response(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        h_tags, stats_res, meta_info = [], {"word_count": 0, "images_count": 0}, {"title": "", "description": ""}
        tasks = data.get("tasks", [])
        if not tasks or not tasks[0].get("result") or not tasks[0]["result"][0].get("items"):
            return {"error": "No result found"}
        
        page = tasks[0]["result"][0]["items"][0]
        meta = page.get("meta", {})
        meta_info["title"], meta_info["description"] = meta.get("title", ""), meta.get("description", "")
        stats_res["word_count"], stats_res["images_count"] = meta.get("content_entities_count", {}).get("words_count", 0), meta.get("images_count", 0)
        
        def collect_headings(node):
            if isinstance(node, dict):
                tag = str(node.get("type", "")).lower()
                if tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                    h_tags.append({"tag": tag, "text": node.get("text", "")})
                for k in ["items", "content"]:
                    if k in node: collect_headings(node[k])
            elif isinstance(node, list):
                for i in node: collect_headings(i)
                
        collect_headings(page.get("content", {}))
        return {"h_tags": h_tags, "content_stats": stats_res, "meta_info": meta_info, "error": None}
