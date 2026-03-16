"""
OpenRouter AI Client
支援透過 OpenRouter 呼叫數百種 AI 模型 (OpenAI 相容 API)
"""
import httpx
import logging
import json
import time
from typing import Optional, List, Dict, Any, AsyncGenerator

logger = logging.getLogger(__name__)

# 全域模型快取
_MODELS_CACHE = {
    "timestamp": 0,
    "data": []
}
CACHE_TTL = 3600  # 快取 1 小時

class OpenRouterClient:
    """OpenRouter API 客戶端"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.timeout = 120.0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://seonize.ai",
            "X-Title": "Seonize AI Writing System"
        }

    async def get_models(self) -> List[Dict[str, Any]]:
        """
        從 OpenRouter 取得可用模型列表與詳細資訊
        
        Returns:
            模型詳細資訊列表 [{"id": "...", "name": "...", "pricing": {...}}]
        """
        global _MODELS_CACHE
        
        # 檢查快取
        now = time.time()
        if _MODELS_CACHE["data"] and (now - _MODELS_CACHE["timestamp"] < CACHE_TTL):
            return _MODELS_CACHE["data"]

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.base_url}/models"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                data = response.json()
                if "data" in data and isinstance(data["data"], list):
                    processed_models = []
                    for m in data["data"]:
                        processed_models.append({
                            "id": m.get("id"),
                            "name": m.get("name"),
                            "context_length": m.get("context_length"),
                            "pricing": m.get("pricing"),
                            "description": m.get("description", "")[:100] + "..." if m.get("description") else ""
                        })
                    
                    # 更新快取
                    _MODELS_CACHE = {
                        "timestamp": now,
                        "data": processed_models
                    }
                    return processed_models
                
        except Exception as e:
            logger.warning(f"Failed to fetch models from OpenRouter: {e}")
            
        return []

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "openai/gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """
        生成文字內容
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/chat/completions"
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                logger.info(f"OpenRouter response received, length: {len(content)}")
                return content
                
        except httpx.HTTPStatusError as e:
            error_msg = f"API 錯誤 ({e.response.status_code})"
            try:
                error_data = e.response.json()
                if "error" in error_data:
                    error_msg = error_data["error"].get("message", error_msg)
            except:
                pass
            logger.error(f"OpenRouter HTTP error: {error_msg}")
            raise RuntimeError(f"OpenRouter API 錯誤: {error_msg}")
        except Exception as e:
            logger.error(f"OpenRouter error: {e}")
            raise RuntimeError(f"OpenRouter 呼叫失敗: {str(e)}")

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "openai/gpt-4o-mini",
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        串流生成文字內容
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/chat/completions"
                async with client.stream("POST", url, headers=self.headers, json=payload) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error(f"OpenRouter stream error: {e}")
            yield f" [Error: {str(e)}] "
