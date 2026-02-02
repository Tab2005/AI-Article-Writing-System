"""
Seonize Backend - Writing API Router
內容生成 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.models.project import OptimizationMode
from app.services.ai_service import AIService

router = APIRouter()


class WritingSection(BaseModel):
    heading: str
    level: int
    keywords: List[str]
    previous_summary: str = ""


class WritingRequest(BaseModel):
    project_id: str
    section: WritingSection
    optimization_mode: OptimizationMode = OptimizationMode.SEO
    ai_model: str = "gemini"  # gemini or openai


class WritingResponse(BaseModel):
    heading: str
    content: str
    word_count: int
    embedded_keywords: List[str]
    summary: str


@router.post("/generate-section", response_model=WritingResponse)
async def generate_section(request: WritingRequest):
    """
    生成單一章節內容
    第四階段：分段迭代撰寫
    """
    result = await AIService.generate_section_content(
        heading=request.section.heading,
        keywords=request.section.keywords,
        previous_summary=request.section.previous_summary,
        optimization_mode=request.optimization_mode,
    )

    return WritingResponse(
        heading=result["heading"],
        content=result["content"],
        word_count=result["word_count"],
        embedded_keywords=result["embedded_keywords"],
        summary=result["summary"],
    )


class FullArticleRequest(BaseModel):
    project_id: str
    h1: str
    sections: List[WritingSection]
    optimization_mode: OptimizationMode = OptimizationMode.SEO


class FullArticleResponse(BaseModel):
    title: str
    content: str
    word_count: int
    keyword_density: Dict[str, float]
    meta_title: str
    meta_description: str


@router.post("/generate-full", response_model=FullArticleResponse)
async def generate_full_article(request: FullArticleRequest):
    """
    生成完整文章（批次處理所有章節）
    """
    full_content = f"# {request.h1}\n\n"
    summaries: List[str] = []
    all_keywords: List[str] = []

    for section in request.sections:
        result = await AIService.generate_section_content(
            heading=section.heading,
            keywords=section.keywords,
            previous_summary=summaries[-1] if summaries else "",
            optimization_mode=request.optimization_mode,
        )
        full_content += f"## {result['heading']}\n\n{result['content']}\n\n"
        summaries.append(result["summary"])
        all_keywords.extend(section.keywords)

    word_count = len(full_content.replace(" ", "").replace("\n", ""))

    def calc_density(content: str, keywords: List[str]) -> Dict[str, float]:
        density: Dict[str, float] = {}
        content_no_space = content.replace(" ", "").replace("\n", "")
        total_len = max(len(content_no_space), 1)
        for kw in set([k for k in keywords if k]):
            count = content_no_space.count(kw)
            density[kw] = round((count * len(kw)) / total_len * 100, 2)
        return density

    keyword_density = calc_density(full_content, all_keywords)

    return FullArticleResponse(
        title=request.h1,
        content=full_content,
        word_count=word_count,
        keyword_density=keyword_density,
        meta_title=f"{request.h1} | Seonize SEO 優質內容",
        meta_description=f"深入了解{request.h1}，本文提供完整指南、實用技巧與專業建議。"
    )


class SEOCheckRequest(BaseModel):
    content: str
    primary_keyword: str
    secondary_keywords: List[str] = []


class SEOCheckResponse(BaseModel):
    word_count: int
    keyword_density: Dict[str, float]
    readability_score: float
    eeat_signals: List[str]
    suggestions: List[str]


@router.post("/seo-check", response_model=SEOCheckResponse)
async def check_seo(request: SEOCheckRequest):
    """
    SEO 體檢與優化建議
    第五階段：SEO 體檢與優化
    """
    content = request.content
    word_count = len(content.replace(" ", "").replace("\n", ""))
    
    # Calculate keyword density
    primary_count = content.lower().count(request.primary_keyword.lower())
    density = (primary_count / max(word_count, 1)) * 100
    
    keyword_density = {request.primary_keyword: round(density, 2)}
    
    for kw in request.secondary_keywords:
        kw_count = content.lower().count(kw.lower())
        keyword_density[kw] = round((kw_count / max(word_count, 1)) * 100, 2)
    
    # Mock E-E-A-T signals detection
    eeat_signals = []
    if "專家" in content or "經驗" in content:
        eeat_signals.append("Experience 信號偵測到")
    if "研究" in content or "數據" in content:
        eeat_signals.append("Expertise 信號偵測到")
    if "來源" in content or "引用" in content:
        eeat_signals.append("Authoritativeness 信號偵測到")
    
    suggestions = []
    if density < 1.0:
        suggestions.append(f"建議增加主關鍵字「{request.primary_keyword}」的使用頻率")
    if density > 3.0:
        suggestions.append(f"主關鍵字密度過高，建議適度減少")
    if word_count < 1500:
        suggestions.append("建議將文章字數增加至 1500 字以上以提升 SEO 效果")
    if not eeat_signals:
        suggestions.append("建議添加更多 E-E-A-T 信號（專業經驗、數據引用等）")
    
    return SEOCheckResponse(
        word_count=word_count,
        keyword_density=keyword_density,
        readability_score=75.0,  # Mock score
        eeat_signals=eeat_signals,
        suggestions=suggestions
    )
