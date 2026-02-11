"""
種子腳本：建立「大綱生成」指令模板
用途：將大綱生成的 Prompt 從 ai_service.py 抽離至資料庫管理
"""

import sys
import os

# 確保能正確導入 app 模組
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate

def seed_outline_prompt():
    db = SessionLocal()
    try:
        # 檢查是否已存在
        existing = db.query(PromptTemplate).filter(
            PromptTemplate.category == "outline_generation",
            PromptTemplate.name == "SEO 大綱生成 (GEO 優化)"
        ).first()
        
        if existing:
            print("已存在「SEO 大綱生成」指令模板，跳過建立")
            return
        
        # 建立新的指令模板
        outline_prompt = PromptTemplate(
            category="outline_generation",
            name="SEO 大綱生成 (GEO 優化)",
            content="""你是一位資深的 SEO 內容建築師，擅長運用知識圖譜與語義搜尋技術。
請為核心關鍵字「{keyword}」生成一篇內容深度領先競爭對手、具備極高 GEO (生成式引擎優化) 潛力的文章大綱。

# 背景資訊
- 核心關鍵字：{keyword}
- 搜尋意圖：{intent}
- 推薦延伸詞：{keywords}

# 實時搜尋數據 (極重要)
我們從 Google 實時搜尋中獲取了以下關鍵數據，請將這些內容織入大綱結構：
- **使用者常問問題 (PAA)**：{paa}
- **相關搜尋詞**：{related_searches}
- **AI 總結特徵**：{ai_overview}

# 大綱生成規則
1. **問題驅動**：請優先將上述 PAA 問題轉化為適當的 H2 或 H3 標題，這對於獲得 AI 搜尋引擎的引用至關重要。
2. **語義覆蓋**：利用相關搜尋詞來細分章節，確保覆蓋該關鍵字的完整知識場景。
3. **結構邏輯**：大綱需包含 H1 (標題) 與多個 H2/H3。
4. **輸出格式**：必須輸出純 JSON 物件。

# 輸出 JSON 結構
{{
    "h1": "吸引人的 GEO 優化標題",
    "sections": [
        {{
            "heading": "章節標題文字",
            "level": 2,
            "description": "該章節的撰寫重點 (30 字內)",
            "keywords": ["推薦關鍵字1", "推薦關鍵字2"]
        }}
    ]
}}""",
            is_active=True
        )
        
        db.add(outline_prompt)
        db.commit()
        print("✅ 成功建立「SEO 大綱生成」指令模板")
        
    except Exception as e:
        print(f"❌ 建立失敗: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_outline_prompt()
