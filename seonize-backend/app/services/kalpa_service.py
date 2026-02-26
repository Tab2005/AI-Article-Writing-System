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
    def generate_matrix(entities: List[str], actions: List[str], pain_points: List[str], project_name: str = "Default_Project", title_template: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        執行笛卡爾乘積運算，生成意圖矩陣 (Kalpa Matrix)
        """
        # 執行笛卡爾乘積 (Cartesian Product)
        combinations = list(itertools.product(entities, actions, pain_points))
        
        results = []
        for e, a, p in combinations:
            # 確保內容沒有前後空格
            e, a, p = e.strip(), a.strip(), p.strip()
            
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
            
        return results

    @staticmethod
    def save_matrix(db: Session, project_name: str, entities: List[str], actions: List[str], pain_points: List[str], nodes: List[Dict[str, Any]], industry: str = "Crypto", money_page_url: str = "") -> KalpaMatrix:
        """
        儲存生成的矩陣到資料庫
        """
        matrix = KalpaMatrix(
            project_name=project_name,
            industry=industry,
            money_page_url=money_page_url,
            entities=entities,
            actions=actions,
            pain_points=pain_points
        )
        db.add(matrix)
        db.flush() # 取得 ID

        for node_data in nodes:
            node = KalpaNode(
                matrix_id=matrix.id,
                entity=node_data.get("entity"),
                action=node_data.get("action"),
                pain_point=node_data.get("pain_point"),
                target_title=node_data.get("target_title"),
                status="pending"
            )
            db.add(node)
        
        db.commit()
        db.refresh(matrix)
        return matrix

    @staticmethod
    def get_matrix(db: Session, matrix_id: str) -> Optional[Dict[str, Any]]:
        """
        取得已儲存的矩陣及其節點
        """
        matrix = db.query(KalpaMatrix).filter(KalpaMatrix.id == matrix_id).first()
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
    async def weave_node(db: Session, node_id: str) -> KalpaNode:
        """
        執行「神諭編織」：為節點生成專業指南文章
        整合了 weaver.py 的邏輯，並使用系統統一配置的 AIService。
        """
        node = db.query(KalpaNode).filter(KalpaNode.id == node_id).first()
        if not node:
            raise ValueError("Node not found")
        
        matrix = db.query(KalpaMatrix).filter(KalpaMatrix.id == node.matrix_id).first()
        if not matrix:
            raise ValueError("Associated matrix not found")

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

        # 2. 構建 System Prompt (結構化加重術)
        system_prompt = f"""
        你是一位在 {matrix.industry} 領域修煉多年的導師。
        
        寫作規範要求：
        - 結構層次：使用 H2, H3。
        - **視覺化加強**：在解釋解決步驟時，必須包含一個用 Mermaid 語法編寫的流程圖，描述處理邏輯（語法必須被包裹在 ```mermaid 和 ``` 之間，例如：```mermaid\ngraph TD...```）。
        - **數據權威**：包含一個簡單的 HTML 表格，對比『常見錯誤原因』與『對應方案』。
        
        【核心指令：微上下文植入】
        在結論段落，以風險管理的角度，引導讀者點擊指定的權威頁面。
        """

        # 3. 構建 User Prompt
        user_prompt = f"""
        請針對標題『{node.target_title}』撰寫專業指南。
        
        實體：{node.entity} | 動作：{node.action} | 痛點：{node.pain_point}
        
        關鍵要求：
        1. 插入一個 Mermaid 流程圖 (語法必須包裹在 ```mermaid 代碼塊內)。
        2. 插入一個 HTML 對照表格。
        3. 結尾自然植入連結：[{selected_anchor}]({matrix.money_page_url or "https://example.com"})
        
        請注意時效性，使用 2026 年為背景。
        """

        try:
            logger.info(f"Starting weaving for node {node_id} (title: {node.target_title})")
            # 使用 AIService 生成內容
            content = await AIService.generate_content(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.8
            )
            
            if not content:
                raise ValueError("AIService returned empty content")

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
    def list_all_articles(db: Session, matrix_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        取得所有已編織完成的文章，整合專案名稱。
        """
        query = db.query(KalpaNode, KalpaMatrix.project_name)\
                  .join(KalpaMatrix, KalpaNode.matrix_id == KalpaMatrix.id)\
                  .filter(KalpaNode.status == "completed")
        
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
        
        請回傳一個包含以下四個欄位的 JSON 物件：
        1. entities (實體)：該產業的核心對象、平台、工具或軟體（例如：MetaMask, 幣安）。
        2. actions (動作)：使用者對這些實體執行的具體行為（例如：入金, 提現, 註冊）。
        3. pain_points (痛點)：執行動作時最常遇到的困難、錯誤、恐懼或不便（例如：失敗, 等很久, 報錯）。
        4. suggested_title_template (建議標題模板)：為該主題量身打造的一個意圖標題模板。必須包含預留位置 {entity}, {action}, {pain_point}。
           請發揮創意，設計一個引人入勝、能解決痛點且具備 2026 年時效性的標題。
           【注意】：標題內容請保持連貫，預留位置前後「不要」有空格（除非是英文詞彙），確保讀起來流暢。
           避免使用「怎麼辦？」或「修復步驟」等陳舊詞彙。
           例如："2026實戰：當{entity}{action}遭遇{pain_point}時的終極優化方案"

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
    def delete_matrix(db: Session, matrix_id: str) -> bool:
        """
        刪除矩陣及其所有關聯節點
        """
        matrix = db.query(KalpaMatrix).filter(KalpaMatrix.id == matrix_id).first()
        if not matrix:
            return False
            
        # 刪除關聯節點
        db.query(KalpaNode).filter(KalpaNode.matrix_id == matrix_id).delete()
        # 刪除矩陣
        db.delete(matrix)
        db.commit()
        return True

kalpa_service = KalpaService()
