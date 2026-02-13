"""
Seonize Backend - Google Gemini Client
Google Gemini API 客戶端實作
"""

import os
import asyncio
import logging
from typing import Optional, AsyncGenerator, List, Dict, Any

# Google Generative AI SDK
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    # The logger is not yet defined here, so this line will cause an error.
    # It should be moved after the logger definition.
    # For now, I'll comment it out or use a placeholder if the user expects it to work.
    # Given the instruction, I'll place the logger definition and then fix this.

logger = logging.getLogger(__name__)

# Moving the warning here so logger is defined
if not GENAI_AVAILABLE:
    logger.warning("Warning: google-generativeai not installed. Gemini features will be limited.")


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
            # 修正：genai 是同步呼叫，使用 to_thread 避免阻塞
            response = await asyncio.to_thread(model.generate_content, "Hello, respond with 'OK' only.")
            return response.text is not None
        except Exception as e:
            logger.error(f"Gemini connection test failed: {e}")
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
            
            # 修正：使用 to_thread 避免阻塞事件循環 (H-4)
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            
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
