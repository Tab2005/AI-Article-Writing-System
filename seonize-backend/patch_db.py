import os
from sqlalchemy import create_engine, text
from app.core.config import settings

def patch_db():
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(database_url)
    
    patches = [
        "ALTER TABLE projects ADD COLUMN content_gap_report JSONB;",
        "ALTER TABLE projects ADD COLUMN images JSONB;",
        "ALTER TABLE projects ADD COLUMN quality_report JSONB;",
        "ALTER TABLE projects ADD COLUMN last_audit_at TIMESTAMP;",
        "ALTER TABLE kalpa_nodes ADD COLUMN images JSONB;",
        "ALTER TABLE keyword_cache ADD COLUMN user_id VARCHAR(36);",
        "ALTER TABLE serp_cache ADD COLUMN content_gap_report JSONB;",
        "ALTER TABLE prompt_templates ADD COLUMN description TEXT;"
    ]
    
    # SQLite 專屬修正 (不支援 JSONB/TIMESTAMP)
    is_sqlite = database_url.startswith("sqlite")
    
    with engine.connect() as conn:
        for sql in patches:
            final_sql = sql
            if is_sqlite:
                final_sql = final_sql.replace("JSONB", "JSON").replace("TIMESTAMP", "DATETIME")
            
            try:
                print(f"Executing: {final_sql}")
                conn.execute(text(final_sql))
                conn.commit()
            except Exception as e:
                print(f"Skipping: {e}")
        
    print("Database patch execution finished.")

if __name__ == "__main__":
    patch_db()

if __name__ == "__main__":
    patch_db()
