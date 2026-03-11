import sys
import os

# 將專案根目錄加入路徑 (seonize-backend)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate
from app.core.initial_data import DEFAULT_PROMPT_TEMPLATES

def update_system_prompts():
    print("🔄 開始同步系統指令模板...")
    db = SessionLocal()
    try:
        updated_count = 0
        for p_data in DEFAULT_PROMPT_TEMPLATES:
            # 找到系統預設模板 (user_id 為空)
            template = db.query(PromptTemplate).filter(
                PromptTemplate.category == p_data["category"],
                PromptTemplate.user_id == None
            ).first()
            
            if template:
                # 更新內容
                if template.content != p_data["content"]:
                    template.content = p_data["content"]
                    template.name = p_data["name"]
                    print(f"✅ 已更新模板: {p_data['name']}")
                    updated_count += 1
            else:
                # 建立遺漏的系統模板
                new_template = PromptTemplate(
                    category=p_data["category"],
                    name=p_data["name"],
                    content=p_data["content"],
                    is_active=p_data["is_active"],
                    user_id=None
                )
                db.add(new_template)
                print(f"🆕 已建立遺漏模板: {p_data['name']}")
                updated_count += 1
        
        db.commit()
        print(f"🎉 同步完成！共變動 {updated_count} 個模板。")
    except Exception as e:
        print(f"❌ 更新失敗: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_system_prompts()
