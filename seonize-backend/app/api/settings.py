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
    google_search_api_key: Optional[str] = None
    google_search_cx: Optional[str] = None
    ai_provider: str = "gemini"
    ai_api_key: Optional[str] = None
    ai_model: str = "gemini-2.0-flash"
    serper_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    google_search_api_key: Optional[str] = None
    google_search_cx: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    serper_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None


class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None


class TestSerperRequest(BaseModel):
    api_key: str


class TestSerpApiRequest(BaseModel):
    api_key: str


class SERPProviderUpdate(BaseModel):
    provider: str


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
    
    # 從資料庫讀取設定
    keys = [
        "google_search_api_key", "google_search_cx", 
        "ai_provider", "ai_api_key", "ai_model", 
        "serper_api_key", "serpapi_api_key", "dataforseo_login", "dataforseo_password", "dataforseo_serp_mode"
    ]
    for key in keys:
        value = Settings.get_value(db, key)
        if value:
            # API Key/Password 類型需要遮蔽
            if ("api_key" in key or "password" in key) and value:
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
        serpapi_api_key=settings.get("serpapi_api_key"),
        dataforseo_login=settings.get("dataforseo_login"),
        dataforseo_password=settings.get("dataforseo_password"),
        dataforseo_serp_mode=settings.get("dataforseo_serp_mode"),
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
    serp_keys = ["google_search_api_key", "google_search_cx", "serper_api_key", "serpapi_api_key", "dataforseo_login", "dataforseo_password", "dataforseo_serp_mode"]
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


@router.post("/test-serper", response_model=TestConnectionResponse)
async def test_serper_connection(request: TestSerperRequest, db: Session = Depends(get_db)):
    """測試 Serper.dev API 連線"""
    api_key = request.api_key
    
    # 如果是遮蔽碼，從資料庫讀取真實金鑰
    if "****" in api_key:
        api_key = Settings.get_value(db, "serper_api_key", api_key)

    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/search",
                json={"q": "test", "num": 1},
                headers={
                    "X-API-KEY": api_key,
                    "Content-Type": "application/json",
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message="Serper.dev 連線成功",
                    provider="serper",
                )
            else:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get("message", error_msg)
                except:
                    pass
                return TestConnectionResponse(
                    success=False,
                    message=f"連線失敗：{error_msg}",
                    provider="serper",
                )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"連線錯誤：{str(e)}",
            provider="serper",
        )


@router.post("/test-serpapi", response_model=TestConnectionResponse)
async def test_serpapi_connection(request: TestSerpApiRequest, db: Session = Depends(get_db)):
    """測試 SerpApi.com API 連線"""
    api_key = request.api_key
    
    # 如果是遮蔽碼，從資料庫讀取真實金鑰
    if "****" in api_key:
        api_key = Settings.get_value(db, "serpapi_api_key", api_key)

    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://serpapi.com/search",
                params={"q": "test", "api_key": api_key, "engine": "google"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message="SerpApi 連線成功",
                    provider="serpapi",
                )
            else:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", error_msg)
                except:
                    pass
                return TestConnectionResponse(
                    success=False,
                    message=f"連線失敗：{error_msg}",
                    provider="serpapi",
                )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"連線錯誤：{str(e)}",
            provider="serpapi",
        )


@router.post("/test-google", response_model=TestConnectionResponse)
async def test_google_connection(api_key: str, cx: str, db: Session = Depends(get_db)):
    """測試 Google Search API 連線"""
    # 如果是遮蔽碼，從資料庫讀取真實內容
    if "****" in api_key:
        api_key = Settings.get_value(db, "google_search_api_key", api_key)
    if "****" in cx:
        cx = Settings.get_value(db, "google_search_cx", cx)

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
        import base64
        
        auth_str = f"{login}:{password}"
        encoded_auth = base64.b64encode(auth_str.encode("ascii")).decode("ascii")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.dataforseo.com/v3/user_node/me",
                headers={"Authorization": f"Basic {encoded_auth}"},
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
            },
            {
                "id": "serpapi",
                "name": "SerpApi.com API",
                "description": "使用 SerpApi.com Google SERP API（未設定）",
                "configured": False,
            },
            {
                "id": "dataforseo",
                "name": "DataForSEO API",
                "description": "支援 Google SERP 與 AI Overviews（未設定）",
                "configured": False,
            }
        ]


@router.post("/serp-provider")
async def set_serp_provider(request: SERPProviderUpdate, db: Session = Depends(get_db)):
    """設定預設的 SERP 提供者"""
    if request.provider not in ["google", "serper", "serpapi", "dataforseo"]:
        raise HTTPException(status_code=400, detail="無效的提供者")

    Settings.set_value(db, "serp_provider", request.provider)
    
    # 清除快取以確保立即生效
    from app.services.serp_service import SERPService
    SERPService.clear_cache()
    
    return {"message": f"SERP 提供者已設定為 {request.provider}"}


@router.get("/serp-provider")
async def get_serp_provider(db: Session = Depends(get_db)):
    """取得目前的 SERP 提供者"""
    provider = Settings.get_value(db, "serp_provider", "google")
    return {"provider": provider}
