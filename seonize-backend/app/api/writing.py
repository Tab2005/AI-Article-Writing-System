"""
Seonize Backend - Writing API Router
內容生成 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.models.project import OptimizationMode

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
    # TODO: Integrate with Gemini 2.5 Flash or OpenAI GPT-4o
    # For now, return mock content
    
    heading = request.section.heading
    keywords = request.section.keywords
    
    mock_content = f"""## {heading}

{request.section.previous_summary}

針對{keywords[0] if keywords else '此主題'}，我們需要深入了解以下幾個重要面向。

### 核心概念

在探討{heading}之前，首先需要建立正確的基礎認知。{keywords[0] if keywords else '相關知識'}的掌握，是理解整體架構的關鍵。

### 實踐方法

根據專業建議，以下是具體的執行步驟：

1. **第一步**：進行初步評估與規劃
2. **第二步**：實施核心策略
3. **第三步**：追蹤成效並持續優化

### 注意事項

在執行過程中，請特別注意以下幾點：

- 確保數據準確性
- 保持內容的一致性
- 定期檢視並調整策略

透過以上方法，您可以更有效地掌握{keywords[0] if keywords else '此領域'}的精髓。
"""
    
    word_count = len(mock_content.replace(" ", "").replace("\n", ""))
    
    return WritingResponse(
        heading=heading,
        content=mock_content,
        word_count=word_count,
        embedded_keywords=keywords[:3] if keywords else [],
        summary=f"本章節介紹了{heading}的核心概念、實踐方法與注意事項。"
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
    # TODO: Implement full article generation with iteration control
    
    full_content = f"# {request.h1}\n\n"
    
    for section in request.sections:
        full_content += f"## {section.heading}\n\n"
        full_content += "此章節內容正在生成中...\n\n"
    
    word_count = len(full_content.replace(" ", "").replace("\n", ""))
    
    return FullArticleResponse(
        title=request.h1,
        content=full_content,
        word_count=word_count,
        keyword_density={"主關鍵字": 2.5, "次關鍵字": 1.2},
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
