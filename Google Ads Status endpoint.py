# python
import os
import requests
from requests.auth import HTTPBasicAuth

# 建議把憑證放在環境變數中
LOGIN = os.getenv("DFSEO_LOGIN", "your_login")
PASSWORD = os.getenv("DFSEO_PASSWORD", "your_password")

URL = "https://api.dataforseo.com/v3/keywords_data/google_ads/status"

def get_google_ads_status(login, password):
    resp = requests.get(URL, auth=HTTPBasicAuth(login, password), headers={"Content-Type":"application/json"})
    resp.raise_for_status()  # 若非 2xx 將丟出例外
    return resp.json()

def main():
    try:
        data = get_google_ads_status(LOGIN, PASSWORD)
    except requests.HTTPError as e:
        print("HTTP error:", e)
        return
    except Exception as e:
        print("Error:", e)
        return

    # 檢查 top-level cost
    top_cost = data.get("cost")
    print("top-level cost:", top_cost)
    if top_cost == 0:
        print("此 endpoint 的回傳 cost 為 0（此 endpoint 不會對帳戶收費）。")
    else:
        print("注意：此回傳顯示 cost =", top_cost)

    # 解析 tasks -> result（依文件結構）
    tasks = data.get("tasks", [])
    if not tasks:
        print("回傳沒有 tasks。")
        return

    # 取第一個 task 的第一筆 result
    task = tasks[0]
    results = task.get("result", [])
    if not results:
        print("task 中沒有 result。")
        return

    status = results[0]
    actual_data = status.get("actual_data")
    date_update = status.get("date_update")
    last_year = status.get("last_year_in_monthly_searches")
    last_month = status.get("last_month_in_monthly_searches")

    print("actual_data:", actual_data)
    print("date_update:", date_update)
    print("last_year_in_monthly_searches:", last_year)
    print("last_month_in_monthly_searches:", last_month)

    # 判斷建議流程
    if actual_data:
        print("說明：Google 已在最近一次更新中更新上個月的關鍵字資料，可以放心取得該月份的搜尋量等指標。")
    else:
        print("說明：Google 尚未更新上個月的關鍵字資料，回傳的最新可用資料可能為更早月份。")

if __name__ == "__main__":
    main()
