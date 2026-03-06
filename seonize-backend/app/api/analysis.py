from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from app.models.project import SearchIntent, WritingStyle
from app.core.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
import logging
from app.services.credit_service import CreditService, CREDIT_COSTS
import uuid

logger = logging.getLogger(__name__)

# 配置路由依賴為全域登入
router = APIRouter(dependencies=[Depends(get_current_user)])


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
async def analyze_intent(
    request: AnalysisRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    執行意圖分析與策略建議 (僅限登入使用者)
    """
    # 意圖偵測邏輯 (保持不變)
    keyword_lower = request.keyword.lower()
    
    # ... (略過中間邏輯) ...
    # 判斷意圖並計算信心分數
    signal_count = 0
    if any(word in keyword_lower for word in ["如何", "怎麼", "什麼是", "為什麼"]):
        intent = SearchIntent.INFORMATIONAL
        style = WritingStyle.EDUCATIONAL
        signals = ["疑問詞觸發", "資訊需求特徵"]
        signal_count = sum(1 for word in ["如何", "怎麼", "什麼是", "為什麼"] if word in keyword_lower)
    elif any(word in keyword_lower for word in ["推薦", "比較", "最好", "評價"]):
        intent = SearchIntent.COMMERCIAL
        style = WritingStyle.REVIEW
        signals = ["商業評估詞觸發", "購買意圖特徵"]
        signal_count = sum(1 for word in ["推薦", "比較", "最好", "評價"] if word in keyword_lower)
    elif any(word in keyword_lower for word in ["購買", "價格", "下載", "訂閱"]):
        intent = SearchIntent.TRANSACTIONAL
        style = WritingStyle.CONVERSATIONAL
        signals = ["交易動作詞觸發"]
        signal_count = sum(1 for word in ["購買", "價格", "下載", "訂閱"] if word in keyword_lower)
    else:
        intent = SearchIntent.INFORMATIONAL
        style = WritingStyle.EDUCATIONAL
        signals = ["預設為資訊型"]
        signal_count = 0
    
    confidence = min(0.95, 0.6 + 0.1 * signal_count)
    
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
    
    from datetime import datetime
    current_year = datetime.now().year
    title_templates = [
        f"{current_year} {request.keyword}完整指南：從入門到精通",
        f"{request.keyword}必看！專家教你 5 個關鍵技巧",
        f"【深度解析】{request.keyword}的 10 個常見問題",
        f"{request.keyword}怎麼做？一篇文章告訴你所有答案",
        f"想學{request.keyword}？這篇文章一次搞定",
    ]
    
    title_suggestions = []
    for i, title in enumerate(title_templates):
        base_score = 0.7
        if request.keyword in title:
            base_score += 0.15
        if str(current_year) in title:
            base_score += 0.1
        rank_bonus = (5 - i) * 0.02
        ctr_score = min(0.95, base_score + rank_bonus)
        
        title_suggestions.append(TitleSuggestion(
            title=title,
            ctr_score=round(ctr_score, 2),
            intent_match=True
        ))
    
    return AnalysisResponse(
        intent_analysis=IntentResult(
            intent=intent,
            confidence=round(confidence, 2),
            signals=signals
        ),
        suggested_style=style,
        keywords=keywords,
        title_suggestions=title_suggestions
    )


class OutlineRequest(BaseModel):
    project_id: str
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
async def generate_outline(
    request: OutlineRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    生成文章大綱 (消耗 5 點)
    """
    from app.services.ai_service import AIService
    from app.models.db_models import Project, PromptTemplate
    
    # 點數扣除
    COST = CREDIT_COSTS["create_outline"]
    tx = CreditService.deduct(db, current_user, COST, f"AI 大綱生成: {request.keyword}")

    research_data = {}
    try:
        # 1. 驗證並載入專案中的研究數據
        db_project = db.query(Project).filter(
            Project.id == request.project_id,
            Project.user_id == current_user.id
        ).first()
        
        if not db_project:
            raise HTTPException(status_code=403, detail="找不到專案或權限不足")
            
        if db_project.research_data:
            research_data = db_project.research_data
        
        # 2. 從指令倉庫載入 Prompt Template（優先取用使用者的，次之取用系統預設）
        prompt_template = db.query(PromptTemplate).filter(
            PromptTemplate.category == "outline_generation",
            PromptTemplate.is_active == True,
            or_(PromptTemplate.user_id == current_user.id, PromptTemplate.user_id == None)
        ).order_by(PromptTemplate.user_id.desc()).first()
        
        prompt_content = prompt_template.content if prompt_template else None
            
        # 3. 調用 AI 產出大綱
        ai_result = await AIService.generate_outline(
            keyword=request.keyword,
            intent=request.intent,
            keywords=request.selected_keywords,
            research_data=research_data,
            custom_prompt=prompt_content
        )
        
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
            logic_chain=["AI 語義分佈", "PAA 織入", "GEO 優化結構", "✓ 權限校驗通過"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Outline generation failed: {e}")
        return OutlineResponse(
            h1=f"{datetime.now().year} {request.keyword}完整指南",
            sections=[],
            logic_chain=[f"生成失敗：{str(e)}"]
        )
@router.post("/content-gap")
async def get_content_gap(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    獲取內容缺口報告與 E-E-A-T 建議 (支援 Project ID, Matrix ID 或直接 Keyword)
    """
    project_id = request.get("project_id")
    keyword_param = request.get("keyword")
    
    if not project_id and not keyword_param:
        raise HTTPException(status_code=400, detail="未提供專案 ID 或關鍵字")
    
    from app.models.db_models import Project, KalpaMatrix, SerpCache
    from app.services.ai_service import AIService
    
    primary_keyword = None
    serp_results = []

    # 1. 優先處理 Project ID
    if project_id:
        # 嘗試尋找文章專案 (Project)
        db_project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
        
        if db_project:
            primary_keyword = db_project.primary_keyword
            serp_results = (db_project.research_data or {}).get("results", [])
        else:
            # 嘗試尋找因果矩陣 (KalpaMatrix)
            matrix = db.query(KalpaMatrix).filter(KalpaMatrix.id == project_id, KalpaMatrix.user_id == current_user.id).first()
            if matrix:
                primary_keyword = matrix.project_name
            else:
                # 如果有提供 keyword_param，則回退到關鍵字查詢
                if keyword_param:
                    primary_keyword = keyword_param
                else:
                    raise HTTPException(status_code=404, detail="找不到相關專案或矩陣")
    else:
        # 僅提供關鍵字
        primary_keyword = keyword_param

    # 2. 如果目前沒有 serp_results，嘗試從快取中獲取
    if not serp_results and primary_keyword:
        cache = db.query(SerpCache).filter(SerpCache.keyword == primary_keyword).order_by(SerpCache.created_at.desc()).first()
        if cache and not cache.is_expired:
            serp_results = (cache.results or {}).get("results", [])
        
    if not serp_results:
        # 如果沒有研究數據，則返回 400 告知需要研究
        raise HTTPException(
            status_code=400, 
            detail=f"『{primary_keyword}』尚無研究數據。請先在『關鍵字研究』執行搜尋，或稍候再試。"
        )

    try:
        report = await AIService.generate_content_gap_report(primary_keyword, serp_results)
        return report
    except Exception as e:
        logger.error(f"Generate content gap failed: {e}")
        raise HTTPException(status_code=500, detail=f"生成報告失敗: {str(e)}")
