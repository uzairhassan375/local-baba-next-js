from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin, require_auth
from ...core.members import fetch_members_by_auth_ids
from ...core.supabase_client import get_admin_client
from ..products.routes import _map_row as _map_product

favorites_bp = Blueprint("favorites", __name__)


def _map_row(row: dict) -> dict:
    product = row.get("products")
    return {
        "productId": row.get("product_id"),
        "product": _map_product(product) if product else None,
        "createdAt": row.get("created_at"),
    }


@favorites_bp.get("")
@require_auth
def list_favorites():
    db = get_admin_client()
    res = (
        db.table("member_favorites")
        .select("*, products(*)")
        .eq("auth_user_id", g.user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(success=True, favorites=[_map_row(r) for r in (res.data or [])])


@favorites_bp.get("/admin/counts")
@require_admin
def admin_favorite_counts():
    """How many members have each product favorited — feeds the admin
    "Cart & Fav Stats" dashboard's per-product counts."""
    db = get_admin_client()
    res = db.table("member_favorites").select("product_id").execute()
    counts: dict = {}
    for r in res.data or []:
        pid = r.get("product_id")
        if pid:
            counts[pid] = counts.get(pid, 0) + 1
    return jsonify(success=True, counts=counts)


@favorites_bp.get("/admin/product/<product_id>")
@require_admin
def admin_favorite_members(product_id: str):
    """Members who currently have this product favorited — the "Fav Stats"
    view on the admin product list."""
    db = get_admin_client()
    res = (
        db.table("member_favorites")
        .select("auth_user_id, created_at")
        .eq("product_id", product_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []
    members_by_id = fetch_members_by_auth_ids([r.get("auth_user_id") for r in rows])

    members = []
    for r in rows:
        m = members_by_id.get(r.get("auth_user_id")) or {}
        members.append(
            {
                "authUserId": r.get("auth_user_id"),
                "favoritedAt": r.get("created_at"),
                "name": m.get("name"),
                "email": m.get("email"),
                "whatsapp": m.get("whatsapp"),
                "city": m.get("city"),
            }
        )
    return jsonify(success=True, members=members)


@favorites_bp.post("")
@require_auth
def add_favorite():
    body = request.get_json(silent=True) or {}
    product_id = body.get("productId")
    if not product_id:
        return jsonify(success=False, error="productId is required."), 400

    db = get_admin_client()
    db.table("member_favorites").upsert(
        {"auth_user_id": g.user["id"], "product_id": product_id},
        on_conflict="auth_user_id,product_id",
        ignore_duplicates=True,
    ).execute()
    return jsonify(success=True)


@favorites_bp.delete("/<product_id>")
@require_auth
def remove_favorite(product_id: str):
    db = get_admin_client()
    db.table("member_favorites").delete().eq("auth_user_id", g.user["id"]).eq(
        "product_id", product_id
    ).execute()
    return jsonify(success=True)
