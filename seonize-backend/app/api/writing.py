from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.models.project import OptimizationMode
from app.services.ai_service import AIService
from app.services.credit_service import CreditService, CREDIT_COSTS
from app.core.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
import re

# 配置路由依賴為全域登入
router = APIRouter(dependencies=[Depends(get_current_user)])


def calculate_readability(content: str) -> float:
    """
    計算中文文章的可讀性分數 (0-100)
    考量平均句長、段落密度與標點符號。
    """
    if not content or not content.strip():
        return 0.0
    
    # 移除空白與換行進行基礎統計
    clean_text = content.replace(" ", "").replace("\n", "").replace("\t", "").replace("\r", "")
    total_chars = len(clean_text)
    if total_chars == 0:
        return 0.0
    
    # 1. 句子切分 (使用標點符號)
    sentences = re.split(r'[。！？；]', content)
    sentences = [s.strip() for s in sentences if s.strip()]
    num_sentences = len(sentences)
    
    # 如果全無標點符號，基礎分數大幅下降
    if num_sentences == 0:
        return 40.0
    
    avg_sentence_len = total_chars / num_sentences
    
    # 2. 評分邏輯 (以 100 為基準)
    score = 100.0
    
    # 理想的平均句長在 15-25 字之間
    if avg_sentence_len > 30:
        # 太長扣分
        score -= (avg_sentence_len - 30) * 1.5
    elif avg_sentence_len < 8:
        # 太短(太破碎)也稍微扣分
        score -= (8 - avg_sentence_len) * 0.5
        
    # 3. 段落密度
    paragraphs = [p for p in content.split("\n") if p.strip()]
    if paragraphs:
        avg_para_len = total_chars / len(paragraphs)
        # 單段超過 250 字會讓人壓力大
        if avg_para_len > 250:
            score -= (avg_para_len - 250) / 5
            
    # 4. 長句懲罰 (單句超過 60 字)
    long_sentences = [s for s in sentences if len(s) > 60]
    score -= len(long_sentences) * 2
    
    return max(0.0, min(100.0, round(score, 1)))


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
async def generate_section(
    request: WritingRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    生成單一章節內容 (僅限擁有者)
    """
    from app.models.db_models import PromptTemplate, Project
    
    # 1. 驗證專案所有權
    db_project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=403, detail="找不到專案或權限不足")

    prompt_content = None
    research_context = ""
    
    if db_project.research_data:
        rd = db_project.research_data
        parts = []
        if rd.get('paa'):
            parts.append("常見問題 (PAA): " + "; ".join(rd['paa'][:5]))
        if rd.get('related_searches'):
            parts.append("相關搜尋: " + ", ".join(rd['related_searches'][:5]))
        if rd.get('ai_overview'):
            parts.append("AI 概覽重點: " + str(rd['ai_overview'])[:500])
        research_context = "\n".join(parts)

    # 2. 從指令倉庫載入 Prompt Template（優先取用使用者的，次之取用系統預設）
    template = db.query(PromptTemplate).filter(
        PromptTemplate.category == "content_writing",
        PromptTemplate.is_active == True,
        or_(PromptTemplate.user_id == current_user.id, PromptTemplate.user_id == None)
    ).order_by(PromptTemplate.user_id.desc()).first()
    
    if template:
        prompt_content = template.content
        
    # ── 點數檢查與扣減 ──────────────────────────
    COST = CREDIT_COSTS["writing_section"]
    tx = CreditService.deduct(db, current_user, COST, "生成段落")
    # ────────────────────────────────────────────

    try:
        result = await AIService.generate_section_content(
            heading=request.section.heading,
            keywords=request.section.keywords,
            previous_summary=request.section.previous_summary,
            optimization_mode=request.optimization_mode.value,
            target_word_count=request.target_word_count,
            keyword_density=request.keyword_density,
            h1=request.h1,
            custom_prompt=prompt_content,
            research_context=research_context,
            quality_report=db_project.quality_report
        )

        # 驗證 AI 回傳內容有效性
        if not result or not result.get("content", "").strip():
            CreditService.refund(db, current_user, COST, "AI 生成段落內容為空")
            raise HTTPException(status_code=500, detail="AI 生成內容為空，已退還點數。")

        return WritingResponse(
            heading=result["heading"],
            content=result["content"],
            word_count=result["word_count"],
            embedded_keywords=result["embedded_keywords"],
            summary=result["summary"],
        )
    except HTTPException:
        raise
    except Exception as e:
        if not tx.get("skipped"):
            CreditService.refund(db, current_user, COST, f"generate_section 異常: {str(e)[:80]}")
        raise HTTPException(status_code=500, detail=f"段落生成失敗，已退還點數。原因：{str(e)}")


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
async def generate_full_article(
    request: FullArticleRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    生成完整文章 (僅限擁有者)
    """
    from app.models.db_models import Project, PromptTemplate
    # 0. 從指令倉庫載入 Prompt Template（優先取用使用者的，次之取用系統預設）
    template = db.query(PromptTemplate).filter(
        PromptTemplate.category == "content_writing",
        PromptTemplate.is_active == True,
        or_(PromptTemplate.user_id == current_user.id, PromptTemplate.user_id == None)
    ).order_by(PromptTemplate.user_id.desc()).first()
    
    prompt_content = template.content if template else None

    # 驗證專案所有權
    db_project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=403, detail="找不到專案或權限不足")

    # ── 點數檢查與扣減 ──────────────────────────
    # 1. 權限檢查：全篇生成需一般會員以上
    CreditService.check_feature_access(current_user, "writing_full")
    
    # 2. 扣減點數
    COST = CREDIT_COSTS["writing_full"]
    tx = CreditService.deduct(db, current_user, COST, "生成完整文章")
    # ────────────────────────────────────────────

    try:
        full_content = f"# {request.h1}\n\n"
        summaries: List[str] = []
        all_keywords: List[str] = []

        # 準備研究數據文本
        research_context = ""
        if db_project and db_project.research_data:
            rd = db_project.research_data
            parts = []
            if rd.get('paa'): parts.append("PAA: " + "; ".join(rd['paa'][:5]))
            if rd.get('related_searches'): parts.append("相關: " + ", ".join(rd['related_searches'][:5]))
            research_context = "\n".join(parts)

        for section in request.sections:
            result = await AIService.generate_section_content(
                heading=section.heading,
                keywords=section.keywords,
                previous_summary=summaries[-1] if summaries else "",
                optimization_mode=request.optimization_mode.value,
                h1=request.h1,
                custom_prompt=prompt_content,
                research_context=research_context,
                quality_report=db_project.quality_report
            )
            full_content += f"## {result['heading']}\n\n{result['content']}\n\n"
            summaries.append(result["summary"])
            all_keywords.extend(section.keywords)

        if not full_content.strip():
            CreditService.refund(db, current_user, COST, "AI 完整文章內容為空")
            raise HTTPException(status_code=500, detail="AI 生成內容為空，已退還點數。")

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
    except HTTPException:
        raise
    except Exception as e:
        if not tx.get("skipped"):
            CreditService.refund(db, current_user, COST, f"generate_full 異常: {str(e)[:80]}")
        raise HTTPException(status_code=500, detail=f"文章生成失敗，已退還點數。原因：{str(e)}")


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
    SEO 體檢與優化建議 (僅限登入使用者)
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
    content_lower = content.lower()
    
    if any(kw in content_lower for kw in ["專家", "經驗", "實測", "親身", "筆者", "觀點"]):
        eeat_signals.append("Experience/Expertise (經驗與專業信號)")
        
    if any(kw in content_lower for kw in ["研究", "數據", "調查", "報告", "根據", "指出", "顯示", "學術"]):
        eeat_signals.append("Authoritativeness (權威與引述信號)")
        
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
        readability_score=calculate_readability(content),
        eeat_signals=eeat_signals,
        suggestions=suggestions
    )

