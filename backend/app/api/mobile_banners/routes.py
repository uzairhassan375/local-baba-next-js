from flask import Blueprint, g, jsonify, request

from ...core.auth import is_admin, require_admin, require_auth
from ...core.supabase_client import get_admin_client

mobile_banners_bp = Blueprint("mobile_banners", __name__)


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "imageUrl": row.get("image_url"),
        "sortOrder": row.get("sort_order") or 0,
        "isActive": bool(row.get("is_active", True)),
    }


@mobile_banners_bp.get("")
@require_auth
def list_mobile_banners():
    """Active banners for the Flutter app's home screen banner carousel (and
    the admin management page, which sees every banner including inactive
    ones), in display order."""
    db = get_admin_client()
    query = db.table("mobile_banners").select("*")
    if not is_admin(g.user):
        query = query.eq("is_active", True)
    res = query.order("sort_order").order("created_at").execute()
    return jsonify(success=True, banners=[_map_row(r) for r in (res.data or [])])


@mobile_banners_bp.post("")
@require_admin
def create_banner():
    body = request.get_json(silent=True) or {}
    image_url = body.get("imageUrl")
    if not image_url:
        return jsonify(success=False, error="imageUrl is required."), 400

    db = get_admin_client()
    res = db.table("mobile_banners").insert({"image_url": image_url, "sort_order": body.get("sortOrder", 0)}).execute()
    if not res.data:
        return jsonify(success=False, error="Could not create banner."), 500
    return jsonify(success=True, banner=_map_row(res.data[0]))


@mobile_banners_bp.patch("/<id>")
@require_admin
def update_banner(id: str):
    body = request.get_json(silent=True) or {}
    updates = {}
    if "sortOrder" in body:
        updates["sort_order"] = body["sortOrder"]
    if "isActive" in body:
        updates["is_active"] = body["isActive"]
    if not updates:
        return jsonify(success=False, error="No writable fields provided."), 400

    db = get_admin_client()
    res = db.table("mobile_banners").update(updates).eq("id", id).execute()
    if not res.data:
        return jsonify(success=False, error="Banner not found."), 404
    return jsonify(success=True, banner=_map_row(res.data[0]))


@mobile_banners_bp.delete("/<id>")
@require_admin
def delete_banner(id: str):
    db = get_admin_client()
    db.table("mobile_banners").delete().eq("id", id).execute()
    return jsonify(success=True)
