"""Memcached adapter for local Memcached or AWS ElastiCache for Memcached."""
import json
import logging
import os
import ssl
import uuid

from pymemcache.client.hash import HashClient

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if os.getenv("CACHE_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        return None

    port = int(os.getenv("MEMCACHED_PORT", "11211"))
    # ElastiCache Memcached configuration-endpoint auto-discovery is not
    # implemented by pymemcache. Supply one or more node endpoints explicitly.
    raw_servers = os.getenv("MEMCACHED_SERVERS") or os.getenv("MEMCACHED_HOST", "")
    hosts = [item.strip() for item in raw_servers.split(",") if item.strip()]
    if not hosts:
        logger.warning("MEMCACHED_SERVERS/MEMCACHED_HOST is empty; caching is disabled")
        return None

    options = {
        "max_pool_size": int(os.getenv("MEMCACHED_POOL_SIZE", "8")),
        "connect_timeout": 2,
        "timeout": 2,
        "use_pooling": True,
    }
    if os.getenv("MEMCACHED_TLS", "false").lower() in {"1", "true", "yes"}:
        options["tls_context"] = ssl.create_default_context()

    try:
        servers = [(host, port) for host in hosts]
        client = HashClient(servers, **options)
        # A harmless read verifies that at least one configured node responds.
        client.get("__ecommerce_memcached_probe__")
        _client = client
        logger.info("Connected to Memcached nodes %s (TLS=%s)", hosts,
                    options.get("tls_context") is not None)
        return _client
    except Exception as exc:
        logger.warning("Memcached unavailable; treating cache as a miss: %s", exc)
        return None


def get_json(key):
    client = _get_client()
    if not client:
        return None
    try:
        value = client.get(key)
        return json.loads(value.decode("utf-8")) if value else None
    except Exception as exc:
        logger.warning("Memcached read failed for %s: %s", key, exc)
        return None


def set_json(key, value, ttl=300):
    client = _get_client()
    if not client:
        return
    try:
        client.set(key, json.dumps(value, default=str).encode("utf-8"), expire=ttl)
    except Exception as exc:
        logger.warning("Memcached write failed for %s: %s", key, exc)


def delete(key):
    client = _get_client()
    if not client:
        return
    try:
        client.delete(key)
    except Exception as exc:
        logger.warning("Memcached delete failed for %s: %s", key, exc)


def namespace_version(namespace):
    """Return a version token used to invalidate a whole key namespace safely."""
    key = f"cache-version:{namespace}"
    version = get_json(key)
    if version is None:
        version = "1"
        set_json(key, version, ttl=0)
    return str(version)


def rotate_namespace(namespace):
    """Invalidate namespace keys without unsupported Memcached wildcard deletes."""
    set_json(f"cache-version:{namespace}", uuid.uuid4().hex, ttl=0)


def invalidate_product_cache(product_id=None):
    delete("catalog:products:list")
    delete("catalog:categories:list")
    if product_id is not None:
        delete(f"catalog:products:{product_id}")


def invalidate_service_cache(service_id=None):
    delete("catalog:services:list")
    if service_id is not None:
        delete(f"catalog:services:{service_id}")
    rotate_namespace("therapists")


def invalidate_therapist_cache(therapist_id=None):
    rotate_namespace("therapists")
    if therapist_id is not None:
        delete(f"catalog:therapists:{therapist_id}")
