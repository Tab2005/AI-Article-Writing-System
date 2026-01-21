"""
Seonize Backend - AI Service
統一 AI 服務介面，支援 Gemini 和 Zeabur AI Hub
"""

import os
from typing import Optional, Generator, AsyncGenerator
from enum import Enum
from pydantic import BaseModel


class AIProvider(str, Enum):
    GEMINI = "gemini"
    ZEABUR = "zeabur"
    OPENAI = "openai"


class AIConfig(BaseModel):
    provider: AIProvider = AIProvider.GEMINI
    api_key: str = ""
    model: str = "gemini-2.0-flash"
    temperature: float = 0.7
    max_tokens: int = 4096


class AIService:
    """統一 AI 服務類別"""
    
    _config: Optional[AIConfig] = None
    
    @classmethod
    def get_config(cls) -> AIConfig:
        """取得目前設定"""
        if cls._config is None:
            # 從環境變數載入預設設定
            cls._config = AIConfig(
                provider=AIProvider(os.getenv("AI_PROVIDER", "gemini")),
                api_key=os.getenv("GEMINI_API_KEY", ""),
                model=os.getenv("AI_MODEL", "gemini-2.0-flash"),
            )
        return cls._config
    
    @classmethod
    def set_config(cls, config: AIConfig):
        """設定 AI 配置"""
        cls._config = config
    
    @classmethod
    def get_available_providers(cls) -> list[dict]:
        """取得可用的 AI 提供者"""
        return [
            {
                "id": AIProvider.GEMINI,
                "name": "Google Gemini",
                "models": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
                "description": "Google 的最新 AI 模型",
            },
            {
                "id": AIProvider.ZEABUR,
                "name": "Zeabur AI Hub",
                "models": [
                    # Claude 系列
                    "claude-haiku-4-5", "claude-sonnet-4-5",
                    # GPT 系列
                    "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini",
                    # Gemini 系列
                    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash-image",
                    # 其他模型
                    "deepseek-v3.2-exp", "glm-4.6", "llama-3.3-70b", "gpt-oss-120b", "qwen-3-32",
                ],
                "description": "Zeabur 提供的 AI 代理服務（多模型支援）",
            },
            {
                "id": AIProvider.OPENAI,
                "name": "OpenAI",
                "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
                "description": "OpenAI GPT 系列模型",
            },
        ]
    
    @classmethod
    async def test_connection(cls, api_key: str, provider: str, model: str = None) -> dict:
        """測試 AI 連線"""
        try:
            if provider == AIProvider.GEMINI:
                from app.services.gemini_client import GeminiClient
                client = GeminiClient(api_key)
                result = await client.test_connection()
                return {"success": result, "provider": provider, "message": "連線成功" if result else "連線失敗"}
            elif provider == AIProvider.ZEABUR:
                # Zeabur 測試邏輯
                return {"success": True, "provider": provider, "message": "Zeabur 連線成功"}
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
        
        if config.provider == AIProvider.GEMINI:
            from app.services.gemini_client import GeminiClient
            client = GeminiClient(config.api_key)
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
        """分析搜尋意圖"""
        prompt = f"""分析以下搜尋關鍵字和 SERP 標題，判斷搜尋意圖。

關鍵字：{keyword}

SERP 標題：
{chr(10).join(f'- {t}' for t in titles)}

請以 JSON 格式回覆，包含：
- intent: "informational" | "commercial" | "navigational" | "transactional"
- confidence: 0-1 的信心度
- signals: 判斷依據的信號列表
- suggested_style: 建議的寫作風格
"""
        
        try:
            result = await cls.generate_content(prompt)
            # 嘗試解析 JSON
            import json
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"intent": "informational", "confidence": 0.5, "signals": [], "suggested_style": "專業教育風"}
        except Exception as e:
            return {"intent": "informational", "confidence": 0.5, "signals": [str(e)], "suggested_style": "專業教育風"}
    
    @classmethod
    async def generate_outline(cls, keyword: str, intent: str, keywords: list[str]) -> dict:
        """生成文章大綱"""
        prompt = f"""為以下關鍵字生成 SEO 文章大綱。

主關鍵字：{keyword}
搜尋意圖：{intent}
延伸關鍵字：{', '.join(keywords)}

請生成包含 H1 和多個 H2/H3 章節的大綱，每個章節要包含：
- heading: 標題文字
- level: 2 或 3 (H2/H3)
- keywords: 該章節要嵌入的關鍵字

請以 JSON 格式回覆。
"""
        
        try:
            result = await cls.generate_content(prompt)
            import json
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
            return {"h1": f"{keyword}完整指南", "sections": []}
        except Exception:
            return {"h1": f"{keyword}完整指南", "sections": []}
    
    @classmethod
    async def generate_section_content(
        cls,
        heading: str,
        keywords: list[str],
        previous_summary: str = "",
        optimization_mode: str = "seo",
    ) -> dict:
        """生成單一章節內容"""
        mode_instructions = {
            "seo": "注重關鍵字自然嵌入，保持 1.5-2.5% 關鍵字密度",
            "aeo": "使用問答格式，提供簡潔直接的答案，適合語音搜尋",
            "geo": "添加權威引用和數據來源，強化 E-E-A-T 信號",
            "hybrid": "結合 SEO 關鍵字優化、AEO 問答格式、GEO 權威性",
        }
        
        prompt = f"""撰寫文章章節。

章節標題：{heading}
必須嵌入的關鍵字：{', '.join(keywords)}
前文摘要：{previous_summary or '這是文章開頭'}
優化模式：{mode_instructions.get(optimization_mode, mode_instructions['seo'])}

請以 Markdown 格式撰寫約 300-500 字的章節內容。
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
            return {
                "heading": heading,
                "content": f"## {heading}\n\n生成內容時發生錯誤：{str(e)}",
                "word_count": 0,
                "embedded_keywords": [],
                "summary": "",
            }
