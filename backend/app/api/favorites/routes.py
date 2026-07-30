from flask import Blueprint, g, jsonify, request

from ...core.auth import require_auth
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
