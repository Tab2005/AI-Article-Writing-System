# 範例：解析 keywords_for_keywords live endpoint 的所有主要回傳欄位
# 將 response_json 換成你實際從 API 得到的 JSON（dict）即可

response_json = { 
    # ... (把上面那段 JSON 貼在這裡，或直接從 requests.json() 取得)
}

# 範例解析
print("=== 回應頂層欄位 ===")
for top in ("version","status_code","status_message","time","cost","tasks_count","tasks_error"):
    print(f"{top}: {response_json.get(top)}")

print("\n=== tasks 列表 ===")
for task_idx, task in enumerate(response_json.get("tasks", []), start=1):
    print(f"\n-- Task #{task_idx} --")
    for field in ("id","status_code","status_message","time","cost","result_count","path"):
        print(f"{field}: {task.get(field)}")
    print("data:", task.get("data"))

    results = task.get("result", [])
    print(f"結果數量: {len(results)}")

    for r_idx, r in enumerate(results, start=1):
        print(f"\n  >> Result #{r_idx}")
        # 基本欄位
        for fld in ("keyword","location_code","language_code","search_partners",
                    "competition","competition_index","search_volume",
                    "low_top_of_page_bid","high_top_of_page_bid","cpc"):
            print(f"    {fld}: {r.get(fld)}")

        # monthly_searches（陣列）
        monthly = r.get("monthly_searches")
        print("    monthly_searches:")
        if monthly:
            for m in monthly:
                print(f"      - {m.get('year')}-{m.get('month')}: {m.get('search_volume')}")
        else:
            print("      None")

        # keyword_annotations（object）
        print("    keyword_annotations:", r.get("keyword_annotations"))

        # concepts / name / concept_group / type（如有）
        print("    concepts:", r.get("concepts"))
        print("    name:", r.get("name"))
        print("    concept_group:", r.get("concept_group"))
        print("    type:", r.get("type"))
