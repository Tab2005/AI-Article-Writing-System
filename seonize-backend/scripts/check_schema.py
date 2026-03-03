import sqlite3
import os

db_path = r"d:\users\Qoo\Documents\python\AI-Article-Writing-System\seonize-backend\seonize.db"
print(f"Checking database at: {db_path}")

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 檢查表格列表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {[t[0] for t in tables]}")
        
        if ("prompt_templates",) in tables:
            cursor.execute("PRAGMA table_info(prompt_templates)")
            columns = cursor.fetchall()
            print("Columns in prompt_templates:")
            for col in columns:
                print(col)
            
            cursor.execute("SELECT COUNT(*) FROM prompt_templates")
            count = cursor.fetchone()[0]
            print(f"Total rows in prompt_templates: {count}")
        else:
            print("Table 'prompt_templates' NOT FOUND.")
        
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")
else:
    print(f"Database {db_path} NOT FOUND.")
