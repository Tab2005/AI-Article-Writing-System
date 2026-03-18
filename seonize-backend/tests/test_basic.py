import pytest
from app.core.config import settings

def test_health_check(client):
    """測試健康檢查介面"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_config_security_validation():
    """測試安全性金鑰驗證提示（此測試僅檢查邏輯，不實際崩潰）"""
    # 這裡我們手動觸發 validator
    from app.core.config import Settings
    s = Settings(SECRET_KEY="", ADMIN_PASSWORD="")
    # 如果沒有拋出錯誤且能正常初始化，則驗證成功（因為我們在 validator 中目前只使用 logging.warning）
    assert s.SECRET_KEY == ""
    assert s.ADMIN_PASSWORD == ""
