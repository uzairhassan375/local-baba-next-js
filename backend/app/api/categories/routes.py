from flask import Blueprint, g, jsonify

from ...core.auth import is_admin, require_auth
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
