import sqlite3
import json

# 連接資料庫
conn = sqlite3.connect('seonize-backend/seonize.db')
cursor = conn.cursor()

# 查詢最新的 SERP 快取
cursor.execute("""
    SELECT keyword, country, language, results, created_at 
    FROM serp_cache 
    ORDER BY created_at DESC 
    LIMIT 3
""")

rows = cursor.fetchall()

if not rows:
    print("❌ 資料庫中沒有任何 SERP 快取資料!")
else:
    for i, row in enumerate(rows, 1):
        keyword, country, language, results_json, created_at = row
        print(f"\n{'='*60}")
        print(f"快取記錄 #{i}")
        print(f"{'='*60}")
        print(f"關鍵字: {keyword}")
        print(f"國家: {country}")
        print(f"語言: {language}")
        print(f"建立時間: {created_at}")
        
        # 解析 JSON
        try:
            results = json.loads(results_json)
            print(f"資料類型: {type(results).__name__}")
            
            if isinstance(results, dict):
                print(f"字典鍵: {list(results.keys())}")
                
                if 'results' in results:
                    results_list = results['results']
                    print(f"✅ 找到 'results' 鍵, 包含 {len(results_list)} 筆資料")
                    
                    if len(results_list) > 0:
                        first_item = results_list[0]
                        print(f"第一筆資料的鍵: {list(first_item.keys())}")
                        print(f"第一筆標題: {first_item.get('title', '❌ 無標題')}")
                else:
                    print("❌ 沒有 'results' 鍵")
                    
            elif isinstance(results, list):
                print(f"✅ 資料是列表, 包含 {len(results)} 筆")
                if len(results) > 0:
                    print(f"第一筆資料的鍵: {list(results[0].keys())}")
                    print(f"第一筆標題: {results[0].get('title', '❌ 無標題')}")
                    
        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析失敗: {e}")

conn.close()
print(f"\n{'='*60}")
