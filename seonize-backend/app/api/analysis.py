"""
Seonize Backend - Analysis API Router
意圖分析與策略建議 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from app.models.project import SearchIntent, WritingStyle

router = APIRouter()


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

    def jieba_tokenizer(text: str) -> List[str]:
        return [t for t in jieba.lcut(text) if t.strip()]

    stop_words = {request.keyword, "的", "是", "了", "和", "與", "及", "在", "也", "或", "為", "如何", "什麼"}

    tfidf = TfidfVectorizer(tokenizer=jieba_tokenizer, stop_words=stop_words)
    tfidf_matrix = tfidf.fit_transform(corpus) if corpus else None
    feature_names = tfidf.get_feature_names_out().tolist() if corpus else []

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
    
    # Generate title suggestions
    title_templates = [
        f"2026 {request.keyword}完整指南：從入門到精通",
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
async def generate_outline(request: OutlineRequest):
    """
    生成知識圖譜大綱
    第三階段：知識圖譜大綱規劃
    """
    import uuid
    
    # 根據意圖生成邏輯鏈條
    logic_chains = {
        SearchIntent.INFORMATIONAL: ["定義說明", "原理解析", "步驟教學", "注意事項", "常見問題"],
        SearchIntent.COMMERCIAL: ["產品概述", "功能比較", "優缺點分析", "使用心得", "購買建議"],
        SearchIntent.TRANSACTIONAL: ["產品介紹", "使用方法", "價格方案", "購買流程", "售後服務"],
        SearchIntent.NAVIGATIONAL: ["官方資訊", "功能介紹", "使用指南", "聯繫方式"],
    }
    
    chain = logic_chains.get(request.intent, logic_chains[SearchIntent.INFORMATIONAL])
    
    sections = [
        OutlineSection(
            id=str(uuid.uuid4()),
            heading=f"{section}：{request.keyword}",
            level=2,
            description=f"關於{request.keyword}的{section}說明",
            keywords=request.selected_keywords[:2] if request.selected_keywords else []
        )
        for section in chain
    ]
    
    return OutlineResponse(
        h1=f"2026 {request.keyword}完整指南",
        sections=sections,
        logic_chain=chain
    )
