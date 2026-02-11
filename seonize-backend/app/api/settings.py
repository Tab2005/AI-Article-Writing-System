"""
Seonize Backend - Settings API Router
系統設定管理 API
"""

from fastapi import APIRouter, Depends, HTTPException, status
import logging
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import Settings
from app.services.ai_service import AIService, AIProvider

router = APIRouter()

logger = logging.getLogger(__name__)


# Request/Response Models
class SettingItem(BaseModel):
    key: str
    value: str
    encrypted: bool = False


class SettingsResponse(BaseModel):
    ai_provider: str = "gemini"
    ai_api_key: Optional[str] = None
    ai_model: str = "gemini-2.0-flash"
    ai_title_prompt: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None
    # 紀錄哪些設定是由環境變數提供的（唯讀）
    system_provided: List[str] = []


class UpdateSettingsRequest(BaseModel):
    ai_provider: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    ai_title_prompt: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None


class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None




class TestDataForSEORequest(BaseModel):
    login: str
    password: str


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    provider: str


class AIProviderInfo(BaseModel):
    id: str
    name: str
    models: List[str]
    description: str


def mask_api_key(key: str) -> str:
    """遮蔽 API Key"""
    if not key or len(key) < 8:
        return "****"
    return key[:4] + "****" + key[-4:]


@router.get("/", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """取得目前設定"""
    settings = {}
    system_provided = []
    
    # 從資料庫讀取設定（這已經包含了優先從環境變數讀取的邏輯）
    keys = [
        "ai_provider", "ai_api_key", "ai_model", "ai_title_prompt",
        "dataforseo_login", "dataforseo_password", "dataforseo_serp_mode"
    ]
    
    # 檢查是否直接由系統提供的環境變數映射
    from app.core import config
    env_keys = {
        "ai_provider": "AI_PROVIDER",
        "ai_model": "AI_MODEL",
        "dataforseo_login": "DATAFORSEO_LOGIN",
        "dataforseo_password": "DATAFORSEO_PASSWORD",
    }
    
    for key in keys:
        value = Settings.get_value(db, key)
        
        # 標註是否由環境變數提供
        if key in env_keys and getattr(config.settings, env_keys[key], None):
            system_provided.append(key)
        elif key == "ai_api_key":
            # API Key 的判斷較複雜，看目前 provider 對應的 ENV 是否有值
            from app.models.db_models import os as system_os
            provider = Settings.get_value(db, "ai_provider", "gemini")
            env_map = {"gemini": "GEMINI_API_KEY", "openai": "OPENAI_API_KEY", "zeabur": "ZEABUR_API_KEY"}
            env_attr = env_map.get(provider, "GEMINI_API_KEY")
            if getattr(config.settings, env_attr, None):
                system_provided.append(key)

        if value:
            # API Key/Password 類型需要遮蔽
            if ("api_key" in key or "password" in key) and value:
                settings[key] = mask_api_key(value)
            else:
                settings[key] = value
    
    return SettingsResponse(
        ai_provider=settings.get("ai_provider", "gemini"),
        ai_api_key=settings.get("ai_api_key"),
        ai_model=settings.get("ai_model", "gemini-2.0-flash"),
        ai_title_prompt=settings.get("ai_title_prompt"),
        dataforseo_login=settings.get("dataforseo_login"),
        dataforseo_password=settings.get("dataforseo_password"),
        dataforseo_serp_mode=settings.get("dataforseo_serp_mode"),
        system_provided=system_provided
    )


@router.post("/", response_model=SettingsResponse)
async def update_settings(request: UpdateSettingsRequest, db: Session = Depends(get_db)):
    """更新設定"""
    updates = request.model_dump(exclude_unset=True)
    
    for key, value in updates.items():
        if value is not None:
            # 如果值看起是被遮蔽的（包含 ****），且不是重新輸入，則跳過儲存
            if value == "****" or ("****" in value and len(value) > 4):
                continue
            
            # API Key/Password 類型標記為加密
            encrypted = "api_key" in key or "password" in key
            Settings.set_value(db, key, value, encrypted=encrypted)
    
    # 如果更新了 AI 設定，同步更新 AI Service
    if any(k in updates for k in ["ai_provider", "ai_api_key", "ai_model"]):
        from app.services.ai_service import AIConfig, AIProvider
        
        provider = Settings.get_value(db, "ai_provider", "gemini")
        api_key = Settings.get_value(db, "ai_api_key", "")
        model = Settings.get_value(db, "ai_model", "gemini-2.0-flash")
        
        AIService.set_config(AIConfig(
            provider=AIProvider(provider),
            api_key=api_key,
            model=model,
        ))
    
    # 如果更新了 SERP 設定，清除 SERP Service 快取
    serp_keys = ["dataforseo_login", "dataforseo_password", "dataforseo_serp_mode"]
    if any(k in updates for k in serp_keys):
        from app.services.serp_service import SERPService
        SERPService.clear_cache()
    
    return await get_settings(db)


@router.get("/providers", response_model=List[AIProviderInfo])
async def get_ai_providers():
    """取得可用的 AI 提供者列表"""
    providers = AIService.get_available_providers()
    return [AIProviderInfo(**p) for p in providers]


@router.post("/test-ai", response_model=TestConnectionResponse)
async def test_ai_connection(request: TestConnectionRequest):
    """測試 AI API 連線"""
    result = await AIService.test_connection(
        api_key=request.api_key,
        provider=request.provider,
        model=request.model,
    )
    return TestConnectionResponse(**result)


@router.post("/test-dataforseo", response_model=TestConnectionResponse)
async def test_dataforseo_connection(request: TestDataForSEORequest, db: Session = Depends(get_db)):
    """測試 DataForSEO API 連線"""
    login = request.login
    password = request.password
    
    # 如果是遮蔽碼，從資料庫讀取真實內容
    if "****" in login:
        login = Settings.get_value(db, "dataforseo_login", login)
    if "****" in password:
        password = Settings.get_value(db, "dataforseo_password", password)

    try:
        import httpx
        from app.services.dataforseo_service import DataForSEOService
        headers = DataForSEOService._get_auth_header(login, password)
        
        if not headers:
             return TestConnectionResponse(
                success=False,
                message="帳號或密碼不能為空",
                provider="dataforseo",
            )

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.dataforseo.com/v3/user_node/me",
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message="DataForSEO 連線成功",
                    provider="dataforseo",
                )
            else:
                return TestConnectionResponse(
                    success=False,
                    message=f"連線失敗：HTTP {response.status_code}",
                    provider="dataforseo",
                )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"連線錯誤：{str(e)}",
            provider="dataforseo",
        )


@router.get("/database-info")
async def get_database_info():
    """取得資料庫資訊"""
    from app.core.database import get_database_info
    return get_database_info()


@router.get("/cache-info")
async def get_cache_info():
    """取得快取資訊"""
    from app.core.cache import get_cache
    return get_cache().get_stats()


