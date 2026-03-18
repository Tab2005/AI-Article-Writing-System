import re
import json
import logging
from typing import Any, Optional, Dict, List

logger = logging.getLogger(__name__)

def clean_ai_json(s: str) -> str:
    """
    清理 AI 回傳的 JSON 字串，處理 Markdown 標籤與特殊字元。
    """
    if not s:
        return ""
        
    # 1. 移除 Markdown 程式碼區塊標記
    s = re.sub(r'```json\s*', '', s)
    s = re.sub(r'```\s*', '', s)
    s = s.strip()
    
    # 2. 找到第一個 { 和最後一個 } 或 [ ]
    # 先試著找物件，再試著找陣列
    match_obj = re.search(r'(\{[\s\S]*\})', s)
    if not match_obj:
        match_obj = re.search(r'(\[[\s\S]*\])', s)
        
    if match_obj:
        s = match_obj.group(1)
        
    # 3. 處理換行與非法控制字元
    s = "".join(ch for ch in s if ord(ch) >= 32 or ch in "\n\r\t")
    
    # 4. 移除物件或陣列末尾多餘的逗號 (Trailing Commas)
    s = re.sub(r',\s*([\]}])', r'\1', s)
    
    return s

def parse_ai_json(s: str, default_value: Any = None) -> Any:
    """
    清理並解析 AI 回傳的 JSON。
    """
    cleaned = clean_ai_json(s)
    if not cleaned:
        return default_value
        
    try:
        return json.loads(cleaned)
    except Exception as e:
        logger.error(f"Failed to parse AI JSON: {e}")
        logger.debug(f"Attempted to parse: {cleaned[:500]}...")
        return default_value
