from flask import Blueprint, g, jsonify, request

from ...core.auth import is_admin, require_admin, require_auth
from ...core.supabase_client import get_admin_client

blasts_bp = Blueprint("blasts", __name__)

WRITABLE_FIELDS = {"title", "body", "target_cities", "status", "sort_order"}


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


# Fields the home screen's announcement ticker actually renders (title,
# body) or reads client-side (target_cities, for the city-match filter) —
# id/status/sort_order/created_at/updated_at are admin-panel-only concerns.
_LEAN_COLUMNS = "title, body, target_cities"


def _map_row_lean(row: dict) -> dict:
    return {
        "title": row.get("title") or "",
        "body": row.get("body"),
        "targetCities": row.get("target_cities") or [],
    }


@blasts_bp.get("")
@require_auth
def list_blasts():
    db = get_admin_client()
    lean = request.args.get("fields") == "lean" and not is_admin(g.user)
    query = db.table("blasts").select(_LEAN_COLUMNS if lean else "*")
    if is_admin(g.user):
        query = query.order("created_at", desc=True)
    else:
        query = query.eq("status", "published").order("sort_order", desc=True).order("created_at", desc=True)
    res = query.execute()
    mapper = _map_row_lean if lean else _map_row
    return jsonify(success=True, blasts=[mapper(r) for r in (res.data or [])])


@blasts_bp.post("")
@require_admin
def create_blast():
    body = request.get_json(silent=True) or {}
    payload = {k: v for k, v in body.items() if k in WRITABLE_FIELDS}
    if not payload.get("title"):
        return jsonify(success=False, error="title is required."), 400

    db = get_admin_client()
    res = db.table("blasts").insert(payload).execute()
    if not res.data:
        return jsonify(success=False, error="Could not create blast."), 500
    return jsonify(success=True, blast=_map_row(res.data[0]))


@blasts_bp.patch("/<id>")
@require_admin
def update_blast(id: str):
    body = request.get_json(silent=True) or {}
    updates = {k: v for k, v in body.items() if k in WRITABLE_FIELDS}
    if not updates:
        return jsonify(success=False, error="No writable fields provided."), 400

    db = get_admin_client()
    res = db.table("blasts").update(updates).eq("id", id).execute()
    if not res.data:
        return jsonify(success=False, error="Blast not found."), 404
    return jsonify(success=True, blast=_map_row(res.data[0]))


@blasts_bp.delete("/<id>")
@require_admin
def delete_blast(id: str):
    db = get_admin_client()
    db.table("blasts").delete().eq("id", id).execute()
    return jsonify(success=True)
