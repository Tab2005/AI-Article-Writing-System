"""
Seonize Backend - Research API Router
SERP 研究 API
"""

from fastapi import APIRouter, HTTPException, status
import asyncio
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.project import SERPResult

router = APIRouter()


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
async def research_serp(request: ResearchRequest):
    """
    執行 SERP 研究 - 獲取 Google Top 10 搜尋結果
    第一階段：數據採集與研究
    """
    from app.services.serp_service import SERPService
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        # 使用 SERP 服務執行搜尋
        search_data = await SERPService.search(
            keyword=request.keyword,
            num_results=request.num_results,
            country=request.country,
            language=request.language,
            db=db,
            force_refresh=request.force_refresh
        )
    finally:
        db.close()
    
    results = search_data.get("results", [])
    ai_overview = search_data.get("ai_overview")
    paa = search_data.get("paa", [])
    related_searches = search_data.get("related_searches", [])
    created_at = search_data.get("created_at")
    error = search_data.get("error")

    return ResearchResponse(
        keyword=request.keyword,
        results=results,
        total_results=len(results),
        ai_overview=ai_overview,
        paa=paa,
        related_searches=related_searches,
        created_at=created_at,
        error=error,
    )


class KeywordIdeasRequest(BaseModel):
    keyword: str
    country: str = "TW"
    language: str = "zh-TW"
    force_refresh: bool = False


