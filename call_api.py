
import httpx
import json

try:
    response = httpx.get("http://localhost:8000/api/settings/serp-providers", timeout=5.0)
    print(f"Status: {response.status_code}")
    print(f"Body: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
