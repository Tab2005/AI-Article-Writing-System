import sqlite3
import os

def seed_writing_prompt():
    db_path = os.path.join('seonize-backend', 'seonize.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    prompt_content = """你是一位資深的 SEO 內容寫手，擅長產出具備高 E-E-A-T (經驗、專業、權威、信任) 價值的內容。
請根據提供的大綱章節標題與資訊，撰寫一段高質量的文章內容。

# 文章背景
- 核心關鍵字：{keyword}
- 搜尋意圖：{intent}
- 整體文章標題 (H1)：{h1}

# 章節資訊
- 章節標題：{heading}
- 必須嵌入的關鍵字：{keywords}
- 前文摘要：{previous_summary}

# 寫作要求
1. **字數控制**：本章節請撰寫約 {target_word_count} 字。
2. **SEO 優化**：
   - 自然嵌入指定的關鍵字，保持關鍵字密度約 {keyword_density}%。
   - 使用 Markdown 格式（例如使用粗體強調重點）。
   - 語氣需符合專業且具說服力的風格。
3. **E-E-A-T 強化**：
   - 儘可能引用數據或展現專業見解。
   - 內容需解決使用者的實際問題。

# 輸出格式
直接輸出 Markdown 內容，不要包含任何開場白或結尾語。
"""

    cursor.execute('''
        INSERT INTO prompt_templates (category, name, content, is_active)
        VALUES (?, ?, ?, ?)
    ''', ('content_writing', 'SEO 分段寫作 (標準)', prompt_content, 1))

    conn.commit()
    conn.close()
    print("✅ SEO Writing Prompt Template seeded successfully!")

if __name__ == "__main__":
    seed_writing_prompt()
