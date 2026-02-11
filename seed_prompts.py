import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "seonize-backend"))

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate

def seed_templates():
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(PromptTemplate).filter(PromptTemplate.category == "title_generation").first()
        if existing:
            print("Templates already exist. Skipping seed.")
            return

        default_prompt = """你是一位資深的 SEO 與 GEO (生成式引擎優化) 專家。你的任務是分析競爭對手標題，並產出 5 個具備高點擊率且極易被 AI 搜尋引擎 (如 ChatGPT, SearchGPT, Gemini) 引用為摘要的標題。

# 輸入數據
- 目前年份：2026 年
- 核心關鍵字：{keyword}
- 預估搜尋意圖：{intent}
- 競爭對手標題 (SERP Top 10)：
{titles}

# 標題優化策略 (基於 GEO 模板)
請從以下策略中挑選 5 個不同的方向來產出標題：
1. **定義意圖 (Definitional)**：針對「是什麼」的搜尋。格式：「什麼是 [關鍵字]？」或「[關鍵字] 的定義」。
2. **清單意圖 (Listicle)**：強調條列式內容。格式：「[數字] 個 [關鍵字] 推薦清單」、「[數字] 大重點」。
3. **教學意圖 (Procedural)**：針對操作流程。格式：「如何 [達成目標]？」、「[關鍵字] 步驟指南」。
4. **比較意圖 (Comparison)**：協助使用者決策。格式：「[A] vs [B] 完整比較」、「為什麼選擇 [關鍵字]」。
5. **權威/趨勢型 (Authority/Trends)**：強調最新與深度。格式：「2026 [關鍵字] 完整指南」、「深度解析 [關鍵字] 的原理」。

# 任務要求
- 必須自然包含核心關鍵字。
- 標題長度控制在 25-30 個中文字之間。
- 時效性限制：若標題提及年份，必須使用 2026 年。
- 嚴格禁止與現有標題重複。

# 輸出格式
請直接輸出 JSON 陣列，每個物件包含以下欄位：
- title: 建議的標題文字
- strategy: 策略類型
- reason: 說明該標題如何利用 GEO 邏輯
"""
        
        template = PromptTemplate(
            category="title_generation",
            name="系統預設 GEO 策略",
            content=default_prompt,
            is_active=True
        )
        db.add(template)
        db.commit()
        print("Successfully seeded default template.")
    except Exception as e:
        print(f"Error seeding templates: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_templates()
