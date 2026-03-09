"""
Seonize Backend - Pydantic Models for Project State
專案狀態物件
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime, timezone
import uuid


class SearchIntent(str, Enum):
    INFORMATIONAL = "informational"
    COMMERCIAL = "commercial"
    NAVIGATIONAL = "navigational"
    TRANSACTIONAL = "transactional"


class WritingStyle(str, Enum):
    EDUCATIONAL = "專業教育風"
    REVIEW = "評論風"
    NEWS = "新聞風"
    CONVERSATIONAL = "對話風"
    TECHNICAL = "技術風"


class OptimizationMode(str, Enum):
    SEO = "seo"
    AEO = "aeo"  # Answer Engine Optimization
    GEO = "geo"  # Generative Engine Optimization
    HYBRID = "hybrid"


class KeywordData(BaseModel):
    secondary: List[str] = Field(default_factory=list, description="次要關鍵字")
    lsi: List[str] = Field(default_factory=list, description="LSI 相關詞")
    density: Optional[Dict[str, float]] = Field(default=None, description="關鍵字密度")


class OutlineSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    heading: str
    level: int = Field(ge=2, le=6)  # H2-H6
    content: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    children: List["OutlineSection"] = Field(default_factory=list)


class OutlineData(BaseModel):
    h1: str
    sections: List[OutlineSection] = Field(default_factory=list)


class SERPResult(BaseModel):
    rank: int
    url: str
    title: str
    snippet: str
    headings: List[str] = Field(default_factory=list)
    sitelinks: List[Dict[str, str]] = Field(default_factory=list) # [{title: '', url: ''}]
    faq: List[Dict[str, str]] = Field(default_factory=list)       # [{question: '', answer: ''}]
    rating: Optional[Dict[str, Any]] = None                      # {value: 4.5, votes_count: 120}
    price: Optional[Dict[str, Any]] = None                       # {value: 99.0, currency: 'USD'}
    about_this_result: Optional[Dict[str, Any]] = None
    main_domain: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None                     # {estimated_traffic: 100, ...}


class ProjectState(BaseModel):
    """專案狀態物件 - 對應 SSD v2.0 定義"""
    project_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # User Inputs
    primary_keyword: str = Field(..., description="核心關鍵字")
    country: str = Field(default="TW", description="搜尋國家")
    language: str = Field(default="zh-TW", description="語言")
    
    # Analysis Results
    intent: Optional[SearchIntent] = None
    style: Optional[WritingStyle] = None
    optimization_mode: OptimizationMode = OptimizationMode.SEO
    
    # SERP Data
    serp_results: List[SERPResult] = Field(default_factory=list)
    research_data: Optional[Dict[str, Any]] = Field(default=None, description="研究數據 (PAA, 相關搜尋, etc.)")
    
    # Keywords
    keywords: KeywordData = Field(default_factory=KeywordData)
    
    # Title Candidates
    candidate_titles: List[str] = Field(default_factory=list)
    selected_title: Optional[str] = None
    
    # Outline
    outline: Optional[OutlineData] = None
    
    # Generated Content
    full_content: str = ""
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    # SEO Metrics
    word_count: int = 0
    keyword_density: Dict[str, float] = Field(default_factory=dict)
    eeat_score: Optional[float] = None
    quality_report: Optional[Dict[str, Any]] = None
    last_audit_at: Optional[datetime] = None


class ProjectCreate(BaseModel):
    primary_keyword: str
    country: str = "TW"
    language: str = "zh-TW"
    optimization_mode: OptimizationMode = OptimizationMode.SEO


class ProjectUpdate(BaseModel):
    selected_title: Optional[str] = None
    intent: Optional[SearchIntent] = None
    style: Optional[WritingStyle] = None
    outline: Optional[OutlineData] = None
    optimization_mode: Optional[OptimizationMode] = None
    candidate_titles: Optional[List[str]] = None
    research_data: Optional[Dict[str, Any]] = None
    full_content: Optional[str] = None
    word_count: Optional[int] = None
