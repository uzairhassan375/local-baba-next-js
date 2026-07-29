from functools import wraps

import jwt
from flask import g, jsonify, request

from .config import config


def decode_supabase_jwt(token: str) -> dict | None:
    """Locally verify a Supabase-issued access token (HS256) and return
    {"id": <auth.uid()>, "email": <email>}, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            leeway=10,
        )
    except jwt.PyJWTError:
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
