from app.core.database import SessionLocal
from app.models.db_models import Settings
import sqlite3
import os

def verify():
    # 1. 直接從 SQLite 讀取原始資料（驗證是否已變密文）
    db_path = "seonize.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value, encrypted FROM settings WHERE key='ai_api_key'")
    row = cursor.fetchone()
    if row:
        print(f"Database Raw Value: {row[1][:20]}... (Encrypted: {bool(row[2])})")
        if not row[1].startswith("gAAAA"):
             print("❌ ERROR: Value is NOT encrypted in database!")
        else:
             print("✅ Success: Value IS encrypted in database.")
    conn.close()

    # 2. 透過 ORM 讀取（驗證自動解密是否正常）
    db = SessionLocal()
    try:
        val = Settings.get_value(db, "ai_api_key")
        if val and not val.startswith("gAAAA"):
            print(f"ORM Decrypted Value: {val[:4]}****{val[-4:] if len(val)>8 else ''}")
            print("✅ Success: ORM correctly decrypted the value.")
        else:
            print("❌ ERROR: ORM failed to decrypt the value!")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
