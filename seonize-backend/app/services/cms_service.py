from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import CMSConfig, Project, KalpaNode
import httpx
import logging
import datetime
import os
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class CMSBase(ABC):
    @abstractmethod
    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None, categories: Optional[List[int]] = None, featured_media: Optional[int] = None, llm_summary: Optional[str] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        pass

class GhostService(CMSBase):
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        self.client = httpx.AsyncClient(timeout=30.0, headers=self.headers)

    def _get_token(self):
        """產生 Ghost Admin API JWT Token"""
        try:
            import jwt
            id, secret = self.api_key.split(':')
            iat = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
            header = {'alg': 'HS256', 'typ': 'JWT', 'kid': id}
            payload = {
                'iat': iat,
                'exp': iat + 5 * 60,
                'aud': '/admin/'
            }
            token = jwt.encode(payload, bytes.fromhex(secret), algorithm='HS256', headers=header)
            return token, None
        except ImportError:
            return None, "系統缺失 pyjwt 套件，請聯繫管理員更新 requirements.txt"
        except ValueError:
            return None, "無效的 API Key 格式 (預期為 id:secret)"
        except Exception as e:
            logger.error(f"Ghost Token generation failed: {e}")
            return None, str(e)

    async def test_connection(self) -> Dict[str, Any]:
        token, err = self._get_token()
        if not token: 
            return {"success": False, "message": f"Token 生成失敗: {err}"}
        try:
            headers = {'Authorization': f'Ghost {token}'}
            # 嘗試取得站點資訊
            response = await self.client.get(f"{self.api_url}/ghost/api/admin/site/", headers=headers)
            if response.status_code == 200:
                site_data = response.json()
                return {"success": True, "message": f"連線成功: {site_data.get('site', {}).get('title', 'Ghost Site')}"}
            else:
                return {"success": False, "message": f"Ghost API 回傳錯誤 ({response.status_code}): {response.text}"}
        except httpx.ConnectError:
            return {"success": False, "message": "連線失敗: 無法存取該網址，請檢查 API URL 是否正確"}
        except Exception as e:
            return {"success": False, "message": f"連線異常: {str(e)}"}

    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None, categories: Optional[List[int]] = None, featured_media: Optional[int] = None, llm_summary: Optional[str] = None) -> Dict[str, Any]:
        token, err = self._get_token()
        if not token:
            return {"success": False, "message": f"Token 生成失敗: {err}"}
        headers = {'Authorization': f'Ghost {token}'}
        
        # Ghost 預設發布 HTML 或 MobileDoc
        # 這裡假設 content 是 Markdown，簡單處理為 HTML
        # 實際上可能需要 markdown2 或其它轉換器
        import markdown2
        # 注入 llm_summary 到 HTML 中 (隱藏式)
        if llm_summary:
            content += f"\n\n<!-- LLM-SUMMARY-START -->\n<div id=\"llms-summary\" style=\"display:none;\">\n\n{llm_summary}\n\n</div>\n<!-- LLM-SUMMARY-END -->"
        
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
        logger.info(f"Ghost Publish Response: {response.status_code} - {response.text[:200]}")
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                post = data['posts'][0]
                return {
                    "success": True,
                    "post_id": post['id'],
                    "url": post.get('url', ''),
                    "status": post['status']
                }
            except (KeyError, IndexError) as e:
                logger.error(f"Ghost response parsing failed: {e}, data: {data}")
                return {"success": False, "message": f"Ghost 回傳格式異常: {str(e)}"}
        else:
            return {"success": False, "message": f"Ghost API 錯誤 ({response.status_code}): {response.text}"}

