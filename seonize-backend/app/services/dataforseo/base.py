import logging
import base64
from typing import Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class DataForSEOBase:
    """DataForSEO 基礎功能與認證管理"""
    
    BASE_URL = "https://api.dataforseo.com/v3"

    _location_map = {
        "TW": 2158, "HK": 2104, "CN": 2156, "JP": 2392, "KR": 2410,
        "SG": 2702, "US": 2840, "GB": 2826, "AU": 2036, "CA": 2124,
    }

    _language_map = {
        "zh-tw": "zh_TW", "zh-hk": "zh_HK", "zh-cn": "zh_CN",
        "en-us": "en", "en-gb": "en", "ja-jp": "ja", "ko-kr": "ko",
    }

    _language_name_map = {
        "zh_TW": "Chinese (Traditional)",
        "zh-tw": "Chinese (Traditional)",
        "zh_HK": "Chinese (Traditional)",
        "zh_CN": "Chinese (Simplified)",
        "en": "English",
        "ja": "Japanese",
        "ko": "Korean",
    }

    @classmethod
    def resolve_language_code(cls, language: str) -> str:
        normalized = language.lower()
        if normalized in cls._language_map:
            return cls._language_map[normalized]
        if "-" in normalized:
            return normalized.split("-")[0]
        return normalized

    @classmethod
    def resolve_language_name(cls, language_code: str) -> str:
        return cls._language_name_map.get(language_code, "English")

    @classmethod
    def resolve_location_code(cls, country: str) -> int:
        if not country:
            return 2158
        return cls._location_map.get(country.upper(), 2158)
    
    @classmethod
    def _get_auth_header(cls, login: Optional[str] = None, password: Optional[str] = None) -> Dict[str, str]:
        """產生 Base64 驗證標頭"""
        l = (login or settings.DATAFORSEO_LOGIN or "").strip()
        p = (password or settings.DATAFORSEO_PASSWORD or "").strip()
        
        logger.debug(f"DataForSEO Auth: login len={len(l)}, pass len={len(p)}")
        
        if p.startswith("Basic "): return {"Authorization": p}
        if l.startswith("Basic "): return {"Authorization": l}
            
        if ":" not in p and len(p) > 20:
            try:
                decoded = base64.b64decode(p).decode("utf-8")
                if ":" in decoded:
                    return {"Authorization": f"Basic {p}"}
            except:
                pass

        if not l or not p: return {}
            
        auth_str = f"{l}:{p}"
        encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        return {"Authorization": f"Basic {encoded_auth}"}
