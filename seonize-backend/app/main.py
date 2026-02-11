import logging
import os

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("backend_diagnostic.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import projects, research, analysis, settings, prompts, writing
from app.api import settings as settings_router
from app.core.config import settings
from app.core.database import init_db
from app.core.cache import CacheManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    # 啟動時
    print("Seonize Backend starting...")
    init_db()  # 初始化資料庫
    CacheManager.get_instance()  # 初始化快取
    print("Seonize Backend ready!")
    
    yield
    
    # 關閉時
    print("Seonize Backend shutting down...")


app = FastAPI(
    title="Seonize API",
    description="數據驅動的 AI SEO 撰寫系統 API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(research.router, prefix="/api/research", tags=["Research"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(writing.router, prefix="/api/writing", tags=["Writing"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(prompts.router, prefix="/api/prompts", tags=["Prompts"])


@app.get("/")
async def root():
    return {"message": "Welcome to Seonize API", "version": "2.0.0"}


@app.get("/api/health")
async def health_check():
    from app.core.database import get_database_info
    from app.core.cache import get_cache
    
    return {
        "status": "healthy",
        "database": get_database_info(),
        "cache": get_cache().get_stats(),
    }
