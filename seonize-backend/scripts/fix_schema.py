import sqlite3
import os

db_path = r"d:\users\Qoo\Documents\python\AI-Article-Writing-System\seonize-backend\seonize.db"

def fix_schema():
    print(f"Opening database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 檢查現有欄位
    cursor.execute("PRAGMA table_info(prompt_templates)")
    existing_cols = [col[1] for col in cursor.fetchall()]
    print(f"Existing columns: {existing_cols}")
    
    # 需要新增的欄位
    required_cols = {
        "user_id": "TEXT",
        "is_active": "BOOLEAN DEFAULT 0",
        "updated_at": "DATETIME"
    }
    
    for col, col_type in required_cols.items():
        if col not in existing_cols:
            print(f"Adding missing column: {col}")
            try:
                cursor.execute(f"ALTER TABLE prompt_templates ADD COLUMN {col} {col_type}")
                print(f"Column {col} added successfully.")
            except Exception as e:
                print(f"Error adding column {col}: {e}")
        else:
            print(f"Column {col} already exists.")
            
    conn.commit()
    conn.close()
    print("Schema fix complete.")

if __name__ == "__main__":
    fix_schema()
