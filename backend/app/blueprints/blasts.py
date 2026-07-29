from flask import Blueprint, g, jsonify

from ..auth import is_admin, require_auth
from ..supabase_client import get_admin_client

blasts_bp = Blueprint("blasts", __name__)


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "title": row.get("title") or "",
        "body": row.get("body"),
        "targetCities": row.get("target_cities") or [],
        "status": row.get("status"),
        "sortOrder": row.get("sort_order") or 0,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


@blasts_bp.get("")
@require_auth
def list_blasts():
    db = get_admin_client()
    query = db.table("blasts").select("*")
    if is_admin(g.user):
        query = query.order("created_at", desc=True)
    else:
        query = query.eq("status", "published").order("sort_order", desc=True).order("created_at", desc=True)
    res = query.execute()
    return jsonify(success=True, blasts=[_map_row(r) for r in (res.data or [])])
