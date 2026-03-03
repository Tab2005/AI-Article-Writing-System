"""
Seonize Backend - Data Migration Script (SQLite to PostgreSQL)
用於將本地開發數據遷移至雲端生產環境。
"""

import os
import sys
from sqlalchemy import create_engine, MetaData, Table, select
from sqlalchemy.orm import sessionmaker

# ── 設定 ──────────────────────────────────────────────────────
# 來源 (本地 SQLite)
SQLITE_DB_PATH = "sqlite:///./seonize.db"
# 目標 (由環境變數提供，例如 postgresql://user:pass@host:port/db)
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or not POSTGRES_URL.startswith("postgresql"):
    print("❌ 錯誤: 請設定環境變數 DATABASE_URL 指向有效的 PostgreSQL 連線字串。")
    print("例如: $env:DATABASE_URL=\"postgresql://user:pass@host:port/db\"")
    sys.exit(1)

# ── 建立連線 ──────────────────────────────────────────────────
sqlite_engine = create_engine(SQLITE_DB_PATH)
pg_engine = create_engine(POSTGRES_URL)

sqlite_meta = MetaData()
sqlite_meta.reflect(bind=sqlite_engine)

pg_meta = MetaData()
pg_meta.reflect(bind=pg_engine)

# ── 遷移過程 ──────────────────────────────────────────────────
def migrate_data():
    print(f"🚀 開始遷移數據...")
    print(f"源端: {SQLITE_DB_PATH}")
    print(f"目標: {POSTGRES_URL.split('@')[-1]}")

    # 需要遷移的資料表清單 (按依賴順序)
    tables_to_migrate = [
        "users",
        "projects",
        "settings",
        "serp_cache",
        "keyword_cache",
        "competitive_cache",
        "prompt_templates",
        "cms_configs",
        "kalpa_matrices",
        "kalpa_nodes",
        "credit_logs"
    ]

    for table_name in tables_to_migrate:
        if table_name not in sqlite_meta.tables:
            print(f"⚠️ 跳過 {table_name}: 本地資料庫尚無此表。")
            continue
            
        print(f"📦 正在遷移 {table_name}...")
        
        # 讀取來源數據
        source_table = Table(table_name, sqlite_meta, autoload_with=sqlite_engine)
        with sqlite_engine.connect() as conn:
            data = conn.execute(select(source_table)).fetchall()
        
        if not data:
            print(f"   (此表無數據，略過)")
            continue

        # 寫入目標數據
        dest_table = Table(table_name, pg_meta, autoload_with=pg_engine)
        
        # 準備數據字典列表
        rows = [dict(row._mapping) for row in data]
        
        with pg_engine.connect() as conn:
            # 先清除舊數據 (選用，為了測試安全這裡先不做 delete)
            # conn.execute(dest_table.delete())
            
            # 使用 insert 寫入
            conn.execute(dest_table.insert(), rows)
            conn.commit()
            
        print(f"✅ 已遷移 {len(rows)} 筆紀錄到 {table_name}")

    print("\n🎉 遷移完成！")
    print("請確保雲端後端服務已啟動並連線至該資料庫。")

if __name__ == "__main__":
    # 先在目標資料庫建立 Schema (如果尚未建立)
    print("🛠️ 正在目標資料庫建立 Schema...")
    # 這裡借用 app.core.database 的 init_db 邏輯
    sys.path.append(os.path.dirname(__file__))
    try:
        from app.core.database import Base, engine
        # 確保 MetaData 被正確載入
        from app.models.db_models import (
            User, Project, Settings, SerpCache, KeywordCache, 
            CompetitiveCache, PromptTemplate, CMSConfig, 
            KalpaMatrix, KalpaNode, CreditLog
        )
        Base.metadata.create_all(bind=pg_engine)
        print("✅ Schema 建立成功。")
    except Exception as e:
        print(f"❌ 建立 Schema 失敗: {e}")
        # 即使失敗也嘗試繼續遷移 (如果表已存在)

    migrate_data()
