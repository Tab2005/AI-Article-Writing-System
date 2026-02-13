"""
Seonize Backend - Security Utilities
提供密碼雜湊與值加密功能
"""

from cryptography.fernet import Fernet
from app.core.config import settings
import base64
import logging

logger = logging.getLogger(__name__)

# 初始化 Fernet 加密器
# 注意：SECRET_KEY 必需是 32 位元 Base64 字串才能作為 Fernet 金鑰
# 我們自定義一個轉換函數，確保任何 SECRET_KEY 都能轉為有效金鑰
def get_fernet_key(secret: str) -> bytes:
    """將任意字串轉為 32 位元 Base64 格式的 Fernet 金鑰"""
    # 使用 SHA-256 雜湊函數生成金鑰，提升安全性
    import hashlib
    key_32 = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key_32)

try:
    _fernet = Fernet(get_fernet_key(settings.SECRET_KEY))
except Exception as e:
    logger.error(f"Failed to initialize Fernet: {e}")
    _fernet = None

def encrypt_value(value: str) -> str:
    """加密字串"""
    if not value or _fernet is None:
        return value
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(token: str) -> str:
    """解密字串，若失敗（如非密文）則回傳原值"""
    if not token or _fernet is None:
        return token
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        # 如果不是有效的密文，可能還是舊的明文，直接回傳
        return token
