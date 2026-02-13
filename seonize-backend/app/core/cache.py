"""
Seonize Backend - Cache Manager
支援 Redis (生產) 和 In-Memory (本地) 快取
"""

import os
import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from functools import wraps
import hashlib

logger = logging.getLogger(__name__)

# Redis 可選導入
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class InMemoryCache:
    """In-Memory 快取實作"""
    
    def __init__(self):
        self._cache: dict[str, dict] = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if entry["expires_at"] and datetime.now(timezone.utc) > entry["expires_at"]:
                del self._cache[key]
                return None
            
            return entry["value"]
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        async with self._lock:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl) if ttl > 0 else None
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc),
            }
            return True
    
    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """清除符合 pattern 的所有 key"""
        async with self._lock:
            # 簡單的 pattern 匹配 (支援 * 萬用字元)
            import fnmatch
            keys_to_delete = [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    async def clear_all(self) -> bool:
        async with self._lock:
            self._cache.clear()
            return True
    
    async def get_stats(self) -> dict:
        return {
            "type": "in-memory",
            "size": len(self._cache),
            "keys": list(self._cache.keys())[:10],  # 只顯示前 10 個
        }


class RedisCache:
    """Redis 快取實作"""
    
    def __init__(self, redis_url: str):
        self._client = redis.from_url(redis_url, decode_responses=True)
        self._prefix = "seonize:"
    
    def _make_key(self, key: str) -> str:
        return f"{self._prefix}{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        try:
            value = await self._client.get(self._make_key(key))
            if value:
                return json.loads(value)
            return None
        except Exception:
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        try:
            await self._client.setex(
                self._make_key(key),
                ttl,
                json.dumps(value, default=str)
            )
            return True
        except Exception:
            return False
    
    async def delete(self, key: str) -> bool:
        try:
            await self._client.delete(self._make_key(key))
            return True
        except Exception:
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        try:
            keys = await self._client.keys(self._make_key(pattern))
            if keys:
                return await self._client.delete(*keys)
            return 0
        except Exception:
            return 0
    
    async def clear_all(self) -> bool:
        try:
            keys = await self._client.keys(f"{self._prefix}*")
            if keys:
                await self._client.delete(*keys)
            return True
        except Exception:
            return False
    
    async def get_stats(self) -> dict:
        try:
            info = await self._client.info("memory")
            return {
                "type": "redis",
                "used_memory": info.get("used_memory_human", "unknown"),
                "connected": True,
            }
        except Exception:
            return {"type": "redis", "connected": False}


class CacheManager:
    """快取管理器 - 統一介面"""
    
    _instance: Optional["CacheManager"] = None
    
    def __init__(self):
        redis_url = os.getenv("REDIS_URL")
        
        if redis_url and REDIS_AVAILABLE:
            try:
                self._cache = RedisCache(redis_url)
                # Redis 具備異步 ping，但我們在 init 只標記
                logger.info(f"Cache: Using Redis ({redis_url})")
            except Exception as e:
                logger.warning(f"Cache: Redis init failed ({e}), falling back to in-memory")
                self._cache = InMemoryCache()
        else:
            self._cache = InMemoryCache()
            logger.info("Cache: Using in-memory cache")
    
    @classmethod
    def get_instance(cls) -> "CacheManager":
        if cls._instance is None:
            cls._instance = CacheManager()
        return cls._instance
    
    async def get(self, key: str) -> Optional[Any]:
        return await self._cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        return await self._cache.set(key, value, ttl)
    
    async def delete(self, key: str) -> bool:
        return await self._cache.delete(key)
    
    async def clear_pattern(self, pattern: str) -> int:
        return await self._cache.clear_pattern(pattern)
    
    async def clear_all(self) -> bool:
        return await self._cache.clear_all()
    
    async def get_stats(self) -> dict:
        return await self._cache.get_stats()


# 快取裝飾器
def cached(ttl: int = 3600, key_prefix: str = ""):
    """快取裝飾器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成快取 key
            cache_key = f"{key_prefix}:{func.__name__}:"
            key_data = str(args) + str(sorted(kwargs.items()))
            cache_key += hashlib.md5(key_data.encode()).hexdigest()
            
            # 嘗試取得快取
            cache = CacheManager.get_instance()
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 執行函數並快取結果
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator


# 便捷函數
def get_cache() -> CacheManager:
    return CacheManager.get_instance()
