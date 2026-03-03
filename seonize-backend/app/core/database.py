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

# 從環境變數取得資料庫 URL，預設使用 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./seonize.db")

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
    """初始化資料庫 - 建立所有表格"""
    from app.models.db_models import (
        User, Project, Settings, SerpCache, KeywordCache, 
        CompetitiveCache, PromptTemplate, CMSConfig, 
        KalpaMatrix, KalpaNode, CreditLog
    )
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database initialized: {DATABASE_URL}")


def get_database_info() -> dict:
    """取得資料庫資訊"""
    return {
        "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
        "type": "sqlite" if IS_SQLITE else "postgresql" if IS_POSTGRES else "unknown",
        "is_local": IS_SQLITE,
    }
