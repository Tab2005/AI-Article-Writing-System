"""
Seonize Backend - Research API Router
SERP 研究 API
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.models.project import SERPResult

router = APIRouter()


class ResearchRequest(BaseModel):
    keyword: str
    country: str = "TW"
    language: str = "zh-TW"
    num_results: int = 10


class ResearchResponse(BaseModel):
    keyword: str
    results: List[SERPResult]
    total_results: int


@router.post("/serp", response_model=ResearchResponse)
async def research_serp(request: ResearchRequest):
    """
    執行 SERP 研究 - 獲取 Google Top 10 搜尋結果
    第一階段：數據採集與研究
    """
    from app.services.serp_service import SERPService

    # 使用 SERP 服務執行搜尋
    results = await SERPService.search(
        keyword=request.keyword,
        num_results=request.num_results,
        country=request.country,
        language=request.language
    )

    return ResearchResponse(
        keyword=request.keyword,
        results=results,
        total_results=len(results)
    )


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
    # TODO: Implement with Playwright/httpx + BeautifulSoup
    mock_results = [
        CrawlResult(
            url=url,
            title=f"網頁標題 - {url}",
            headings=["H1: 主標題", "H2: 第一章", "H2: 第二章", "H3: 細節說明"],
            content="這是爬取的網頁內容範例...",
            word_count=1500
        )
        for url in request.urls[:5]  # Limit to 5 for demo
    ]
    
    return CrawlResponse(results=mock_results)
