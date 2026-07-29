import logging
import ssl
from functools import wraps

import certifi
import jwt
from flask import g, jsonify, request
from jwt import PyJWKClient

from .config import config

logger = logging.getLogger(__name__)

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Supabase signs access tokens with an asymmetric key (ES256) published
    at this project's JWKS endpoint — not the legacy shared HS256 "JWT
    Secret". PyJWKClient fetches and caches the public key(s), matching by
    the token's `kid` header, and refreshes automatically on key rotation.

    Uses certifi's CA bundle explicitly for the SSL context — some local
    Python installs (notably python.org builds on macOS) don't pick up the
    system trust store by default, which makes the plain urllib fetch
    PyJWKClient does internally fail with CERTIFICATE_VERIFY_FAILED.
    """
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, ssl_context=ssl_context)
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict | None:
    """Verify a Supabase-issued access token against the project's JWKS and
    return {"id": <auth.uid()>, "email": <email>}, or None if invalid/expired.
    """
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            leeway=10,
        )
    except jwt.PyJWTError as exc:
        logger.warning("JWT verification failed: %s: %s", type(exc).__name__, exc)
        return None

    sub = payload.get("sub")
    if not sub:
        return None
    return {"id": sub, "email": (payload.get("email") or "").lower()}


def get_bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header[len("Bearer "):].strip() or None


def get_current_user() -> dict | None:
    """Best-effort identity lookup — does not fail the request if absent/invalid.
    Use for endpoints where auth is optional (e.g. public product listing that
    shows more to admins)."""
    token = get_bearer_token()
    if not token:
        return None
    return decode_supabase_jwt(token)


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify(success=False, error="Missing Authorization header"), 401
        user = decode_supabase_jwt(token)
        if not user:
            return jsonify(success=False, error="Invalid or expired session"), 401
        g.user = user
        return f(*args, **kwargs)

    return wrapper


def is_admin(user: dict | None) -> bool:
    if not user or not config.ADMIN_EMAIL:
        return False
    return user["email"] == config.ADMIN_EMAIL.strip().lower()


def require_admin(f):
    @wraps(f)
    @require_auth
    def wrapper(*args, **kwargs):
        if not is_admin(g.user):
            return jsonify(success=False, error="Forbidden"), 403
        return f(*args, **kwargs)

    return wrapper
