import sqlite3

def dump_schema():
    conn = sqlite3.connect('seonize.db')
    cur = conn.cursor()
    
    target_tables = [
        'users', 'projects', 'cms_configs', 'prompt_templates', 
        'kalpa_matrices', 'kalpa_nodes', 'credit_logs', 'keyword_cache', 'serp_cache'
    ]
    
    for table in target_tables:
        print(f"\nTABLE_SCHEMA_START:{table}")
        try:
            cur.execute(f"PRAGMA table_info({table});")
            columns = cur.fetchall()
            for col in columns:
                # cid, name, type, notnull, dflt_value, pk
                print(f"COL:{col[1]}|{col[2]}|{col[3]}|{col[5]}")
        except Exception as e:
            print(f"ERROR:{e}")
        print(f"TABLE_SCHEMA_END:{table}")
            
    conn.close()

if __name__ == "__main__":
    dump_schema()
