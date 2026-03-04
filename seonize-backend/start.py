"""
Zeabur-compatible startup script.
Reads PORT or WEB_PORT from environment variables safely,
handling cases where Zeabur may pass template strings like '${WEB_PORT}'.
"""
import os
import uvicorn


def get_port(default: int = 8080) -> int:
    for var in ("PORT", "WEB_PORT"):
        val = os.environ.get(var, "")
        try:
            return int(val)
        except (ValueError, TypeError):
            continue
    return default


if __name__ == "__main__":
    port = get_port(default=8080)
    print(f"Starting Seonize Backend on port {port}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
