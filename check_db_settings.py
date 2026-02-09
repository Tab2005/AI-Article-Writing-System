
import sqlite3
import os

db_path = r"d:\users\Qoo\Documents\python\AI-Article-Writing-System\seonize-backend\seonize.db"

def check_settings():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    print("--- Database Settings ---")
    try:
        cur.execute("SELECT key, value FROM settings WHERE key LIKE '%dataforseo%'")
        rows = cur.fetchall()
        for key, value in rows:
            # Mask the value for security but show if it's there
            masked = value[:2] + "*" * (len(value) - 4) + value[-2:] if (value and len(value) > 4) else "ERROR/SHORT"
            print(f"{key}: {masked} (Len: {len(value) if value else 0})")
            
        cur.execute("SELECT key, value FROM settings WHERE key = 'serp_provider'")
        provider = cur.fetchone()
        print(f"serp_provider: {provider[1] if provider else 'NOT SET'}")
    except Exception as e:
        print(f"Error reading settings: {e}")
    
    conn.close()

if __name__ == "__main__":
    check_settings()
