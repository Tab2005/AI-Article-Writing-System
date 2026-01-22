"""
Seonize Backend - SERP Service
統一 SERP 搜尋服務介面，支援 Google Search API 和 Serper.dev API
"""

import os
import httpx
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel
from app.models.project import SERPResult
from app.core.database import get_db
from app.models.db_models import Settings


class SERPProvider(str, Enum):
    GOOGLE = "google"
    SERPER = "serper"


class SERPConfig(BaseModel):
    provider: SERPProvider = SERPProvider.GOOGLE
    google_api_key: str = ""
    google_cx: str = ""
    serper_api_key: str = ""


class SERPService:
    """統一 SERP 搜尋服務類別"""
    
    _config_cache: Optional[SERPConfig] = None
    _cache_timestamp: Optional[float] = None
    _cache_timeout = 300  # 5 分鐘快取
    _initialized = False

    @classmethod
    def get_config(cls) -> SERPConfig:
        """從資料庫取得 SERP 配置（帶快取）"""
        import time
        
        current_time = time.time()
        if (cls._config_cache is not None and cls._cache_timestamp is not None and 
            current_time - cls._cache_timestamp < cls._cache_timeout):
            return cls._config_cache
        
        # 如果已經初始化過但資料庫連線失敗，返回快取的配置或預設配置
        if cls._initialized and cls._config_cache is not None:
            return cls._config_cache
        
        try:
            db = next(get_db())
            google_api_key = Settings.get_value(db, "google_search_api_key", "")
            google_cx = Settings.get_value(db, "google_search_cx", "")
            serper_api_key = Settings.get_value(db, "serper_api_key", "")
            provider_str = Settings.get_value(db, "serp_provider", "")
            cls._initialized = True
        except Exception:
            # 如果資料庫連線失敗，返回預設配置
            if cls._config_cache is None:
                cls._config_cache = SERPConfig()
                cls._cache_timestamp = current_time
            return cls._config_cache

        # 確定提供者
        if provider_str == "serper" and serper_api_key:
            provider = SERPProvider.SERPER
        elif provider_str == "google" and google_api_key and google_cx:
            provider = SERPProvider.GOOGLE
        elif serper_api_key:
            provider = SERPProvider.SERPER  # fallback to serper if available
        else:
            provider = SERPProvider.GOOGLE  # fallback to google

        config = SERPConfig(
            provider=provider,
            google_api_key=google_api_key,
            google_cx=google_cx,
            serper_api_key=serper_api_key,
        )
        
        # 快取配置
        cls._config_cache = config
        cls._cache_timestamp = current_time
        
        return config

    @classmethod
    async def search(cls, keyword: str, num_results: int = 10, country: str = "TW", language: str = "zh-TW") -> List[SERPResult]:
        """執行 SERP 搜尋"""
        config = cls.get_config()

        if config.provider == SERPProvider.SERPER and config.serper_api_key:
            return await cls._search_serper(keyword, num_results, country, language, config.serper_api_key)
        elif config.provider == SERPProvider.GOOGLE and config.google_api_key and config.google_cx:
            return await cls._search_google(keyword, num_results, country, language, config.google_api_key, config.google_cx)
        else:
            # 如果沒有可用的 API，返回 mock 數據
            return cls._get_mock_results(keyword, num_results)

    @classmethod
    async def _search_google(cls, keyword: str, num_results: int, country: str, language: str, api_key: str, cx: str) -> List[SERPResult]:
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

                    return results
                else:
                    print(f"Google Search API error: {response.status_code} - {response.text}")
                    return cls._get_mock_results(keyword, num_results)

        except Exception as e:
            print(f"Google Search API exception: {e}")
            return cls._get_mock_results(keyword, num_results)

    @classmethod
    async def _search_serper(cls, keyword: str, num_results: int, country: str, language: str, api_key: str) -> List[SERPResult]:
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

                    return results
                else:
                    print(f"Serper.dev API error: {response.status_code} - {response.text}")
                    return cls._get_mock_results(keyword, num_results)

        except Exception as e:
            print(f"Serper.dev API exception: {e}")
            return cls._get_mock_results(keyword, num_results)

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
        """取得可用的 SERP 提供者"""
        try:
            config = cls.get_config()
            providers = []

            # Google Search API
            if config.google_api_key and config.google_cx:
                providers.append({
                    "id": "google",
                    "name": "Google Search API",
                    "description": "使用 Google Custom Search API",
                    "configured": True,
                })
            else:
                providers.append({
                    "id": "google",
                    "name": "Google Search API",
                    "description": "使用 Google Custom Search API（未設定）",
                    "configured": False,
                })

            # Serper.dev API
            if config.serper_api_key:
                providers.append({
                    "id": "serper",
                    "name": "Serper.dev API",
                    "description": "使用 Serper.dev Google SERP API",
                    "configured": True,
                })
            else:
                providers.append({
                    "id": "serper",
                    "name": "Serper.dev API",
                    "description": "使用 Serper.dev Google SERP API（未設定）",
                    "configured": False,
                })

            return providers
        except Exception:
            # 如果資料庫連線失敗，返回預設提供者列表
            return [
                {
                    "id": "google",
                    "name": "Google Search API",
                    "description": "使用 Google Custom Search API（未設定）",
                    "configured": False,
                },
                {
                    "id": "serper",
                    "name": "Serper.dev API",
                    "description": "使用 Serper.dev Google SERP API（未設定）",
                    "configured": False,
                }
            ]