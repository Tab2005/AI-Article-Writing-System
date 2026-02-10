import logging
import httpx
import base64
import json
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

    _language_name_map = {
        "zh_TW": "Chinese (Traditional)",
        "zh-tw": "Chinese (Traditional)", # Add dash variant
        "zh_HK": "Chinese (Traditional)",
        "zh_CN": "Chinese (Simplified)",
        "en": "English",
        "ja": "Japanese",
        "ko": "Korean",
    }

    @classmethod
    def resolve_language_code(cls, language: str) -> str:
        normalized = language.lower()
        if normalized in cls._language_map:
            return cls._language_map[normalized]
        if "-" in normalized:
            return normalized.split("-")[0]
        return normalized

    @classmethod
    def resolve_language_name(cls, language_code: str) -> str:
        return cls._language_name_map.get(language_code, "English")

    @classmethod
    def resolve_location_code(cls, country: str) -> int:
        if not country:
            return 2158
        return cls._location_map.get(country.upper(), 2158)
    
    @classmethod
    def _get_auth_header(cls, login: Optional[str] = None, password: Optional[str] = None) -> Dict[str, str]:
        """產生 Base64 驗證標頭"""
        l = (login or settings.DATAFORSEO_LOGIN or "").strip()
        p = (password or settings.DATAFORSEO_PASSWORD or "").strip()
        
        # 僅在偵錯模式上記錄關鍵資訊的長度與首尾字元
        logger.debug(f"DataForSEOService Auth: login='{l[:2]}...{l[-2:] if len(l)>2 else ''}' (len={len(l)}), pass='{p[:2]}...{p[-2:] if len(p)>2 else ''}' (len={len(p)})")
        
        # 1. 檢測是否直接提供了完整的 HTTP Basic Auth 字串
        if p.startswith("Basic "):
            return {"Authorization": p}
        if l.startswith("Basic "):
            return {"Authorization": l}
            
        # 2. 檢測是否提供了已經 Base64 編碼過的 'login:password'
        # 規律：長度較長、無空格、無冒號，且解碼後包含冒號
        if ":" not in p and len(p) > 20:
            try:
                decoded = base64.b64decode(p).decode("utf-8")
                if ":" in decoded:
                    logger.info("DataForSEOService: Detected pre-encoded Base64 login:password in credential field")
                    return {"Authorization": f"Basic {p}"}
            except:
                pass

        # 3. 標準處理 (Email + API Password)
        if not l or not p:
            logger.warning("DataForSEOService: Login or Password is empty! Fallback check: Login=%s, Pass=%s", bool(l), bool(p))
            return {}
            
        auth_str = f"{l}:{p}"
        # 使用 utf-8 避免特殊字元問題
        encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
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
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        獲取 Google SERP 結果，支援 AI Overviews (SGE)
        包含快取邏輯：優先從 SerpCache 讀取，除非強制刷新
        """
        # 1. 檢查快取（僅依關鍵字查詢,不限制國家/語言以提高相容性）
        if db:
            from app.models.db_models import SerpCache
            cache = db.query(SerpCache).filter(
                SerpCache.keyword == keyword
            ).order_by(SerpCache.created_at.desc()).first()
            
            if cache and not force_refresh:
                logger.info(f"Using cached SERP results for: {keyword}")
                results_data = cache.results
                # 將快取建立時間加入結果,以便前端顯示
                if isinstance(results_data, dict):
                    results_data["created_at"] = cache.created_at.isoformat() if cache.created_at else None
                return results_data
        else:
            cache = None

        mode = (serp_mode or "google_organic").lower()
        if mode not in ["google_organic", "google_ai_mode"]:
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"Unsupported DataForSEO SERP mode: {serp_mode}"}

        url = f"{cls.BASE_URL}/serp/google/organic/live/advanced"
        if mode == "google_ai_mode":
            url = f"{cls.BASE_URL}/serp/google/ai_mode/live/advanced"
        
        # 準備請求數據
        lang_name = cls.resolve_language_name(language_code)
        post_data = [{
            "keyword": keyword,
            "language_name": lang_name,
            "location_code": location_code,
            "depth": num_results,
            "calculate_rectangles": False
        }]
        
        try:
            logger.info("DataForSEO Request to %s: %s", url, post_data)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.warning("DataForSEO Error: HTTP %s Body: %s", response.status_code, response.text)
                    return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"DataForSEO Error: HTTP {response.status_code}"}
                
                data = response.json()
                logger.info("DataForSEO Raw Response: %s", data)
                parsed_results = cls._parse_serp_response(data)
                parsed_results["created_at"] = datetime.utcnow().isoformat()
                
                # 2. 寫入快取
                if db and not parsed_results.get("error"):
                    from app.models.db_models import SerpCache
                    if cache:
                        cache.results = parsed_results
                        cache.created_at = datetime.utcnow()
                        cache.expires_at = datetime.utcnow() + timedelta(days=7)
                    else:
                        new_cache = SerpCache(
                            keyword=keyword,
                            country="TW",  # 新增國家欄位
                            language="zh-TW",  # 新增語言欄位
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
            status_message = data.get("status_message", "Unknown error")
            logger.warning("DataForSEO response missing tasks. Status: %s, Full Data: %s", status_message, data)
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"DataForSEO 錯誤: {status_message}"}
            
        # 取得第一個 task 的結果
        task_result = tasks[0].get("result", [])
        if not task_result:
            status_message = tasks[0].get("status_message", "No result found")
            logger.warning("DataForSEO task missing result. Status: %s, Task: %s", status_message, tasks[0])
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": f"DataForSEO 任務失敗: {status_message}"}
            
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
                ).model_dump())
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
        lang_name = cls.resolve_language_name(language_code)
        post_data = [{
            "keyword": keyword,
            "language_name": lang_name,
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
            "language_code": language_code, # Keywords Data endpoint requires language_code
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
                    logger.warning("DataForSEO Keyword Data HTTP Error: %s Body: %s", response.status_code, response.text)
                    return []
                    
                data = response.json()
                logger.info("DataForSEO Keyword Data Response: %s", data)
                tasks = data.get("tasks", [])
                if not tasks or tasks[0].get("status_code", 0) >= 40000:
                    status_msg = tasks[0].get("status_message") if tasks else "No tasks found"
                    logger.warning("DataForSEO Keyword Data Task Error: %s", status_msg)
                    return []
                    
                result = tasks[0].get("result", [])
                return result
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
        password: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        獲取關鍵字建議與長尾詞 (Keyword Ideas)
        包含快取邏輯：優先從資料庫讀取，失效或不存在才調用 API
        """
        # 1. 檢查快取 (若有提供 db session 且非強制刷新)
        if db and not force_refresh:
            cache = db.query(KeywordCache).filter(
                KeywordCache.keyword == keyword,
                KeywordCache.location_code == location_code,
                KeywordCache.language_code == language_code
            ).first()
            
            # 手動更新邏輯：除非強制刷新，否則即便是過期的也先回傳 (或是這裡可以取消過期檢查)
            if cache:
                logger.info(f"Using cached keyword ideas for: {keyword}")
                return {
                    "seed_keyword_data": cls._flatten_keyword_data(cache.seed_data),
                    "suggestions": [cls._flatten_keyword_data(s) for s in cache.suggestions] if cache.suggestions else [],
                    "from_cache": True
                }
        elif db and force_refresh:
            # 如果是強制刷新，先查出舊快取物件以便更新
            cache = db.query(KeywordCache).filter(
                KeywordCache.keyword == keyword,
                KeywordCache.location_code == location_code,
                KeywordCache.language_code == language_code
            ).first()
        else:
            cache = None

        # 2. 調用 API
        print(f"DEBUG: DataForSEO Keyword Ideas Params: Keyword={keyword}, LangCode={language_code}, Loc={location_code}")
        url = f"{cls.BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live"
        post_data = [{
            "keywords": [keyword],
            "language_code": language_code, # Keywords Data endpoint requires language_code
            "location_code": location_code,
            "include_adult_keywords": False
        }]
        
        try:
            logger.info("DataForSEO Keyword Ideas Request to %s: %s", url, post_data)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=post_data,
                    headers=cls._get_auth_header(login, password),
                    timeout=30.0
                )
                
                print(f"DEBUG: DataForSEO Keyword Ideas Status: {response.status_code}")
                if response.status_code != 200:
                    print(f"DEBUG: DataForSEO Keyword Ideas Error Body: {response.text}")
                    logger.warning("DataForSEO Keyword Ideas HTTP Error: %s Body: %s", response.status_code, response.text)
                    return {"seed_keyword_data": None, "suggestions": [], "error": f"API Error: {response.status_code}"}
                
                data = response.json()
                # 寫入偵錯檔案
                with open("ideas_last_response.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"DEBUG: DataForSEO Keyword Ideas Response: {str(data)[:200]}...")
                logger.info("DataForSEO Keyword Ideas Response: %s", data)
                tasks = data.get("tasks", [])
                
                if not tasks or tasks[0].get("status_code", 0) >= 40000:
                    status_msg = tasks[0].get("status_message") if tasks else "No tasks found"
                    logger.warning("DataForSEO Keyword Ideas Task Error: %s", status_msg)
                    return {"seed_keyword_data": None, "suggestions": [], "error": status_msg}

                if not tasks[0].get("result"):
                    return {"seed_keyword_data": None, "suggestions": [], "error": "No results found"}
                
                result_list = tasks[0]["result"]
                # keywords_for_keywords 返回陣列，第一個通常是 seed
                raw_seed_data = result_list[0]
                raw_suggestions = result_list[1:] if len(result_list) > 1 else []
                
                # 扁平化數據以利前端使用
                seed_data = cls._flatten_keyword_data(raw_seed_data) if raw_seed_data else None
                suggestions = [cls._flatten_keyword_data(s) for s in raw_suggestions if s]
                
                # 3. 寫入快取 (若有提供 db session)
                if db:
                    logger.info("Saving Keyword Ideas to Cache for: %s", keyword)
                    if cache:
                        cache.seed_data = seed_data
                        cache.suggestions = suggestions
                        cache.created_at = datetime.now()
                        cache.expires_at = datetime.now() + timedelta(days=30)
                    else:
                        new_cache = KeywordCache(
                            keyword=keyword,
                            location_code=location_code,
                            language_code=language_code,
                            seed_data=seed_data,
                            suggestions=suggestions,
                            expires_at=datetime.now() + timedelta(days=30)
                        )
                        db.add(new_cache)
                    db.commit()
                    logger.info("Successfully committed Keyword Cache for: %s", keyword)
                
                return {
                    "seed_keyword_data": seed_data,
                    "suggestions": suggestions,
                    "from_cache": False
                }
                
        except Exception as e:
            logger.error(f"Keyword Ideas Exception: {str(e)}", exc_info=True)
            return {"seed_keyword_data": None, "suggestions": [], "error": str(e)}

    @classmethod
    def _flatten_keyword_data(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        將 DataForSEO 權重數據扁平化，提取關鍵指標到首層
        """
        if not item:
            return {}
            
        # 優先從頂層獲取（Keywords Data Live 端點）
        search_volume = item.get("search_volume")
        cpc = item.get("cpc")
        competition = item.get("competition")
        competition_index = item.get("competition_index")
        low_bid = item.get("low_top_of_page_bid")
        high_bid = item.get("high_top_of_page_bid")
        
        # 如果頂層沒有，嘗試從內層獲取（某些 SERP 或 Labs 端點）
        info = item.get("keyword_info", {})
        if not info:
            info = item.get("keyword_data", {})
            
        if info:
            search_volume = search_volume or info.get("search_volume")
            cpc = cpc or info.get("cpc")
            competition = competition or info.get("competition")
            competition_index = competition_index or info.get("competition_index")
            low_bid = low_bid or info.get("low_top_of_page_bid")
            high_bid = high_bid or info.get("high_top_of_page_bid")

        return {
            "keyword": item.get("keyword"),
            "search_volume": search_volume,
            "cpc": cpc,
            "competition": competition,
            "competition_index": competition_index,
            "low_top_of_page_bid": low_bid,
            "high_top_of_page_bid": high_bid,
        }
