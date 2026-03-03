import logging
import os

import sys
import traceback

# 立即刷新輸出以防止在崩潰時日誌丟失
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

print("🚀 Seonize Backend pre-init starting...")

try:
    # 配置基礎日誌 (僅輸出到 stdout/stderr 以符合容器最佳實務)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger(__name__)

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from contextlib import asynccontextmanager
    
    # 延遲導入 app 組件以捕獲導入錯誤
    from app.api import (
        projects_router,
        research_router,
        analysis_router,
        prompts_router,
        writing_router,
        auth_router,
        settings_router as settings_api_router,
        kalpa_router,
        cms_router,
        users_router,
    )
    from app.core.config import settings as app_settings
    from app.core.database import init_db
    from app.core.cache import CacheManager
    from app.services.scheduler_service import start_scheduler

except Exception as e:
    print(f"❌ CRITICAL ERROR DURING BOOTSTRAP: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    # 啟動時
    logger.info("Seonize Backend starting...")
    try:
        import google.generativeai # type: ignore
    except ImportError:
        logger.warning("Warning: google-generativeai not installed. Gemini features will be limited.")
    
    init_db()  # 初始化資料庫
    logger.info(f"Database initialized: {app_settings.DATABASE_URL}")
    CacheManager.get_instance()  # 初始化快取
    
    # 啟動 CMS 排程器
    start_scheduler()
    
    logger.info("Seonize Backend ready!")
    
    yield
    
    # 關閉時
    logger.info("Seonize Backend shutting down...")


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
    allow_origins=app_settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(research_router, prefix="/api/research", tags=["Research"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(writing_router, prefix="/api/writing", tags=["Writing"])
app.include_router(settings_api_router, prefix="/api/settings", tags=["Settings"])
app.include_router(prompts_router, prefix="/api/prompts", tags=["Prompts"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(kalpa_router, prefix="/api/kalpa", tags=["Kalpa Matrix"])
app.include_router(cms_router, prefix="/api/cms", tags=["CMS Integration"])
app.include_router(users_router, prefix="/api/admin/users", tags=["Admin - User Management"])


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
