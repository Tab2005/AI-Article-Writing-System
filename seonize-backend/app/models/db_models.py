"""
Seonize Backend - SQLAlchemy Database Models
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base, IS_SQLITE
from app.core.security import encrypt_value, decrypt_value

# 命名慣例，用於 Alembic 遷移
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

Base.metadata.naming_convention = naming_convention

def get_uuid_type():
    """根據資料庫類型返回適當的 UUID 類型"""
    if IS_SQLITE:
        return String(36)
    return PG_UUID(as_uuid=True)

class User(Base):
    """使用者模型"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # super_admin, vip, user
    credits = Column(Integer, default=0)
    membership_level = Column(Integer, default=1)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    prompt_templates = relationship("PromptTemplate", back_populates="user", cascade="all, delete-orphan")      
    cms_configs = relationship("CMSConfig", back_populates="user", cascade="all, delete-orphan")
    kalpa_matrices = relationship("KalpaMatrix", back_populates="user", cascade="all, delete-orphan")
    credit_logs = relationship("CreditLog", back_populates="user", cascade="all, delete-orphan")
    topical_maps = relationship("TopicalMap", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "role": self.role,
            "credits": self.credits,
            "membership_level": self.membership_level,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class Project(Base):
    """專案模型"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    primary_keyword = Column(String(255), nullable=False, index=True)
    country = Column(String(10), default="TW")
    language = Column(String(10), default="zh-TW")

    intent = Column(String(20), nullable=True)
    style = Column(String(50), nullable=True)
    optimization_mode = Column(String(20), default="seo")

    candidate_titles = Column(JSON, default=list)
    selected_title = Column(Text, nullable=True)

    keywords = Column(JSON, default=dict)
    research_data = Column(JSON, nullable=True)
    content_gap_report = Column(JSON, nullable=True)

    outline = Column(JSON, nullable=True)
    full_content = Column(Text, default="")
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)

    word_count = Column(Integer, default=0)
    keyword_density = Column(JSON, default=dict)
    eeat_score = Column(Float, nullable=True)
    images = Column(JSON, default=list)

    quality_report = Column(JSON, nullable=True)
    style_blueprint = Column(Text, nullable=True)
    last_audit_at = Column(DateTime, nullable=True)

    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True)
    cms_post_id = Column(String(100), nullable=True)
    publish_status = Column(String(20), default="draft")
    cms_publish_url = Column(Text, nullable=True)
    llm_summary = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="projects")
    cms_config = relationship("CMSConfig")

    def to_dict(self) -> dict:
        return {
            "project_id": self.id,
            "user_id": self.user_id,
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
            "content_gap_report": self.content_gap_report,
            "outline": self.outline,
            "content": self.full_content or "",
            "full_content": self.full_content or "",
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "word_count": self.word_count or 0,
            "keyword_density": self.keyword_density or {},
            "eeat_score": self.eeat_score,
            "images": self.images or [],
            "quality_report": self.quality_report,
            "style_blueprint": self.style_blueprint,
            "last_audit_at": self.last_audit_at.replace(tzinfo=timezone.utc).isoformat() if self.last_audit_at else None,
            "cms_config_id": self.cms_config_id,
            "cms_post_id": self.cms_post_id,
            "publish_status": self.publish_status,
            "cms_publish_url": self.cms_publish_url,
            "llm_summary": self.llm_summary,
            "scheduled_at": self.scheduled_at.replace(tzinfo=timezone.utc).isoformat() if self.scheduled_at else None,
            "published_at": self.published_at.replace(tzinfo=timezone.utc).isoformat() if self.published_at else None,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class Settings(Base):
    """系統設定模型"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    encrypted = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_value(cls, db, key: str, default: str = None) -> str:
        setting = db.query(cls).filter(cls.key == key).first()
        if not setting or setting.value is None:
            return default
        if setting.encrypted:
            return decrypt_value(setting.value)
        return setting.value

    @classmethod
    def set_value(cls, db, key: str, value: str, encrypted: bool = False):
        setting = db.query(cls).filter(cls.key == key).first()
        if setting:
            if any(k in key for k in ["api_key", "password", "login"]):
                value = value.strip()
            if encrypted:
                value = encrypt_value(value)
            setting.value = value
            setting.encrypted = encrypted
        else:
            if any(k in key for k in ["api_key", "password", "login"]):
                value = value.strip()
            if encrypted:
                value = encrypt_value(value)
            setting = cls(key=key, value=value, encrypted=encrypted)
            db.add(setting)
        db.commit()
        return setting

class SerpCache(Base):
    """SERP 快取模型"""
    __tablename__ = "serp_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String(255), nullable=False, index=True)
    country = Column(String(10), default="TW")
    language = Column(String(10), default="zh-TW")
    results = Column(JSON, nullable=True)
    content_gap_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return True
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        return now > self.expires_at

class KeywordCache(Base):
    """關鍵字快取模型"""
    __tablename__ = "keyword_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    keyword = Column(String(255), nullable=False, index=True)
    location_code = Column(Integer, nullable=False)
    language_code = Column(String(10), nullable=False)
    seed_data = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)
    ai_suggestions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    user = relationship("User")

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        return now > self.expires_at

