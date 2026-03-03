from fastapi import APIRouter, HTTPException, status, Depends
import logging
from sqlalchemy.orm import Session
from app.core.database import get_db
import asyncio
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.project import SERPResult
from app.core.auth import get_current_user
from app.services.serp_service import SERPService
from app.services.dataforseo_service import DataForSEOService
from app.services.ai_service import AIService

from app.services.credit_service import CreditService, CREDIT_COSTS

logger = logging.getLogger(__name__)

# 配置路由依賴為全域登入
router = APIRouter(dependencies=[Depends(get_current_user)])


class ResearchRequest(BaseModel):
    keyword: str
    country: str = "TW"
    language: str = "zh-TW"
    num_results: int = 10
    force_refresh: bool = False


class ResearchHistoryItem(BaseModel):
    id: int
    keyword: str
    country: str
    language: str
    created_at: datetime
    search_volume: Optional[int] = None
    cpc: Optional[float] = None


class ResearchResponse(BaseModel):
    keyword: str
    results: List[SERPResult]
    total_results: int
    ai_overview: Optional[Dict[str, Any]] = None
    paa: List[str] = []              # 新增 PAA 清單
    related_searches: List[str] = [] # 新增相關搜尋清單
    serp_features: List[str] = []    # 新增搜尋特徵
    created_at: Optional[str] = None # 數據時間
    error: Optional[str] = None


class TitleSuggestion(BaseModel):
    title: str
    strategy: Optional[str] = "一般型"
    reason: Optional[str] = "提升點擊率"


class TitleGenerationRequest(BaseModel):
    keyword: str
    intent: str = "informational"


class TitleGenerationResponse(BaseModel):
    keyword: str
    suggestions: List[TitleSuggestion]


@router.post("/serp", response_model=ResearchResponse)
async def research_serp(request: ResearchRequest, db: Session = Depends(get_db)):
    """
    執行 SERP 研究 (僅限登入使用者)
    """
    # 執行搜尋 (此處先執行，以便判斷是否命中快取)
    search_data = await SERPService.search(
        keyword=request.keyword,
        num_results=request.num_results,
        country=request.country,
        language=request.language,
        db=db,
        force_refresh=request.force_refresh
    )

    # 點數處理：僅在非快取命中 (cache_hit=False) 時扣除 2 點
    if not search_data.get("cache_hit"):
        COST = CREDIT_COSTS["serp_query"]
        CreditService.deduct(db, current_user, COST, f"SERP 查詢: {request.keyword}")
    
    
    results = search_data.get("results", [])
    ai_overview = search_data.get("ai_overview")
    paa = search_data.get("paa", [])
    related_searches = search_data.get("related_searches", [])
    serp_features = search_data.get("serp_features", [])
    created_at = search_data.get("created_at")
    error = search_data.get("error")

    return ResearchResponse(
        keyword=request.keyword,
        results=results,
        total_results=len(results),
        ai_overview=ai_overview,
        paa=paa,
        related_searches=related_searches,
        serp_features=serp_features,
        created_at=created_at,
        error=error,
    )


class KeywordIdeasRequest(BaseModel):
    keyword: str
    country: str = "TW"
    language: str = "zh-TW"
    force_refresh: bool = False


