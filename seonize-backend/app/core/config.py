"""
Seonize Backend - Configuration Settings
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Seonize"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    
    # Database
    DATABASE_URL: str = "sqlite:///./seonize.db"
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600  # 1 hour
    
    # AI Provider Settings
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-2.0-flash"
    
    # AI API Keys
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ZEABUR_API_KEY: str = ""
    
    # Search API
    SERP_API_KEY: str = ""
    GOOGLE_SEARCH_API_KEY: str = ""
    GOOGLE_SEARCH_CX: str = ""
    
    # DataForSEO
    DATAFORSEO_LOGIN: str = ""
    DATAFORSEO_PASSWORD: str = ""
    DATAFORSEO_USE_SANDBOX: bool = False
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


settings = Settings()
