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


class SERPConfig(BaseModel):
    dataforseo_login: str = ""
    dataforseo_password: str = ""
    dataforseo_serp_mode: str = "google_organic"


class SERPService:
    """統一 SERP 搜尋服務類別 (目前僅支援 DataForSEO)"""
    
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
            logger.debug("SERPService: Using cached config")
            return cls._config_cache
        
        logger.info("SERPService: Loading fresh config from Database")
        # 如果已經初始化過但資料庫連線失敗，返回快取的配置或預設配置
        if cls._initialized and cls._config_cache is not None:
            return cls._config_cache
        
        try:
            from app.core.database import SessionLocal
            with SessionLocal() as db:
                dfs_login = Settings.get_value(db, "dataforseo_login", "")
                dfs_password = Settings.get_value(db, "dataforseo_password", "")
                dfs_serp_mode = Settings.get_value(db, "dataforseo_serp_mode", "google_organic")
                
                cls._initialized = True
        except Exception:
            logger.warning("Failed to load SERP config", exc_info=True)
            # 如果資料庫連線失敗，且沒有快取，建立一個暫時的預設配置但不快取
            return cls._config_cache or SERPConfig()

        config = SERPConfig(
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
    async def search(cls, keyword: str, num_results: int = 10, country: str = "TW", language: str = "zh-TW", db: Optional[Any] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """執行 SERP 搜尋，回傳包含結果列表與可能的 AI Overview"""
        config = cls.get_config()

        if not (config.dataforseo_login and config.dataforseo_password):
            return {"results": [], "ai_overview": None, "paa": [], "related_searches": [], "error": "SERP provider not configured: dataforseo"}
        
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
            db=db,
            force_refresh=force_refresh
        )

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
