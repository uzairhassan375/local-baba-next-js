from flask import Blueprint, g, jsonify, request

from ...core.auth import is_admin, require_admin, require_auth
from ...core.supabase_client import get_admin_client

categories_bp = Blueprint("categories", __name__)


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "name": row.get("name") or "",
        "imageUrl": row.get("image_url"),
        "sortOrder": row.get("sort_order") or 0,
        "isActive": bool(row.get("is_active")),
    }


@categories_bp.get("")
@require_auth
def list_categories():
    """Categories for the "Shop by Category" row — admin sees every
    category (including inactive, for the management page); everyone else
    only sees active ones, in display order. Categories themselves are
    admin-CRUD'd via direct Supabase from the admin panel, same convention
    as products/blasts — this is the read side the mobile app and website
    both use.
    """
    db = get_admin_client()
    query = db.table("categories").select("*")
    if not is_admin(g.user):
        query = query.eq("is_active", True)
    res = query.order("sort_order").order("created_at").execute()
    return jsonify(success=True, categories=[_map_row(r) for r in (res.data or [])])


@categories_bp.post("")
@require_admin
def upsert_category():
    """Categories aren't separately "created" by admins — the button for
    each one always exists (driven by the product category list) and this
    just attaches optional display metadata to it, keyed by name."""
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify(success=False, error="name is required."), 400

    payload = {"name": name}
    if "imageUrl" in body:
        payload["image_url"] = body.get("imageUrl")
    if "isActive" in body:
        payload["is_active"] = body.get("isActive")
    if "sortOrder" in body:
        payload["sort_order"] = body.get("sortOrder")

    db = get_admin_client()
    res = db.table("categories").upsert(payload, on_conflict="name").execute()
    if not res.data:
        return jsonify(success=False, error="Could not save category."), 500
    return jsonify(success=True, category=_map_row(res.data[0]))
