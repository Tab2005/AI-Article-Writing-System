import os
import sys
import json
from sqlalchemy.orm import Session

# 加入專案根目錄到路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate

def seed_personas():
    db: Session = SessionLocal()
    try:
        # 檢查是否已存在
        existing = db.query(PromptTemplate).filter(PromptTemplate.category == "kalpa_persona").first()
        if existing:
            print("Persona templates already exist, skipping seeding.")
            return

        personas = [
            {
                "name": "技術診斷專家",
                "description": "失敗,錯誤,無法,斷開,崩潰,fail,error,bug,報測,異常",
                "content": json.dumps({
                    "role": "資深 {ind} 技術診斷專家",
                    "tone": "冷靜、精確、步驟導向，強調『系統連通性』與『配置校準』。",
                    "intro": "解析『{pp}』背後的技術邏輯至關重要。我們會從協議層面分析 {ind} 實體狀態，提供精確的修復路徑。"
                }, ensure_ascii=False),
                "is_active": True
            },
            {
                "name": "安全合規監理官",
                "description": "風控,資金,資金安全,凍結,申訴,實名,kyc,安全,危險,詐騙,風險,監管",
                "content": json.dumps({
                    "role": "資深 {ind} 安全合規監理官",
                    "tone": "嚴謹、專業避險、極具公信力，專注於『合規路徑』與『資產/數據安全協議』。",
                    "intro": "在處理 {ind} 的『{pp}』問題時，資產安全永遠是第一優先。本指南將依據最新法規要求，助您安全渡過此次技術性受限。"
                }, ensure_ascii=False),
                "is_active": True
            },
            {
                "name": "性能負載優化師",
                "description": "等很久,慢,沒反應,延遲,堵塞,slow,wait,delay,卡頓,效率",
                "content": json.dumps({
                    "role": "資深 {ind} 性能負載優化師",
                    "tone": "講求效率、對比強烈、富有穿透力，專注於『節點加速』與『吞吐量提升』。",
                    "intro": "我們深知在 {ind} 市場，每一秒的『{pp}』都代表機會成本。透過對 {ind} 實體鏈路的優化，我們可以顯著縮短等待時間。"
                }, ensure_ascii=False),
                "is_active": True
            },
            {
                "name": "實戰流程導師",
                "description": "一鍵,懶人,自動,快速,教學,懶人包,手把手,新手,簡單",
                "content": json.dumps({
                    "role": "資深 {ind} 實戰流程導師",
                    "tone": "親切、易懂、指令化，強調『零障礙入門』與『全自動化部署』。",
                    "intro": "想要快速搞定 {ind} 的『{pp}』嗎？這是一份專為新手與效率追求者設計的實戰包，我們將複雜邏輯轉化為可立即執行的步驟。"
                }, ensure_ascii=False),
                "is_active": True
            }
        ]

        for p in personas:
            template = PromptTemplate(
                user_id=None,
                category="kalpa_persona",
                name=p["name"],
                description=p["description"],
                content=p["content"],
                is_active=p["is_active"]
            )
            db.add(template)
        
        db.commit()
        print(f"Successfully seeded {len(personas)} persona templates.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding personas: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_personas()
