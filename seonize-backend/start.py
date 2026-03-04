"""
Zeabur-compatible startup script.
Reads PORT (or WEB_PORT) from environment variables so that uvicorn
gets an integer value rather than the unexpanded shell literal.
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(
        os.environ.get("PORT")
        or os.environ.get("WEB_PORT")
        or 8080
    )
    print(f"Starting Seonize Backend on port {port}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
