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
    h1: str = ""                         # 新增：整體文章標題
    section: WritingSection
    optimization_mode: OptimizationMode = OptimizationMode.SEO
    ai_model: str = "gemini"              # gemini or openai
    target_word_count: int = 400         # 新增：目標字數
    keyword_density: float = 2.0         # 新增：目標關鍵字密度


class WritingResponse(BaseModel):
    heading: str
    content: str
    word_count: int
    embedded_keywords: List[str]
    summary: str


@router.post("/generate-section", response_model=WritingResponse)
async def generate_section(request: WritingRequest):
    """
    生成單一章節內容 - 整合指令倉庫
    """
    from app.core.database import SessionLocal
    from app.models.db_models import PromptTemplate
    
    db = SessionLocal()
    prompt_content = None
    research_context = ""
    try:
        # 從資料庫獲取專案的研究數據與背景
        from app.models.db_models import Project
        db_project = db.query(Project).filter(Project.id == request.project_id).first()
        if db_project and db_project.research_data:
            rd = db_project.research_data
            parts = []
            if rd.get('paa'):
                parts.append("常見問題 (PAA): " + "; ".join(rd['paa'][:5]))
            if rd.get('related_searches'):
                parts.append("相關搜尋: " + ", ".join(rd['related_searches'][:5]))
            if rd.get('ai_overview'):
                parts.append("AI 概覽重點: " + str(rd['ai_overview'])[:500])
            research_context = "\n".join(parts)

        # 從指令倉庫載入 Prompt Template
        template = db.query(PromptTemplate).filter(
            PromptTemplate.category == "content_writing",
            PromptTemplate.is_active == True
        ).first()
        if template:
            prompt_content = template.content
            
        result = await AIService.generate_section_content(
            heading=request.section.heading,
            keywords=request.section.keywords,
            previous_summary=request.section.previous_summary,
            optimization_mode=request.optimization_mode.value,
            target_word_count=request.target_word_count,
            keyword_density=request.keyword_density,
            h1=request.h1,
            custom_prompt=prompt_content,
            research_context=research_context
        )

        return WritingResponse(
            heading=result["heading"],
            content=result["content"],
            word_count=result["word_count"],
            embedded_keywords=result["embedded_keywords"],
            summary=result["summary"],
        )
    finally:
        db.close()


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
    
    # Mock E-E-A-T signals detection - 加強偵測邏輯
    eeat_signals = []
    content_lower = content.lower()
    
    # 經驗與專業 (Experience/Expertise)
    if any(kw in content_lower for kw in ["專家", "經驗", "實測", "親身", "筆者", "觀點"]):
        eeat_signals.append("Experience/Expertise (經驗與專業信號)")
        
    # 權威性 (Authoritativeness)
    if any(kw in content_lower for kw in ["研究", "數據", "調查", "報告", "根據", "指出", "顯示", "學術"]):
        eeat_signals.append("Authoritativeness (權威與引述信號)")
        
    # 信任度 (Trustworthiness)
    if any(kw in content_lower for kw in ["來源", "引用", "參考資料", "連結", "官方"]):
        eeat_signals.append("Trustworthiness (信任與來源信號)")
    
    suggestions = []
    if density < 1.0:
        suggestions.append(f"建議增加主關鍵字「{request.primary_keyword}」的使用頻率")
    if density > 3.0:
        suggestions.append(f"主關鍵字密度過高，建議適度減少")
    if word_count < 1500:
        suggestions.append("建議將文章字數增加至 1500 字以上以提升 SEO 效果")
    if len(eeat_signals) < 2:
        suggestions.append("建議強化 E-E-A-T 信號：增加具體數據引用 (如「根據...指出」) 或專家評論語氣")
    
    return SEOCheckResponse(
        word_count=word_count,
        keyword_density=keyword_density,
        readability_score=75.0,  # Mock score
        eeat_signals=eeat_signals,
        suggestions=suggestions
    )
@router.post("/projects/{project_id}/analyze-competition")
async def analyze_competition(project_id: str):
    """
    對專案的關鍵字進行 SERP 競爭對手深度分析 (H2/H3 抓取)
    """
    from app.core.database import SessionLocal
    from app.models.db_models import Project, Settings
    from app.services.dataforseo_service import DataForSEOService
    import asyncio
    
    db = SessionLocal()
    try:
        db_project = db.query(Project).filter(Project.id == project_id).first()
        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # 取得 DataForSEO 憑證
        login = Settings.get_value(db, "dataforseo_login")
        password = Settings.get_value(db, "dataforseo_password")
        
        if not login or not password:
            raise HTTPException(status_code=400, detail="DataForSEO 憑證未設定，請至系統設定配置 DataForSEO。")

        # 1. 取得 SERP 結果
        serp_data = db_project.research_data or {}
        results = serp_data.get("results", [])
        
        if not results:
            return {"error": "請先執行基礎研究以獲取搜尋結果列表", "competitors": []}

        # 2. 針對前 5 名競爭對手進行深度抓取
        competitor_analysis = []
        top_competitors = results[:5]
        
        tasks = []
        for comp in top_competitors:
            url = comp.get("url")
            if url:
                tasks.append(DataForSEOService.get_page_structure(url, login, password, db))
        
        # 並行執行抓取任務
        analysis_results = await asyncio.gather(*tasks)
        
        for i, res in enumerate(analysis_results):
            comp_info = {
                "rank": top_competitors[i].get("rank"),
                "url": top_competitors[i].get("url"),
                "title": top_competitors[i].get("title"),
                "snippet": top_competitors[i].get("snippet"),
                "structure": res
            }
            competitor_analysis.append(comp_info)
            
        return {
            "project_id": project_id,
            "keyword": db_project.primary_keyword,
            "competitors": competitor_analysis,
            "serp_features": serp_data.get("serp_features", [])
        }
    finally:
        db.close()
