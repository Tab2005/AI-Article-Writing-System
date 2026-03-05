from datetime import datetime, timezone
import itertools
import random
import logging
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import KalpaMatrix, KalpaNode
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

class KalpaService:
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
    async def generate_anchor_variants(industry: str, money_page_url: str = "") -> List[str]:
        """
        使用 AI 動態生成符合產業語境的錨點文字（法寶袋）
        """
        system_prompt = f"""
        你是一位專業的 SEO 與內容營銷專家。
        目標：為一個在「{industry}」產業的頁面生成具備高度吸引力與導引性的錨點文字（Anchor Text）。
        
        要求：
        1. 產出 5 個不同的錨點文字。
        2. 風格多樣：包含專業指南感、風險管理感、實戰經驗感、以及具備時效性（設定在 2026 年）。
        3. 內容必須與「{industry}」高度相關。
        4. 格式：僅回傳一個 JSON 陣列，例如 ["文字1", "文字2", ...]，不要有任何其他解釋。
        """
        
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
            anchor_variants = await KalpaService.generate_anchor_variants(matrix.industry, matrix.money_page_url)
            matrix.anchor_variants = anchor_variants
            db.commit()
            
        selected_anchor = random.choice(anchor_variants)
        
        # 2. 【千人千面】動態人格設定 (Multi-Personality v3 - 產業適配)
        persona = KalpaService._get_weaving_persona(node.pain_point, matrix.industry)

        # 3. 構建 System Prompt (結構化加重術 + GEO/AIO 深度優化)
        system_prompt = f"""
        你現在的身份是：{persona['role']}。
        你的寫作語氣：{persona['tone']}
        
        寫作規範要求 (GEO/AIO 友善架構)：
        1. **快速摘要 (Summary Card)**：在文章最開頭，以『## 📋 快速摘要 (TL;DR)』為標題，用 100 字內總結針對『{node.target_title}』的核心方案。
        2. **🎯 直接答案片段**：在每個 H2/H3 標題下方，緊接一段 50 字內的精煉回答，直接切入重點，避免廢話，以符合 AI Overviews 摘錄邏輯。
        3. **視覺化與表格**：解釋步驟時必須包含一個 Mermaid 流程圖，並包含一個 HTML 表格對比『核心問題』與『優化方案』。
        4. **💡 專家洞察 (Expert Insight)**：在文中插入一個具有深度見解的段落，開頭標註『💡 專家建議：』。
        5. **常見問答 (FAQ)**：在結尾前增加一個『## ❓ 常見問答 (FAQ)』區塊，包含 3 個關鍵問題與回答。
        6. **🏁 完整性協定**：文章必須完整結束，嚴禁在 mid-sentence 或開放標籤處中斷。
        
        【核心指令：微上下文植入】
        在結論段落，以專業風險管理的角度，自然引導讀者點擊指定的權威頁面。
        """

        # 4. 構建 User Prompt
        user_prompt = f"""
        {persona['intro']}
        
        請針對標題『{node.target_title}』撰寫專業解決方案指南。
        
        核心要素：
        - 產業背景：{matrix.industry}
        - 實體：{node.entity}
        - 動作：{node.action}
        - 痛點：{node.pain_point}
        
        文章必須包含：
        1. 針對 {node.pain_point} 的深度解析與同理。
        2. 完全符合 {persona['role']} 背景的專業建議，嚴禁使用無關產業的術語（除非是類比）。
        3. Mermaid 流程圖語法 (包裹在 ```mermaid 內)。
        4. HTML 對照表格。
        5. 結尾自然植入連結：[{selected_anchor}]({matrix.money_page_url or "https://example.com"})
        
        請注意時效性，背景設定為 2026 年最新趨勢與實踐方案。
        """

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
    async def brainstorm_elements(topic: str) -> Dict[str, List[str]]:
        """
        天道解析：透過 AI 進行領域建模，生成建議的實體、動作與痛點。
        """
        system_prompt = """
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
           請根據您對主題『主題』的專業理解，列出 3-5 條最關鍵的邏輯排除規則，避免產生低品質組合。

        每個欄位前三項請提供約 6-10 個最具代表性的詞彙。
        回傳格式必須為純 JSON，不得包含任何 Markdown 標籤或額外解釋。
        """
        
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
        【千人千面 v3】根據痛點內容與產業背景，動態生成 AI 寫作人格設定
        """
        pp = pain_point.lower()
        ind = industry if industry else "相關領域"
        
        # 1. 失敗/故障類
        if any(w in pp for w in ["失敗", "錯誤", "無法", "斷開", "崩潰", "fail", "error", "bug"]):
            return {
                "role": f"資深 {ind} 技術架構師",
                "tone": "專業、簡潔、邏輯性極強，專注於『故障排除路徑』與『底層邏輯修復』。",
                "intro": f"面對 {ind} 的技術故障，我們需要保持冷靜。這通常源於配置偏移或環境不相容。這篇文章會帶你從檢查實體狀態開始，快速定位並解決問題。"
            }
            
        # 2. 金流/風險/安全類
        if any(w in pp for w in ["風控", "資金", "拿不出來", "凍結", "申訴", "實名", "kyc", "安全", "危險", "詐騙", "風險"]):
            return {
                "role": f"資深 {ind} 安全合規顧問",
                "tone": "嚴謹、安撫性強、極具權威感，專注於『合規路徑』與『資產/數據安全協議』。",
                "intro": f"在 {ind} 領域，安全始終是核心。遇到風險提示或受限情況時，這往往是系統安全協議的觸發。接下來，我將依據 2026 最新標準引導您完成合規處置。"
            }
            
        # 3. 效率/等待類
        if any(w in pp for w in ["等很久", "慢", "沒反應", "延遲", "堵塞", "slow", "wait", "delay"]):
            return {
                "role": f"資深 {ind} 流程優化專家",
                "tone": "親切、耐心、富有對比感，使用生動比喻（如排隊、塞車）來解釋底層延遲原因。",
                "intro": f"我知道在處理 {ind} 相關事務時，『等待』是最折磨人的。這種延遲通常與處理高峰有關，讓我們拿起地圖，看看現在的『交通狀況』，並尋找最優的加速方案。"
            }

        # 4. 極速/教學/懶人類
        if any(w in pp for w in ["一鍵", "懶人", "自動", "快速", "教學", "懶人包", "手把手"]):
            return {
                "role": f"{ind} 極簡主義效率導師",
                "tone": "高效、去冗餘、指令化，強調『3 分鐘上手』與『全自動化配置』。",
                "intro": f"時間在 {ind} 競爭中至關重要。我們跳過所有繁瑣的理論，直接進入最乾貨的操作環節，讓您在最短時間內達成自動化優化目標。"
            }

        # 預設：資深領域專家
        return {
            "role": f"資深 {ind} 諮詢官",
            "tone": "中立、平衡、全面，提供 2026 年最新趨勢分析與客觀優化方案。",
            "intro": f"針對 {ind} 領域的這個常見問題，我們進行了深度的調研與實測，這份 2026 年版本的優化指南將助您在解決方案中脫穎而出。"
        }

kalpa_service = KalpaService()
