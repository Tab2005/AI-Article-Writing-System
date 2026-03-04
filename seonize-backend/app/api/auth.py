"""
Seonize Backend - Auth API Router
登入與註冊接口
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import User
from app.core.auth import create_access_token, get_password_hash, verify_password, get_current_user

router = APIRouter()

class UserRegister(BaseModel):
    email: str
    password: str
    username: str = None

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None

@router.post("/register")
async def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    使用者註冊接口
    """
    # 檢查 Email 是否已註冊
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="此電子郵件已註冊過。")
    
    # 建立新使用者
    new_user = User(
        email=user_in.email,
        username=user_in.username or user_in.email.split("@")[0],
        hashed_password=get_password_hash(user_in.password),
        role="user"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "註冊成功", "user_id": new_user.id}

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    登入接口
    驗證電子郵件與密碼，並核發 JWT
    """
    # 優先從資料庫查找使用者 (支援 admin 直接對應到 admin@example.com)
    # 使用 .strip() 預防不可見空格干擾
    raw_username = form_data.username.strip()
    raw_password = form_data.password.strip()
    
    search_email = raw_username
    admin_email = settings.ADMIN_EMAIL.strip()
    if search_email == "admin":
        search_email = admin_email
        
    user = db.query(User).filter(User.email == search_email).first()
    
    # 啟動機制：如果資料庫尚無任何使用者，且使用管理員憑證登入，則自動建立第一個超管
    is_admin_attempt = raw_username in ["admin", admin_email]
    # 這裡對密碼進行 72 位截斷以相容 bcrypt 限制
    safe_admin_pwd = settings.ADMIN_PASSWORD.strip()[:72]
    
    if not user and is_admin_attempt:
        if raw_password == safe_admin_pwd:
            user = User(
                email=admin_email,
                username=settings.ADMIN_USERNAME.strip() or "Admin",
                hashed_password=get_password_hash(safe_admin_pwd),
                role="super_admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # 驗證邏輯：對於管理員嘗試，同樣對傳入密碼進行截斷雜湊比對
    login_pwd = raw_password
    if is_admin_attempt:
        login_pwd = login_pwd[:72]

    if not user or not verify_password(login_pwd, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="電子郵件或密碼錯誤。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }

@router.patch("/profile")
async def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    修改個人資料介面 (使用者名稱, 密碼)
    """
    if profile_in.username:
        current_user.username = profile_in.username.strip()
    
    if profile_in.new_password:
        if not profile_in.old_password:
            raise HTTPException(status_code=400, detail="修改密碼時必須提供舊密碼。")
        
        if not verify_password(profile_in.old_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="舊密碼錯誤。")
        
        # 限制密碼長度
        safe_pwd = profile_in.new_password.strip()[:72]
        current_user.hashed_password = get_password_hash(safe_pwd)
    
    db.commit()
    db.refresh(current_user)
    
    return {"message": "設定已更新", "user": current_user.to_dict()}

@router.get("/validate")
async def validate_token(current_user: User = Depends(get_current_user)):
    """驗證 Token 是否有效並回傳目前使用者資訊"""
    return {
        "status": "success",
        "user": current_user.to_dict()
    }

@router.get("/credits/history")
async def get_credit_history(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    獲取目前使用者的點數異動紀錄
    """
    from app.models.db_models import CreditLog
    
    query = db.query(CreditLog).filter(CreditLog.user_id == current_user.id)
    total = query.count()
    logs = query.order_by(CreditLog.created_at.desc()) \
                .offset((page - 1) * per_page) \
                .limit(per_page) \
                .all()
    
    return {
        "logs": [log.to_dict() for log in logs],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@router.post("/membership/mock-upgrade")
async def mock_upgrade(
    level: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    模擬升級會員等級 (僅供測試階段使用)
    """
    if level not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="無效的會員等級（1-3）。")
    
    current_user.membership_level = level
    # 順便給點補點以便測試
    if level == 2:
        current_user.credits = max(current_user.credits, 500)
    elif level == 3:
        current_user.credits = max(current_user.credits, 2000)
        
    db.commit()
    db.refresh(current_user)
    return {"message": f"已成功模擬升級至 Lv.{level}", "user": current_user.to_dict()}
