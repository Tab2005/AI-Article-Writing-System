import requests
from requests.auth import HTTPBasicAuth

# 用你的帳號/密碼
USERNAME = "your_login"
PASSWORD = "your_password"

url = "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live"

# 範例 POST 資料（可包含多個 task）
post_data = [
    {
        "location_name": "United States",
        "keywords": ["phone", "cellphone"]
    }
]

resp = requests.post(url, json=post_data, auth=HTTPBasicAuth(USERNAME, PASSWORD))
if resp.status_code != 200:
    print("HTTP error:", resp.status_code, resp.text)
else:
    data = resp.json()
    # 接著用前面解析範例的邏輯來讀取 data 的欄位
    # 例如：印出每個 result 的 keyword 與 search_volume
    for task in data.get("tasks", []):
        for r in task.get("result", []):
            print("keyword:", r.get("keyword"), "search_volume:", r.get("search_volume"))
