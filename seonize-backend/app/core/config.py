"""
Seonize Backend - Configuration Settings
"""

from pydantic_settings import BaseSettings
from pydantic import model_validator
import os
import json
import logging
from typing import Any

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Seonize"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Database
    _DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "seonize.db")
    DATABASE_URL: str = f"sqlite:///{_DB_PATH}"
    
    # Redis Cache
    REDIS_URL: str = ""
    CACHE_TTL: int = 3600  # 1 hour
    
    # Security
    # 預設為空，強制從環境變數讀取或在啟動時驗證
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ADMIN_PASSWORD: str = ""  # 強制從 .env 讀取
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_USERNAME: str = "Admin"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # AI Provider
    AI_PROVIDER: str = "zeabur"
    ZEABUR_AI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"

    # Stock Photo APIs
    PEXELS_API_KEY: str = ""
    PIXABAY_API_KEY: str = ""

    # DataForSEO
    DATAFORSEO_LOGIN: str = ""
    DATAFORSEO_PASSWORD: str = ""

    @model_validator(mode="after")
    def validate_security_keys(self) -> 'Settings':
        if not self.SECRET_KEY or self.SECRET_KEY == "your-super-secret-key-change-it-in-env":
            # 在開發環境中如果是空，可以給予警告但不崩潰（假設還原後需要重新設定）
            # 但在生產環境建議報錯。這裡採用警告 + 靜態提示。
            logging.warning("⚠️ SECRET_KEY 未設定或為預設值，這將導致加密失敗！請檢查 .env 檔案。")
        
        if not self.ADMIN_PASSWORD or self.ADMIN_PASSWORD == "admin123":
            logging.warning("⚠️ ADMIN_PASSWORD 為空或預設值，請務必在 .env 中設定強密碼。")
            
        return self

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()
