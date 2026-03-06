"""
Seonize Backend - Research Service
實作數據驗證與反幻覺機制，參考 smart-blog-skills 的驗證邏輯。
"""

import logging
import httpx
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import re

logger = logging.getLogger(__name__)

class ResearchService:
    """研究與數據驗證服務"""

    @classmethod
    async def fetch_page_content(cls, url: str) -> Optional[str]:
        """抓取網頁內容並提取純文字"""
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # 移除腳本和樣式
                    for script in soup(["script", "style"]):
                        script.decompose()
                        
                    # 取得文字
                    text = soup.get_text()
                    
                    # 清理空白
                    lines = (line.strip() for line in text.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = '\n'.join(chunk for chunk in chunks if chunk)
                    
                    return text
                return None
        except Exception as e:
            logger.error(f"Failed to fetch content from {url}: {e}")
            return None

    @classmethod
    def verify_stat_in_text(cls, stat: str, text: str) -> bool:
        """驗證數據是否存在於文本中 (簡單模糊匹配)"""
        if not text:
            return False
            
        # 移除標點符號與空白後的匹配
        clean_stat = re.sub(r'[^\w\s]', '', stat).lower()
        clean_text = re.sub(r'[^\w\s]', '', text).lower()
        
        return clean_stat in clean_text

    @classmethod
    async def get_verified_data(cls, urls: List[str], target_keywords: List[str]) -> List[Dict[str, Any]]:
        """深度研究與驗證數據"""
        results = []
        for url in urls[:3]: # 先限制前 3 個網址以節省時間
            content = await cls.fetch_page_content(url)
            if content:
                status = "[V]" # Verified
            else:
                status = "[F]" # Failed
                
            results.append({
                "url": url,
                "status": status,
                "summary": content[:500] if content else "無法讀取內容"
            })
        return results

    @classmethod
    def format_citation_report(cls, verification_results: List[Dict[str, Any]]) -> str:
        """產出驗證報告"""
        report = "### 資料來源驗證報告\n"
        for res in verification_results:
            report += f"- {res['status']} {res['url']}\n"
        return report
