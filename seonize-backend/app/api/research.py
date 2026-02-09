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


class ResearchHistoryItem(BaseModel):
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
    error: Optional[str] = None


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
            db=db
        )
    finally:
        db.close()
    
    results = search_data.get("results", [])
    ai_overview = search_data.get("ai_overview")
    paa = search_data.get("paa", [])
    related_searches = search_data.get("related_searches", [])
    error = search_data.get("error")

    return ResearchResponse(
        keyword=request.keyword,
        results=results,
        total_results=len(results),
        ai_overview=ai_overview,
        paa=paa,
        related_searches=related_searches,
        error=error,
    )


class KeywordIdeasRequest(BaseModel):
    keyword: str
    country: str = "TW"
    language: str = "zh-TW"


@router.post("/keyword-ideas")
async def get_keyword_ideas(request: KeywordIdeasRequest):
    """
    獲取關鍵字建議與數據 (Keyword Ideas)
    支援資料庫快取
    """
    from app.services.dataforseo_service import DataForSEOService
    from app.services.serp_service import SERPService, SERPProvider
    from app.core.database import SessionLocal

    config = SERPService.get_config()
    
    # 建立臨時 DB session
    db = SessionLocal()
    try:
        language_code = DataForSEOService.resolve_language_code(request.language)
        location_code = DataForSEOService.resolve_location_code(request.country)

        ideas_data = await DataForSEOService.get_keyword_ideas(
            keyword=request.keyword,
            language_code=language_code,
            location_code=location_code,
            db=db,
            login=config.dataforseo_login,
            password=config.dataforseo_password
        )
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
