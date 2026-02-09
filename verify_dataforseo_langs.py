
import httpx
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Use credentials from .env or fallback
login = os.getenv("DATAFORSEO_LOGIN", "")
password = os.getenv("DATAFORSEO_PASSWORD", "")

if not login or not password:
    print("Error: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables are required.")
    exit(1)

auth_str = f"{login}:{password}"
encoded_auth = base64.b64encode(auth_str.encode("ascii")).decode("ascii")
headers = {"Authorization": f"Basic {encoded_auth}"}

async def check_languages():
    async with httpx.AsyncClient() as client:
        # Check standard SERP languages
        url = "https://api.dataforseo.com/v3/serp/google/languages"
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            tasks = data.get("tasks", [])
            if tasks:
                results = tasks[0].get("result", [])
                # Look for Traditional Chinese
                tw_langs = [r for r in results if "Traditional" in r.get("language_name", "") or "TW" in r.get("language_code", "")]
                print("--- SERP Languages for Traditional Chinese ---")
                print(json.dumps(tw_langs, indent=2, ensure_ascii=False))
        else:
            print(f"Failed to fetch SERP languages: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_languages())