class WordPressService(CMSBase):
    def __init__(self, api_url: str, username: str, app_password: str):
        self.api_url = api_url.rstrip('/')
        self.username = username
        self.app_password = app_password
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        self.client = httpx.AsyncClient(timeout=30.0, headers=self.headers)

    def _get_auth(self):
        import base64
        auth = f"{self.username}:{self.app_password}"
        return base64.b64encode(auth.encode()).decode()

    async def test_connection(self) -> Dict[str, Any]:
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        try:
            response = await self.client.get(f"{self.api_url}/wp-json/wp/v2/users/me", headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                return {"success": True, "message": f"連線成功! 歡迎 {user_data.get('name')}"}
            else:
                return {"success": False, "message": f"WordPress API 錯誤 ({response.status_code}): {response.text}"}
        except Exception as e:
            return {"success": False, "message": f"連線異常: {str(e)}"}

    async def get_categories(self) -> List[Dict[str, Any]]:
        """取得 WordPress 所有分類"""
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        try:
            response = await self.client.get(f"{self.api_url}/wp-json/wp/v2/categories?per_page=100", headers=headers)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            logger.error(f"WP List Categories failed: {e}")
            return []

    async def upload_media(self, file_path: str, alt_text: str = "", caption: str = "") -> Optional[int]:
        """上傳媒體到 WordPress 並回傳媒體 ID"""
        auth = self._get_auth()
        file_name = os.path.basename(file_path)
        
        # 判斷 MIME Type
        content_type = "image/webp" if file_name.endswith(".webp") else "image/jpeg"
        
        headers = {
            'Authorization': f'Basic {auth}',
            'Content-Disposition': f'attachment; filename={file_name}',
            'Content-Type': content_type
        }
        
        try:
            with open(file_path, "rb") as f:
                media_content = f.read()
                
            response = await self.client.post(
                f"{self.api_url}/wp-json/wp/v2/media",
                content=media_content,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                media_id = data.get('id')
                
                # 更新 Alt Text 與 Caption
                if alt_text or caption:
                    await self.client.post(
                        f"{self.api_url}/wp-json/wp/v2/media/{media_id}",
                        json={
                            "alt_text": alt_text,
                            "caption": caption
                        },
                        headers={'Authorization': f'Basic {auth}'}
                    )
                return media_id
            else:
                logger.error(f"WP Upload Media failed ({response.status_code}): {response.text}")
                return None
        except Exception as e:
            logger.error(f"WP Upload Media exception: {e}")
            return None

    async def create_category(self, name: str) -> Optional[int]:
        """建立 WordPress 新分類並回傳 ID"""
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        try:
            response = await self.client.post(f"{self.api_url}/wp-json/wp/v2/categories", json={"name": name}, headers=headers)
            if response.status_code in [200, 201]:
                data = response.json()
                return data.get('id')
            return None
        except Exception as e:
            logger.error(f"WP Create Category failed: {e}")
            return None

    def _convert_to_blocks(self, content: str) -> str:
        """將 Markdown/HTML 混合內容轉換為 WordPress Gutenberg 區塊標記"""
        import re
        import markdown2

        blocks = []
        lines = content.split('\n')
        current_paragraph = []
        
        def flush_paragraph():
            if current_paragraph:
                p_text = '\n'.join(current_paragraph).strip()
                if p_text:
                    html = markdown2.markdown(p_text).strip()
                    # 確保段落被 wp:paragraph 封裝
                    blocks.append(f'<!-- wp:paragraph -->\n{html}\n<!-- /wp:paragraph -->')
                current_paragraph.clear()

        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # A. 標題
            if line.startswith('#'):
                flush_paragraph()
                level = len(line.split(' ')[0])
                if level > 6: level = 6 # WP 只支援到 h6
                title_text = line.lstrip('#').strip()
                blocks.append(f'<!-- wp:heading {{"level":{level}}} -->\n<h{level}>{title_text}</h{level}>\n<!-- /wp:heading -->')
            
            # B. 圖片
            elif line.startswith('![') and '](' in line:
                flush_paragraph()
                img_match = re.match(r'!\[(.*?)\]\((.*?)\)', line)
                if img_match:
                    alt, url = img_match.groups()
                    blocks.append(f'<!-- wp:image {{"align":"center","sizeSlug":"large","linkDestination":"none"}} -->\n<figure class="wp-block-image aligncenter size-large"><img src="{url}" alt="{alt}"/><figcaption class="wp-element-caption">{alt}</figcaption></figure>\n<!-- /wp:image -->')
            
            # C. 表格 (HTML 格式)
            elif line.startswith('<table'):
                flush_paragraph()
                table_lines = []
                while i < len(lines):
                    table_lines.append(lines[i])
                    if '</table>' in lines[i]:
                        break
                    i += 1
                table_html = '\n'.join(table_lines)
                blocks.append(f'<!-- wp:table -->\n<figure class="wp-block-table">{table_html}</figure>\n<!-- /wp:table -->')
            
            # D. 空行
            elif not line:
                flush_paragraph()
            
            # E. 一般文字段落
            else:
                current_paragraph.append(lines[i])
            
            i += 1
        
        flush_paragraph()
        return '\n\n'.join(blocks)

    async def publish(self, title: str, content: str, status: str = "draft", scheduled_at: Optional[datetime.datetime] = None, categories: Optional[List[int]] = None, featured_media: Optional[int] = None, llm_summary: Optional[str] = None) -> Dict[str, Any]:
        auth = self._get_auth()
        headers = {'Authorization': f'Basic {auth}'}
        
        # 使用區塊化轉換 (Gutenberg Blocks)
        html_content = self._convert_to_blocks(content)

        # 狀態映射修正：WordPress 使用 publish, Ghost 使用 published
        wp_status = "draft"
        if status in ["publish", "published"]:
            wp_status = "publish"
        elif status in ["future", "scheduled"]:
            wp_status = "future"

        post_data = {
            "title": title,
            "content": html_content,
            "status": wp_status
        }

        # 注入 llm_summary 到自定義欄位 (需確保 WP 有對外暴露此 meta 或使用外掛)
        if llm_summary:
            post_data["meta"] = {
                "_seonize_llm_summary": llm_summary
            }

        if categories:
            post_data["categories"] = categories
        
        if featured_media:
            post_data["featured_media"] = featured_media
        
        if wp_status == "future":
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
        """
        try:
            # 獲取發布者角色 (從 User 表)
            from app.models.db_models import User
            user = db.query(User).filter(User.id == user_id).first()
            is_admin = user and user.role == "super_admin"

            # 驗證 CMS 設定的所有權
            config_query = db.query(CMSConfig).filter(CMSConfig.id == config_id)
            if not is_admin:
                from sqlalchemy import or_
                config_query = config_query.filter(or_(CMSConfig.user_id == user_id, CMSConfig.user_id == None))
            
            config = config_query.first()
            if not config:
                return {"success": False, "message": "找不到指定的 CMS 設定或權限不足"}

            if target_type == "project":
                item_query = db.query(Project).filter(Project.id == target_id)
                if not is_admin:
                    from sqlalchemy import or_
                    item_query = item_query.filter(or_(Project.user_id == user_id, Project.user_id == None))
                
                item = item_query.first()
                if not item:
                    return {"success": False, "message": "找不到指定的專案或權限不足"}
                title = item.selected_title or item.primary_keyword
                content = item.full_content
                llm_summary = item.llm_summary
            else:
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
                llm_summary = item.llm_summary

            if not content:
                return {"success": False, "message": "文章內容為空，無法發布"}

            client = CMSManager.get_client(config)
            if not client:
                return {"success": False, "message": "無效的 CMS 平台"}

            logger.info(f"🚀 正在發布文章: {title} 到 {config.name} ({config.platform})")
            
            # --- 方案 B: 自動分類與媒體同步邏輯 (僅限 WordPress) ---
            categories = None
            featured_media = None
            if config.platform == "wordpress":
                try:
                    from app.services.ai_service import AIService
                    import re
                    wp_client = client # It's already the WordPressService instance
                    
                    # A. 自動媒體同步 (Media Sync)
                    # 尋找內容中的本地圖片 URL: /uploads/xxx.webp
                    img_pattern = r'!\[(.*?)\]\((/uploads/.*?)\)'
                    matches = re.findall(img_pattern, content)
                    
                    if matches:
                        logger.info(f"📸 偵測到 {len(matches)} 張本地圖片，啟動 CMS 同步...")
                        for i, (alt, local_url) in enumerate(matches):
                            # 取得實體路徑
                            local_path = local_url.lstrip('/') # 去除開頭的 /
                            if os.path.exists(local_path):
                                remote_media_id = await wp_client.upload_media(local_path, alt_text=alt)
                                if remote_media_id:
                                    # 取得媒體資訊以更換 URL
                                    auth = wp_client._get_auth()
                                    media_res = await wp_client.client.get(
                                        f"{wp_client.api_url}/wp-json/wp/v2/media/{remote_media_id}",
                                        headers={'Authorization': f'Basic {auth}'}
                                    )
                                    if media_res.status_code == 200:
                                        remote_url = media_res.json().get('source_url')
                                        # 替換內容中的 URL
                                        content = content.replace(local_url, remote_url)
                                        # 第一張圖設為特色圖片
                                        if i == 0:
                                            featured_media = remote_media_id
                                            logger.info(f"🌟 已設定特色圖片: ID {remote_media_id}")
                    
                    # B. 自動分類 (既存邏輯)
                    existing_cats = await wp_client.get_categories()
                    if content and len(content) > 50:
                        suggestion = await AIService.suggest_category(title, content, existing_cats)
                        if suggestion.get("match_id"):
                            categories = [suggestion["match_id"]]
                            logger.info(f"🏷️ AI 匹配現有分類: {suggestion.get('reason')}")
                        elif suggestion.get("suggest_name"):
                            new_cat_id = await wp_client.create_category(suggestion["suggest_name"])
                            if new_cat_id:
                                categories = [new_cat_id]
                                logger.info(f"🆕 AI 建立並套用新分類: {suggestion['suggest_name']}")
                except Exception as e:
                    logger.error(f"⚠️ 媒體同步或自動分類失敗: {e}")

                # C. 優先使用 KalpaNode / Project 自身的圖片欄位作為特色圖片 (若內容無圖片)
                if not featured_media and hasattr(item, "images") and item.images:
                    try:
                        logger.info("🎨 內容無圖片，從節點圖片欄位獲取特色圖片")
                        # 處理 JSON 欄位
                        images_list = item.images if isinstance(item.images, list) else []
                        if images_list:
                            main_image = images_list[0]
                            image_url = main_image.get("url")
                            image_alt = main_image.get("alt", title)
                            
                            from app.services.image_service import ImageService
                            # 下載遠端圖片到本機 (若是 Pexels 等網址)
                            download_res = await ImageService.download_image(image_url)
                            local_path = download_res.get("local_path")
                            
                            if local_path and os.path.exists(local_path):
                                remote_media_id = await wp_client.upload_media(local_path, alt_text=image_alt)
                                if remote_media_id:
                                    featured_media = remote_media_id
                                    logger.info(f"🌟 已從節點欄位設定特色圖片: ID {featured_media}")
                    except Exception as im_e:
                        logger.warning(f"⚠️ 從節點欄位獲取特色圖片失敗: {im_e}")

            result = await client.publish(title, content, status, scheduled_at, categories, featured_media, llm_summary)
            
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
                logger.info(f"✅ 發布成功: {item.cms_publish_url}")
            else:
                logger.error(f"❌ 發布失敗: {result.get('message')}")
                
            return result
        except Exception as e:
            import traceback
            logger.error(f"💥 publish_article 發生崩潰: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "message": f"伺服器內部錯誤: {str(e)}"}

cms_manager = CMSManager()
