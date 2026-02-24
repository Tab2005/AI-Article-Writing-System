import itertools
import random
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import KalpaMatrix, KalpaNode
from app.services.ai_service import AIService

class KalpaService:
    @staticmethod
    def generate_matrix(entities: List[str], actions: List[str], pain_points: List[str], project_name: str = "Default_Project") -> List[Dict[str, Any]]:
        """
        執行笛卡爾乘積運算，生成意圖矩陣 (Kalpa Matrix)
        """
        # 執行笛卡爾乘積 (Cartesian Product)
        combinations = list(itertools.product(entities, actions, pain_points))
        
        results = []
        for e, a, p in combinations:
            # 生成標題模板
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

        # 1. 法寶袋：多樣化錨點文字清單
        anchor_variants = [
            "2026 全球推薦交易所佈局指南",
            "分散風險的資產配置工具清單",
            "資深交易員避坑的備用方案",
            "加密貨幣安全儲備：實測推薦清單",
            "從劫數中解脫：高評價平台選單"
        ]
        selected_anchor = random.choice(anchor_variants)

        # 2. 構建 System Prompt (結構化加重術)
        system_prompt = f"""
        你是一位在 {matrix.industry} 領域修煉多年的導師。
        
        寫作規範要求：
        - 結構層次：使用 H2, H3。
        - **視覺化加強**：在解釋解決步驟時，必須包含一個用 Mermaid 語法編寫的 [mermaid] 流程圖，描述處理邏輯（語法：graph TD...）。
        - **數據權威**：包含一個簡單的 HTML 表格，對比『常見錯誤原因』與『對應方案』。
        
        【核心指令：微上下文植入】
        在結論段落，以風險管理的角度，引導讀者點擊指定的權威頁面。
        """

        # 3. 構建 User Prompt
        user_prompt = f"""
        請針對標題『{node.target_title}』撰寫專業指南。
        
        實體：{node.entity} | 動作：{node.action} | 痛點：{node.pain_point}
        
        關鍵要求：
        1. 插入一個 Mermaid 流程圖。
        2. 插入一個 HTML 對照表格。
        3. 結尾自然植入連結：[{selected_anchor}]({matrix.money_page_url or "https://example.com"})
        
        請注意時效性，使用 2026 年為背景。
        """

        try:
            # 使用 AIService 生成內容
            content = await AIService.generate_content(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.8
            )
            
            node.woven_content = content
            node.anchor_used = selected_anchor
            node.status = "completed"
        except Exception as e:
            node.status = "failed"
            node.woven_content = f"Error during weaving: {str(e)}"
        
        db.commit()
        db.refresh(node)
        return node

kalpa_service = KalpaService()
