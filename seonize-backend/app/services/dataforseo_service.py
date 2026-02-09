import logging
import httpx
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.project import SERPResult
from app.models.db_models import KeywordCache


logger = logging.getLogger(__name__)

class DataForSEOService:
    """DataForSEO API 介接類別"""
    
    BASE_URL = "https://api.dataforseo.com/v3"

    _location_map = {
        "TW": 2158,
        "HK": 2104,
        "CN": 2156,
        "JP": 2392,
        "KR": 2410,
        "SG": 2702,
        "US": 2840,
        "GB": 2826,
        "AU": 2036,
        "CA": 2124,
    }

    _language_map = {
        "zh-tw": "zh_TW",
        "zh-hk": "zh_HK",
        "zh-cn": "zh_CN",
        "en-us": "en",
        "en-gb": "en",
        "ja-jp": "ja",
        "ko-kr": "ko",
    }

    @classmethod
    def resolve_language_code(cls, language: str) -> str:
        if not language:
            return "zh_TW"
        normalized = language.replace("_", "-").lower()
        if normalized in cls._language_map:
            return cls._language_map[normalized]
        if "-" in normalized:
            return normalized.split("-")[0]
        return normalized

    @classmethod
    def resolve_location_code(cls, country: str) -> int:
        if not country:
            return 2158
        return cls._location_map.get(country.upper(), 2158)
    
    @classmethod
    def _get_auth_header(cls, login: Optional[str] = None, password: Optional[str] = None) -> Dict[str, str]:
        """產生 Base64 驗證標頭"""
        # 優先使用傳入的憑證，其次使用設定檔
        final_login = login or settings.DATAFORSEO_LOGIN
        final_password = password or settings.DATAFORSEO_PASSWORD
        
        if not final_login or not final_password:
            return {}
            
        auth_str = f"{final_login}:{final_password}"
        encoded_auth = base64.b64encode(auth_str.encode("ascii")).decode("ascii")
        return {"Authorization": f"Basic {encoded_auth}"}

    @classmethod
    async def get_serp_results(
        cls, 
        keyword: str,
        num_results: int = 10,
        language_code: str = "zh_TW", 
        location_code: int = 2158,
        include_ai_overview: bool = True,
        db: Optional[Session] = None,
        login: Optional[str] = None,
        password: Optional[str] = None,
        serp_mode: str = "google_organic",
    ) -> Dict[str, Any]:
        """
        獲取 Google SERP 結果，支援 AI Overviews (SGE)
        包含快取邏輯：優先從 SerpCache 讀取
        """
        # 1. 檢查快取
        if db:
            from app.models.db_models import SerpCache
            cache = db.query(SerpCache).filter(
                SerpCache.keyword == keyword,
                SerpCache.country == "TW", # 這裡暫定，實際可連動 location_code
                SerpCache.language == "zh-TW"
            ).first()
            
            if cache and not cache.is_expired:
                logger.info(f"Using cached SERP results for: {keyword}")
                return cache.results

        mode = (serp_mode or "google_organic").lower()
        if mode not in ["google_organic", "google_ai_mode"]:
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"Unsupported DataForSEO SERP mode: {serp_mode}"}

        url = f"{cls.BASE_URL}/serp/google/organic/live/advanced"
        if mode == "google_ai_mode":
            url = f"{cls.BASE_URL}/serp/google/ai_mode/live/advanced"
        
        # 準備請求數據
        post_data = [{
            "keyword": keyword,
            "language_code": language_code,
            "location_code": location_code,
            "depth": num_results,
            "calculate_rectangles": False
        }]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.warning("DataForSEO Error: HTTP %s", response.status_code)
                    return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"DataForSEO Error: HTTP {response.status_code}"}
                
                data = response.json()
                parsed_results = cls._parse_serp_response(data)
                
                # 2. 寫入快取
                if db and not parsed_results.get("error"):
                    from app.models.db_models import SerpCache
                    from datetime import datetime, timedelta
                    if cache:
                        cache.results = parsed_results
                        cache.created_at = datetime.utcnow()
                        cache.expires_at = datetime.utcnow() + timedelta(days=7)
                    else:
                        new_cache = SerpCache(
                            keyword=keyword,
                            results=parsed_results,
                            expires_at=datetime.utcnow() + timedelta(days=7)
                        )
                        db.add(new_cache)
                    db.commit()
                
                return parsed_results
                
        except Exception as e:
            logger.warning("DataForSEO Exception", exc_info=True)
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": str(e)}

    @classmethod
    def _parse_serp_response(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """解析 DataForSEO 的回傳格式，提取有機搜尋、AI Overview、PAA 與 相關搜尋"""
        results = []
        ai_overview = None
        paa = []
        related_searches = []
        
        # DataForSEO 的 task 回傳結構
        tasks = data.get("tasks", [])
        if not tasks:
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": "DataForSEO response missing tasks"}
            
        # 取得第一個 task 的結果
        task_result = tasks[0].get("result", [])
        if not task_result:
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": "DataForSEO response missing results"}
            
        # 遍歷結果項項目
        items = task_result[0].get("items", [])
        
        rank = 1
        for item in items:
            item_type = item.get("type")
            
            if item_type == "organic":
                results.append(SERPResult(
                    rank=rank,
                    url=item.get("url", ""),
                    title=item.get("title", ""),
                    snippet=item.get("description", ""),
                    headings=[] # DataForSEO Advanced 有時會提供更多，此處先留空
                ))
                rank += 1
                
            # 處理 AI Overview
            elif item_type == "google_ai_overview":
                ai_overview = item
            
            # 處理 People Also Ask (PAA)
            elif item_type == "people_also_ask":
                paa_items = item.get("items", [])
                for p_item in paa_items:
                    if p_item.get("title"):
                        paa.append(p_item.get("title"))
            
            # 處理 Related Searches
            elif item_type == "related_searches":
                rel_items = item.get("items", [])
                for r_item in rel_items:
                    if isinstance(r_item, str):
                        related_searches.append(r_item)
                    elif isinstance(r_item, dict) and r_item.get("title"):
                        related_searches.append(r_item.get("title"))
                
        return {
            "results": results, 
            "ai_overview": ai_overview, 
            "paa": paa,
            "related_searches": related_searches,
            "error": None
        }

    @classmethod
    async def get_ai_overview(
        cls, 
        keyword: str, 
        language_code: str = "zh_TW", 
        location_code: int = 2158,
        login: Optional[str] = None,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        專門獲取 Google AI Overview (SGE) 數據
        """
        url = f"{cls.BASE_URL}/serp/google/ai_overview/live/advanced"
        post_data = [{
            "keyword": keyword,
            "language_code": language_code,
            "location_code": location_code
        }]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
        except Exception:
            logger.warning("DataForSEO AI Overview Exception", exc_info=True)
            return {}

    @classmethod
    async def get_keyword_data(
        cls, 
        keywords: List[str], 
        language_code: str = "zh_TW", 
        location_code: int = 2158,
        login: Optional[str] = None,
        password: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        獲取關鍵字數據 (搜尋量、競爭度等)
        使用 Keywords Data -> Google -> Search Volume -> Live 端點
        """
        url = f"{cls.BASE_URL}/keywords_data/google/search_volume/live"
        post_data = [{
            "keywords": keywords,
            "language_code": language_code,
            "location_code": location_code
        }]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return []
                    
                data = response.json()
                tasks = data.get("tasks", [])
                if not tasks:
                    return []
                    
                return tasks[0].get("result", [])
        except Exception:
            logger.warning("DataForSEO Keyword Data Exception", exc_info=True)
            return []

    @classmethod
    async def get_keyword_ideas(
        cls, 
        keyword: str, 
        language_code: str = "zh_TW", 
        location_code: int = 2158,
        db: Optional[Session] = None,
        login: Optional[str] = None,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        獲取關鍵字建議與長尾詞 (Keyword Ideas)
        包含快取邏輯：優先從資料庫讀取，失效或不存在才調用 API
        """
        # 1. 檢查快取 (若有提供 db session)
        if db:
            cache = db.query(KeywordCache).filter(
                KeywordCache.keyword == keyword,
                KeywordCache.location_code == location_code,
                KeywordCache.language_code == language_code
            ).first()
            
            if cache and not cache.is_expired:
                logger.info(f"Using cached keyword ideas for: {keyword}")
                return {
                    "seed_keyword_data": cache.seed_data,
                    "suggestions": cache.suggestions,
                    "from_cache": True
                }

        # 2. 調用 API
        url = f"{cls.BASE_URL}/keywords_data/google_ads/keyword_ideas/live"
        post_data = [{
            "keywords": [keyword],
            "language_code": language_code,
            "location_code": location_code,
            "include_adult_keywords": False
        }]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {"seed_keyword_data": None, "suggestions": [], "error": f"API Error: {response.status_code}"}
                    
                data = response.json()
                tasks = data.get("tasks", [])
                if not tasks or not tasks[0].get("result"):
                    return {"seed_keyword_data": None, "suggestions": [], "error": "No results found"}
                
                result = tasks[0]["result"][0]
                seed_data = result.get("seed_keyword_data")
                suggestions = result.get("items", [])
                
                # 3. 寫入快取 (若有提供 db session)
                if db:
                    if cache:
                        cache.seed_data = seed_data
                        cache.suggestions = suggestions
                        cache.created_at = datetime.utcnow()
                        cache.expires_at = datetime.utcnow() + timedelta(days=30)
                    else:
                        new_cache = KeywordCache(
                            keyword=keyword,
                            location_code=location_code,
                            language_code=language_code,
                            seed_data=seed_data,
                            suggestions=suggestions,
                            expires_at=datetime.utcnow() + timedelta(days=30)
                        )
                        db.add(new_cache)
                    db.commit()
                
                return {
                    "seed_keyword_data": seed_data,
                    "suggestions": suggestions,
                    "from_cache": False
                }
                
        except Exception as e:
            logger.error(f"Keyword Ideas Exception: {str(e)}", exc_info=True)
            return {"seed_keyword_data": None, "suggestions": [], "error": str(e)}
