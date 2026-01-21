"""
Seonize Backend - Google Gemini Client
Google Gemini API 客戶端實作
"""

import os
from typing import Optional, AsyncGenerator

# Google Generative AI SDK
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("Warning: google-generativeai not installed. Gemini features will be limited.")


class GeminiClient:
    """Google Gemini API 客戶端"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self._configured = False
        
        if GENAI_AVAILABLE and self.api_key:
            genai.configure(api_key=self.api_key)
            self._configured = True
    
    async def test_connection(self) -> bool:
        """測試 API 連線"""
        if not self._configured:
            return False
        
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content("Hello, respond with 'OK' only.")
            return response.text is not None
        except Exception as e:
            print(f"Gemini connection test failed: {e}")
            return False
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str = None,
        model: str = "gemini-2.0-flash",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """生成內容"""
        if not self._configured:
            raise RuntimeError("Gemini API not configured. Please set API key.")
        
        try:
            # 設定生成參數
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # 建立模型
            gemini_model = genai.GenerativeModel(
                model_name=model,
                generation_config=generation_config,
                system_instruction=system_prompt,
            )
            
            # 生成內容
            response = gemini_model.generate_content(prompt)
            
            return response.text
        except Exception as e:
            raise RuntimeError(f"Gemini generation failed: {e}")
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = None,
        model: str = "gemini-2.0-flash",
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """串流生成內容"""
        if not self._configured:
            raise RuntimeError("Gemini API not configured. Please set API key.")
        
        try:
            generation_config = genai.GenerationConfig(
                temperature=temperature,
            )
            
            gemini_model = genai.GenerativeModel(
                model_name=model,
                generation_config=generation_config,
                system_instruction=system_prompt,
            )
            
            response = gemini_model.generate_content(prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"Error: {e}"
    
    async def classify_intent(self, keyword: str, titles: list[str]) -> dict:
        """分類搜尋意圖"""
        prompt = f"""你是一個 SEO 專家。請分析以下搜尋關鍵字和競品標題，判斷用戶的搜尋意圖。

關鍵字：{keyword}

SERP 標題：
{chr(10).join(f'{i+1}. {t}' for i, t in enumerate(titles))}

請判斷：
1. 搜尋意圖類型（informational/commercial/navigational/transactional）
2. 判斷信心度（0-100%）
3. 支持判斷的信號
4. 建議的寫作風格

以 JSON 格式回覆：
{{"intent": "...", "confidence": 0.85, "signals": ["..."], "suggested_style": "..."}}
"""
        
        try:
            result = await self.generate(prompt, temperature=0.3)
            import json
            import re
            json_match = re.search(r'\{[\s\S]*?\}', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        
        return {
            "intent": "informational",
            "confidence": 0.5,
            "signals": ["預設判斷"],
            "suggested_style": "專業教育風"
        }
    
    async def generate_titles(self, keyword: str, intent: str, count: int = 5) -> list[str]:
        """生成高 CTR 標題建議"""
        prompt = f"""你是一個 SEO 標題專家。請為以下關鍵字生成 {count} 個高點擊率的文章標題。

關鍵字：{keyword}
搜尋意圖：{intent}
年份：2026

要求：
1. 標題要吸引人點擊
2. 包含關鍵字
3. 符合搜尋意圖
4. 長度適中（不超過 60 字元）

請以 JSON 陣列格式回覆標題列表。
"""
        
        try:
            result = await self.generate(prompt, temperature=0.8)
            import json
            import re
            json_match = re.search(r'\[[\s\S]*?\]', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        
        return [
            f"2026 {keyword}完整指南",
            f"{keyword}怎麼做？一篇文章告訴你",
            f"【專家推薦】{keyword}的 5 個關鍵技巧",
        ]
