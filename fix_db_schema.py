import sqlite3
import os

db_path = os.path.join("seonize-backend", "seonize.db")
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def ensure_column(table_name, column_name, column_type):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [c[1] for c in cursor.fetchall()]
    if column_name not in columns:
        print(f"Adding {column_name} to {table_name}...")
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        print("Success!")
    else:
        print(f"Column {column_name} already exists in {table_name}")

try:
    ensure_column("kalpa_matrices", "cms_config_id", "VARCHAR(36)")
    ensure_column("kalpa_nodes", "cms_config_id", "VARCHAR(36)")
    conn.commit()
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
