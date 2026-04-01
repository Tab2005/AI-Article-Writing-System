import os
from sqlalchemy import create_engine, text
from app.core.config import settings

def patch_db():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(database_url)
    
    # 增加關鍵表的建立 (防止 Migration 跳過)
    table_creations = [
        """
        CREATE TABLE IF NOT EXISTS credit_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            delta INTEGER NOT NULL,
            balance INTEGER NOT NULL,
            operation VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS cms_configs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36),
            name VARCHAR(100) NOT NULL,
            platform VARCHAR(20) NOT NULL,
            api_url TEXT NOT NULL,
            api_key TEXT,
            username VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            auto_publish_enabled BOOLEAN DEFAULT FALSE,
            frequency_type VARCHAR(20),
            frequency_count INTEGER,
            last_auto_published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS kalpa_matrices (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36),
            project_name VARCHAR(255) NOT NULL,
            industry VARCHAR(100),
            money_page_url TEXT,
            entities JSONB,
            actions JSONB,
            pain_points JSONB,
            anchor_variants JSONB,
            cms_config_id VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    ]
    
    patches = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_level INTEGER DEFAULT 1;",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS content_gap_report JSONB;",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS images JSONB;",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS quality_report JSONB;",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_audit_at TIMESTAMP;",
        "ALTER TABLE kalpa_nodes ADD COLUMN IF NOT EXISTS images JSONB;",
        "ALTER TABLE keyword_cache ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);",
        "ALTER TABLE serp_cache ADD COLUMN IF NOT EXISTS content_gap_report JSONB;",
        "ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS description TEXT;"
    ]
    
    # SQLite 專屬修正 (不支援 JSONB/TIMESTAMP/IF NOT EXISTS for ADD COLUMN)
    is_sqlite = database_url.startswith("sqlite")
    
    with engine.connect() as conn:
        # 1. 創表
        for sql in table_creations:
            final_sql = sql
            if is_sqlite:
                final_sql = final_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                final_sql = final_sql.replace("JSONB", "JSON").replace("TIMESTAMP", "DATETIME")
            
            try:
                print(f"Checking table creation...")
                conn.execute(text(final_sql))
                conn.commit()
            except Exception as e:
                print(f"Table Creation Error: {e}")

        # 2. 補欄位
        for sql in patches:
            final_sql = sql
            if is_sqlite:
                # SQLite ALTER TABLE ADD COLUMN 不支援 IF NOT EXISTS
                final_sql = final_sql.replace("IF NOT EXISTS ", "")
                final_sql = final_sql.replace("JSONB", "JSON").replace("TIMESTAMP", "DATETIME")
            
            try:
                print(f"Executing: {final_sql}")
                conn.execute(text(final_sql))
                conn.commit()
            except Exception as e:
                print(f"Skipping: {e} (might already exist)")
        
    print("Database full patch execution finished.")

if __name__ == "__main__":
    patch_db()
