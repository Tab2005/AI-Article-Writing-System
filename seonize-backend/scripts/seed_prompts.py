import sys
import os

# 將專案根目錄加入路徑 (seonize-backend)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate

def seed_prompts():
    print("🌱 開始初始化指令模板...")
    db = SessionLocal()
    try:
        # 清除現有的系統模板 (user_id 為空)
        db.query(PromptTemplate).filter(PromptTemplate.user_id == None).delete()
        
        # 1. 標題生成模板 (使用 .replace 替換)
        title_prompt = """你是一位資深的 SEO 與 GEO (生成式引擎優化) 專家。你的任務是分析競爭對手標題，並產出 5 個具備高點擊率且極易被 AI 搜尋引擎 (如 ChatGPT, SearchGPT, Gemini) 引用為摘要的標題。

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
- reason: 說明該標題如何利用 GEO 邏輯（如：觸發清單摘要、強化定義摘要等）

---
**變數說明：**
- `{keyword}`: 核心搜尋關鍵字
- `{intent}`: 使用者的搜尋意圖分析
- `{titles}`: 目前搜尋结果前十名的標題清單"""

        # 2. 大綱生成模板 (使用 .format 替換，JSON 大括號需雙倍 {{ }})
        outline_prompt = """你是一位資深的 SEO 內容建築師，擅長運用知識圖譜與語義搜尋技術。
請為核心關鍵字「{keyword}」生成一篇內容深度領先競爭對手、具備極高 GEO (生成式引擎優化) 潛力的文章大綱。

# 背景資訊
- 核心關鍵字：{keyword}
- 搜尋意圖：{intent}
- 推薦延伸詞：{keywords}

# 實時搜尋數據 (極重要)
我們從 Google 實時搜尋中獲取了以下關鍵數據，請將這些內容織入大綱結構：
- **使用者常問問題 (PAA)**：
{paa}
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
}}

---
**變數說明：**
- `{keyword}`: 核心搜尋關鍵字
- `{intent}`: 使用者的搜尋意圖分析
- `{keywords}`: 系統推薦的延伸關鍵字群
- `{paa}`: Google 使用者常問問題 (People Also Asked)
- `{related_searches}`: Google 相關搜尋詞
- `{ai_overview}`: AI 生成的搜尋結果綜述"""

        # 3. 內容寫作模板 (使用 .format 替換)
        writing_prompt = """撰寫文章章節。

文章標題：{h1}
章節標題：{heading}
必須嵌入的關鍵字：{keywords}
前文摘要：{previous_summary}
{research_context}
優化模式指南：{intent}

請以 Markdown 格式撰寫約 {target_word_count} 字的章節內容，並確保關鍵字密度約 {keyword_density}%。
若有研究數據提供，請在文中以自然的方式進行「引述」或「參考」，以增加內容的權威度。

---
**變數說明：**
- `{h1}`: 文章總標題
- `{heading}`: 當前章節標題
- `{keywords}`: 當前章節必須嵌入的關鍵字清單
- `{previous_summary}`: 前一段落的摘要內容 (保持上下文連貫)
- `{research_context}`: 相關的競爭對手或研究參考資料
- `{intent}`: 當前文章的搜尋意圖定向
- `{target_word_count}`: 本節目標字數
- `{keyword_density}`: 推薦的關鍵字密度百分比"""

        # 4. 劫之眼：神諭編織模板
        kalpa_prompt = """{persona_intro}

情感引導：你是一位專注於協助讀者解決問題的專家。
請針對以下矩陣節點撰寫內容：
- 標題：{title}
- 產業背景：{industry}
- 實體 (Subject)：{entity}
- 動作 (Action)：{action}
- 解決痛點 (Pain Point)：{pain_point}
- 推薦內部連結錨點：{selected_anchor}
- 目標 Landing Page：{money_page_url}

你的角色定位：{persona_role}

請撰寫具備高度專業感、解決方案導向的內容。文中必須自然地帶入痛點並提供實際的執行步驟。

---
**變數說明：**
- `{persona_intro}`: AI 人格背景介紹
- `{title}`: 本篇編織文章的標題
- `{industry}`: 所屬產業別
- `{entity}`: 核模受眾或主題實體
- `{action}`: 採取的具體操作或場景
- `{pain_point}`: 針對的用戶痛點
- `{selected_anchor}`: 系統分配的內部連結關鍵字
- `{money_page_url}`: 最終轉化頁面的網址
- `{persona_role}`: AI 具體的角色名稱設定"""

        templates = [
            PromptTemplate(category="title_generation", name="系統預設標題指令", content=title_prompt, is_active=True),
            PromptTemplate(category="outline_generation", name="系統預設大綱指令", content=outline_prompt, is_active=True),
            PromptTemplate(category="content_writing", name="系統預設寫作指令", content=writing_prompt, is_active=True),
            PromptTemplate(category="kalpa_weaving_user", name="神諭編織：用戶內容指令 (預設)", content=kalpa_prompt, is_active=True),
        ]
        
        db.add_all(templates)
        db.commit()
        print("🎉 預設指令模板初始化成功！")
    except Exception as e:
        print(f"❌ 初始化失敗: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_prompts()
