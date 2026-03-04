"""
Seonize Backend - Configuration Settings
"""

from pydantic_settings import BaseSettings
import os
import json
from typing import Any

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Seonize"
    
    # CORS
    # 使用 str 型別避免 pydantic-settings v2 對 List 自動做 JSON 解碼而崩潰
    # 支援格式：逗號分隔、JSON 陣列字串、或單一 URL
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Database
    # 使用絕對路徑以避免啟動目錄不同造成的資料庫遺失
    # 這裡將資料庫固定在後端目錄內
    _DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "seonize.db")
    DATABASE_URL: str = f"sqlite:///{_DB_PATH}"
    
    # Redis Cache
    REDIS_URL: str = ""
    CACHE_TTL: int = 3600  # 1 hour
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-it-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ADMIN_PASSWORD: str = "admin123"  # 預設密碼，建議從 .env 覆蓋
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # AI Provider (雲端部署時可透過環境變數設定預設值；後台設定優先)
    AI_PROVIDER: str = "zeabur"
    ZEABUR_AI_API_KEY: str = ""    # Zeabur AI Hub API Key
    AI_MODEL: str = "gpt-4o-mini"  # 預設模型

    # DataForSEO (雲端部署時可透過環境變數設定預設值；後台設定優先)
    DATAFORSEO_LOGIN: str = ""
    DATAFORSEO_PASSWORD: str = ""

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


settings = Settings()
