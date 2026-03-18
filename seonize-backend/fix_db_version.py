import sqlite3
import os

db_path = "seonize.db"
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT version_num FROM alembic_version")
    row = cursor.fetchone()
    print(f"Current version in DB: {row[0] if row else 'None'}")
    
    # Update to latest known version from migratory files
    target_version = '6a7b8c9d0e1f'
    if row:
        cursor.execute("UPDATE alembic_version SET version_num = ?", (target_version,))
    else:
        cursor.execute("INSERT INTO alembic_version (version_num) VALUES (?)", (target_version,))
        
    conn.commit()
    print(f"Successfully stamped database to: {target_version}")
except Exception as e:
    print(f"Error updating database: {e}")
finally:
    conn.close()
