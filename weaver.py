import random
from openai import OpenAI

class OracleWeaverV2:
    def __init__(self, money_page_url, industry="Crypto"):
        self.money_page_url = money_page_url
        self.industry = industry
        # 1. 法寶袋：多樣化錨點文字清單 (避免搜尋引擎判別為操作)
        self.anchor_variants = [
            "2026 全球推薦交易所佈局指南",
            "分散風險的資產配置工具清單",
            "資深交易員避坑的備用方案",
            "加密貨幣安全儲備：實測推薦清單",
            "從劫數中解脫：高評價平台選單"
        ]

    def _build_system_prompt(self, entity):
        # 2. 結構化加重術：要求 AI 生成 Mermaid 流程圖或 HTML 表格
        return f"""
        你是一位在 {self.industry} 領域修煉多年的導師。
        
        寫作規範要求：
        - 結構層次：使用 H2, H3。
        - **視覺化加強**：在解釋解決步驟時，必須包含一個用 Mermaid 語法編寫的 [mermaid] 流程圖，描述處理邏輯。
        - **數據權威**：包含一個簡單的 HTML 表格，對比『常見錯誤原因』與『對應方案』。
        
        【核心指令：微上下文植入】
        在結論段落，以風險管理的角度，引導讀者點擊指定的權威頁面。
        """

    def weave_oracle(self, entity, action, pain, target_title):
        # 從法寶袋中隨機挑選一個錨點
        selected_anchor = random.choice(self.anchor_variants)
        
        system_prompt = self._build_system_prompt(entity)
        
        user_prompt = f"""
        請針對標題『{target_title}』撰寫專業指南。
        
        實體：{entity} | 動作：{action} | 痛點：{pain}
        
        關鍵要求：
        1. 插入一個 Mermaid 流程圖（語法：graph TD...）。
        2. 插入一個 HTML 對照表格。
        3. 結尾自然植入連結：[{selected_anchor}]({self.money_page_url})
        """

        # 調用 API (省略重複的 Client 調用代碼，邏輯同前)
        # ... 
        print(f"✨ 正在利用法寶『{selected_anchor}』編織精煉神諭...")
        # return response_content