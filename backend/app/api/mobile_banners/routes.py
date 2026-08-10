from flask import Blueprint, jsonify

from ...core.auth import require_auth
from ...core.supabase_client import get_admin_client

mobile_banners_bp = Blueprint("mobile_banners", __name__)


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "imageUrl": row.get("image_url"),
        "sortOrder": row.get("sort_order") or 0,
    }


@mobile_banners_bp.get("")
@require_auth
def list_mobile_banners():
    """Active banners for the Flutter app's home screen banner carousel, in
    display order. This is a dedicated, mobile-app-only feature — separate
    from blasts (which also feed the website's member dashboard). Admin
    CRUD happens via direct Supabase from the admin panel, same convention
    as products/blasts/categories; this is the read side the app uses."""
    db = get_admin_client()
    res = (
        db.table("mobile_banners")
        .select("id, image_url, sort_order")
        .eq("is_active", True)
        .order("sort_order")
        .order("created_at")
        .execute()
    )
    return jsonify(success=True, banners=[_map_row(r) for r in (res.data or [])])
