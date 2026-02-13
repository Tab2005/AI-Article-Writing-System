import logging
from .dataforseo.serp import DataForSEOSerpService
from .dataforseo.keywords import DataForSEOKeywordService
from .dataforseo.on_page import DataForSEOOnPageService

logger = logging.getLogger(__name__)

class DataForSEOService(DataForSEOSerpService, DataForSEOKeywordService, DataForSEOOnPageService):
    """
    DataForSEO API 門面類別 (Facade)
    
    本類別透過多重繼承將拆分後的模組重新匯聚，
    以確保現有代碼中 `DataForSEOService.xxx()` 的呼叫路徑不需要變動。
    
    職責已拆分至：
    - .dataforseo.base: 認證與座標轉換
    - .dataforseo.serp: SERP 研究與 AI Overview
    - .dataforseo.keywords: 關鍵字數據與建議
    - .dataforseo.on_page: 網頁結構解析
    """
    pass
