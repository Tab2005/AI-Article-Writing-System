import os
import logging
import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import TopicalMap, TopicalCluster, TopicalKeyword, User
from app.services.dataforseo_service import DataForSEOService
from app.services.ai_service import AIService
from app.utils.ai_utils import parse_ai_json
from app.services.credit_service import CreditService

logger = logging.getLogger(__name__)

class TopicalMapService:
    @staticmethod
    async def generate_map_task(db: Session, map_id: str, user_id: str):
        """非同步生成主題地圖的任務"""
        topical_map = db.query(TopicalMap).filter(TopicalMap.id == map_id).first()
        if not topical_map:
            logger.error(f"Topical Map {map_id} not found")
            return

        try:
            # 1. 獲取關鍵字數據 (DataForSEO)
            logger.info(f"Fetching keywords for topic: {topical_map.topic} (Location: {topical_map.country}, Lang: {topical_map.language})")
            
            language_code = DataForSEOService.resolve_language_code(topical_map.language)
            location_code = DataForSEOService.resolve_location_code(topical_map.country)
            
            from app.services.serp_service import SERPService
            config = SERPService.get_config()
            
            keyword_data = await DataForSEOService.get_keyword_ideas(
                keyword=topical_map.topic,
                user_id=user_id,
                language_code=language_code,
                location_code=location_code,
                db=db,
                login=config.dataforseo_login,
                password=config.dataforseo_password,
                force_refresh=True
            )
            
            suggestions = keyword_data.get("suggestions", [])
            if not suggestions:
                error_msg = keyword_data.get("error") or "No keywords found for this topic"
                logger.error(f"DataForSEO error: {error_msg}")
                raise ValueError(error_msg)

            logger.info(f"Successfully fetched {len(suggestions)} keywords from DataForSEO")

            # 限制處理數量，避免 AI 負擔過重
            suggestions = suggestions[:300]
            
            # 2. AI 語義聚類
            logger.info(f"Clustering {len(suggestions)} keywords with AI...")
            clusters_data = await TopicalMapService._cluster_keywords_with_ai(topical_map.topic, suggestions)
            
            if not clusters_data:
                logger.warning("AI clustering returned no data, creating a fallback cluster")
                clusters_data = [{
                    "name": "General",
                    "description": "Unclassified keywords",
                    "subclusters": [{
                        "name": "Related Keywords",
                        "description": "Keywords related to the main topic",
                        "keywords": [s["keyword"] for s in suggestions]
                    }]
                }]
            
            # 3. 儲存至資料庫
            logger.info("Saving clusters and keywords to database")
            await TopicalMapService._save_clusters_and_keywords(db, topical_map, clusters_data, suggestions)
            
            # 4. 更新地圖狀態
            topical_map.status = "completed"
            topical_map.total_keywords = len(suggestions)
            topical_map.total_search_volume = sum(s.get("search_volume", 0) or 0 for s in suggestions)
            db.commit()
            
            logger.info(f"Topical Map {map_id} generation completed successfully")

        except Exception as e:
            logger.error(f"Topical Map generation failed: {str(e)}")
            topical_map.status = "failed"
            db.commit()

    @staticmethod
    async def _cluster_keywords_with_ai(topic: str, keywords: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """利用 AI 對關鍵字進行分層聚類"""
        kw_list = [k["keyword"] for k in keywords]
        batch_size = 100
        all_clusters = []
        
        for i in range(0, len(kw_list), batch_size):
            batch = kw_list[i:i+batch_size]
            prompt = f"""你是一位 SEO 戰略專家。請針對核心主題「{topic}」，將以下關鍵字進行語義聚類。
請建立一個兩層的結構：
1. L1 (Main Topic): 大類主題
2. L2 (Sub-topic): 子類主題

請將每個關鍵字分配到最合適的 L2 子主題下。

關鍵字列表：
{', '.join(batch)}

請以 JSON 格式回傳，格式如下：
[
  {{
    "name": "L1 主題名稱",
    "description": "簡短描述",
    "subclusters": [
      {{
        "name": "L2 子主題名稱",
        "description": "簡短描述",
        "keywords": ["關鍵字1", "關鍵字2"]
      }}
    ]
  }}
]
"""
            
            try:
                content = await AIService.generate_content(prompt, temperature=0.3)
                batch_clusters = parse_ai_json(content)
                if batch_clusters:
                    all_clusters.extend(batch_clusters)
            except Exception as e:
                logger.error(f"AI Clustering batch {i} failed: {e}")
        
        return all_clusters

    @staticmethod
    async def _save_clusters_and_keywords(db: Session, topical_map: TopicalMap, clusters_data: List[Dict[str, Any]], raw_keywords: List[Dict[str, Any]]):
        """將聚類結果持久化到資料庫"""
        kw_lookup = {k["keyword"]: k for k in raw_keywords}
        
        for l1_data in clusters_data:
            l1_node = TopicalCluster(
                id=str(uuid.uuid4()),
                topical_map_id=topical_map.id,
                name=l1_data["name"],
                description=l1_data.get("description"),
                level=1
            )
            db.add(l1_node)
            
            for l2_data in l1_data.get("subclusters", []):
                l2_node = TopicalCluster(
                    id=str(uuid.uuid4()),
                    topical_map_id=topical_map.id,
                    parent_id=l1_node.id,
                    name=l2_data["name"],
                    description=l2_data.get("description"),
                    level=2
                )
                db.add(l2_node)
                
                for kw_text in l2_data.get("keywords", []):
                    raw_data = kw_lookup.get(kw_text, {"keyword": kw_text})
                    kw_node = TopicalKeyword(
                        cluster_id=l2_node.id,
                        keyword=kw_text,
                        search_volume=raw_data.get("search_volume", 0) or 0,
                        cpc=raw_data.get("cpc", 0.0) or 0.0,
                        competition=raw_data.get("competition", 0.0) or 0.0,
                        intent=raw_data.get("intent"),
                        status="pending"
                    )
                    db.add(kw_node)
        
        db.commit()

topical_map_service = TopicalMapService()
