"""
Zeabur AI Hub Client
支援透過 Zeabur AI Hub 呼叫各種 AI 模型
"""
import httpx
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

# 已知的 Zeabur AI Hub 可用模型 (作為 API 無法取得時的備用列表)
ZEABUR_FALLBACK_MODELS = [
    "gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini",
    "claude-3-7-sonnet", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet", "claude-3-5-haiku", 
    "gemini-2.0-flash", "gemini-2.0-flash-lite-preview", "gemini-1.5-pro", "gemini-1.5-flash",
    "deepseek-v3", "deepseek-r1", "deepseek-chat", "deepseek-reasoner",
    "llama-3.3-70b-instruct", "llama-3.1-405b", "llama-3.1-70b",
    "mistral-large-latest", "pixtral-large-latest"
]


class ZeaburClient:
    """Zeabur AI Hub 客戶端"""
    
    def __init__(self, api_key: str, base_url: str = "https://hnd1.aihub.zeabur.ai/"):
        self.api_key = api_key
        # 確保 base_url 結尾沒有斜線，方便後續拼接
        self.base_url = base_url.rstrip("/")
        self.timeout = 120.0
    
    def _get_v1_url(self, path: str) -> str:
        """建構 API URL，自動偵測 base_url 是否已包含 /v1"""
        if "/v1" in self.base_url:
            return f"{self.base_url}/{path.lstrip('/')}"
        return f"{self.base_url}/v1/{path.lstrip('/')}"

    async def get_models(self) -> List[str]:
        """
        從 Zeabur AI Hub 取得可用模型列表
        
        Returns:
            可用模型名稱列表，若 API 呼叫失敗則回傳備用清單
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = self._get_v1_url("models")
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                data = response.json()
                # OpenAI 相容格式: {"data": [{"id": "model-name", ...}, ...]}
                if "data" in data and isinstance(data["data"], list):
                    models = sorted([m["id"] for m in data["data"] if "id" in m])
                    if models:
                        logger.info(f"Fetched {len(models)} models from Zeabur AI Hub")
                        return models
                
                # 若回應格式不符合預期，使用備用清單
                logger.warning("Unexpected models response format, using fallback list")
                return ZEABUR_FALLBACK_MODELS
                
        except Exception as e:
            logger.warning(f"Failed to fetch models from Zeabur AI Hub: {e}, using fallback list")
            return ZEABUR_FALLBACK_MODELS

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
                url = self._get_v1_url("chat/completions")
                
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
            try:
                error_data = e.response.json()
                error_msg = error_data.get("error", {}).get("message", str(e))
                logger.error(f"Zeabur AI Hub HTTP error: {e.response.status_code} - {error_msg}")
                raise RuntimeError(f"Zeabur AI Hub API 錯誤 ({e.response.status_code}): {error_msg}")
            except Exception:
                logger.error(f"Zeabur AI Hub HTTP error: {e.response.status_code} - {e.response.text}")
                raise RuntimeError(f"Zeabur AI Hub API 錯誤 ({e.response.status_code})")
        except Exception as e:
            logger.error(f"Zeabur AI Hub error: {e}")
            raise RuntimeError(f"Zeabur AI Hub 呼叫失敗: {str(e)}")

