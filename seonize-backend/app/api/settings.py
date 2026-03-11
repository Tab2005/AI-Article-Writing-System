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
from app.core.auth import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])

logger = logging.getLogger(__name__)


# Request/Response Models
class SettingItem(BaseModel):
    key: str
    value: str
    encrypted: bool = False


class SettingsResponse(BaseModel):
    ai_provider: str = "zeabur"
    ai_api_key: Optional[str] = None
    ai_model: str = "gpt-4o-mini"
    ai_title_prompt: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None
    pixabay_api_key: Optional[str] = None
    pexels_api_key: Optional[str] = None
    # 紀錄哪些設定是由環境變數提供的（唯讀）
    system_provided: List[str] = []


class UpdateSettingsRequest(BaseModel):
    ai_provider: Optional[str] = "zeabur"
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = "gpt-4o-mini"
    ai_title_prompt: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    dataforseo_serp_mode: Optional[str] = None
    pixabay_api_key: Optional[str] = None
    pexels_api_key: Optional[str] = None


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
        "dataforseo_login", "dataforseo_password", "dataforseo_serp_mode",
        "pixabay_api_key", "pexels_api_key"
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
        ai_provider=settings.get("ai_provider", "gemini"),
        ai_api_key=settings.get("ai_api_key"),
        ai_model=settings.get("ai_model", "gemini-2.0-flash"),
        ai_title_prompt=settings.get("ai_title_prompt"),
        dataforseo_login=settings.get("dataforseo_login"),
        dataforseo_password=settings.get("dataforseo_password"),
        dataforseo_serp_mode=settings.get("dataforseo_serp_mode"),
        pixabay_api_key=settings.get("pixabay_api_key"),
        pexels_api_key=settings.get("pexels_api_key"),
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
async def get_ai_providers(db: Session = Depends(get_db)):
    """取得可用的 AI 提供者列表（並嘗試自動從 Zeabur API 取得最新模型列表）"""
    from app.services.zeabur_client import ZeaburClient
    
    # 取得靜態的提供者列表 (包含備用模型)
    providers = AIService.get_available_providers()
    
    # 嘗試用目前儲存的 API Key 向 Zeabur API 動態查詢最新模型
    try:
        api_key = Settings.get_value(db, "ai_api_key", None)
        if api_key:
            client = ZeaburClient(api_key)
            dynamic_models = await client.get_models()
            if dynamic_models:
                for p in providers:
                    if p["id"] == "zeabur":
                        # 合併動態取得的模型與靜態備用列表，去除重複
                        from app.services.zeabur_client import ZEABUR_FALLBACK_MODELS
                        all_models = list(dict.fromkeys(dynamic_models + ZEABUR_FALLBACK_MODELS))
                        p["models"] = all_models
                        break
    except Exception as e:
        logger.warning(f"Failed to fetch dynamic models: {e}")
    
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
    import httpx
    import base64
    
    login = request.login
    password = request.password
    
    # 如果是遮蔽碼，從資料庫讀取真實內容
    if "****" in login:
        login = Settings.get_value(db, "dataforseo_login", login) or login
    if "****" in password:
        password = Settings.get_value(db, "dataforseo_password", password) or password
    
    login = (login or "").strip()
    password = (password or "").strip()
    
    if not login or not password:
        return TestConnectionResponse(
            success=False,
            message="帳號或密碼不能為空",
            provider="dataforseo",
        )

    try:
        # 直接構建 Basic Auth 標頭（最可靠的方法）
        auth_str = f"{login}:{password}"
        encoded = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        headers = {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(
                "https://api.dataforseo.com/v3/appendix/user_data",
                headers=headers,
                timeout=15.0
            )
            
            logger.info(f"DataForSEO test: HTTP {response.status_code}, body={response.text[:200]}")
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message="DataForSEO 連線成功",
                    provider="dataforseo",
                )
            elif response.status_code == 401:
                return TestConnectionResponse(
                    success=False,
                    message="認證失敗：帳號或 API 密碼錯誤（請至 app.dataforseo.com/api-access 確認）",
                    provider="dataforseo",
                )
            elif response.status_code == 403:
                return TestConnectionResponse(
                    success=False,
                    message="存取被拒：請確認帳號權限",
                    provider="dataforseo",
                )
            else:
                try:
                    body = response.json()
                    detail = body.get("status_message") or body.get("error", {}).get("message") or str(body)[:150]
                except Exception:
                    detail = response.text[:150] or "（無回應內容）"
                return TestConnectionResponse(
                    success=False,
                    message=f"連線失敗：HTTP {response.status_code} - {detail}",
                    provider="dataforseo",
                )
    except httpx.ConnectTimeout:
        return TestConnectionResponse(
            success=False,
            message="連線逾時：請檢查網路連線",
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
    return await get_cache().get_stats()


