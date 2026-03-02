import asyncio
import datetime
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.db_models import Project, KalpaNode, CMSConfig
from app.services.cms_service import cms_manager

logger = logging.getLogger(__name__)

async def scan_scheduled_posts():
    """
    掃描資料庫中已排程且過期的文章，並執行發布。
    """
    while True:
        try:
            db: Session = SessionLocal()
            now = datetime.datetime.now(datetime.timezone.utc)
            
            # 1. 掃描主要分析專案 (Projects)
            scheduled_projects = db.query(Project).filter(
                Project.publish_status == "scheduled",
                Project.scheduled_at <= now,
                Project.cms_config_id.isnot(None)
            ).all()

            for project in scheduled_projects:
                logger.info(f"Executing scheduled publish for project: {project.id}")
                await cms_manager.publish_article(
                    db, "project", project.id, project.cms_config_id, "published"
                )

            # 2. 掃描矩陣寫文節點 (KalpaNodes)
            scheduled_nodes = db.query(KalpaNode).filter(
                KalpaNode.publish_status == "scheduled",
                KalpaNode.scheduled_at <= now,
                KalpaNode.cms_config_id.isnot(None)
            ).all()

            for node in scheduled_nodes:
                logger.info(f"Executing scheduled publish for Kalpa node: {node.id}")
                await cms_manager.publish_article(
                    db, "kalpa_node", node.id, node.cms_config_id, "published"
                )

            db.close()
        except Exception as e:
            logger.error(f"Error in scheduler task: {e}")
            if 'db' in locals():
                db.close()
        
        # 每分鐘檢查一次
        await asyncio.sleep(60)

async def scan_auto_publish():
    """
    掃描已啟動「自動循環發布」的站點，並按頻率從庫存（草稿）派發文章。
    """
    while True:
        try:
            db: Session = SessionLocal()
            now = datetime.datetime.now(datetime.timezone.utc)
            
            # 取得所有開啟自動發布的站點
            configs = db.query(CMSConfig).filter(CMSConfig.auto_publish_enabled == True).all()
            
            for config in configs:
                # 計算發布間隔（秒）
                seconds_in_unit = {
                    "hour": 3600,
                    "day": 86400,
                    "week": 604800
                }.get(config.frequency_type, 86400)
                
                interval = seconds_in_unit / max(config.frequency_count, 1)
                
                # 檢查間隔是否達標
                can_publish = False
                if not config.last_auto_published_at:
                    can_publish = True
                else:
                    # 確保最後發布時間具備時區資訊以進行比較
                    last_published = config.last_auto_published_at
                    if last_published.tzinfo is None:
                        last_published = last_published.replace(tzinfo=datetime.timezone.utc)
                    
                    if (now - last_published).total_seconds() >= interval:
                        can_publish = True
                
                if can_publish:
                    # 尋找該站點所屬的庫存文章（草稿）
                    # 優先檢查 Project (主要分析寫文)
                    target = db.query(Project).filter(
                        Project.cms_config_id == config.id,
                        Project.publish_status == "draft"
                    ).order_by(Project.created_at.asc()).first()
                    
                    target_type = "project"
                    
                    if not target:
                        # 若無 Project，則檢查 KalpaNode (矩陣寫文)
                        target = db.query(KalpaNode).filter(
                            KalpaNode.cms_config_id == config.id,
                            KalpaNode.publish_status == "draft"
                        ).order_by(KalpaNode.created_at.asc()).first()
                        target_type = "kalpa_node"
                    
                    if target:
                        logger.info(f"Auto-publishing {target_type} {target.id} to {config.name} (Frequency: {config.frequency_count}/{config.frequency_type})")
                        # 執行實際發布邏輯
                        await cms_manager.publish_article(
                            db, target_type, target.id, config.id, "published"
                        )
                        # 更新該站點的次後發布時間標記
                        config.last_auto_published_at = datetime.datetime.now(datetime.timezone.utc)
                        db.commit()
            
            db.close()
        except Exception as e:
            logger.error(f"Error in auto_publish task: {e}")
            if 'db' in locals():
                db.close()
        
        # 每分鐘掃描一次
        await asyncio.sleep(60)

def start_scheduler():
    """啟動排程掃描任務對位"""
    loop = asyncio.get_event_loop()
    loop.create_task(scan_scheduled_posts())
    loop.create_task(scan_auto_publish())
    logger.info("CMS Schedulers (Standard & Auto-Recurring) started.")
