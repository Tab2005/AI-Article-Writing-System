import sys
import os

# 將專案路徑加入 sys.path 以便導入 app 模組
sys.path.append(os.getcwd())

try:
    from app.core.database import SessionLocal
    from app.models.db_models import Settings
    
    db = SessionLocal()
    try:
        # 強制將資料庫中的現有設定改為 zeabur
        print("Cleaning up AI settings in database...")
        Settings.set_value(db, 'ai_provider', 'zeabur')
        Settings.set_value(db, 'ai_model', 'gpt-4o-mini')
        db.commit()
        print("✅ Database AI Settings reset to Zeabur AI Hub.")
    except Exception as e:
        print(f"❌ Error during DB update: {e}")
    finally:
        db.close()
except Exception as e:
    print(f"❌ Critical error: {e}")
    print("Please make sure you are running this from the seonize-backend directory.")
