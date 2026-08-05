from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin, require_auth
from ...core.members import fetch_members_by_auth_ids
from ...core.supabase_client import get_admin_client
from ..products.routes import _map_row as _map_product

cart_bp = Blueprint("cart", __name__)

DEFAULT_QUANTITY = 30


def _map_row(row: dict) -> dict:
    product = row.get("products")
    return {
        "productId": row.get("product_id"),
        "quantity": row.get("quantity"),
        "product": _map_product(product) if product else None,
        "updatedAt": row.get("updated_at"),
    }


@cart_bp.get("")
@require_auth
def list_cart():
    db = get_admin_client()
    res = (
        db.table("member_cart")
        .select("*, products(*)")
        .eq("auth_user_id", g.user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(success=True, cart=[_map_row(r) for r in (res.data or [])])


@cart_bp.get("/admin/counts")
@require_admin
def admin_cart_counts():
    """How many members have each product in their cart — feeds the admin
    "Cart & Fav Stats" dashboard's per-product counts."""
    db = get_admin_client()
    res = db.table("member_cart").select("product_id").execute()
    counts: dict = {}
    for r in res.data or []:
        pid = r.get("product_id")
        if pid:
            counts[pid] = counts.get(pid, 0) + 1
    return jsonify(success=True, counts=counts)


@cart_bp.get("/admin/product/<product_id>")
@require_admin
def admin_cart_members(product_id: str):
    """Members who currently have this product in their cart — the "Cart
    Stats" view on the admin product list."""
    db = get_admin_client()
    res = (
        db.table("member_cart")
        .select("auth_user_id, quantity, created_at, updated_at")
        .eq("product_id", product_id)
        .order("updated_at", desc=True)
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
                "quantity": r.get("quantity"),
                "addedAt": r.get("created_at"),
                "updatedAt": r.get("updated_at"),
                "name": m.get("name"),
                "email": m.get("email"),
                "whatsapp": m.get("whatsapp"),
                "city": m.get("city"),
            }
        )
    return jsonify(success=True, members=members)


@cart_bp.post("")
@require_auth
def add_to_cart():
    body = request.get_json(silent=True) or {}
    product_id = body.get("productId")
    if not product_id:
        return jsonify(success=False, error="productId is required."), 400

    try:
        quantity = int(body.get("quantity") or DEFAULT_QUANTITY)
    except (TypeError, ValueError):
        quantity = DEFAULT_QUANTITY
    quantity = max(quantity, 1)

    db = get_admin_client()
    db.table("member_cart").upsert(
        {
            "auth_user_id": g.user["id"],
            "product_id": product_id,
            "quantity": quantity,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="auth_user_id,product_id",
    ).execute()

    # Adding a favorited product to the cart removes it from favorites.
    db.table("member_favorites").delete().eq("auth_user_id", g.user["id"]).eq(
        "product_id", product_id
    ).execute()

    return jsonify(success=True)


@cart_bp.patch("/<product_id>")
@require_auth
def update_cart_item(product_id: str):
    body = request.get_json(silent=True) or {}
    try:
        quantity = int(body.get("quantity"))
    except (TypeError, ValueError):
        return jsonify(success=False, error="quantity is required."), 400
    if quantity < 1:
        return jsonify(success=False, error="quantity must be at least 1."), 400

    db = get_admin_client()
    res = (
        db.table("member_cart")
        .update({"quantity": quantity, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("auth_user_id", g.user["id"])
        .eq("product_id", product_id)
        .execute()
    )
    if not res.data:
        return jsonify(success=False, error="Item not found in cart."), 404
    return jsonify(success=True)


@cart_bp.delete("/<product_id>")
@require_auth
def remove_cart_item(product_id: str):
    db = get_admin_client()
    db.table("member_cart").delete().eq("auth_user_id", g.user["id"]).eq(
        "product_id", product_id
    ).execute()
    return jsonify(success=True)


@cart_bp.delete("")
@require_auth
def clear_cart():
    db = get_admin_client()
    db.table("member_cart").delete().eq("auth_user_id", g.user["id"]).execute()
    return jsonify(success=True)
