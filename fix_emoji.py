import sys

# 讀取文件
with open(r'd:\users\Qoo\Documents\python\AI-Article-Writing-System\seonize-frontend\src\pages\PromptPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 替換損壞的 icon 行
import re
content = re.sub(r"icon: '[^']*spec'", "icon: '📋'", content)

# 寫回文件
with open(r'd:\users\Qoo\Documents\python\AI-Article-Writing-System\seonize-frontend\src\pages\PromptPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復 emoji 字符")
