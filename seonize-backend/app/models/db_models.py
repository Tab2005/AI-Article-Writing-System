"""
Seonize Backend - SQLAlchemy Database Models
"""

import uuid
import os
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey, MetaData
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base, IS_SQLITE
from app.core.security import encrypt_value, decrypt_value

# 定義命名慣例，這對於 Alembic 在 SQLite 下執行 batch 遷移至關重要
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# 套用命名慣例到 Base.metadata
Base.metadata.naming_convention = naming_convention


# 根據資料庫類型選擇 UUID 類型
def get_uuid_type():
    if IS_SQLITE:
        return String(36)
    return PG_UUID(as_uuid=True)


class User(Base):
    """使用者資料表"""
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
    """專案資料表"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # 歸屬使用者
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
    content_gap_report = Column(JSON, nullable=True) # 儲存 AI 產出的內容缺口與 EEAT 建議
    
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
    images = Column(JSON, default=list) # [{url, alt, caption, source}]
    
    # 品質審計
    quality_report = Column(JSON, nullable=True)
    last_audit_at = Column(DateTime, nullable=True)
    
    # CMS 發布資訊
    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True) # 關聯至 CMSConfig.id
    cms_post_id = Column(String(100), nullable=True)
    publish_status = Column(String(20), default="draft")  # draft, scheduled, published, failed
    cms_publish_url = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    # 時間戳記
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="projects")
    cms_config = relationship("CMSConfig")

    def to_dict(self) -> dict:
        """轉換為字典"""
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
            "content": self.full_content or "", # 統一為 content
            "full_content": self.full_content or "",
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "word_count": self.word_count or 0,
            "keyword_density": self.keyword_density or {},
            "eeat_score": self.eeat_score,
            "images": self.images or [],
            "quality_report": self.quality_report,
            "last_audit_at": self.last_audit_at.replace(tzinfo=timezone.utc).isoformat() if self.last_audit_at else None,
            "cms_config_id": self.cms_config_id,
            "cms_post_id": self.cms_post_id,
            "publish_status": self.publish_status,
            "cms_publish_url": self.cms_publish_url,
            "scheduled_at": self.scheduled_at.replace(tzinfo=timezone.utc).isoformat() if self.scheduled_at else None,
            "published_at": self.published_at.replace(tzinfo=timezone.utc).isoformat() if self.published_at else None,
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
    content_gap_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return True
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # 如果 self.expires_at 沒有時區資訊 (常見於 SQLite)，則也將 now 轉換為無時區時間作比較
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
            
        return now > self.expires_at

class KeywordCache(Base):
    """關鍵字快取資料表，儲存 Keyword Ideas 研究結果"""
    __tablename__ = "keyword_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # 歸屬使用者
    keyword = Column(String(255), nullable=False, index=True)
    location_code = Column(Integer, nullable=False)
    language_code = Column(String(10), nullable=False)
    
    seed_data = Column(JSON, nullable=True)     # 核心詞數據 {search_volume, cpc, ...}
    suggestions = Column(JSON, nullable=True)   # 長尾詞建議列表 [{keyword, search_volume, ...}]
    ai_suggestions = Column(JSON, nullable=True) # AI 產出的 5 個標題建議列表
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User")

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False # 預設不逾期
            
        from datetime import timezone
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
            
        return now > self.expires_at

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
            
        from datetime import timezone
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
            
        return now > self.expires_at

class PromptTemplate(Base):
    """指令模板資料表"""
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # 歸屬使用者 (NULL 代表系統預設)
    category = Column(String(50), nullable=False, index=True) # title_generation, outline_generation, etc.
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True) # 用於儲存觸發關鍵字或人格說明
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
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
    """CMS 站點設定資料表"""
    __tablename__ = "cms_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # 歸屬使用者
    name = Column(String(100), nullable=False)
    platform = Column(String(20), nullable=False)  # ghost, wordpress
    api_url = Column(Text, nullable=False)
    
    # Auth 資訊 (加密儲存)
    api_key = Column(Text, nullable=True)         # Ghost Admin API Key 或 WP App Password
    username = Column(String(100), nullable=True) # WP 專用
    
    is_active = Column(Boolean, default=True)
    
    # 自動循環發布設定
    auto_publish_enabled = Column(Boolean, default=False)
    frequency_type = Column(String(20), default="day") # hour, day, week
    frequency_count = Column(Integer, default=1)      # 單位時間內的發布篇數
    last_auto_published_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
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
    """因果矩陣專案資料表"""
    __tablename__ = "kalpa_matrices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True) # 歸屬使用者
    project_name = Column(String(255), nullable=False, index=True)
    industry = Column(String(100), default="Crypto")
    money_page_url = Column(Text, nullable=True)
    
    # 原始配置
    entities = Column(JSON, default=list)
    actions = Column(JSON, default=list)
    pain_points = Column(JSON, default=list)
    anchor_variants = Column(JSON, default=list)  # 法寶袋：動態生成的錨點文字清單
    
    # CMS 發布資訊
    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True) # 預設發布站點
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
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
    """因果矩陣節點（意圖）資料表"""
    __tablename__ = "kalpa_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # 歸屬使用者
    matrix_id = Column(String(36), ForeignKey("kalpa_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    entity = Column(String(100))
    action = Column(String(100))
    pain_point = Column(String(100))
    target_title = Column(Text)
    
    # 編織與發布結果
    status = Column(String(20), default="pending")  # pending, weaving, completed, failed
    woven_content = Column(Text, nullable=True)
    anchor_used = Column(String(255), nullable=True)
    woven_at = Column(DateTime, nullable=True)
    images = Column(JSON, default=list) # [{url, alt, caption, source}]
    
    # CMS 發布資訊
    cms_config_id = Column(String(36), ForeignKey("cms_configs.id", ondelete="SET NULL"), nullable=True)
    cms_post_id = Column(String(100), nullable=True)
    publish_status = Column(String(20), default="draft")  # draft, scheduled, published, failed
    cms_publish_url = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
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
            "content": self.woven_content, # 統一為 content
            "woven_content": self.woven_content, # 保留舊欄位以防止其他潛在點崩潰
            "anchor_used": self.anchor_used,
            "images": self.images or [],
            "woven_at": self.woven_at.replace(tzinfo=timezone.utc).isoformat() if self.woven_at else None,
            "cms_config_id": self.cms_config_id,
            "cms_post_id": self.cms_post_id,
            "publish_status": self.publish_status,
            "cms_publish_url": self.cms_publish_url,
            "scheduled_at": self.scheduled_at.replace(tzinfo=timezone.utc).isoformat() if self.scheduled_at else None,
            "published_at": self.published_at.replace(tzinfo=timezone.utc).isoformat() if self.published_at else None,
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
        }


class CreditLog(Base):
    """點數異動記錄表（扣點 / 退款歷程）"""
    __tablename__ = "credit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)      # 正數=入帳/退還, 負數=扣除
    balance = Column(Integer, nullable=False)    # 操作後餘額快照
    operation = Column(String(150), nullable=True)  # 操作名稱
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
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
