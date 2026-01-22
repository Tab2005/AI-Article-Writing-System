"""
Seonize Backend - Settings API Router
系統設定管理 API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import Settings
from app.services.ai_service import AIService, AIProvider

router = APIRouter()


# Request/Response Models
class SettingItem(BaseModel):
    key: str
    value: str
    encrypted: bool = False


class SettingsResponse(BaseModel):
    google_search_api_key: Optional[str] = None
    google_search_cx: Optional[str] = None
    ai_provider: str = "gemini"
    ai_api_key: Optional[str] = None
    ai_model: str = "gemini-2.0-flash"
    serper_api_key: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    google_search_api_key: Optional[str] = None
    google_search_cx: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    serper_api_key: Optional[str] = None


class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None


class TestSerperRequest(BaseModel):
    api_key: str


class SERPProviderUpdate(BaseModel):
    provider: str


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
    
    # 從資料庫讀取設定
    for key in ["google_search_api_key", "google_search_cx", "ai_provider", "ai_api_key", "ai_model", "serper_api_key"]:
        value = Settings.get_value(db, key)
        if value:
            # API Key 類型需要遮蔽
            if "api_key" in key and value:
                settings[key] = mask_api_key(value)
            else:
                settings[key] = value
    
    return SettingsResponse(
        google_search_api_key=settings.get("google_search_api_key"),
        google_search_cx=settings.get("google_search_cx"),
        ai_provider=settings.get("ai_provider", "gemini"),
        ai_api_key=settings.get("ai_api_key"),
        ai_model=settings.get("ai_model", "gemini-2.0-flash"),
        serper_api_key=settings.get("serper_api_key"),
    )


@router.post("/", response_model=SettingsResponse)
async def update_settings(request: UpdateSettingsRequest, db: Session = Depends(get_db)):
    """更新設定"""
    updates = request.model_dump(exclude_unset=True)
    
    for key, value in updates.items():
        if value is not None:
            # API Key 類型標記為加密
            encrypted = "api_key" in key
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


@router.post("/test-google", response_model=TestConnectionResponse)
async def test_google_connection(api_key: str, cx: str):
    """測試 Google Search API 連線"""
    try:
        import httpx
        
        # 測試 Google Custom Search API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": api_key,
                    "cx": cx,
                    "q": "test",
                    "num": 1,
                }
            )
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message="Google Search API 連線成功",
                    provider="google",
                )
            else:
                error = response.json().get("error", {}).get("message", "未知錯誤")
                return TestConnectionResponse(
                    success=False,
                    message=f"連線失敗：{error}",
                    provider="google",
                )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"連線錯誤：{str(e)}",
            provider="google",
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


@router.get("/serp-providers")
async def get_serp_providers():
    """取得可用的 SERP 提供者"""
    try:
        from app.services.serp_service import SERPService
        return SERPService.get_available_providers()
    except Exception as e:
        # 如果發生錯誤，返回預設提供者列表
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


@router.post("/serp-provider")
async def set_serp_provider(request: SERPProviderUpdate, db: Session = Depends(get_db)):
    """設定預設的 SERP 提供者"""
    if request.provider not in ["google", "serper"]:
        raise HTTPException(status_code=400, detail="無效的提供者")

    Settings.set_value(db, "serp_provider", request.provider)
    return {"message": f"SERP 提供者已設定為 {request.provider}"}


@router.get("/serp-provider")
async def get_serp_provider(db: Session = Depends(get_db)):
    """取得目前的 SERP 提供者"""
    provider = Settings.get_value(db, "serp_provider", "google")
    return {"provider": provider}