class CompetitiveCache(Base):
    """競爭力分析快取模型"""
    __tablename__ = "competitive_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(Text, nullable=False, index=True)
    h_tags = Column(JSON, nullable=True)
    content_stats = Column(JSON, nullable=True)
    meta_info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        return now > self.expires_at

class PromptTemplate(Base):
    """提示詞模板模型"""
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="prompt_templates")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category": self.category,
            "name": self.name,
            "description": self.description,
            "content": self.content,
            "is_active": self.is_active,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class CMSConfig(Base):
    """CMS 設定模型"""
    __tablename__ = "cms_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    platform = Column(String(20), nullable=False)
    api_url = Column(Text, nullable=False)
    api_key = Column(Text, nullable=True)
    username = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    auto_publish_enabled = Column(Boolean, default=False)
    frequency_type = Column(String(20), default="day")
    frequency_count = Column(Integer, default=1)
    last_auto_published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="cms_configs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "platform": self.platform,
            "api_url": self.api_url,
            "username": self.username,
            "is_active": self.is_active,
            "auto_publish_enabled": self.auto_publish_enabled,
            "frequency_type": self.frequency_type,
            "frequency_count": self.frequency_count,
            "last_auto_published_at": self.last_auto_published_at.replace(tzinfo=timezone.utc).isoformat() if self.last_auto_published_at else None,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class KalpaMatrix(Base):
    """劫之眼矩陣模型"""
    __tablename__ = "kalpa_matrices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    project_name = Column(String(255), nullable=False, index=True)
    industry = Column(String(100), default="Crypto")
    money_page_url = Column(Text, nullable=True)
    entities = Column(JSON, default=list)
    actions = Column(JSON, default=list)
    pain_points = Column(JSON, default=list)
    anchor_variants = Column(JSON, default=list)
    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="kalpa_matrices")
    nodes = relationship("KalpaNode", back_populates="matrix", cascade="all, delete-orphan")
    cms_config = relationship("CMSConfig")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "project_name": self.project_name,
            "industry": self.industry,
            "money_page_url": self.money_page_url,
            "entities": self.entities or [],
            "actions": self.actions or [],
            "pain_points": self.pain_points or [],
            "anchor_variants": self.anchor_variants or [],
            "cms_config_id": self.cms_config_id,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class KalpaNode(Base):
    """劫之眼節點模型"""
    __tablename__ = "kalpa_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    matrix_id = Column(String(36), ForeignKey("kalpa_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    entity = Column(String(100))
    action = Column(String(100))
    pain_point = Column(String(100))
    target_title = Column(Text)
    status = Column(String(20), default="pending")
    woven_content = Column(Text, nullable=True)
    anchor_used = Column(String(255), nullable=True)
    woven_at = Column(DateTime, nullable=True)
    images = Column(JSON, default=list)
    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True)
    cms_post_id = Column(String(100), nullable=True)
    publish_status = Column(String(20), default="draft")
    cms_publish_url = Column(Text, nullable=True)
    llm_summary = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    matrix = relationship("KalpaMatrix", back_populates="nodes")
    user = relationship("User")
    cms_config = relationship("CMSConfig")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "matrix_id": self.matrix_id,
            "entity": self.entity,
            "action": self.action,
            "pain_point": self.pain_point,
            "target_title": self.target_title,
            "status": self.status,
            "content": self.woven_content,
            "woven_content": self.woven_content,
            "anchor_used": self.anchor_used,
            "images": self.images or [],
            "woven_at": self.woven_at.replace(tzinfo=timezone.utc).isoformat() if self.woven_at else None,      
            "cms_config_id": self.cms_config_id,
            "cms_post_id": self.cms_post_id,
            "publish_status": self.publish_status,
            "cms_publish_url": self.cms_publish_url,
            "llm_summary": self.llm_summary,
            "scheduled_at": self.scheduled_at.replace(tzinfo=timezone.utc).isoformat() if self.scheduled_at else None,
            "published_at": self.published_at.replace(tzinfo=timezone.utc).isoformat() if self.published_at else None,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }

