"""
Seonize Backend - SQLAlchemy Database Models
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base, IS_SQLITE


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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
            "outline": self.outline,
            "full_content": self.full_content or "",
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "word_count": self.word_count or 0,
            "keyword_density": self.keyword_density or {},
            "eeat_score": self.eeat_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Settings(Base):
    """系統設定資料表"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    encrypted = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @classmethod
    def get_value(cls, db, key: str, default: str = None) -> str:
        """取得設定值"""
        setting = db.query(cls).filter(cls.key == key).first()
        if not setting or setting.value is None:
            return default
        return setting.value

    @classmethod
    def set_value(cls, db, key: str, value: str, encrypted: bool = False):
        """設定值"""
        setting = db.query(cls).filter(cls.key == key).first()
        if setting:
            # 如果是金鑰類，自動去前後空白
            if "api_key" in key or "password" in key:
                value = value.strip()
            setting.value = value
            setting.encrypted = encrypted
        else:
            if "api_key" in key or "password" in key:
                value = value.strip()
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
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return True
        return datetime.utcnow() > self.expires_at
