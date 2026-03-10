"""
Seonize Backend - Database Configuration
支援 SQLite (本地) 和 PostgreSQL (生產) 自動切換
"""

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

logger = logging.getLogger(__name__)

from app.core.config import settings

# 從統一配置中心取得資料庫 URL
DATABASE_URL = settings.DATABASE_URL

# 修正 PostgreSQL 協定頭 (SQLAlchemy 2.0+ 強制要求使用 postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 判斷資料庫類型
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = DATABASE_URL.startswith("postgresql")

# 建立引擎
if IS_SQLITE:
    # SQLite 設定 - 處理多執行緒
    # 移除 StaticPool 以允許真正的併發 (SQLite WAL 模式支援)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30},
        echo=False,
    )
    
    # SQLite 啟用外鍵約束與 WAL 模式
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        # 啟用 WAL (Write-Ahead Logging) 模式，大幅提升併發讀寫效能
        cursor.execute("PRAGMA journal_mode=WAL")
        # 設定同步模式為 NORMAL (在效能與資料安全性間取得平衡)
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    # PostgreSQL 設定
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=5, # 增加逾時防止啟動掛死
        echo=False,
    )

# Session 工廠
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 基礎模型類別
Base = declarative_base()


def get_db():
    """FastAPI Dependency - 取得資料庫 session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context Manager - 用於非 FastAPI 場景"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """初始化資料庫 - 適應性建立表格並套用遷移"""
    import traceback
    from app.models.db_models import (
        User, Project, Settings, SerpCache, KeywordCache, 
        CompetitiveCache, PromptTemplate, CMSConfig, 
        KalpaMatrix, KalpaNode, CreditLog
    )
    
    # 遮蔽敏感資訊的日誌
    display_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    logger.info(f"Connecting to database: {display_url}")
    
    # 1. 建立基本結構 (僅 SQLite 模式下啟動，生產環境交給 Alembic)
    if IS_SQLITE:
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("SQLite base metadata created.")
        except Exception as e:
            logger.error(f"Failed to create base metadata: {e}")
    
    # 2. 執行 Alembic 自動遷移 (生產環境結構升級的核心)
    try:
        from alembic.config import Config
        from alembic import command
        
        # 尋找 alembic.ini (使用相對路徑容錯)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ini_path = os.path.join(base_dir, "alembic.ini")
        
        # 如果第一級找不到，試試當前目錄或上一級 (適應 Zeabur 的 root 變動)
        if not os.path.exists(ini_path):
            ini_path = os.path.join(os.getcwd(), "alembic.ini")
            
        if os.path.exists(ini_path):
            logger.info(f"Running migrations using {ini_path}...")
            alembic_cfg = Config(ini_path)
            alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
            
            logger.info("Starting Alembic upgrade to 'head'...")
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic upgrade successfully completed.")
        else:
            logger.warning("alembic.ini not found, skipping auto-migration.")
            
    except Exception as e:
        logger.error(f"Migration error (non-fatal): {e}")
        logger.error(traceback.format_exc())
        # 不讓遷移錯誤阻斷進程啟動，以便進入 /api/health 診斷

    logger.info("Initialization sequence finished.")


def get_database_info() -> dict:
    """取得資料庫資訊"""
    return {
        "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
        "type": "sqlite" if IS_SQLITE else "postgresql" if IS_POSTGRES else "unknown",
        "is_local": IS_SQLITE,
    }
