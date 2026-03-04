"""
Zeabur-compatible startup script.
Reads PORT or WEB_PORT from environment variables safely.
"""
import os
import uvicorn
import logging

# Set up basic logging for startup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("startup")

def get_port(default: int = 8000) -> int:
    # Check for direct PORT or WEB_PORT env vars
    for var in ("PORT", "WEB_PORT"):
        val = os.environ.get(var, "")
        logger.info(f"Checking env var {var}: '{val}'")
        try:
            port = int(val)
            logger.info(f"Found valid port in {var}: {port}")
            return port
        except (ValueError, TypeError):
            logger.warning(f"Invalid port value in {var}: '{val}'")
            continue
    
    logger.info(f"Using default port: {default}")
    return default


if __name__ == "__main__":
    port = get_port(default=8000)
    logger.info(f"Starting Seonize Backend on 0.0.0.0:{port}")
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            proxy_headers=True,
            forwarded_allow_ips="*"
        )
    except Exception as e:
        logger.error(f"Failed to start uvicorn: {e}")
        raise
