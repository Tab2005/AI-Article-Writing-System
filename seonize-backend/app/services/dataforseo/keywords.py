import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from .base import DataForSEOBase
from app.models.db_models import KeywordCache

logger = logging.getLogger(__name__)

class DataForSEOKeywordService(DataForSEOBase):
    """關鍵字相關服務"""

    @classmethod
    async def get_keyword_data(cls, keywords: List[str], language_code: str = "zh_TW", location_code: int = 2158, login = None, password = None) -> List[Dict[str, Any]]:
        url = f"{cls.BASE_URL}/keywords_data/google/search_volume/live"
        post_data = [{"keywords": keywords, "language_code": language_code, "location_code": location_code}]
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=post_data, headers=cls._get_auth_header(login, password), timeout=30.0)
                if response.status_code != 200: return []
                tasks = response.json().get("tasks", [])
                return tasks[0].get("result", []) if tasks and tasks[0].get("status_code", 0) < 40000 else []
        except Exception:
            return []

    @classmethod
    async def get_keyword_ideas(cls, keyword: str, user_id: str, language_code: str = "zh_TW", location_code: int = 2158, db = None, login = None, password = None, force_refresh: bool = False) -> Dict[str, Any]:
        if db and not force_refresh:
            # 加入 user_id 過濾
            cache = db.query(KeywordCache).filter(
                KeywordCache.keyword == keyword, 
                KeywordCache.location_code == location_code, 
                KeywordCache.language_code == language_code,
                KeywordCache.user_id == user_id
            ).first()
            if cache:
                return {
                    "id": cache.id,
                    "seed_keyword_data": cls._flatten_keyword_data(cache.seed_data),
                    "suggestions": [cls._flatten_keyword_data(s) for s in cache.suggestions] if cache.suggestions else [],
                    "ai_suggestions": cache.ai_suggestions or [], 
                    "from_cache": True,
                    "error": None
                }

        url = f"{cls.BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live"
        post_data = [{"keywords": [keyword], "language_code": language_code, "location_code": location_code, "include_adult_keywords": False}]
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=post_data, headers=cls._get_auth_header(login, password), timeout=30.0)
                if response.status_code != 200: return {"suggestions": [], "error": f"API Error: {response.status_code}"}
                
                data = response.json()
                tasks = data.get("tasks", [])
                if not tasks or tasks[0].get("status_code", 0) >= 40000:
                    return {"suggestions": [], "error": tasks[0].get("status_message") if tasks else "No tasks found"}
                
                result_list = tasks[0].get("result", [])
                seed_data = cls._flatten_keyword_data(result_list[0]) if result_list else None
                suggestions = [cls._flatten_keyword_data(s) for s in result_list[1:] if s]
                
                record_id = None
                if db:
                    cache = db.query(KeywordCache).filter(
                        KeywordCache.keyword == keyword, 
                        KeywordCache.location_code == location_code, 
                        KeywordCache.language_code == language_code,
                        KeywordCache.user_id == user_id
                    ).order_by(KeywordCache.created_at.desc()).first()
                    
                    if cache:
                        cache.seed_data, cache.suggestions = seed_data, suggestions
                        cache.created_at, cache.expires_at = datetime.now(timezone.utc), datetime.now(timezone.utc) + timedelta(days=30)
                        record_id = cache.id
                    else:
                        new_cache = KeywordCache(
                            user_id=user_id,
                            keyword=keyword, 
                            location_code=location_code, 
                            language_code=language_code, 
                            seed_data=seed_data, 
                            suggestions=suggestions, 
                            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
                        )
                        db.add(new_cache)
                        db.commit()
                        db.refresh(new_cache)
                        record_id = new_cache.id

                return {
                    "id": record_id,
                    "seed_keyword_data": seed_data,
                    "suggestions": suggestions,
                    "from_cache": False,
                    "error": None
                }
        except Exception as e:
            return {"suggestions": [], "error": str(e)}

    @classmethod
    async def get_google_ads_status(cls, login = None, password = None) -> Dict[str, Any]:
        url = f"{cls.BASE_URL}/keywords_data/google_ads/status"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=cls._get_auth_header(login, password), timeout=15.0)
                if response.status_code != 200: return {}
                res = response.json().get("tasks", [])[0].get("result", [{}])[0]
                return {"actual_data": res.get("actual_data"), "date_update": res.get("date_update"), "last_year": res.get("last_year_in_monthly_searches"), "last_month": res.get("last_month_in_monthly_searches")}
        except Exception:
            return {}

    @classmethod
    def _flatten_keyword_data(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        if not item: return {}
        info = item.get("keyword_info", {}) or item.get("keyword_data", {})
        sv = item.get("search_volume") or info.get("search_volume")
        cpc = item.get("cpc") or info.get("cpc")
        return {
            "keyword": item.get("keyword"), "search_volume": sv, "cpc": cpc,
            "competition": item.get("competition") or info.get("competition"),
            "competition_index": item.get("competition_index") or info.get("competition_index"),
            "low_top_of_page_bid": item.get("low_top_of_page_bid") or info.get("low_top_of_page_bid"),
            "high_top_of_page_bid": item.get("high_top_of_page_bid") or info.get("high_top_of_page_bid"),
            "monthly_searches": item.get("monthly_searches") or info.get("monthly_searches"),
            "relevance": item.get("relevance")
        }
