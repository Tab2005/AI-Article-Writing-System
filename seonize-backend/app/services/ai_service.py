"""
Seonize Backend - AI Service
統一 AI 服務介面，支援 Gemini 和 Zeabur AI Hub
"""

import os
from typing import Optional, Generator, AsyncGenerator, List, Dict, Any
from enum import Enum
from pydantic import BaseModel
from app.core.config import settings


class AIProvider(str, Enum):
    ZEABUR = "zeabur"


from app.services.zeabur_client import ZEABUR_FALLBACK_MODELS


class AIConfig(BaseModel):
    provider: AIProvider = AIProvider.ZEABUR
    api_key: str = ""
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 4096


class AIService:
    """統一 AI 服務類別"""
    
    _config: Optional[AIConfig] = None
    
    @classmethod
    def get_config(cls) -> AIConfig:
        """取得目前設定 - 優先從資料庫讀取,其次從環境變數"""
        if cls._config is None:
            # 嘗試從資料庫載入設定
            try:
                from app.core.database import SessionLocal
                from app.models.db_models import Settings
                
                db = SessionLocal()
                try:
                    provider = Settings.get_value(db, "ai_provider", None)
                    api_key = Settings.get_value(db, "ai_api_key", None)
                    model = Settings.get_value(db, "ai_model", None)
                    
                    # 如果資料庫中有設定,使用資料庫設定
                    if provider and api_key:
                        cls._config = AIConfig(
                            provider=AIProvider(provider),
                            api_key=api_key,
                            model=model or "gemini-2.0-flash",
                        )
                        return cls._config
                finally:
                    db.close()
            except Exception as e:
                # 如果資料庫讀取失敗,記錄錯誤但繼續使用環境變數
                import logging
                logging.warning(f"Failed to load AI config from database: {e}")
            
            # 從環境變數載入預設設定
            cls._config = AIConfig(
                provider=AIProvider(os.getenv("AI_PROVIDER", settings.AI_PROVIDER)),
                api_key=os.getenv("ZEABUR_AI_API_KEY", settings.ZEABUR_AI_API_KEY) or os.getenv("GEMINI_API_KEY", ""),
                model=os.getenv("AI_MODEL", settings.AI_MODEL),
            )
        return cls._config
    
    @classmethod
    def set_config(cls, config: AIConfig):
        """設定 AI 配置"""
        cls._config = config
    
    @classmethod
    def get_available_providers(cls) -> list[dict]:
        """取得可用的 AI 提供者 (由 zeabur_client 提供模型列表)"""
        return [
            {
                "id": AIProvider.ZEABUR,
                "name": "Zeabur AI Hub",
                "models": ZEABUR_FALLBACK_MODELS,
                "description": "Zeabur 提供的 AI 閘道服務 (支援多種先進模型)"
            }
        ]
    
    @classmethod
    async def test_connection(cls, api_key: str, provider: str, model: str = "gpt-4o-mini") -> dict:
        """測試 AI 連線"""
        try:
            if provider == AIProvider.ZEABUR:
                from app.services.zeabur_client import ZeaburClient
                client = ZeaburClient(api_key)
                # 簡單生成測試
                await client.generate("Hello", model=model or "gpt-4o-mini", max_tokens=5)
                return {"success": True, "provider": provider, "message": "Zeabur AI Hub 連線成功"}
            else:
                return {"success": False, "provider": provider, "message": "不支援的提供者"}
        except Exception as e:
            return {"success": False, "provider": provider, "message": str(e)}
    
    @classmethod
    async def generate_content(
        cls,
        prompt: str,
        system_prompt: str = None,
        temperature: float = None,
        max_tokens: int = None,
    ) -> str:
        """生成內容"""
        config = cls.get_config()
        
        if config.provider == AIProvider.ZEABUR:
            from app.services.zeabur_client import ZeaburClient
            client = ZeaburClient(config.api_key)
            return await client.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                model=config.model,
                temperature=temperature or config.temperature,
                max_tokens=max_tokens or config.max_tokens,
            )
        else:
            raise NotImplementedError(f"Provider {config.provider} not implemented")
    
    @classmethod
    async def generate_content_stream(
        cls,
        prompt: str,
        system_prompt: str = None,
    ) -> AsyncGenerator[str, None]:
        """串流生成內容"""
        config = cls.get_config()
        
        if config.provider == AIProvider.GEMINI:
            from app.services.gemini_client import GeminiClient
            client = GeminiClient(config.api_key)
            async for chunk in client.generate_stream(
                prompt=prompt,
                system_prompt=system_prompt,
                model=config.model,
            ):
                yield chunk
        else:
            raise NotImplementedError(f"Provider {config.provider} not implemented")
    
    @classmethod
    async def analyze_search_intent(cls, keyword: str, titles: list[str]) -> dict:
        """分析搜尋意圖與初步內容缺口"""
        prompt = f"""你是一位資深的 SEO 策略分析師。請分析以下搜尋關鍵字和 SERP 標題，判斷搜尋意圖並找出初步的內容缺口。

關鍵字：{keyword}

SERP 標題：
{chr(10).join(f'- {t}' for t in titles[:10])}

請以 JSON 格式回覆，包含：
- intent: "informational" | "commercial" | "navigational" | "transactional"
- confidence: 0-1 的信心度
- signals: 判斷依據的信號列表
- suggested_style: 建議的寫作風格
- quick_content_gaps: [列出 3 個競爭對手標題中未提及但使用者可能感興趣的細分切入點]
"""
        
        try:
            result = await cls.generate_content(prompt)
            import json, re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"intent": "informational", "confidence": 0.5, "signals": [], "suggested_style": "專業教育風", "quick_content_gaps": []}
        except Exception as e:
            return {"intent": "informational", "confidence": 0.5, "signals": [str(e)], "suggested_style": "專業教育風", "quick_content_gaps": []}
    
    @classmethod
    async def generate_outline(cls, keyword: str, intent: str, keywords: list[str], research_data: dict = None, custom_prompt: str = None, content_gap_report: dict = None, selected_title: str = None) -> dict:
        """基於語義數據生成 AI 驅動的文章大綱（支援自訂 Prompt 與內容缺口建議）"""
        
        gap_info = ""
        is_dict = isinstance(research_data, dict)
        paa = research_data.get("paa", []) if is_dict else []
        related = research_data.get("related_searches", []) if is_dict else []
        ai_overview = research_data.get("ai_overview", {}) if is_dict else {}
        
        gap_info = ""
        
        if selected_title:
            gap_info += f"\n- **使用者指定標題**：{selected_title}\n"

        # 內容缺口資訊注入
        if content_gap_report and isinstance(content_gap_report, dict):
            gap_info += f"""
# 內容缺口與 E-E-A-T 策略建議 (參考)
- **對手忽略的缺口**：{', '.join(content_gap_report.get('content_gaps', [])) or '無'}
- **獨特切入視角**：{content_gap_report.get('unique_angle', '無')}
- **E-E-A-T 執行策略**：{', '.join(content_gap_report.get('eeat_strategies', [])) or content_gap_report.get('eeat_strategy', '無')}

請務必在標題或章節中，針對上述「對手忽略的缺口」進行補強。
"""

        # 如果有提供自訂 Prompt，使用它；否則使用預設
        if custom_prompt:
            prompt = custom_prompt.replace("{keyword}", keyword)\
                                 .replace("{intent}", intent)\
                                 .replace("{keywords}", ', '.join(keywords))\
                                 .replace("{paa}", chr(10).join(f'  - {p}' for p in paa[:5]) if paa else '無')\
                                 .replace("{related_searches}", ', '.join(related[:8]) if related else '無')\
                                 .replace("{ai_overview}", ai_overview.get('description') or ai_overview.get('snippet') or '無' if isinstance(ai_overview, dict) else '無')
            
            # 支援手動標籤 {content_gap}
            if "{content_gap}" in prompt:
                prompt = prompt.replace("{content_gap}", gap_info)
            else:
                # 若無標籤則附在背景資訊後，保持向下相容
                prompt = prompt.replace("# 背景資訊", f"{gap_info}\n# 背景資訊")
        else:
            # 預設提示詞（保持向後兼容）
            prompt = f"""你是一位資深的 SEO 內容建築師，擅長運用知識圖譜與語義搜尋技術。
請為核心關鍵字「{keyword}」生成一篇內容深度領先競爭對手、具備極高 GEO (生成式引擎優化) 潛力的文章大綱。

{gap_info}

# 背景資訊
- 核心關鍵字：{keyword}
- 搜尋意圖：{intent}
- 推薦延伸詞：{', '.join(keywords)}

# 實時搜尋數據 (極重要)
我們從 Google 實時搜尋中獲取了以下關鍵數據，請將這些內容織入大綱結構：
- **使用者常問問題 (PAA)**：{chr(10).join(f'  - {p}' for p in paa[:5]) if paa else '無'}
- **相關搜尋詞**：{', '.join(related[:8]) if related else '無'}
- **AI 總結特徵**：{ai_overview.get('description') or ai_overview.get('snippet') or '無' if isinstance(ai_overview, dict) else '無'}

# 大綱生成規則
1. **問題驅動**：請優先將上述 PAA 問題轉化為適當的 H2 或 H3 標題，這對於獲得 AI 搜尋引擎的引用至關重要。
2. **語義覆蓋**：利用相關搜尋詞來細分章節，確保覆蓋該關鍵字的完整知識場景。
3. **優勢補強**：參考上述「內容缺口」，在章節中加入對手未提及的獨特視角。
4. **標題選定**：若是背景資訊中提供有「使用者指定標題」，請優先使用該標題作為回傳 JSON 中的 h1 欄位。
5. **結構邏輯**：大綱需包含 H1 (標題) 與多個 H2/H3。
6. **輸出格式**：必須輸出純 JSON 物件。

# 輸出 JSON 結構
{{
    "h1": "吸引人的 GEO 優化標題",
    "sections": [
        {{
            "heading": "章節標題文字",
            "level": 2,
            "description": "該章節的撰寫重點 (30 字內)",
            "keywords": ["推薦關鍵字1", "推薦關鍵字2"],
            "image_suggestion": {{
                "topic": "建議圖片主題 (如：專業團隊討論)",
                "search_keywords": "適合圖庫 API 的英文關鍵字 (如：professional team discussion)",
                "visual_type": "photo | illustration | diagram"
            }}
        }}
    ]
}}
"""
        
        try:
            result = await cls.generate_content(prompt, temperature=0.7)
            import json
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"h1": f"2026 {keyword}完整指南", "sections": []}
        except Exception as e:
            import logging
            logging.error(f"Failed to generate AI outline: {e}")
            return {"h1": f"2026 {keyword}完整指南", "sections": []}
    
    @classmethod
    async def generate_section_content(
        cls,
        heading: str,
        keywords: list[str],
        previous_summary: str = "",
        optimization_mode: str = "seo",
        target_word_count: int = 400,
        keyword_density: float = 2.0,
        h1: str = "",
        custom_prompt: str = None,
        research_context: str = "",
        quality_report: dict = None
    ) -> dict:
        """生成單一章節內容"""
        
        # 注入策略建議 (E-E-A-T & Gap Coverage)
        strategy_info = ""
        if quality_report and isinstance(quality_report, dict):
            recs = ' / '.join(quality_report.get('recommendations', [])[:3])
            strategy_info = f"E-E-A-T 強化建議：{recs}"
            
        # 如果有提供自訂 Prompt，使用它；否則使用預設
        if custom_prompt:
            prompt = custom_prompt.replace("{keyword}", h1 or heading)\
                                 .replace("{intent}", optimization_mode)\
                                 .replace("{h1}", h1)\
                                 .replace("{heading}", heading)\
                                 .replace("{keywords}", ', '.join(keywords))\
                                 .replace("{previous_summary}", previous_summary or '這是文章開頭')\
                                 .replace("{target_word_count}", str(target_word_count))\
                                 .replace("{keyword_density}", str(keyword_density))\
                                 .replace("{research_context}", research_context or '暫無可用研究數據')\
                                 .replace("{eeat_strategy}", strategy_info)\
                                 .replace("{content_gap}", strategy_info) # 兼用
        else:
            mode_instructions = {
                "seo": "注重關鍵字自然嵌入，保持 1.5-2.5% 關鍵字密度",
                "aeo": "使用問答格式，提供簡潔直接的答案，適合語音搜尋",
                "geo": "添加權威引用（如：『根據搜尋結果指出...』、『常見問題中提到...』）和數據來源，強化 E-E-A-T 信號",
                "hybrid": "結合 SEO 關鍵字優化、AEO 問答格式、GEO 權威性",
            }
            
            research_block = f"\n相關研究數據與參考資料：\n{research_context}\n" if research_context else ""
            
            prompt = f"""撰寫文章章節。

文章標題：{h1}
章節標題：{heading}
必須嵌入的關鍵字：{', '.join(keywords)}
前文摘要：{previous_summary or '這是文章開頭'}

# 策略方針
{strategy_info}

{research_block}
優化模式指南：{mode_instructions.get(optimization_mode, mode_instructions['seo'])}

請以 Markdown 格式撰寫約 {target_word_count} 字的章節內容，並確保關鍵字密度約 {keyword_density}%。
若有研究數據提供，請在文中以自然的方式進行「引述」或「參考」，以增加內容的權威度。
"""
        
        try:
            content = await cls.generate_content(prompt, temperature=0.8)
            word_count = len(content.replace(" ", "").replace("\n", ""))
            return {
                "heading": heading,
                "content": content,
                "word_count": word_count,
                "embedded_keywords": keywords,
                "summary": f"介紹了{heading}的核心概念",
            }
        except Exception as e:
            import logging
            logging.error(f"Failed to generate section content: {e}")
            return {
                "heading": heading,
                "content": f"## {heading}\n\n生成內容時發生錯誤：{str(e)}",
                "word_count": 0,
                "embedded_keywords": [],
                "summary": "",
            }
    @classmethod
    async def generate_ai_titles(cls, keyword: str, titles: List[str], intent: str = "informational", user_id: Optional[int] = None, custom_prompt: Optional[str] = None) -> List[Dict[str, Any]]:
        """基於競爭對手生成 AI 建議標題 (GEO 優化模式)"""
        if not titles:
            return [
                {"title": f"什麼是 {keyword}？2026 最完整定義與基礎指南", "strategy": "定義型", "reason": "預設生成"},
                {"title": f"{keyword}怎麼辦？2026 最新解決教學與修復步驟", "strategy": "教學型", "reason": "預設生成"}
            ]
            
        # 1. 優先從新模板系統讀取啟用的模板
        # custom_prompt = None # This line is redundant as custom_prompt is already a parameter or will be set below
        try:
            from app.core.database import SessionLocal
            from app.models.db_models import PromptTemplate
            from sqlalchemy import or_
            db = SessionLocal()
            try:
                # 優先順序：使用者的活躍模板 > 系統預設活躍模板
                active_template = db.query(PromptTemplate).filter(
                    PromptTemplate.category == "title_generation",
                    PromptTemplate.is_active == True,
                    or_(PromptTemplate.user_id == user_id, PromptTemplate.user_id == None) if user_id else PromptTemplate.user_id == None
                ).order_by(PromptTemplate.user_id.desc()).first()
                
                if active_template:
                    custom_prompt = active_template.content
            finally:
                db.close()
        except Exception as e:
            import logging
            logging.warning(f"Failed to load active prompt template: {e}")

        # 2. 備用：從舊設定讀取 (保持相容性)
        if not custom_prompt:
            try:
                from app.core.database import SessionLocal
                from app.models.db_models import Settings
                db = SessionLocal()
                try:
                    custom_prompt = Settings.get_value(db, "ai_title_prompt", None)
                finally:
                    db.close()
            except Exception as e:
                import logging
                logging.warning(f"Failed to load legacy ai_title_prompt: {e}")

        if custom_prompt:
            # 使用者自定義指令 (支援變數替換)
            prompt = custom_prompt.replace("{keyword}", keyword).replace("{intent}", intent)
            # 注入競爭對手標題
            competitor_list = chr(10).join(f'- {t}' for t in titles[:10])
            prompt = prompt.replace("{titles}", competitor_list)
            # 如果使用者沒放變數，則貼在後面 (保險做法)
            if "{titles}" not in custom_prompt:
                prompt += f"\n\n# 競爭對手標題 (SERP Top 10)：\n{competitor_list}"
        else:
            # 系統預設指令
            prompt = f"""你是一位資深的 SEO 與 GEO (生成式引擎優化) 專家。你的任務是分析競爭對手標題，並產出 5 個具備高點擊率且極易被 AI 搜尋引擎 (如 ChatGPT, SearchGPT, Gemini) 引用為摘要的標題。

# 輸入數據
- 目前年份：2026 年
- 核心關鍵字：{keyword}
- 預估搜尋意圖：{intent}
- 競爭對手標題 (SERP Top 10)：
{chr(10).join(f"- {t}" for t in (titles or [])[:10])}

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
"""
        
        try:
            result = await cls.generate_content(prompt, temperature=0.8)
            # 解析 JSON 
            import json
            import re
            json_match = re.search(r'\[[\s\S]*\]', result)
            if json_match:
                return json.loads(json_match.group())
            
            # 備用方案：如果 JSON 解析失敗
            return [
                {"title": f"什麼是 {keyword}？2026 最完整定義與基礎指南", "strategy": "定義型", "reason": "觸發 AI 定義摘要"},
                {"title": f"如何優化 {keyword}？從入門到精通的 5 個教學步驟", "strategy": "教學型", "reason": "符合操作流程意圖"},
                {"title": f"2026 年必看 7 大 {keyword} 推薦清單與實測評比", "strategy": "清單型", "reason": "清單格式極易被 AI 抓取"},
            ]
        except Exception as e:
            return [{"title": f"生成失敗: {str(e)}", "strategy": "錯誤", "reason": "系統發生異常"}]

    @classmethod
    async def analyze_article_quality(cls, content: str, gap_report: dict = None) -> dict:
        """分析文章品質並給予 100 分量化評分 (參考 smart-blog-skills:analyze)"""
        
        gap_context = ""
        if gap_report:
            gap_context = f"\n# 內容缺口與 E-E-A-T 策略建議 (參考點)\n"
            gap_context += f"- 市場標準: {', '.join(gap_report.get('market_standards', []))}\n"
            gap_context += f"- 對手忽略的缺口: {', '.join(gap_report.get('content_gaps', []))}\n"
            gap_context += f"- E-E-A-T 強化策略: {', '.join(gap_report.get('eeat_strategies', [])) or gap_report.get('eeat_strategy', '')}\n"

        prompt = f"""請對以下文章進行深度品質審計與 100 分量化評分。
請務必確認文章是否成功「覆蓋」了我們識別出的內容缺口。

# 審計項目
1. AI 內容偵測：分析語態、句長爆發性、觸發詞密度。
2. 結構分析：是否符合 Answer-First 格式，段落邏輯是否清晰。
3. 數據與權威度：統計數據的引用比例與驗證狀態 (找尋 [V] 標籤)。
4. SEO 優化：關鍵字融入自然度。
5. 策略覆蓋率：是否補強了競爭對手忽略的缺口。{gap_context}

# 待分析文章
{content[:5000]} # 限制分析長度

# 輸出 JSON 格式要求
{{
    "score": 85,
    "grade": "卓越 | 優良 | 及格 | 待改進 | 重寫",
    "metrics": {{
        "ai_detect": 20,
        "seo_score": 80,
        "readability": 90,
        "gap_coverage": 70
    }},
    "issues": [
        {{"severity": "🔴 致命 | 🟡 高 | 🟠 中", "description": "問題描述 (若有特定缺口沒補上請明確指出)"}}
    ],
    "recommendations": ["具體建議 1", "具體建議 2", "具體建議 3"]
}}
"""
        try:
            result = await cls.generate_content(prompt, temperature=0.5)
            import json, re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"score": 0, "grade": "錯誤", "issues": [{"severity": "🔴 致命", "description": "無法解析 AI 回覆"}]}
        except Exception as e:
            return {"score": 0, "grade": "錯誤", "message": str(e)}

    @classmethod
    async def generate_content_gap_report(cls, keyword: str, competitors_data: list) -> dict:
        """生成內容缺口分析報告 (參考 smart-blog-skills:outline)"""
        prompt = f"""分析核心關鍵字「{keyword}」的搜尋競爭對手內容，找出「內容缺口 (Content Gaps)」。

# 競爭對手數據 (標題與摘要)
{chr(10).join(f"- {d.get('title')}: {d.get('snippet')}" for d in (competitors_data or [])[:5])}

# 任務要求
1. 識別競爭對手普遍提到的觀點與市場基本水平。
2. 挖掘競爭對手「忽略」或「解釋不深」的關鍵內容缺口。
3. 提出具體的 E-E-A-T 強化建議，說明如何展現專業度、經驗感與權威性。

# 輸出 JSON 格式要求
{{
    "market_standards": ["競品共通點 1", "競品共通點 2"],
    "content_gaps": ["被忽略的重點 1", "深度不足的章節"],
    "eeat_strategies": ["建議策略 1：增加專家訪談或引述", "建議策略 2：提供實測數據與對比圖表"],
    "unique_angle": "建議的獨特切入點"
}}
"""
        try:
            result = await cls.generate_content(prompt, temperature=0.6)
            import json, re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                data = json.loads(json_match.group())
                # 相容性轉換：如果 AI 回傳的是舊的單數欄位或字串，轉換為複數列表
                if "eeat_strategy" in data and "eeat_strategies" not in data:
                    strategy = data.get("eeat_strategy")
                    data["eeat_strategies"] = [strategy] if isinstance(strategy, str) else strategy
                return data
            return {"market_standards": [], "content_gaps": ["無法分析"], "eeat_strategies": []}
        except Exception as e:
            return {"market_standards": [], "content_gaps": [str(e)], "eeat_strategies": []}
    @classmethod
    async def suggest_category(cls, title: str, content: str, existing_categories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """基於文章標題與內容，從現有分類清單中挑選最合適的一個，或建議建立新分類"""
        cat_list = chr(10).join(f"- {c['name']} (ID: {c['id']})" for c in existing_categories)
        prompt = f"""請為以下文章建議最合適的分類。
1. 從「現有分類清單」中挑選一個最匹配的。
2. 如果清單中沒有任何合適的分類，請建議一個「全新」的分類名稱。

# 文章標題
{title}

# 文章內容 (節錄)
{content[:1000]}

# 現有分類清單
{cat_list or "無"}

# 輸出 JSON 格式要求
{{
    "match_id": 123,     // 若匹配到現有分類，填入其 ID；否則填 null
    "suggest_name": "分類名稱",  // 如果 match_id 為 null，此處填入建議的新分類名稱
    "reason": "挑選理由"
}}
"""
        try:
            result = await cls.generate_content(prompt, temperature=0.3)
            import json, re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"match_id": None, "suggest_name": "未分類", "reason": "解析失敗"}
        except Exception:
            return {"match_id": None, "suggest_name": "未分類", "reason": "系統異常"}
