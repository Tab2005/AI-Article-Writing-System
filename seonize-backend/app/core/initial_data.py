"""
Seonize Backend - Initial Data Seeding
用於初始化資料庫的預設數據
"""
import logging
from sqlalchemy.orm import Session
from app.models.db_models import PromptTemplate

logger = logging.getLogger(__name__)

# 預設指令模板清單
DEFAULT_PROMPT_TEMPLATES = [
    {
        "category": "title_generation",
        "name": "GEO 權威標題生成器 (預設)",
        "is_active": True,
        "content": """你是一位資深的 SEO 與 GEO (生成式引擎優化) 專家。你的任務是分析競爭對手標題，並產出 5 個具備高點擊率且極易被 AI 搜尋引擎 (如 ChatGPT, SearchGPT, Gemini) 引用為摘要的標題。

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
- **時效性限制：若標題提及年份，必須使用 2026 年，嚴格禁止出現 2024 或 2025。**
- 嚴格禁止與現有標題重複。
- 每個標題必須標註其對應的策略類型。

# 輸出格式
請直接輸出 JSON 陣列，每個物件包含以下欄位：
- title: 建議的標題文字
- strategy: 策略類型 (請使用：定義型、清單型、教學型、比較型、趨勢型)
- reason: 說明該標題如何利用 GEO 邏輯（如：觸發清單摘要、強化定義摘要等）"""
    },
    {
        "category": "outline_generation",
        "name": "語義大綱架構師 (預設)",
        "is_active": True,
        "content": """你是一位資深的 SEO 內容建築師，擅長運用知識圖譜與語義搜尋技術。
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
{
    "h1": "吸引人的 GEO 優化標題",
    "sections": [
        {
            "heading": "章節標題文字",
            "level": 2,
            "description": "該章節的撰寫重點 (30 字內)",
            "keywords": ["推薦關鍵字1", "推薦關鍵字2"]
        }
    ]
}"""
    },
    {
        "category": "content_writing",
        "name": "高品質 SEO 寫手 (預設)",
        "is_active": True,
        "content": """撰寫文章章節。

文章標題：{h1}
章節標題：{heading}
必須嵌入的關鍵字：{keywords}
前文摘要：{previous_summary}

相關研究數據與參考資料：
{research_context}

優化模式指南：{intent} (seo: 密度優化, aeo: 問答格式, geo: 權威引用)

請以 Markdown 格式撰寫約 {target_word_count} 字的章節內容，並確保關鍵字密度約 {keyword_density}%。
若有研究數據提供，請在文中以自然的方式進行「引述」或「參考」，以增加內容的權威度。"""
    }
]

def initialize_default_prompts(db: Session):
    """初始化系統預設指令模板"""
    try:
        # 檢查系統模板是否已存在 (user_id is None)
        existing_count = db.query(PromptTemplate).filter(PromptTemplate.user_id == None).count()
        if existing_count >= len(DEFAULT_PROMPT_TEMPLATES):
            # logger.info("System default prompt templates already exist.")
            return

        for p_data in DEFAULT_PROMPT_TEMPLATES:
            # 檢查特定類別的系統模板是否存在
            exists = db.query(PromptTemplate).filter(
                PromptTemplate.category == p_data["category"],
                PromptTemplate.user_id == None
            ).first()
            
            if not exists:
                new_template = PromptTemplate(
                    category=p_data["category"],
                    name=p_data["name"],
                    content=p_data["content"],
                    is_active=p_data["is_active"],
                    user_id=None
                )
                db.add(new_template)
                logger.info(f"Initialized system prompt template: {p_data['name']}")
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to initialize default prompts: {e}")