@router.post("/keyword-ideas")
async def get_keyword_ideas(request: KeywordIdeasRequest):
    """
    獲取關鍵字建議與數據 (Keyword Ideas)
    支援資料庫快取與強制重新整理
    """
    from app.services.dataforseo_service import DataForSEOService
    from app.services.serp_service import SERPService
    from app.core.database import SessionLocal

    config = SERPService.get_config()
    
    # 建立臨時 DB session
    db = SessionLocal()
    try:
        language_code = DataForSEOService.resolve_language_code(request.language)
        location_code = DataForSEOService.resolve_location_code(request.country)

        # 併發執行關鍵字建議獲取與 Google Ads 狀態檢查
        ideas_task = DataForSEOService.get_keyword_ideas(
            keyword=request.keyword,
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
    finally:
        db.close()


class KeywordResearchRequest(BaseModel):
    keywords: List[str]
    country: str = "TW"
    language: str = "zh-TW"


@router.post("/keywords")
async def research_keywords(request: KeywordResearchRequest):
    """
    獲取關鍵字數據 (搜尋量、競爭度等)
    僅支援 DataForSEO 提供者
    """
    from app.services.dataforseo_service import DataForSEOService
    from app.services.serp_service import SERPService, SERPProvider

    config = SERPService.get_config()
    if config.provider != SERPProvider.DATAFORSEO:
        # 如果當前提供者不是 DataForSEO，嘗試檢查是否已配置
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
async def get_research_history():
    """
    獲取關鍵字研究歷史紀錄
    """
    from app.core.database import SessionLocal
    from app.models.db_models import KeywordCache
    
    db = SessionLocal()
    try:
        # 獲取所有快取的關鍵字，按時間排序
        records = db.query(KeywordCache).order_by(KeywordCache.created_at.desc()).all()
        
        history = []
        for r in records:
            search_volume = r.seed_data.get("search_volume") if r.seed_data else None
            cpc = r.seed_data.get("cpc") if r.seed_data else None
            
            history.append(ResearchHistoryItem(
                id=r.id,
                keyword=r.keyword,
                country="TW", # 這裡可以根據 location_code 反查
                language=r.language_code,
                created_at=r.created_at,
                search_volume=search_volume,
                cpc=cpc
            ))
        return history
    finally:
        db.close()


@router.delete("/history/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_research_history(record_id: int):
    """
    刪除關鍵字研究歷史紀錄
    """
    from app.core.database import SessionLocal
    from app.models.db_models import KeywordCache
    
    db = SessionLocal()
    try:
        record = db.query(KeywordCache).filter(KeywordCache.id == record_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Research record {record_id} not found"
            )
        
        db.delete(record)
        db.commit()
        return None
    finally:
        db.close()


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


@router.post("/crawl", response_model=CrawlResponse)
async def crawl_pages(request: CrawlRequest):
    """
    爬取指定網頁內容
    異步爬取 Top 10 網頁內容 (H1-H3 標籤及全文)
    """
    async def fetch_page(client: httpx.AsyncClient, url: str) -> CrawlResult:
        try:
            response = await client.get(url, timeout=15.0, follow_redirects=True)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            title = (soup.title.string.strip() if soup.title and soup.title.string else url)
            headings = []
            for tag in soup.find_all(["h1", "h2", "h3"]):
                text = tag.get_text(strip=True)
                if text:
                    headings.append(f"{tag.name.upper()}: {text}")

            # 取得主要文字內容
            for script in soup(["script", "style", "noscript"]):
                script.decompose()
            content = " ".join(soup.stripped_strings)
            content = content[:8000]

            word_count = len(content.replace(" ", "").replace("\n", ""))
            return CrawlResult(
                url=url,
                title=title,
                headings=headings,
                content=content,
                word_count=word_count,
            )
        except Exception as e:
            return CrawlResult(
                url=url,
                title=url,
                headings=[],
                content=f"爬取失敗：{str(e)}",
                word_count=0,
            )

    urls = request.urls[:10]
    async with httpx.AsyncClient() as client:
        tasks = [fetch_page(client, url) for url in urls]
        results = await asyncio.gather(*tasks)

    return CrawlResponse(results=results)


@router.post("/generate-titles", response_model=TitleGenerationResponse)
async def generate_titles(request: TitleGenerationRequest):
    """
    基於 SERP 競品標題生成 AI 建議標題
    """
    from app.services.ai_service import AIService
    from app.core.database import SessionLocal
    from app.models.db_models import SerpCache
    import logging

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    titles = []
    try:
        # 從快取取得 SERP 標題（使用多重查詢策略）
        logger.info(f"Searching for keyword: '{request.keyword}' (length: {len(request.keyword)})")
        
        # 策略 1: 精確匹配
        cache = db.query(SerpCache).filter(
            SerpCache.keyword == request.keyword
        ).order_by(SerpCache.created_at.desc()).first()
        
        # 策略 2: 如果精確匹配失敗,嘗試去除空格後匹配
        if not cache:
            keyword_stripped = request.keyword.strip()
            logger.info(f"Exact match failed, trying stripped keyword: '{keyword_stripped}'")
            cache = db.query(SerpCache).filter(
                SerpCache.keyword == keyword_stripped
        ).order_by(SerpCache.created_at.desc()).first()
        
        # 策略 3: 列出所有可用的關鍵字供診斷
        if not cache:
            all_keywords = db.query(SerpCache.keyword).distinct().limit(20).all()
            available_keywords = [k[0] for k in all_keywords]
            logger.warning(f"No cache found. Available keywords in database: {available_keywords}")
        
        logger.info(f"Cache query result: found={cache is not None}")
        
        if cache and cache.results:
            logger.info(f"Cache results type: {type(cache.results)}")
            logger.info(f"Cache results keys (if dict): {cache.results.keys() if isinstance(cache.results, dict) else 'N/A'}")
            
            # 提取標題 - 支援多種資料結構
            # 1. results 是 dict,包含 "results" key (最常見)
            if isinstance(cache.results, dict):
                if "results" in cache.results:
                    results_list = cache.results.get("results", [])
                    logger.info(f"Found 'results' key in dict, list length: {len(results_list)}")
                    titles = [res.get("title") for res in results_list if isinstance(res, dict) and res.get("title")]
                else:
                    # 可能整個 dict 就是一筆結果
                    logger.info("No 'results' key found, treating entire dict as single result")
                    if cache.results.get("title"):
                        titles = [cache.results.get("title")]
            # 2. 直接在 results 中的 list
            elif isinstance(cache.results, list):
                logger.info(f"Cache results is a list, length: {len(cache.results)}")
                titles = [res.get("title") for res in cache.results if isinstance(res, dict) and res.get("title")]
            
            logger.info(f"Extracted {len(titles)} titles from cache")
        
        if not titles:
            # 如果沒有快取標題,返回錯誤或嘗試抓取（此處選擇返回錯誤引導使用者先研究）
            logger.warning(f"No SERP titles found for keyword: {request.keyword}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到關鍵字「{request.keyword}」的 SERP 數據,請先執行搜尋研究。"
            )

        logger.info(f"Generating AI titles for keyword: {request.keyword}, intent: {request.intent}, titles count: {len(titles)}")
        
        suggestions = await AIService.generate_ai_titles(
            keyword=request.keyword,
            titles=titles,
            intent=request.intent
        )
        
        # 將生成結果持久化回 KeywordCache (覆蓋舊有建議)
        from app.models.db_models import KeywordCache
        kw_cache = db.query(KeywordCache).filter(
            KeywordCache.keyword == request.keyword
        ).first()
        if kw_cache:
            kw_cache.ai_suggestions = suggestions
            db.commit()
            logger.info(f"Persisted {len(suggestions)} suggestions to KeywordCache for: {request.keyword}")

        logger.info(f"Successfully generated {len(suggestions)} title suggestions")
        
        return TitleGenerationResponse(
            keyword=request.keyword,
            suggestions=[TitleSuggestion(**s) for s in suggestions]
        )
    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except RuntimeError as e:
        # AI Service 配置錯誤
        logger.error(f"AI Service configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 服務配置錯誤：{str(e)}。請檢查系統設定中的 AI API 金鑰是否正確配置。"
        )
    except Exception as e:
        # 其他未預期的錯誤
        logger.error(f"Unexpected error in generate_titles: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"標題生成失敗：{str(e)}。請稍後再試或聯繫系統管理員。"
        )
    finally:
        db.close()
