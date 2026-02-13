"""
Seonize Backend - Settings Migration Script
將現有的明文設定值轉換為加密格式
"""

import sys
import os

# 將專案根目錄加入路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.db_models import Settings
from app.core.security import encrypt_value

def migrate():
    db = SessionLocal()
    try:
        # 找出所有包含 api_key, password, login 且標記為需要加密的設定
        settings_to_encrypt = db.query(Settings).filter(
            (Settings.key.like("%api_key%")) | 
            (Settings.key.like("%password%")) |
            (Settings.key.like("%login%"))
        ).all()

        count = 0
        for setting in settings_to_encrypt:
            # 如果還沒有加密過（判定方式：嘗試加密後看是否變動，
            # 或者是根據內容特徵，Fernet 密文通常以 gAAAA... 開頭）
            if setting.value and not setting.value.startswith("gAAAA"):
                print(f"Encrypting {setting.key}...")
                setting.value = encrypt_value(setting.value)
                setting.encrypted = True
                count += 1
        
        db.commit()
        print(f"Successfully migrated {count} settings.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
