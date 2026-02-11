import os
import sys

# 將 seonize-backend 加入路徑以利匯入 app
sys.path.append(os.path.join(os.getcwd(), "seonize-backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Base, Project, Settings, PromptTemplate, SerpCache, KeywordCache

# 1. 配置資料庫 URL
# 本地 SQLite
SQLITE_URL = "sqlite:///./seonize.db"
# 遠端或本地 PostgreSQL (請根據 Zeabur 提供的值更改)
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL:
    print("錯誤：請設置環境變數 DATABASE_URL以指向您的 PostgreSQL。")
    sys.exit(1)

def migrate():
    print(f"正在從 {SQLITE_URL} 遷移數據至 {POSTGRES_URL.split('@')[-1]}...")
    
    # 建立引擎與 Session
    src_engine = create_engine(SQLITE_URL)
    dst_engine = create_engine(POSTGRES_URL)
    
    SrcSession = sessionmaker(bind=src_engine)
    DstSession = sessionmaker(bind=dst_engine)
    
    src_db = SrcSession()
    dst_db = DstSession()
    
    # 2. 在目標資料庫建立表格
    Base.metadata.create_all(bind=dst_engine)
    print("目標資料庫表格已建立。")

    # 3. 定義遷移順序 (考慮外鍵依賴)
    models = [Settings, PromptTemplate, Project, SerpCache, KeywordCache]
    
    try:
        for model in models:
            print(f"正在遷移 {model.__name__}...")
            # 取得原始數據
            items = src_db.query(model).all()
            if not items:
                print(f"  {model.__name__} 無數據，略過。")
                continue
            
            # 寫入目標資料庫
            for item in items:
                # 使用 make_transient 來斷開與 src_session 的關聯並將其標記為新對象
                src_db.expunge(item)
                dst_db.add(item)
            
            dst_db.commit()
            print(f"  成功遷移 {len(items)} 筆 {model.__name__} 數據。")
            
    except Exception as e:
        print(f"遷移過程中發生錯誤: {e}")
        dst_db.rollback()
    finally:
        src_db.close()
        dst_db.close()
        print("遷移任務結束。")

if __name__ == "__main__":
    migrate()
