from datetime import datetime, timezone
import itertools
import random
import logging
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import KalpaMatrix, KalpaNode, PromptTemplate
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

class KalpaService:
    @staticmethod
    def _get_active_template(db: Session, user_id: Optional[str], category: str, default_content: str) -> str:
        """
        取得指定類別的有效指令模板。優先順序：使用者啟用的模板 > 系統預設啟用的模板 > 硬編碼預設。
        """
        # 1. 嘗試查找使用者自定義且啟用的模板
        if user_id:
            user_template = db.query(PromptTemplate).filter(
                PromptTemplate.category == category,
                PromptTemplate.user_id == user_id,
                PromptTemplate.is_active == True
            ).first()
            if user_template:
                return user_template.content
        
        # 2. 嘗試查找系統預設啟用的模板
        system_template = db.query(PromptTemplate).filter(
            PromptTemplate.category == category,
            PromptTemplate.user_id == None,
            PromptTemplate.is_active == True
        ).first()
        if system_template:
            return system_template.content
            
        return default_content

    @staticmethod
    def generate_matrix(entities: List[str], actions: List[str], pain_points: List[str], project_name: str = "Default_Project", title_template: Optional[str] = None, exclusion_rules: Optional[Dict[str, List[str]]] = None) -> List[Dict[str, Any]]:
        """
        執行笛卡爾乘積運算，生成意圖矩陣 (Kalpa Matrix)
        """
        # 執行笛卡爾乘積 (Cartesian Product)
        combinations = list(itertools.product(entities, actions, pain_points))
        total_initial = len(combinations)
        
        results = []
        filtered_count = 0

        for e, a, p in combinations:
            # 確保內容沒有前後空格
            e, a, p = e.strip(), a.strip(), p.strip()

            # --- 慧眼識珠：過濾邏輯 ---
            is_valid = True
            selected_rules = exclusion_rules if exclusion_rules is not None else {}
            
            for trigger, forbidden_words in selected_rules.items():
                if trigger.lower() in e.lower():
                    if any(word.lower() in a.lower() or word.lower() in p.lower() for word in forbidden_words):
                        is_valid = False
                        break
            
            if not is_valid:
                filtered_count += 1
                continue
            # ------------------------
            
            # 生成標題邏輯
            if title_template:
                # 支援模板替換: {entity}, {action}, {pain_point}
                t = title_template.replace("{entity}", e).replace("{action}", a).replace("{pain_point}", p)
                # 如果模板中沒有變量，則作為後綴附加
                if "{entity}" not in title_template and "{action}" not in title_template and "{pain_point}" not in title_template:
                    title = f"{e}{a}{p}{title_template}"
                else:
                    title = t
            else:
                # 預設標題模板
                title = f"{e}{a}{p}怎麼辦？2026 最新解決教學與修復步驟"
            
            results.append({
                "entity": e,
                "action": a,
                "pain_point": p,
                "target_title": title,
                "status": "pending"
            })
            
        logger.info(f"💾 矩陣生成完畢：原組合 {total_initial} 個，經【慧眼識珠】過濾掉 {filtered_count} 個不合邏輯節點，剩餘 {len(results)} 個。")
        return results

    @staticmethod
    def save_matrix(db: Session, project_name: str, entities: List[str], actions: List[str], pain_points: List[str], nodes: List[Dict[str, Any]], user_id: str, industry: str = "Crypto", money_page_url: str = "", cms_config_id: Optional[str] = None, project_id: Optional[str] = None) -> KalpaMatrix:
        """
        儲存生成的矩陣到資料庫 (支援更新與 User 隔離)
        """
        if project_id:
            matrix = db.query(KalpaMatrix).filter(
                KalpaMatrix.id == project_id,
                KalpaMatrix.user_id == user_id
            ).first()
            if not matrix:
                # 如果找不到且提供了 ID，可能是越權或 ID 錯誤
                matrix = KalpaMatrix(id=project_id, project_name=project_name, user_id=user_id)
                db.add(matrix)
            else:
                matrix.project_name = project_name
                matrix.industry = industry
                matrix.money_page_url = money_page_url
                matrix.entities = entities
                matrix.actions = actions
                matrix.pain_points = pain_points
                matrix.cms_config_id = cms_config_id
                matrix.updated_at = datetime.now(timezone.utc)
        else:
            matrix = KalpaMatrix(
                project_name=project_name,
                industry=industry,
                money_page_url=money_page_url,
                entities=entities,
                actions=actions,
                pain_points=pain_points,
                cms_config_id=cms_config_id,
                user_id=user_id
            )
            db.add(matrix)
        
        db.flush() # 確保取得/確認 ID

        # 處理節點：批量更新優化
        logger.info(f"💾 正在更新矩陣節點，專案 ID: {matrix.id}, 節點總數: {len(nodes)}")
        
        try:
            # 先清理舊節點，使用 synchronize_session=False 提升效能
            db.query(KalpaNode).filter(KalpaNode.matrix_id == matrix.id).delete(synchronize_session=False)

            new_nodes = []
            for node_data in nodes:
                # 解析日期格式 (如果有)
                woven_at = None
                if node_data.get("woven_at"):
                    try:
                        woven_at = datetime.fromisoformat(node_data["woven_at"].replace('Z', '+00:00'))
                    except: pass

                node = KalpaNode(
                    matrix_id=matrix.id,
                    entity=node_data.get("entity"),
                    action=node_data.get("action"),
                    pain_point=node_data.get("pain_point"),
                    target_title=node_data.get("target_title"),
                    status=node_data.get("status", "pending"),
                    woven_content=node_data.get("woven_content"),
                    anchor_used=node_data.get("anchor_used"),
                    woven_at=woven_at,
                    cms_config_id=node_data.get("cms_config_id"),
                    cms_post_id=node_data.get("cms_post_id"),
                    publish_status=node_data.get("publish_status", "draft"),
                    cms_publish_url=node_data.get("cms_publish_url")
                )
                new_nodes.append(node)
            
            db.add_all(new_nodes)
            db.commit()
            logger.info(f"✅ 矩陣儲存成功！節點數: {len(new_nodes)}")
        except Exception as e:
            db.rollback()
            logger.error(f"❌ 節點儲存失敗: {str(e)}")
            raise e

        db.refresh(matrix)
        return matrix

    @staticmethod
    def get_matrix(db: Session, matrix_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        取得已儲存的矩陣及其節點 (管理員可不傳 user_id 以查看全站)
        """
        query = db.query(KalpaMatrix).filter(KalpaMatrix.id == matrix_id)
        if user_id:
            query = query.filter(KalpaMatrix.user_id == user_id)
            
        matrix = query.first()
        if not matrix:
            return None
        
        nodes = db.query(KalpaNode).filter(KalpaNode.matrix_id == matrix_id).all()
        
        result = matrix.to_dict()
        result["nodes"] = [node.to_dict() for node in nodes]
        return result

    @staticmethod
    async def generate_anchor_variants(db: Session, industry: str, money_page_url: str = "", user_id: Optional[str] = None) -> List[str]:
        """
        使用 AI 動態生成符合產業語境的錨點文字（法寶袋）
        """
        default_system = f"""
        你是一位專業的 SEO 與內容營銷專家。
        目標：為一個在「{industry}」產業的頁面生成具備高度吸引力與導引性的錨點文字（Anchor Text）。
        
        要求：
        1. 產出 5 個不同的錨點文字。
        2. 風格多樣：包含專業指南感、風險管理感、實戰經驗感、以及具備時效性（設定在 2026 年）。
        3. 內容必須與「{industry}」高度相關。
        4. 格式：僅回傳一個 JSON 陣列，例如 ["文字1", "文字2", ...]，不要有任何其他解釋。
        """
        
        system_prompt_template = KalpaService._get_active_template(db, user_id, "kalpa_anchor_generation", default_system)
        system_prompt = system_prompt_template.replace("{industry}", industry).replace("{money_page_url}", money_page_url)
        
        user_prompt = f"請為產業「{industry}」以及目標網址「{money_page_url}」生成 5 個法寶袋錨點文字。"
        
        try:
            content = await AIService.generate_content(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.8
            )
            
            # 尋找 JSON 陣列
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                return json.loads(match.group())
            
            # 回退方案：如果 AI 產出的不是純 JSON，嘗試按行分割
            lines = [l.strip().strip('"').strip("'").strip("[]") for l in content.split('\n') if l.strip() and len(l.strip()) > 2]
            return [l for l in lines if not l.startswith('[') and not l.endswith(']')][:5]
            
        except Exception as e:
            logger.error(f"Failed to generate anchor variants: {str(e)}")
            # 基本回退
            return ["查看更多專業指南", "點擊獲取專家建議", "2026 產業佈局清單", "專業避坑與優化方案", "從入門到精通的實戰筆記"]

    @staticmethod
    async def weave_node(db: Session, node_id: str, user_id: str) -> KalpaNode:
        """
        執行「神諭編織」：為節點生成專業指南文章 (User 隔離)
        """
        node = db.query(KalpaNode).filter(KalpaNode.id == node_id).first()
        if not node:
            raise ValueError("Node not found")
        
        matrix = db.query(KalpaMatrix).filter(
            KalpaMatrix.id == node.matrix_id,
            KalpaMatrix.user_id == user_id
        ).first()
        if not matrix:
            raise ValueError("Associated matrix not found or access denied")

        node.status = "weaving"
        db.commit()

        # 1. 法寶袋：動態獲取或生成
        anchor_variants = matrix.anchor_variants
        if not anchor_variants:
            logger.info(f"Matrix {matrix.id} has no anchor variants. Generating...")
            anchor_variants = await KalpaService.generate_anchor_variants(db, matrix.industry, matrix.money_page_url, user_id)
            matrix.anchor_variants = anchor_variants
            db.commit()
            
        selected_anchor = random.choice(anchor_variants)
        
        # 2. 【千人千面】動態人格設定 (Multi-Personality v4 - 產業適配)
        persona = KalpaService._get_weaving_persona(node.pain_point, matrix.industry)

        # 3. 構建 System Prompt (配合指令倉庫模板)
        default_system = f"""
        你現在的身份是：{persona['role']}。
        你的寫作語氣：{persona['tone']}
        
        寫作規範要求 (人像化優化架構)：
        1. **自然開場**：在文章最開頭，直接以 100 字內總結解決方案，避免使用「總之」、「綜上所述」等 AI 常用開頭訊息。
        2. **嚴禁 Emoji**：禁止在標題、段落或任何地方使用表情符號（如 🎯, 💡, ❓, 🏁 等）。
        3. **口語化敘述**：將原本僵硬的「答案片段」與正文融合，用語要像專業人士在聊天或給建議，多用「你可以...」、「建議這樣做...」等直接語氣。
        4. **HTML 對照表格**：包含一個 HTML 表格對比『關鍵問題』與『優化方案』，表格標題請使用純文字。
        5. **專家洞察**：在文中插入一個深度見解段落，標題改為純文字「專家建議：」。
        6. **常見問答 (FAQ)**：結尾增加「常見問答 (FAQ)」區塊。
        
        【去 AI 味寫作協定】
        - 嚴禁使用「值得注意的是」、「首先、其次、最後」、「總結來說」等制式過渡詞。
        - 句子要有長短變化，避免平鋪直敘。
        - 針對 {node.pain_point} 的描述要帶入實際場景，增加代入感。
        
        【核心指令：微上下文植入】
        在結論段落，以專業風險管理的角度，自然引導讀者點擊指定的權威頁面。
        """
        
        system_template = KalpaService._get_active_template(db, user_id, "kalpa_weaving_system", default_system)
        system_prompt = system_template.replace("{persona_role}", persona['role'])\
                                       .replace("{persona_tone}", persona['tone'])\
                                       .replace("{title}", node.target_title)

        # 4. 構建 User Prompt (配合指令倉庫模板)
        default_user = f"""
        {{persona_intro}}
        
        請撰寫專業解決方案指南。
        【重要】：直接從正文內容開始寫，不要輸出標題『{{title}}』。
        
        核心要素：
        - 產業背景：{{industry}}
        - 實體：{{entity}}
        - 動作：{{action}}
        - 痛點：{{pain_point}}
        
        文章必須包含：
        1. 針對 {{pain_point}} 的深度解析與同理。
        2. 完全符合 {{persona_role}} 背景的專業建議，嚴禁使用無關產業的術語（除非是類比）。
        3. HTML 對照表格。
        4. 結尾自然植入連結：[{{selected_anchor}}]({{money_page_url}})
        
        請注意時效性，背景設定為 2026 年最新趨勢與實踐方案。
        """
        
        user_template = KalpaService._get_active_template(db, user_id, "kalpa_weaving_user", default_user)
        user_prompt = user_template.replace("{persona_intro}", persona['intro'])\
                                   .replace("{title}", node.target_title)\
                                   .replace("{industry}", matrix.industry)\
                                   .replace("{entity}", node.entity)\
                                   .replace("{action}", node.action)\
                                   .replace("{pain_point}", node.pain_point)\
                                   .replace("{selected_anchor}", selected_anchor)\
                                   .replace("{money_page_url}", matrix.money_page_url or "https://example.com")\
                                   .replace("{persona_role}", persona['role'])

        try:
            logger.info(f"Starting weaving for node {node_id} (title: {node.target_title})")
            # 使用 AIService 生成內容 (增加 max_tokens 確保長文完整性)
            content = await AIService.generate_content(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.8,
                max_tokens=8192
            )
            
            if not content:
                raise ValueError("AIService returned empty content")

            # 內容完整性修正：檢查是否以開放式符號中斷
            if content.strip().endswith("- [") or content.strip().endswith("["):
                logger.warning(f"Content for node {node_id} appears truncated. Attempting simple closure.")
                content = content.strip().rstrip("-[") + "\n- [ ] (後續步驟請參考官方指南)"

            logger.info(f"Successfully generated content for node {node_id}")
            node.woven_content = content
            node.anchor_used = selected_anchor
            node.woven_at = datetime.now(timezone.utc)
            node.status = "completed"
        except Exception as e:
            logger.error(f"Weaving failed for node {node_id}: {str(e)}")
            node.status = "failed"
            node.woven_content = f"Error during weaving: {str(e)}"
        
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    async def batch_weave_nodes(db: Session, node_ids: List[str], user_id: str) -> Dict[str, Any]:
        """
        批量執行「神諭編織」 (User 隔離)
        """
        import asyncio
        semaphore = asyncio.Semaphore(3)
        
        results = {"success": 0, "failed": 0, "total": len(node_ids)}
        
        async def Task(node_id):
            async with semaphore:
                try:
                    await KalpaService.weave_node(db, node_id, user_id) 
                    results["success"] += 1
                except Exception as e:
                    logger.error(f"Batch weaving failed for node {node_id}: {e}")
                    results["failed"] += 1

        await asyncio.gather(*(Task(nid) for nid in node_ids))
        return results

    @staticmethod
    async def batch_weave_task(node_ids: List[str], user_id: str, total_cost: int = 0):
        """
        背景任務：執行批量編織，並根據失敗狀況進行部分退款。
        """
        from app.core.database import SessionLocal
        from app.services.credit_service import CreditService
        db = SessionLocal()
        try:
            from app.models.db_models import User
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return

            results = await KalpaService.batch_weave_nodes(db, node_ids, user_id)
            
            # 部分退款邏輯
            if results["failed"] > 0 and total_cost > 0:
                refund_per_node = total_cost / results["total"]
                refund_amount = math.ceil(refund_per_node * results["failed"])
                
                CreditService.refund(
                    db, user, refund_amount, 
                    f"Kalpa 批量編織部分失敗 ({results['failed']}/{results['total']})"
                )
        except Exception as e:
            logger.error(f"Background batch weave task failed: {e}")
            # 如果整批任務沒跑完就崩潰，且沒跑出任何成功（或無法確認），則退還剩餘部分（這裏簡化處理，視情況全退或不退）
            # 因為 batch_weave_nodes 內部有 try...except，通常會跑完。
        finally:
            db.close()

    @staticmethod
    def list_all_articles(db: Session, user_id: Optional[str] = None, matrix_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        取得所有已編織完成的文章，整合專案名稱 (管理員可不傳 user_id 以查看全站)
        """
        query = db.query(KalpaNode, KalpaMatrix.project_name)\
                  .join(KalpaMatrix, KalpaNode.matrix_id == KalpaMatrix.id)\
                  .filter(KalpaNode.status == "completed")
        
        if user_id:
            query = query.filter(KalpaMatrix.user_id == user_id)
        
        if matrix_id:
            query = query.filter(KalpaNode.matrix_id == matrix_id)
            
        results = query.order_by(KalpaNode.woven_at.desc()).all()
        
        articles = []
        for node, project_name in results:
            d = node.to_dict()
            d["project_name"] = project_name
            articles.append(d)
        
        return articles

    @staticmethod
    async def brainstorm_elements(db: Session, topic: str, user_id: Optional[str] = None) -> Dict[str, List[str]]:
        """
        天道解析：透過 AI 進行領域建模，生成建議的實體、動作與痛點。
        """
        default_system = """
        你是一位精通 SEO 內容行銷與產業建模的專家。
        你的任務是針對使用者提供的『主題』，進行因果矩陣建模。
        
        請回傳一個包含以下五個欄位的 JSON 物件：
        1. entities (實體)：該產業的核心對象、平台、工具或軟體（例如：MetaMask, 幣安）。
        2. actions (動作)：使用者對這些實體執行的具體行為（例如：入金, 提現, 註冊）。
        3. pain_points (痛點)：執行動作時最常遇到的困難、錯誤、恐懼或不便（例如：失敗, 等很久, 報錯）。
        4. suggested_title_template (建議標題模板)：為該主題量身打造的一個意圖標題模板。必須包含預留位置 {entity}, {action}, {pain_point}。
           請發揮創意，設計一個引人入勝、能解決痛點且具備 2026 年時效性的標題。
           【注意】：標題內容請保持連貫，預留位置前後「不要」有空格（除非是英文詞彙），確保讀起來流暢。
           例如："2026實戰：當{entity}{action}遭遇{pain_point}時的終極優化方案"
        5. exclusion_rules (排除規則)：這是一個 JSON 物件，定義該產業中不合理的組合。
           格式為 { "實體關鍵字": ["禁止出現的動作或痛點詞彙"] }。
           例如針對『加密貨幣錢包』，規則可能是：{"MetaMask": ["KYC認證", "提現"], "冷錢包": ["入金"]}。
           請根據您對主題『{topic}』的專業理解，列出 3-5 條最關鍵的邏輯排除規則，避免產生低品質組合。

        每個欄位前三項請提供約 6-10 個最具代表性的詞彙。
        回傳格式必須為純 JSON，不得包含任何 Markdown 標籤或額外解釋。
        """
        
        system_template = KalpaService._get_active_template(db, user_id, "kalpa_brainstorming", default_system)
        system_prompt = system_template.replace("{topic}", topic)
        
        user_prompt = f"請針對主題『{topic}』進行天道解析建模。"
        
        try:
            content = await AIService.generate_content(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.7
            )
            
            # 清理可能的 Markdown 標記
            clean_json = content.replace("```json", "").replace("```", "").strip()
            import json
            return json.loads(clean_json)
        except Exception as e:
            print(f"Brainstorm failed: {str(e)}")
            return {
                "entities": [],
                "actions": [],
                "pain_points": [],
                "suggested_title_template": ""
            }

    @staticmethod
    def delete_matrix(db: Session, matrix_id: str, user_id: str) -> bool:
        """
        刪除矩陣及其所有關聯節點 (User 隔離)
        """
        matrix = db.query(KalpaMatrix).filter(
            KalpaMatrix.id == matrix_id,
            KalpaMatrix.user_id == user_id
        ).first()
        if not matrix:
            return False
            
        # 刪除關聯節點
        db.query(KalpaNode).filter(KalpaNode.matrix_id == matrix_id).delete()
        # 刪除矩陣
        db.delete(matrix)
        db.commit()
        return True

    @staticmethod
    def _get_weaving_persona(pain_point: str, industry: str) -> Dict[str, str]:
        """
        【千人千面 v4】根據痛點內容與產業背景，動態生成 AI 寫作人格設定
        """
        pp = pain_point.lower()
        ind = industry if industry else "相關領域"
        
        # 定義核心策略分類與動態角色模板
        strategies = [
            {
                "keywords": ["失敗", "錯誤", "無法", "斷開", "崩潰", "fail", "error", "bug", "報錯", "異常"],
                "role_suffix": "技術診斷專家",
                "tone": "冷靜、精確、步驟導向，強調『系統連通性』與『配置校準』。",
                "intro_template": "解析『{pp}』背後的技術邏輯至關重要。我們會從協議層面分析 {ind} 實體狀態，提供精確的修復路徑。"
            },
            {
                "keywords": ["風控", "資金", "資金安全", "凍結", "申訴", "實名", "kyc", "安全", "危險", "詐騙", "風險", "監管"],
                "role_suffix": "安全合規監理官",
                "tone": "嚴謹、專業避險、極具公信力，專注於『合規路徑』與『資產/數據安全協議』。",
                "intro_template": "在處理 {ind} 的『{pp}』問題時，資產安全永遠是第一優先。本指南將依據最新法規要求，助您安全渡過此次技術性受限。"
            },
            {
                "keywords": ["等很久", "慢", "沒反應", "延遲", "堵塞", "slow", "wait", "delay", "卡頓", "效率"],
                "role_suffix": "性能負載優化師",
                "tone": "講求效率、對比強烈、富有穿透力，專注於『節點加速』與『吞吐量提升』。",
                "intro_template": "我們深知在 {ind} 市場，每一秒的『{pp}』都代表機會成本。透過對 {ind} 實體鏈路的優化，我們可以顯著縮短等待時間。"
            },
            {
                "keywords": ["一鍵", "懶人", "自動", "快速", "教學", "懶人包", "手把手", "新手", "簡單"],
                "role_suffix": "實戰流程導師",
                "tone": "親切、易懂、指令化，強調『零障礙入門』與『全自動化部署』。",
                "intro_template": "想要快速搞定 {ind} 的『{pp}』嗎？這是一份專為新手與效率追求者設計的實戰包，我們將複雜邏輯轉化為可立即執行的步驟。"
            }
        ]

        # 根據關鍵字權重進行動態匹配
        matched = None
        for strategy in strategies:
            if any(w in pp for w in strategy["keywords"]):
                matched = strategy
                break

        if matched:
            return {
                "role": f"資深 {ind} {matched['role_suffix']}",
                "tone": matched["tone"],
                "intro": matched["intro_template"].format(ind=ind, pp=pain_point)
            }

        # 預設：資深領域策略官
        return {
            "role": f"資深 {ind} 策略諮詢顧問",
            "tone": "全面、平衡、深入淺出，提供 2026 年最新趨勢剖析與多元化優化視野。",
            "intro": f"針對 {ind} 領域中的『{pain_point}』現狀，我們綜合了 2026 年最新的數據指標，旨在為您提供一個具備未來前瞻性的解決框架。"
        }

kalpa_service = KalpaService()
