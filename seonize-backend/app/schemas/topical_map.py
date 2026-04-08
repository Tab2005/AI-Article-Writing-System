from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TopicalKeywordBase(BaseModel):
    keyword: str
    search_volume: int = 0
    cpc: float = 0.0
    competition: float = 0.0
    intent: Optional[str] = None
    suggested_title: Optional[str] = None

class TopicalKeywordResponse(TopicalKeywordBase):
    id: int
    cluster_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TopicalClusterBase(BaseModel):
    name: str
    description: Optional[str] = None
    level: int = 1

class TopicalClusterResponse(TopicalClusterBase):
    id: str
    topical_map_id: str
    parent_id: Optional[str] = None
    created_at: datetime
    keywords: List[TopicalKeywordResponse] = []
    subclusters: List['TopicalClusterResponse'] = []

    class Config:
        from_attributes = True

class TopicalMapBase(BaseModel):
    name: str
    topic: str
    country: str = "TW"
    language: str = "zh-TW"

class TopicalMapCreate(TopicalMapBase):
    pass

class TopicalMapResponse(TopicalMapBase):
    id: str
    user_id: str
    total_keywords: int
    total_search_volume: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# For the tree view visualization
class TopicalMapDetailResponse(TopicalMapResponse):
    clusters: List[TopicalClusterResponse] = []

# To update the Pydantic self-referencing model
TopicalClusterResponse.model_rebuild()
