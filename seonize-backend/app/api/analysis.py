"""
Seonize Backend - Analysis API Router
意圖分析與策略建議 API
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from app.models.project import SearchIntent, WritingStyle
from app.core.auth import get_current_admin
from sqlalchemy.orm import Session
from app.core.database import get_db
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_admin)])


class AnalysisRequest(BaseModel):
    keyword: str
    titles: List[str]
    content_samples: List[str] = []


class IntentResult(BaseModel):
    intent: SearchIntent
    confidence: float
    signals: List[str]


class KeywordExtractionResult(BaseModel):
    secondary_keywords: List[str]
    lsi_keywords: List[str]
    keyword_weights: Dict[str, float]


class TitleSuggestion(BaseModel):
    title: str
    ctr_score: float
    intent_match: bool


class AnalysisResponse(BaseModel):
    intent_analysis: IntentResult
    suggested_style: WritingStyle
    keywords: KeywordExtractionResult
    title_suggestions: List[TitleSuggestion]


@router.post("/intent", response_model=AnalysisResponse)
async def analyze_intent(request: AnalysisRequest):
    """
    執行意圖分析與策略建議
    第二階段：意圖分析與策略建議
    """
    # 意圖偵測邏輯 (簡化版)
    keyword_lower = request.keyword.lower()
    
    # 判斷意圖
    if any(word in keyword_lower for word in ["如何", "怎麼", "什麼是", "為什麼"]):
        intent = SearchIntent.INFORMATIONAL
        style = WritingStyle.EDUCATIONAL
        signals = ["疑問詞觸發", "資訊需求特徵"]
    elif any(word in keyword_lower for word in ["推薦", "比較", "最好", "評價"]):
        intent = SearchIntent.COMMERCIAL
        style = WritingStyle.REVIEW
        signals = ["商業評估詞觸發", "購買意圖特徵"]
    elif any(word in keyword_lower for word in ["購買", "價格", "下載", "訂閱"]):
        intent = SearchIntent.TRANSACTIONAL
        style = WritingStyle.CONVERSATIONAL
        signals = ["交易動作詞觸發"]
    else:
        intent = SearchIntent.INFORMATIONAL
        style = WritingStyle.EDUCATIONAL
        signals = ["預設為資訊型"]
    
    # 關鍵字抽取：jieba + TF-IDF
    corpus = [request.keyword] + request.titles + request.content_samples
    corpus = [c for c in corpus if c and c.strip()]

    stop_words = {request.keyword, "的", "是", "了", "和", "與", "及", "在", "也", "或", "為", "如何", "什麼", " ", "\n", "\t"}

    def jieba_tokenizer(text: str) -> List[str]:
        tokens = jieba.lcut(text)
        return [t for t in tokens if t.strip() and t not in stop_words]

    tfidf = TfidfVectorizer(tokenizer=jieba_tokenizer, stop_words=None)
    
    try:
        tfidf_matrix = tfidf.fit_transform(corpus) if corpus else None
        feature_names = tfidf.get_feature_names_out().tolist() if (tfidf_matrix is not None and len(tfidf.vocabulary_) > 0) else []
    except ValueError:
        # 處理 vocabulary 為空的情況
        tfidf_matrix = None
        feature_names = []

    keyword_scores: Dict[str, float] = {}
    if tfidf_matrix is not None and feature_names:
        scores = tfidf_matrix.mean(axis=0).A1
        keyword_scores = {feature_names[i]: float(scores[i]) for i in range(len(feature_names))}

    sorted_keywords = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)
    secondary_keywords = [k for k, _ in sorted_keywords if k not in stop_words][:8]
    lsi_keywords = [k for k, _ in sorted_keywords if k not in stop_words][8:16]

    keywords = KeywordExtractionResult(
        secondary_keywords=secondary_keywords,
        lsi_keywords=lsi_keywords,
        keyword_weights=keyword_scores,
    )
    
    # Generate title suggestions with dynamic year
    from datetime import datetime
    current_year = datetime.now().year
    title_templates = [
        f"{current_year} {request.keyword}完整指南：從入門到精通",
        f"{request.keyword}必看！專家教你 5 個關鍵技巧",
        f"【深度解析】{request.keyword}的 10 個常見問題",
        f"{request.keyword}怎麼做？一篇文章告訴你所有答案",
        f"想學{request.keyword}？這篇文章一次搞定",
    ]
    
    title_suggestions = [
        TitleSuggestion(
            title=title,
            ctr_score=0.9 - (i * 0.1),
            intent_match=True
        )
        for i, title in enumerate(title_templates)
    ]
    
    return AnalysisResponse(
        intent_analysis=IntentResult(
            intent=intent,
            confidence=0.85,
            signals=signals
        ),
        suggested_style=style,
        keywords=keywords,
        title_suggestions=title_suggestions
    )


class OutlineRequest(BaseModel):
    project_id: str                      # 新增：關聯的專案 ID
    keyword: str
    intent: SearchIntent
    selected_keywords: List[str]


class OutlineSection(BaseModel):
    id: str
    heading: str
    level: int
    description: str
    keywords: List[str]


class OutlineResponse(BaseModel):
    h1: str
    sections: List[OutlineSection]
    logic_chain: List[str]


@router.post("/outline", response_model=OutlineResponse)
async def generate_outline(request: OutlineRequest, db: Session = Depends(get_db)):
    """
    生成文章大綱 - 語義數據驅動版（整合指令倉庫）
    """
    from app.services.ai_service import AIService
    from app.models.db_models import Project, PromptTemplate
    
    research_data = {}
    try:
        # 1. 嘗試載入專案中的研究數據 (PAA, 相關搜尋)
        db_project = db.query(Project).filter(Project.id == request.project_id).first()
        if db_project and db_project.research_data:
            research_data = db_project.research_data
        
        # 2. 從指令倉庫載入 Prompt Template
        prompt_template = db.query(PromptTemplate).filter(
            PromptTemplate.category == "outline_generation",
            PromptTemplate.is_active == True
        ).first()
        
        if not prompt_template:
            # 備用：使用預設 prompt
            prompt_content = None
        else:
            prompt_content = prompt_template.content
            
        # 3. 調用 AI 產出大綱（傳入 prompt_content）
        ai_result = await AIService.generate_outline(
            keyword=request.keyword,
            intent=request.intent,
            keywords=request.selected_keywords,
            research_data=research_data,
            custom_prompt=prompt_content
        )
        
        # 偵錯：列印 AI 回傳結果
        logger.debug(f"AI Outline Result: {ai_result}")
        
        # 4. 處理 AI 回傳結果
        from datetime import datetime
        h1 = ai_result.get("h1", f"{datetime.now().year} {request.keyword}完整指南")
        sections = []
        for idx, s in enumerate(ai_result.get("sections", [])):
            sections.append(OutlineSection(
                id=str(uuid.uuid4()),
                heading=s.get("heading", f"章節 {idx+1}"),
                level=s.get("level", 2),
                description=s.get("description", ""),
                keywords=s.get("keywords", [])
            ))
            
        return OutlineResponse(
            h1=h1,
            sections=sections,
            logic_chain=["AI 語義分佈", "PAA 織入", "GEO 優化結構", "✓ 使用指令倉庫模板"]
        )
    except Exception as e:
        logger.error(f"Outline generation failed: {e}")
        # 備用機制 (保證 API 不會直接掛掉)
        from datetime import datetime
        return OutlineResponse(
            h1=f"{datetime.now().year} {request.keyword}完整指南",
            sections=[],
            logic_chain=[f"生成失敗：{str(e)}"]
        )
