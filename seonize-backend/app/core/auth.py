"""
Seonize Backend - Authentication Core
JWT 與密碼驗證邏輯
"""

from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

# 密碼雜湊設定 - 使用 pbkdf2_sha256 以獲得更好的環境相容性 (避免 bcrypt 4.0+ 與 passlib 的衝突)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼是否正確"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """將密碼進行雜湊"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """產生 JWT Access Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Any:
    """
    FastAPI 依賴函數：驗證 Token 並獲取資料庫中的使用者物件
    """
    from app.core.database import SessionLocal
    from app.models.db_models import User
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="憑證失效或未登入，請重新登入。",
        headers={"WWW-Authenticate": "Bearer"},
    )
    db = SessionLocal()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise credentials_exception
        
        return user
    except JWTError:
        raise credentials_exception
    except Exception:
        raise credentials_exception
    finally:
        db.close()

async def get_current_admin(current_user: Any = Depends(get_current_user)) -> Any:
    """
    驗證是否具備超級管理員權限
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="權限不足，僅限超級管理員存取。"
        )
    return current_user
