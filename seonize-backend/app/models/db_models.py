"""
Seonize Backend - SQLAlchemy Database Models
"""

import uuid
import os
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base, IS_SQLITE
from app.core.security import encrypt_value, decrypt_value


# 根據資料庫類型選擇 UUID 類型
def get_uuid_type():
    if IS_SQLITE:
        return String(36)
    return PG_UUID(as_uuid=True)


class Project(Base):
    """專案資料表"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    primary_keyword = Column(String(255), nullable=False, index=True)
    country = Column(String(10), default="TW")
    language = Column(String(10), default="zh-TW")
    
    # 分析結果
    intent = Column(String(20), nullable=True)  # informational, commercial, navigational, transactional
    style = Column(String(50), nullable=True)   # 專業教育風, 評論風, etc.
    optimization_mode = Column(String(20), default="seo")  # seo, aeo, geo, hybrid
    
    # 標題
    candidate_titles = Column(JSON, default=list)
    selected_title = Column(Text, nullable=True)
    
    # 關鍵字
    keywords = Column(JSON, default=dict)  # {secondary: [], lsi: [], density: {}}
    research_data = Column(JSON, nullable=True) # 儲存 PAA, 相關搜尋, AI Overview 等研究數據
    
    # 大綱
    outline = Column(JSON, nullable=True)  # {h1: "", sections: []}
    
    # 內容
    full_content = Column(Text, default="")
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)
    
    # 指標
    word_count = Column(Integer, default=0)
    keyword_density = Column(JSON, default=dict)
    eeat_score = Column(Float, nullable=True)
    
    # 時間戳記
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        """轉換為字典"""
        return {
            "project_id": self.id,
            "primary_keyword": self.primary_keyword,
            "country": self.country,
            "language": self.language,
            "intent": self.intent,
            "style": self.style,
            "optimization_mode": self.optimization_mode,
            "candidate_titles": self.candidate_titles or [],
            "selected_title": self.selected_title,
            "keywords": self.keywords or {"secondary": [], "lsi": []},
            "research_data": self.research_data or {"paa": [], "related_searches": [], "ai_overview": None},
            "outline": self.outline,
            "full_content": self.full_content or "",
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "word_count": self.word_count or 0,
            "keyword_density": self.keyword_density or {},
            "eeat_score": self.eeat_score,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }


class Settings(Base):
    """系統設定資料表"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    encrypted = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_value(cls, db, key: str, default: str = None) -> str:
        """取得設定值，全量由資料庫管理"""
        setting = db.query(cls).filter(cls.key == key).first()
        if not setting or setting.value is None:
            return default
        
        # 如果標記為加密，則進行解密
        if setting.encrypted:
            return decrypt_value(setting.value)
            
        return setting.value

    @classmethod
    def set_value(cls, db, key: str, value: str, encrypted: bool = False):
        """設定值"""
        setting = db.query(cls).filter(cls.key == key).first()
        if setting:
            # 如果是金鑰、密碼或帳號，自動去前後空白
            if any(k in key for k in ["api_key", "password", "login"]):
                value = value.strip()
            
            # 如果需要加密
            if encrypted:
                value = encrypt_value(value)
                
            setting.value = value
            setting.encrypted = encrypted
        else:
            if any(k in key for k in ["api_key", "password", "login"]):
                value = value.strip()
            
            # 如果需要加密
            if encrypted:
                value = encrypt_value(value)
                
            setting = cls(key=key, value=value, encrypted=encrypted)
            db.add(setting)
        db.commit()
        return setting


class SerpCache(Base):
    """SERP 快取資料表"""
    __tablename__ = "serp_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String(255), nullable=False, index=True)
    country = Column(String(10), default="TW")
    language = Column(String(10), default="zh-TW")
    results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return True
        return datetime.now(timezone.utc) > self.expires_at

class KeywordCache(Base):
    """關鍵字快取資料表，儲存 Keyword Ideas 研究結果"""
    __tablename__ = "keyword_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String(255), nullable=False, index=True)
    location_code = Column(Integer, nullable=False)
    language_code = Column(String(10), nullable=False)
    
    seed_data = Column(JSON, nullable=True)     # 核心詞數據 {search_volume, cpc, ...}
    suggestions = Column(JSON, nullable=True)   # 長尾詞建議列表 [{keyword, search_volume, ...}]
    ai_suggestions = Column(JSON, nullable=True) # AI 產出的 5 個標題建議列表
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False # 預設不逾期
        return datetime.now(timezone.utc) > self.expires_at

class CompetitiveCache(Base):
    """競爭對手網頁內容快取資料表"""
    __tablename__ = "competitive_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(Text, nullable=False, index=True)
    h_tags = Column(JSON, nullable=True)     # [{tag: 'h2', text: '...'}, ...]
    content_stats = Column(JSON, nullable=True) # {word_count: 1200, images_count: 5, ...}
    meta_info = Column(JSON, nullable=True)    # {title: '...', description: '...'}
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at

class PromptTemplate(Base):
    """指令模板資料表"""
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, index=True) # title_generation, outline_generation, etc.
    name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category": self.category,
            "name": self.name,
            "content": self.content,
            "is_active": self.is_active,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }


class KalpaMatrix(Base):
    """因果矩陣專案資料表"""
    __tablename__ = "kalpa_matrices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_name = Column(String(255), nullable=False, index=True)
    industry = Column(String(100), default="Crypto")
    money_page_url = Column(Text, nullable=True)
    
    # 原始配置
    entities = Column(JSON, default=list)
    actions = Column(JSON, default=list)
    pain_points = Column(JSON, default=list)
    anchor_variants = Column(JSON, default=list)  # 法寶袋：動態生成的錨點文字清單
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_name": self.project_name,
            "industry": self.industry,
            "money_page_url": self.money_page_url,
            "entities": self.entities or [],
            "actions": self.actions or [],
            "pain_points": self.pain_points or [],
            "anchor_variants": self.anchor_variants or [],
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }


class KalpaNode(Base):
    """因果矩陣節點（意圖）資料表"""
    __tablename__ = "kalpa_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    matrix_id = Column(String(36), nullable=False, index=True)
    
    entity = Column(String(100))
    action = Column(String(100))
    pain_point = Column(String(100))
    target_title = Column(Text)
    
    # 編織結果
    status = Column(String(20), default="pending")  # pending, weaving, completed, failed
    woven_content = Column(Text, nullable=True)
    anchor_used = Column(String(255), nullable=True)
    woven_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "matrix_id": self.matrix_id,
            "entity": self.entity,
            "action": self.action,
            "pain_point": self.pain_point,
            "target_title": self.target_title,
            "status": self.status,
            "woven_content": self.woven_content,
            "anchor_used": self.anchor_used,
            "woven_at": self.woven_at.replace(tzinfo=timezone.utc).isoformat() if self.woven_at else None,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }
