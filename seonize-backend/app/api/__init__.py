# Seonize Backend - API Package
from .projects import router as projects_router
from .research import router as research_router
from .analysis import router as analysis_router
from .writing import router as writing_router
from .settings import router as settings_router
from .prompts import router as prompts_router
from .auth import router as auth_router
from .kalpa import router as kalpa_router
from .cms import router as cms_router


__all__ = [
    "projects_router",
    "research_router",
    "analysis_router",
    "writing_router",
    "settings_router",
    "prompts_router",
    "auth_router",
    "kalpa_router",
    "cms_router",
]

