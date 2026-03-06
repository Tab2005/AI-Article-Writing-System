import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from app.models.project import SERPResult
from .base import DataForSEOBase

logger = logging.getLogger(__name__)

class DataForSEOSerpService(DataForSEOBase):
    """SERP 相關服務"""

    @classmethod
    async def get_serp_results(
        cls, 
        keyword: str,
        num_results: int = 10,
        language_code: str = "zh_TW", 
        location_code: int = 2158,
        include_ai_overview: bool = True,
        db = None,
        login: Optional[str] = None,
        password: Optional[str] = None,
        serp_mode: str = "google_organic",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """獲取 Google SERP 結果，支援 AI Overviews"""
        if db:
            from app.models.db_models import SerpCache
            cache = db.query(SerpCache).filter(SerpCache.keyword == keyword).order_by(SerpCache.created_at.desc()).first()
            if cache and not force_refresh:
                results_data = cache.results
                if isinstance(results_data, dict):
                    results_data["created_at"] = cache.created_at.isoformat() if cache.created_at else None
                    results_data["cache_hit"] = True
                return results_data

        mode = (serp_mode or "google_organic").lower()
        url = f"{cls.BASE_URL}/serp/google/organic/live/advanced"
        if mode == "google_ai_mode":
            url = f"{cls.BASE_URL}/serp/google/ai_mode/live/advanced"
        
        post_data = [{
            "keyword": keyword,
            "language_name": cls.resolve_language_name(language_code),
            "location_code": location_code,
            "depth": num_results,
            "calculate_rectangles": False
        }]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=post_data, headers=cls._get_auth_header(login, password), timeout=30.0
                )
                if response.status_code != 200:
                    return {"results": [], "error": f"DataForSEO Error: HTTP {response.status_code}"}
                
                data = response.json()
                parsed_results = cls._parse_serp_response(data)
                parsed_results["created_at"] = datetime.now(timezone.utc).isoformat()
                
                if db and not parsed_results.get("error"):
                    from app.models.db_models import SerpCache
                    new_cache = SerpCache(
                        keyword=keyword, country="TW", language="zh-TW",
                        results=parsed_results, expires_at=datetime.now(timezone.utc) + timedelta(days=7)
                    )
                    db.add(new_cache)
                    db.commit()
                parsed_results["cache_hit"] = False
                return parsed_results
        except Exception as e:
            logger.error(f"SERP Request Exception: {e}", exc_info=True)
            return {"results": [], "error": str(e)}

    @classmethod
    async def get_ai_overview(cls, keyword: str, language_code: str = "zh_TW", location_code: int = 2158, login = None, password = None) -> Dict[str, Any]:
        url = f"{cls.BASE_URL}/serp/google/ai_overview/live/advanced"
        post_data = [{"keyword": keyword, "language_name": cls.resolve_language_name(language_code), "location_code": location_code}]
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=post_data, headers=cls._get_auth_header(login, password), timeout=30.0)
                return response.json() if response.status_code == 200 else {}
        except Exception:
            return {}

    @classmethod
    def _parse_serp_response(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        results, ai_overview, paa, related_searches, serp_features = [], None, [], [], []
        tasks = data.get("tasks", [])
        if not tasks: return {"results": [], "error": "No tasks found"}
        task_result = tasks[0].get("result", [])
        if not task_result: return {"results": [], "error": "No results found"}
        
        items = task_result[0].get("items") or []
        rank = 1
        for item in items:
            item_type = item.get("type")
            if item_type != "organic": serp_features.append(item_type)
            if item_type == "organic":
                results.append(SERPResult(
                    rank=rank, url=item.get("url", ""), title=item.get("title", ""),
                    snippet=item.get("description", ""), main_domain=item.get("domain"),
                    sitelinks=[{"title": l.get("title", ""), "url": l.get("url", "")} for l in (item.get("links") or [])],
                    faq=[{"question": f.get("question", ""), "answer": f.get("answer", "")} for f in (item.get("faq") or {}).get("items") or []]
                ).model_dump())
                rank += 1
            elif item_type == "google_ai_overview": ai_overview = item
            elif item_type == "people_also_ask":
                paa.extend([p.get("title") for p in (item.get("items") or []) if p.get("title")])
            elif item_type == "related_searches":
                related_searches.extend([r if isinstance(r, str) else r.get("title") for r in (item.get("items") or [])])
                
        return {
            "results": results, "ai_overview": ai_overview, "paa": paa,
            "related_searches": related_searches, "serp_features": list(set(serp_features)),
            "error": None
        }
