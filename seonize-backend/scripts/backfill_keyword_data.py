import asyncio
import os
import sys
import json
from datetime import datetime

# 將專案根目錄加入路徑以便導入 app 模組
# 假設腳本位於 seonize-backend/scripts/
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.append(root_dir)

# 加載環境變數 (手動嘗試加載 .env 文件)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(root_dir, ".env"))
except ImportError:
    pass

from app.core.database import SessionLocal
from app.models.db_models import KeywordCache
from app.services.dataforseo_service import DataForSEOService

async def backfill_keyword_data():
    """
    掃描資料庫中的 KeywordCache 紀錄
    若發現 seed_data 或 suggestions 中缺少 monthly_searches 或 relevance
    則調用 API 進行強制更新
    """
    print("=== Seonize 關鍵字快取數據補全系統 ===")
    print(f"啟動時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    db = SessionLocal()
    try:
        # 1. 取得所有快取紀錄
        caches = db.query(KeywordCache).all()
        to_process = []
        
        for c in caches:
            needs_update = False
            
            # 檢查種子關鍵字數據
            if c.seed_data:
                if "monthly_searches" not in c.seed_data or "relevance" not in c.seed_data:
                    needs_update = True
            
            # 檢查建議清單 (檢查第一筆即可代表該批次是否為舊格式)
            if not needs_update and c.suggestions and len(c.suggestions) > 0:
                first_sug = c.suggestions[0]
                if "monthly_searches" not in first_sug or "relevance" not in first_sug:
                    needs_update = True
            
            if needs_update:
                to_process.append(c)
        
        if not to_process:
            print("✨ 所有快取數據皆已包含最新欄位，無需補全。")
            return

        print(f"📋 發現 {len(to_process)} 筆舊格式數據需要補全。")
        print(f"💰 注意：每筆補全將消耗 $0.002 DataForSEO 額度。預計消耗: ${len(to_process) * 0.002:.4f}")
        
        confirm = input("\n是否開始執行補全？ (y/N): ")
        if confirm.lower() != 'y':
            print("🛑 已由使用者取消。")
            return

        print("\n🚀 開始執行補全任務...")
        
        success_count = 0
        error_count = 0
        
        for i, cache_record in enumerate(to_process):
            keyword = cache_record.keyword
            print(f"[{i+1}/{len(to_process)}] 正在重新同步: {keyword}...", end="", flush=True)
            
            try:
                # 調用 Service 進行強制重新整理
                # 這會重新調用 API、扁平化數據並更新該筆資料庫紀錄
                result = await DataForSEOService.get_keyword_ideas(
                    keyword=keyword,
                    language_code=cache_record.language_code,
                    location_code=cache_record.location_code,
                    db=db,
                    force_refresh=True
                )
                
                if "error" in result and result["error"]:
                    print(f" ❌ 失敗: {result['error']}")
                    error_count += 1
                else:
                    print(" ✅ 成功")
                    success_count += 1
                
                # 稍微延遲避免觸發 API 頻率限制
                await asyncio.sleep(1.2)
                
            except Exception as e:
                print(f" ❌ 異常: {str(e)}")
                error_count += 1

        print("\n" + "="*30)
        print(f"任務完成！")
        print(f"✅ 成功補全: {success_count} 筆")
        print(f"❌ 執行失敗: {error_count} 筆")
        print("="*30)

    except Exception as e:
        print(f"💥 腳本執行發生致命錯誤: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(backfill_keyword_data())
