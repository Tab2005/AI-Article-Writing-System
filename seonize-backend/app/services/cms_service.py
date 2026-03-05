from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import CMSConfig, Project, KalpaNode
import httpx
import logging
import datetime
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class CMSBase(ABC):
    @abstractmethod
    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        pass

class GhostService(CMSBase):
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    def _get_token(self):
        """產生 Ghost Admin API JWT Token"""
        import jwt # 需要安裝 pyjwt
        try:
            id, secret = self.api_key.split(':')
            iat = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
            header = {'alg': 'HS256', 'typ': 'JWT', 'kid': id}
            payload = {
                'iat': iat,
                'exp': iat + 5 * 60,
                'aud': '/admin/'
            }
            token = jwt.encode(payload, bytes.fromhex(secret), algorithm='HS256', headers=header)
            return token
        except Exception as e:
            logger.error(f"Ghost Token generation failed: {e}")
            return None

    async def test_connection(self) -> bool:
        token = self._get_token()
        if not token: return False
        try:
            headers = {'Authorization': f'Ghost {token}'}
            # 嘗試取得站點資訊
            response = await self.client.get(f"{self.api_url}/ghost/api/admin/site/", headers=headers)
            return response.status_code == 200
        except Exception:
            return False

    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None) -> Dict[str, Any]:
        token = self._get_token()
        headers = {'Authorization': f'Ghost {token}'}
        
        # Ghost 預設發布 HTML 或 MobileDoc
        # 這裡假設 content 是 Markdown，簡單處理為 HTML
        # 實際上可能需要 markdown2 或其它轉換器
        import markdown2
        html_content = markdown2.markdown(content)

        post_data = {
            "posts": [{
                "title": title,
                "html": html_content,
                "status": status if status in ["draft", "published", "scheduled"] else "draft"
            }]
        }
        
        if scheduled_at and status == "scheduled":
            post_data["posts"][0]["published_at"] = scheduled_at.isoformat()

        response = await self.client.post(f"{self.api_url}/ghost/api/admin/posts/?source=html", json=post_data, headers=headers)
        if response.status_code in [200, 201]:
            data = response.json()
            post = data['posts'][0]
            return {
                "success": True,
                "post_id": post['id'],
                "url": post.get('url', ''),
                "status": post['status']
            }
        else:
            return {"success": False, "message": response.text}

class WordPressService(CMSBase):
    def __init__(self, api_url: str, username: str, app_password: str):
        self.api_url = api_url.rstrip('/')
        self.username = username
        self.app_password = app_password
        self.client = httpx.AsyncClient(timeout=30.0)

    def _get_auth(self):
        import base64
        auth = f"{self.username}:{self.app_password}"
        return base64.b64encode(auth.encode()).decode()

    async def test_connection(self) -> bool:
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        try:
            response = await self.client.get(f"{self.api_url}/wp-json/wp/v2/users/me", headers=headers)
            return response.status_code == 200
        except Exception:
            return False

    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None) -> Dict[str, Any]:
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        
        import markdown2
        html_content = markdown2.markdown(content)

        post_data = {
            "title": title,
            "content": html_content,
            "status": status if status in ["draft", "publish", "future"] else "draft"
        }
        
        if status == "scheduled":
            post_data["status"] = "future"
            if scheduled_at:
                post_data["date"] = scheduled_at.isoformat()

        response = await self.client.post(f"{self.api_url}/wp-json/wp/v2/posts", json=post_data, headers=headers)
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                "success": True,
                "post_id": str(data['id']),
                "url": data.get('link', ''),
                "status": data['status']
            }
        else:
            return {"success": False, "message": response.text}

class CMSManager:
    @staticmethod
    def get_client(config: CMSConfig) -> Optional[CMSBase]:
        from app.core.security import decrypt_value
        if config.platform == "ghost":
            # 假設 api_key 加密儲存
            api_key = decrypt_value(config.api_key) if config.api_key else ""
            return GhostService(config.api_url, api_key)
        elif config.platform == "wordpress":
            app_pwd = decrypt_value(config.api_key) if config.api_key else ""
            return WordPressService(config.api_url, config.username, app_pwd)
        return None

    @staticmethod
    async def publish_article(db: Session, target_type: str, target_id: str, config_id: str, user_id: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None):
        """
        發布文章的核心進入點 (支援 User 隔離)
        target_type: 'project' 或 'kalpa_node'
        """
        # 獲取發布者角色 (從 User 表)
        from app.models.db_models import User
        user = db.query(User).filter(User.id == user_id).first()
        is_admin = user and user.role == "super_admin"

        if not is_admin:
            from sqlalchemy import or_
            config_query = config_query.filter(or_(CMSConfig.user_id == user_id, CMSConfig.user_id == None))
        
        config = config_query.first()
        if not config:
            return {"success": False, "message": "找不到指定的 CMS 設定或權限不足"}

        if target_type == "project":
            # 驗證專案的所有權 (管理員可操作所有專案，或該專案 user_id 為空)
            item_query = db.query(Project).filter(Project.id == target_id)
            if not is_admin:
                from sqlalchemy import or_
                item_query = item_query.filter(or_(Project.user_id == user_id, Project.user_id == None))
            
            item = item_query.first()
            if not item:
                return {"success": False, "message": "找不到指定的專案或權限不足"}
            title = item.selected_title or item.primary_keyword
            content = item.full_content
        else:
            # 驗證 KalpaNode 透過 KalpaMatrix 的所有權 (管理員可操作所有文章)
            from app.models.db_models import KalpaMatrix
            item_query = db.query(KalpaNode).join(KalpaMatrix, KalpaNode.matrix_id == KalpaMatrix.id).filter(KalpaNode.id == target_id)
            
            if not is_admin:
                from sqlalchemy import or_
                item_query = item_query.filter(or_(KalpaMatrix.user_id == user_id, KalpaMatrix.user_id == None))
            
            item = item_query.first()
            if not item:
                return {"success": False, "message": "找不到指定的節點或權限不足"}
            title = item.target_title
            content = item.woven_content

        if not content:
            return {"success": False, "message": "文章內容為空，無法發布"}

        client = CMSManager.get_client(config)
        if not client:
            return {"success": False, "message": "無效的 CMS 平台"}

        result = await client.publish(title, content, status, scheduled_at)
        
        if result["success"]:
            item.cms_config_id = config_id
            item.cms_post_id = result["post_id"]
            item.cms_publish_url = result["url"]
            item.publish_status = "published" if status in ["published", "publish"] else "scheduled" if status in ["scheduled", "future"] else "draft"
            if item.publish_status == "published":
                item.published_at = datetime.datetime.now(datetime.timezone.utc)
            elif item.publish_status == "scheduled":
                item.scheduled_at = scheduled_at
            db.commit()
            
        return result

cms_manager = CMSManager()
