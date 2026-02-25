"""
Zeabur AI Hub Client
支援透過 Zeabur AI Hub 呼叫各種 AI 模型
"""
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ZeaburClient:
    """Zeabur AI Hub 客戶端"""
    
    def __init__(self, api_key: str, base_url: str = "https://hnd1.aihub.zeabur.ai/"):
        self.api_key = api_key
        # 確保 base_url 結尾沒有斜線，方便後續拼接
        self.base_url = base_url.rstrip("/")
        self.timeout = 120.0
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """
        生成文字內容
        
        Args:
            prompt: 使用者提示詞
            system_prompt: 系統提示詞
            model: 模型名稱
            temperature: 溫度參數
            max_tokens: 最大 token 數
            
        Returns:
            生成的文字內容
        """
        # 構建訊息
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # API 請求
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 根據範例，路徑應為 /v1/chat/completions 或直接從 base_url 拼接
                # 通常 OpenAI 相容介面在 v1 下
                url = f"{self.base_url}/v1/chat/completions"
                
                # 有些 base_url 已經包含 v1，做個檢查
                if "/v1" in self.base_url:
                    url = f"{self.base_url}/chat/completions"
                
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                logger.info(f"Zeabur AI Hub response received, length: {len(content)}")
                return content
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Zeabur AI Hub HTTP error: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Zeabur AI Hub API 錯誤: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Zeabur AI Hub error: {e}")
            raise RuntimeError(f"Zeabur AI Hub 呼叫失敗: {str(e)}")
