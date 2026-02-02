"""
Seonize Backend - DataForSEO Service
處理 DataForSEO API 的介接，包含 SERP, AI Overviews 與 Keyword Data
"""

import logging
import httpx
import base64
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.models.project import SERPResult


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
        login: Optional[str] = None,
        password: Optional[str] = None,
        serp_mode: str = "google_organic",
    ) -> Dict[str, Any]:
        """
        獲取 Google SERP 結果，支援 AI Overviews (SGE)
        """
        mode = (serp_mode or "google_organic").lower()
        if mode not in ["google_organic", "google_ai_mode"]:
            return {"results": [], "ai_overview": None, "error": f"Unsupported DataForSEO SERP mode: {serp_mode}"}

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
        
        # 如果需要 AI Overview，則調用專用端點或在進階請求中處理
        # 注意: Advanced 端點通常已包含 AI Overview 資訊 (如果有的話)
        
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
                    return {"results": [], "ai_overview": None, "error": f"DataForSEO Error: HTTP {response.status_code}"}
                
                data = response.json()
                return cls._parse_serp_response(data)
                
        except Exception as e:
            logger.warning("DataForSEO Exception", exc_info=True)
            return {"results": [], "ai_overview": None, "error": str(e)}

    @classmethod
    def _parse_serp_response(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """解析 DataForSEO 的回傳格式，提取有機搜尋與 AI Overview"""
        results = []
        ai_overview = None
        
        # DataForSEO 的 task 回傳結構
        tasks = data.get("tasks", [])
        if not tasks:
            return {"results": [], "ai_overview": None, "error": "DataForSEO response missing tasks"}
            
        # 取得第一個 task 的結果
        task_result = tasks[0].get("result", [])
        if not task_result:
            return {"results": [], "ai_overview": None, "error": "DataForSEO response missing results"}
            
        # 遍歷結果項項目
        items = task_result[0].get("items", [])
        
        rank = 1
        for item in items:
            if item.get("type") == "organic":
                results.append(SERPResult(
                    rank=rank,
                    url=item.get("url", ""),
                    title=item.get("title", ""),
                    snippet=item.get("description", ""),
                    headings=[] # DataForSEO Advanced 有時會提供更多，此處先留空
                ))
                rank += 1
                
            # 處理 AI Overview
            elif item.get("type") == "google_ai_overview":
                ai_overview = item
                
        return {"results": results, "ai_overview": ai_overview, "error": None}

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