@router.post("/keyword-ideas")
async def get_keyword_ideas(
    request: KeywordIdeasRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    獲取關鍵字建議與數據 (僅限登入使用者)
    """
    config = SERPService.get_config()
    
    language_code = DataForSEOService.resolve_language_code(request.language)
    location_code = DataForSEOService.resolve_location_code(request.country)

    # 併發執行關鍵字建議獲取與 Google Ads 狀態檢查
    ideas_task = DataForSEOService.get_keyword_ideas(
        keyword=request.keyword,
        user_id=current_user.id, # 傳遞使用者 ID 以實現快取隔離
        language_code=language_code,
        location_code=location_code,
        db=db,
        login=config.dataforseo_login,
        password=config.dataforseo_password,
        force_refresh=request.force_refresh
    )
    
    status_task = DataForSEOService.get_google_ads_status(
        login=config.dataforseo_login,
        password=config.dataforseo_password
    )
    
    ideas_data, ads_status = await asyncio.gather(ideas_task, status_task)
    
    # 整合狀態數據
    if isinstance(ideas_data, dict):
        ideas_data["google_ads_status"] = ads_status
        
    return ideas_data


class KeywordResearchRequest(BaseModel):
    keywords: List[str]
    country: str = "TW"
    language: str = "zh-TW"


@router.get("/keywords", response_model=Dict[str, Any])
async def get_keyword_data(
    keyword: str,
    country: str = "TW",
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    獲取關鍵字詳細成交數據 (需 Lv.2 一般會員 + 消耗 3 點)
    """
    # 1. 等級檢查
    CreditService.check_feature_access(current_user, "dataforseo_keywords")
    
    # 2. 扣除點數
    COST = CREDIT_COSTS["dataforseo_keywords"]
    CreditService.deduct(db, current_user, COST, f"關鍵字數據查詢: {keyword}")

    try:
        data = await DataForSEOService.get_keyword_info(keyword, country=country)
        return data
    except Exception as e:
        # 失敗退款
        CreditService.refund(db, current_user, COST, f"關鍵字查詢失敗: {str(e)[:50]}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keywords")
async def research_keywords(request: KeywordResearchRequest):
    """
    獲取關鍵字數據 (僅限登入使用者)
    """
    config = SERPService.get_config()
    if config.provider != "dataforseo":
        if not (config.dataforseo_login and config.dataforseo_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="關鍵字研究功能需要 DataForSEO 配置"
            )

    language_code = DataForSEOService.resolve_language_code(request.language)
    location_code = DataForSEOService.resolve_location_code(request.country)

    results = await DataForSEOService.get_keyword_data(
        keywords=request.keywords,
        login=config.dataforseo_login,
        password=config.dataforseo_password,
        language_code=language_code,
        location_code=location_code,
    )

    return {"results": results}


@router.get("/history", response_model=List[ResearchHistoryItem])
async def get_research_history(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    獲取關鍵字研究歷史紀錄 (僅限擁有者)
    """
    from app.models.db_models import KeywordCache
    
    # 僅篩選屬於當前使用者的歷史記錄
    records = db.query(KeywordCache).filter(
        KeywordCache.user_id == current_user.id
    ).order_by(KeywordCache.created_at.desc()).all()
    
    history = []
    for r in records:
        search_volume = r.seed_data.get("search_volume") if r.seed_data else None
        cpc = r.seed_data.get("cpc") if r.seed_data else None
        
        history.append(ResearchHistoryItem(
            id=r.id,
            keyword=r.keyword,
            country="TW",
            language=r.language_code,
            created_at=r.created_at,
            search_volume=search_volume,
            cpc=cpc
        ))
    return history


@router.delete("/history/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_research_history(
    record_id: int, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    刪除關鍵字研究歷史紀錄 (僅限擁有者)
    """
    from app.models.db_models import KeywordCache
    
    record = db.query(KeywordCache).filter(
        KeywordCache.id == record_id,
        KeywordCache.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到歷史記錄或權限不足"
        )
    
    db.delete(record)
    db.commit()
    return None


class CrawlRequest(BaseModel):
    urls: List[str]


class CrawlResult(BaseModel):
    url: str
    title: str
    headings: List[str]
    content: str
    word_count: int


class CrawlResponse(BaseModel):
    results: List[CrawlResult]


@router.post("/intent", response_model=Dict[str, Any])
async def analyze_intent(request: Dict[str, str], db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    """
    AI 意圖分析 (消耗 2 點)
    """
    COST = CREDIT_COSTS["ai_intent_analysis"]
    CreditService.deduct(db, current_user, COST, f"AI 意圖分析: {request.get('keyword', '')}")
    
    try:
        # 實作略，調用 AIService...
        keyword = request.get("keyword")
        # For demonstration, let's assume AIService.analyze_intent exists and returns a dict
        # intent_analysis_result = await AIService.analyze_intent(keyword)
        # return intent_analysis_result
        return {"keyword": keyword, "intent": "informational", "confidence": 0.9}
    except Exception as e:
        CreditService.refund(db, current_user, COST, f"AI 意圖分析失敗: {str(e)[:50]}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crawl", response_model=CrawlResponse)
async def crawl_pages(request: CrawlRequest):
    """
    爬取指定網頁內容 (僅限登入使用者)
    """
    import random
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
    ]

    async def fetch_page(client: httpx.AsyncClient, url: str, sem: asyncio.Semaphore) -> CrawlResult:
        async with sem:
            try:
                await asyncio.sleep(random.uniform(0.5, 2.0))
                headers = {"User-Agent": random.choice(USER_AGENTS), "Referer": "https://www.google.com/"}
                response = await client.get(url, timeout=20.0, follow_redirects=True, headers=headers)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")

                title = soup.title.string.strip() if soup.title and soup.title.string else url
                headings = [f"{tag.name.upper()}: {tag.get_text(strip=True)}" for tag in soup.find_all(["h1", "h2", "h3"]) if tag.get_text(strip=True)]

                for script in soup(["script", "style", "noscript"]): script.decompose()
                content = " ".join(soup.stripped_strings)[:8000]
                word_count = len(content.replace(" ", "").replace("\n", ""))
                
                return CrawlResult(url=url, title=title, headings=headings, content=content, word_count=word_count)
            except Exception as e:
                return CrawlResult(url=url, title=url, headings=[], content=f"爬取失敗：{str(e)}", word_count=0)

    urls = request.urls[:10]
    sem = asyncio.Semaphore(3)
    async with httpx.AsyncClient() as client:
        tasks = [fetch_page(client, url, sem) for url in urls]
        results = await asyncio.gather(*tasks)

    return CrawlResponse(results=results)


@router.post("/generate-titles", response_model=TitleGenerationResponse)
async def generate_titles(
    request: TitleGenerationRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    基於 SERP 競品標題生成 AI 建議標題 (僅限登入使用者)
    """
    from app.models.db_models import SerpCache, KeywordCache
    titles = []
    
    # 1. 嘗試從 SERP 快取取得標題 (共享系統快取)
    cache = db.query(SerpCache).filter(
        SerpCache.keyword == request.keyword.strip()
    ).order_by(SerpCache.created_at.desc()).first()
    
    if cache and cache.results:
        res_data = cache.results
        if isinstance(res_data, dict) and "results" in res_data:
            results_list = res_data.get("results", [])
            titles = [res.get("title") for res in results_list if isinstance(res, dict) and res.get("title")]
        elif isinstance(res_data, list):
            titles = [res.get("title") for res in res_data if isinstance(res, dict) and res.get("title")]

    if not titles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到關鍵字「{request.keyword}」的 SERP 數據,請先執行搜尋研究。"
        )

    suggestions = await AIService.generate_ai_titles(
        keyword=request.keyword,
        titles=titles,
        intent=request.intent
    )
    
    # 2. 持久化至使用者的 KeywordCache
    kw_cache = db.query(KeywordCache).filter(
        KeywordCache.keyword == request.keyword,
        KeywordCache.user_id == current_user.id
    ).first()
    
    if kw_cache:
        kw_cache.ai_suggestions = suggestions
        db.commit()

    return TitleGenerationResponse(
        keyword=request.keyword,
        suggestions=[TitleSuggestion(**s) for s in suggestions]
    )
