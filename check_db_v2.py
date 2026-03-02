import sqlite3
import os

db_path = "seonize.db"
# 同時檢查 backend 目錄
if not os.path.exists(db_path):
    backend_db_path = os.path.join("seonize-backend", "seonize.db")
    if os.path.exists(backend_db_path):
        db_path = backend_db_path
    else:
        print(f"Error: seonize.db not found in root or backend.")
        exit(1)

print(f"Using database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for table in ["kalpa_matrices", "kalpa_nodes"]:
        print(f"\nTable: {table}")
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [c[1] for c in cursor.fetchall()]
        print(f"Columns: {', '.join(cols)}")
        if "cms_config_id" not in cols:
            print("!!! MISSING cms_config_id !!!")

    conn.close()
except Exception as e:
    print(f"Db Error: {e}")