@router.post("/projects/{project_id}/analyze-competition")
async def analyze_competition(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    對專案的關鍵字進行 SERP 競爭對手深度分析 (僅限擁有者)
    """
    from app.models.db_models import Project
    from app.services.dataforseo_service import DataForSEOService
    import asyncio
    
    # 1. 驗證專案所有權
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=403, detail="找不到專案或權限不足")

    # 2. 取得 SERP 結果
    serp_data = db_project.research_data or {}
    results = serp_data.get("results", [])
    
    if not results:
        return {"error": "請先執行基礎研究以獲取搜尋結果列表", "competitors": []}

    # 3. 針對前 5 名競爭對手進行深度抓取
    competitor_analysis = []
    top_competitors = results[:5]
    
    tasks = []
    for comp in top_competitors:
        url = comp.get("url")
        if url:
            # 修改處：這裡之前可能有引用錯誤，確保參數傳遞正確
            tasks.append(DataForSEOService.get_page_structure(url))
    
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
class QualityAnalysisRequest(BaseModel):
    project_id: str
    content: str

@router.post("/analyze-quality")
async def analyze_quality(
    request: QualityAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    對文章進行深度品質審計 (消耗 3 點，並持久化至專案)
    """
    from app.models.db_models import Project
    from datetime import datetime
    
    # 1. 驗證專案
    db_project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=403, detail="找不到專案或權限不足")

    # 2. 點數扣除
    COST = CREDIT_COSTS.get("quality_audit", 3)
    tx = CreditService.deduct(db, current_user, COST, f"品質健檢: {db_project.primary_keyword}")

    try:
        # 3. 取得戰略背景 (Content Gap Report)
        gap_report = db_project.content_gap_report
        
        # 4. 執行 AI 分析
        analysis = await AIService.analyze_article_quality(request.content, gap_report=gap_report)
        
        # 5. 持久化至資料庫
        db_project.quality_report = analysis
        db_project.last_audit_at = datetime.now()
        db_project.eeat_score = analysis.get("score", db_project.eeat_score)
        db.commit()
        
        return analysis
    except Exception as e:
        CreditService.refund(db, current_user, COST, f"品質分析失敗: {str(e)[:50]}")
        raise HTTPException(status_code=500, detail=f"品質分析失敗: {str(e)}")
