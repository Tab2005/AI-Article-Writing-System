import sqlite3

def patch_db():
    conn = sqlite3.connect('seonize.db')
    cur = conn.cursor()
    
    patches = [
        "ALTER TABLE projects ADD COLUMN content_gap_report JSON;",
        "ALTER TABLE projects ADD COLUMN images JSON;",
        "ALTER TABLE projects ADD COLUMN quality_report JSON;",
        "ALTER TABLE projects ADD COLUMN last_audit_at DATETIME;",
        "ALTER TABLE kalpa_nodes ADD COLUMN images JSON;",
        "ALTER TABLE keyword_cache ADD COLUMN user_id VARCHAR(36);",
        "ALTER TABLE serp_cache ADD COLUMN content_gap_report JSON;",
        "ALTER TABLE prompt_templates ADD COLUMN description TEXT;"
    ]
    
    for sql in patches:
        try:
            print(f"Executing: {sql}")
            cur.execute(sql)
        except Exception as e:
            print(f"Skipping (likely already exists): {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    patch_db()
