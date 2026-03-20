"""
Seonize Backend - Settings API Router
系統設定管理 API
"""

from fastapi import APIRouter, Depends, HTTPException, status
import logging
import os
from pydantic import BaseModel
from typing import Optional, List, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import Settings
from app.services.ai_service import AIService, AIProvider
from app.core.auth import get_current_admin
from app.core.config import settings as settings_lib

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
    models: List[Any]
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

        # 檢查是否真理由環境變數提供（支援多種可能的環境變數名稱）
        env_map = {
            "ai_api_key": ["AI_API_KEY", "ZEABUR_AI_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"],
            "ai_provider": ["AI_PROVIDER"],
            "ai_model": ["AI_MODEL"],
            "dataforseo_login": ["DATAFORSEO_LOGIN"],
            "dataforseo_password": ["DATAFORSEO_PASSWORD"],
            "pexels_api_key": ["PEXELS_API_KEY"],
            "pixabay_api_key": ["PIXABAY_API_KEY"]
        }
        
        possible_envs = env_map.get(key, [key.upper()])
        if any(env_key in os.environ for env_key in possible_envs):
            system_provided.append(key)
    
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
    """取得可用的 AI 提供者列表"""
    # 只在資料庫中有明確設定時才強制覆寫 AIService 設定，否則讓其自動決定 (含環境變數回退)
    db_provider = Settings.get_value(db, "ai_provider", None)
    db_api_key = Settings.get_value(db, "ai_api_key", None)
    db_model = Settings.get_value(db, "ai_model", "gpt-4o-mini")
    
    if db_provider and db_api_key:
        from app.services.ai_service import AIConfig
        AIService.set_config(AIConfig(
            provider=AIProvider(db_provider),
            api_key=db_api_key,
            model=db_model
        ))
    else:
        # 如果資料庫沒設定，強制清除對象內部的快取以重新載入環境變數
        AIService._config = None
    
    # 取得提供者列表 (現在會使用正確的金鑰去 OpenRouter 抓取)
    providers = await AIService.get_available_providers()
    
    # 嘗試向 Zeabur API 動態查詢最新模型 (現在已在 AIService.set_config 中處理好金鑰取得)
    try:
        current_config = AIService.get_config()
        if current_config.provider == AIProvider.ZEABUR and current_config.api_key:
            client = ZeaburClient(current_config.api_key)
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
async def test_ai_connection(request: TestConnectionRequest, db: Session = Depends(get_db)):
    """測試 AI API 連線"""
    api_key = request.api_key
    
    # 如果是遮蔽碼，從資料庫或環境變數讀取真實內容
    if api_key and "****" in api_key:
        real_key = Settings.get_value(db, "ai_api_key", None)
        if not real_key:
            # 嘗試從環境變數讀取 (比照 AIService.get_config 邏輯)
            real_key = os.getenv("ZEABUR_AI_API_KEY") or \
                       os.getenv("OPENROUTER_API_KEY") or \
                       os.getenv("GEMINI_API_KEY") or \
                       os.getenv("AI_API_KEY")
        
        if real_key:
            api_key = real_key
        
    result = await AIService.test_connection(
        api_key=api_key,
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