class CreditLog(Base):
    """點數紀錄模型"""
    __tablename__ = "credit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    balance = Column(Integer, nullable=False)
    operation = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="credit_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "delta": self.delta,
            "balance": self.balance,
            "operation": self.operation,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }

class TopicalMap(Base):
    """主題地圖模型"""
    __tablename__ = "topical_maps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)        
    name = Column(String(255), nullable=False)
    topic = Column(String(255), nullable=False)
    country = Column(String(10), default="TW")
    language = Column(String(10), default="zh-TW")
    total_keywords = Column(Integer, default=0)
    total_search_volume = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="topical_maps")
    clusters = relationship("TopicalCluster", back_populates="topical_map", cascade="all, delete-orphan")       

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "topic": self.topic,
            "country": self.country,
            "language": self.language,
            "total_keywords": self.total_keywords,
            "total_search_volume": self.total_search_volume,
            "status": self.status,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
            "updated_at": self.updated_at.replace(tzinfo=timezone.utc).isoformat() if self.updated_at else None,
        }

class TopicalCluster(Base):
    """主題群聚模型"""
    __tablename__ = "topical_clusters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topical_map_id = Column(String(36), ForeignKey("topical_maps.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("topical_clusters.id", ondelete="CASCADE"), nullable=True)        
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    topical_map = relationship("TopicalMap", back_populates="clusters")
    parent = relationship("TopicalCluster", remote_side=[id], back_populates="subclusters")
    subclusters = relationship("TopicalCluster", back_populates="parent", cascade="all, delete-orphan")
    keywords = relationship("TopicalKeyword", back_populates="cluster", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "topical_map_id": self.topical_map_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "description": self.description,
            "level": self.level,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }

class TopicalKeyword(Base):
    """主題關鍵字模型"""
    __tablename__ = "topical_keywords"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_id = Column(String(36), ForeignKey("topical_clusters.id", ondelete="CASCADE"), nullable=False, index=True)
    keyword = Column(String(255), nullable=False)
    search_volume = Column(Integer, default=0)
    cpc = Column(Float, default=0.0)
    competition = Column(Float, default=0.0)
    intent = Column(String(50), nullable=True)
    suggested_title = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cluster = relationship("TopicalCluster", back_populates="keywords")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cluster_id": self.cluster_id,
            "keyword": self.keyword,
            "search_volume": self.search_volume,
            "cpc": self.cpc,
            "competition": self.competition,
            "intent": self.intent,
            "suggested_title": self.suggested_title,
            "status": self.status,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }
