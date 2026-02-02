"""
Seonize Backend - SERP Service
統一 SERP 搜尋服務介面，支援 Google Search API 和 Serper.dev API
"""

import logging
import time
import httpx
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
from pydantic import BaseModel
from app.models.project import SERPResult
from app.models.db_models import Settings


logger = logging.getLogger(__name__)


class SERPProvider(str, Enum):
    GOOGLE = "google"
    SERPER = "serper"
    DATAFORSEO = "dataforseo"
    SERPAPI = "serpapi"


class SERPConfig(BaseModel):
    provider: SERPProvider = SERPProvider.GOOGLE
    google_api_key: str = ""
    google_cx: str = ""
    serper_api_key: str = ""
    serpapi_api_key: str = ""
    dataforseo_login: str = ""
    dataforseo_password: str = ""
    dataforseo_serp_mode: str = "google_organic"


class SERPService:
    """統一 SERP 搜尋服務類別"""
    
    _config_cache: Optional[SERPConfig] = None
    _cache_timestamp: Optional[float] = None
    _cache_timeout = 300  # 5 分鐘快取
    _initialized = False

    @classmethod
    def get_config(cls) -> SERPConfig:
        """從資料庫取得 SERP 配置（帶快取）"""
        current_time = time.time()
        if (cls._config_cache is not None and cls._cache_timestamp is not None and 
            current_time - cls._cache_timestamp < cls._cache_timeout):
            return cls._config_cache
        
        # 如果已經初始化過但資料庫連線失敗，返回快取的配置或預設配置
        if cls._initialized and cls._config_cache is not None:
            return cls._config_cache
        
        try:
            from app.core.database import SessionLocal
            with SessionLocal() as db:
                google_api_key = Settings.get_value(db, "google_search_api_key", "")
                google_cx = Settings.get_value(db, "google_search_cx", "")
                serper_api_key = Settings.get_value(db, "serper_api_key", "")
                serpapi_api_key = Settings.get_value(db, "serpapi_api_key", "")
                dfs_login = Settings.get_value(db, "dataforseo_login", "")
                dfs_password = Settings.get_value(db, "dataforseo_password", "")
                dfs_serp_mode = Settings.get_value(db, "dataforseo_serp_mode", "google_organic")
                provider_str = Settings.get_value(db, "serp_provider", "")
                
                cls._initialized = True
        except Exception:
            logger.warning("Failed to load SERP config", exc_info=True)
            # 如果資料庫連線失敗，且沒有快取，建立一個暫時的預設配置但不快取
            return cls._config_cache or SERPConfig()

        # 確定提供者
        if provider_str in SERPProvider._value2member_map_:
            provider = SERPProvider(provider_str)
        else:
            provider = SERPProvider.GOOGLE

        config = SERPConfig(
            provider=provider,
            google_api_key=google_api_key,
            google_cx=google_cx,
            serper_api_key=serper_api_key,
            serpapi_api_key=serpapi_api_key,
            dataforseo_login=dfs_login,
            dataforseo_password=dfs_password,
            dataforseo_serp_mode=dfs_serp_mode,
        )
        
        # 快取配置
        cls._config_cache = config
        cls._cache_timestamp = current_time
        
        return config

    @classmethod
    def clear_cache(cls):
        """清除配置快取，強迫下次重新讀取"""
        cls._config_cache = None
        cls._cache_timestamp = None
        cls._initialized = False

    @classmethod
    async def search(cls, keyword: str, num_results: int = 10, country: str = "TW", language: str = "zh-TW") -> Dict[str, Any]:
        """執行 SERP 搜尋，回傳包含結果列表與可能的 AI Overview"""
        config = cls.get_config()

        if config.provider == SERPProvider.SERPER:
            if not config.serper_api_key:
                return {"results": [], "ai_overview": None, "error": "SERP provider not configured: serper"}
            results, error = await cls._search_serper(keyword, num_results, country, language, config.serper_api_key)
            return {"results": results, "ai_overview": None, "error": error}
        if config.provider == SERPProvider.SERPAPI:
            if not config.serpapi_api_key:
                return {"results": [], "ai_overview": None, "error": "SERP provider not configured: serpapi"}
            results, error = await cls._search_serpapi(keyword, num_results, country, language, config.serpapi_api_key)
            return {"results": results, "ai_overview": None, "error": error}
        if config.provider == SERPProvider.DATAFORSEO:
            if not (config.dataforseo_login and config.dataforseo_password):
                return {"results": [], "ai_overview": None, "error": "SERP provider not configured: dataforseo"}
            from app.services.dataforseo_service import DataForSEOService
            language_code = DataForSEOService.resolve_language_code(language)
            location_code = DataForSEOService.resolve_location_code(country)
            return await DataForSEOService.get_serp_results(
                keyword,
                num_results=num_results,
                login=config.dataforseo_login,
                password=config.dataforseo_password,
                language_code=language_code,
                location_code=location_code,
                serp_mode=config.dataforseo_serp_mode,
            )
        if config.provider == SERPProvider.GOOGLE:
            if not (config.google_api_key and config.google_cx):
                return {"results": [], "ai_overview": None, "error": "SERP provider not configured: google"}
            results, error = await cls._search_google(keyword, num_results, country, language, config.google_api_key, config.google_cx)
            return {"results": results, "ai_overview": None, "error": error}
        return {"results": [], "ai_overview": None, "error": "SERP provider unavailable"}

    @classmethod
    async def _search_google(cls, keyword: str, num_results: int, country: str, language: str, api_key: str, cx: str) -> Tuple[List[SERPResult], Optional[str]]:
        """使用 Google Custom Search API 搜尋"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": api_key,
                        "cx": cx,
                        "q": keyword,
                        "num": min(num_results, 10),  # Google API 最多返回 10 個結果
                        "gl": country.lower(),  # 地理位置
                        "hl": language,  # 語言
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    results = []

                    for i, item in enumerate(data.get("items", [])):
                        results.append(SERPResult(
                            rank=i + 1,
                            url=item.get("link", ""),
                            title=item.get("title", ""),
                            snippet=item.get("snippet", ""),
                            headings=[],  # Google API 不提供 headings
                        ))

                    return results, None
                else:
                    error = f"Google Search API error: HTTP {response.status_code}"
                    logger.warning("%s", error)
                    return [], error

        except Exception as e:
            logger.warning("Google Search API exception", exc_info=True)
            return [], str(e)

    @classmethod
    async def _search_serper(cls, keyword: str, num_results: int, country: str, language: str, api_key: str) -> Tuple[List[SERPResult], Optional[str]]:
        """使用 Serper.dev API 搜尋"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://google.serper.dev/search",
                    json={
                        "q": keyword,
                        "num": num_results,
                        "gl": country.lower(),  # 地理位置
                        "hl": language,  # 語言
                    },
                    headers={
                        "X-API-KEY": api_key,
                        "Content-Type": "application/json",
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    results = []

                    for i, item in enumerate(data.get("organic", [])):
                        results.append(SERPResult(
                            rank=i + 1,
                            url=item.get("link", ""),
                            title=item.get("title", ""),
                            snippet=item.get("snippet", ""),
                            headings=[],  # Serper API 可能不提供 headings
                        ))

                    return results, None
                else:
                    error = f"Serper.dev API error: HTTP {response.status_code}"
                    logger.warning("%s", error)
                    return [], error

        except Exception as e:
            logger.warning("Serper.dev API exception", exc_info=True)
            return [], str(e)

    @classmethod
    async def _search_serpapi(cls, keyword: str, num_results: int, country: str, language: str, api_key: str) -> Tuple[List[SERPResult], Optional[str]]:
        """使用 SerpApi.com API 搜尋"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "q": keyword,
                        "num": num_results,
                        "gl": country.lower(),
                        "hl": language,
                        "api_key": api_key,
                        "engine": "google",
                    },
                    timeout=20.0
                )

                if response.status_code == 200:
                    data = response.json()
                    results = []

                    for i, item in enumerate(data.get("organic_results", [])):
                        results.append(SERPResult(
                            rank=i + 1,
                            url=item.get("link", ""),
                            title=item.get("title", ""),
                            snippet=item.get("snippet", ""),
                            headings=[],
                        ))

                    return results, None
                else:
                    error = f"SerpApi error: HTTP {response.status_code}"
                    logger.warning("%s", error)
                    return [], error

        except Exception as e:
            logger.warning("SerpApi exception", exc_info=True)
            return [], str(e)

    @classmethod
    def _get_mock_results(cls, keyword: str, num_results: int) -> List[SERPResult]:
        """返回模擬數據"""
        return [
            SERPResult(
                rank=i + 1,
                url=f"https://example{i + 1}.com/article",
                title=f"範例標題 {i + 1} - {keyword}",
                snippet=f"這是關於 {keyword} 的範例摘要內容...",
                headings=[f"H2: 關於 {keyword}", "H2: 詳細說明", "H3: 注意事項"]
            )
            for i in range(min(num_results, 10))
        ]

    @classmethod
    def get_available_providers(cls) -> List[Dict[str, Any]]:
        """取得可用的 SERP 提供者清單"""
        try:
            config = cls.get_config()
            providers = []

            # 1. Google Search API
            is_google_configured = bool(config.google_api_key and config.google_cx)
            providers.append({
                "id": "google",
                "name": "Google Search API",
                "description": "使用 Google Custom Search API",
                "configured": is_google_configured,
            })

            # 2. Serper.dev API
            is_serper_configured = bool(config.serper_api_key)
            providers.append({
                "id": "serper",
                "name": "Serper.dev API",
                "description": "使用 Serper.dev Google SERP API",
                "configured": is_serper_configured,
            })
            
            # 2.5 SerpApi.com API
            is_serpapi_configured = bool(config.serpapi_api_key)
            providers.append({
                "id": "serpapi",
                "name": "SerpApi.com API",
                "description": "使用 SerpApi.com Google SERP API",
                "configured": is_serpapi_configured,
            })
            
            # 3. DataForSEO API
            is_dfs_configured = bool(config.dataforseo_login and config.dataforseo_password)
            providers.append({
                "id": "dataforseo",
                "name": "DataForSEO API",
                "description": "支援 Google SERP 與 AI Overviews (SGE)",
                "configured": is_dfs_configured,
            })

            return providers
        except Exception:
            logger.warning("Failed to get SERP providers", exc_info=True)
            return [
                {"id": "google", "name": "Google Search API", "description": "Google Search API", "configured": False},
                {"id": "serper", "name": "Serper.dev API", "description": "Serper.dev API", "configured": False},
                {"id": "serpapi", "name": "SerpApi.com API", "description": "SerpApi.com API", "configured": False},
                {"id": "dataforseo", "name": "DataForSEO API", "description": "DataForSEO API", "configured": False},
            ]
