import itertools
from typing import List, Dict, Any

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

kalpa_service = KalpaService()
