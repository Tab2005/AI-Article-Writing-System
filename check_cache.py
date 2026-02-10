import sys
sys.path.insert(0, 'seonize-backend')

from app.core.database import SessionLocal
from app.models.db_models import SerpCache
import json

db = SessionLocal()
try:
    cache = db.query(SerpCache).order_by(SerpCache.created_at.desc()).first()
    
    if not cache:
        print("No cache found!")
    else:
        print(f"Keyword: {cache.keyword}")
        print(f"Results type: {type(cache.results)}")
        
        if isinstance(cache.results, dict):
            print(f"Dict keys: {list(cache.results.keys())}")
            if 'results' in cache.results:
                results_list = cache.results['results']
                print(f"Results list length: {len(results_list)}")
                if len(results_list) > 0:
                    print(f"First result keys: {list(results_list[0].keys())}")
                    print(f"First title: {results_list[0].get('title', 'NO TITLE')}")
        elif isinstance(cache.results, list):
            print(f"List length: {len(cache.results)}")
            if len(cache.results) > 0:
                print(f"First item keys: {list(cache.results[0].keys())}")
                print(f"First title: {cache.results[0].get('title', 'NO TITLE')}")
finally:
    db.close()
