import sqlite3
import os

def migrate():
    db_path = 'seonize.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. 建立 cms_configs 表 (如果不存在)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cms_configs (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        platform VARCHAR(20) NOT NULL,
        api_url TEXT NOT NULL,
        api_key TEXT,
        username VARCHAR(100),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME,
        updated_at DATETIME
    )
    ''')
    print("Checked/Created table: cms_configs")

    # 2. 為 projects 表增加欄位
    project_columns = [
        ('cms_config_id', 'VARCHAR(36)'),
        ('cms_post_id', 'VARCHAR(100)'),
        ('publish_status', 'VARCHAR(20) DEFAULT "draft"'),
        ('cms_publish_url', 'TEXT'),
        ('scheduled_at', 'DATETIME'),
        ('published_at', 'DATETIME')
    ]

    for col_name, col_type in project_columns:
        try:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to projects")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists in projects")

    # 3. 為 kalpa_nodes 表增加欄位
    node_columns = [
        ('cms_config_id', 'VARCHAR(36)'),
        ('cms_post_id', 'VARCHAR(100)'),
        ('publish_status', 'VARCHAR(20) DEFAULT "draft"'),
        ('cms_publish_url', 'TEXT'),
        ('scheduled_at', 'DATETIME'),
        ('published_at', 'DATETIME')
    ]

    for col_name, col_type in node_columns:
        try:
            cursor.execute(f"ALTER TABLE kalpa_nodes ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to kalpa_nodes")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists in kalpa_nodes")

    # 4. 為 kalpa_matrices 表增加欄位
    matrix_columns = [
        ('cms_config_id', 'VARCHAR(36)')
    ]

    for col_name, col_type in matrix_columns:
        try:
            cursor.execute(f"ALTER TABLE kalpa_matrices ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to kalpa_matrices")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists in kalpa_matrices")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
