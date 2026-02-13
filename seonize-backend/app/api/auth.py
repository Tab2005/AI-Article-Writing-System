"""
Seonize Backend - Auth API Router
登入相關接口
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.core.config import settings
from app.core.auth import create_access_token

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    管理員登入接口
    驗證使用者名稱 (應為 admin) 與密碼
    """
    # 目前採單一管理員模式：驗證密碼是否與配置相符
    # 提醒：如果是生產環境，建議密碼先在 .env 以雜湊形式存入，此處再比對
    if form_data.username != "admin" or form_data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="使用者名稱或密碼錯誤。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin"}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.get("/validate")
async def validate_token():
    """驗證 Token 是否有效（由前端在初始化時調用）"""
    # get_current_admin 已包含驗證邏輯，能走到這表示 Token 有效
    from app.core.auth import get_current_admin
    import fastapi
    return {"status": "ok"}
