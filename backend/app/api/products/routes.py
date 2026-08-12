from flask import Blueprint, jsonify, request

from ...core.auth import get_current_user, is_admin
from ...core.supabase_client import get_admin_client

products_bp = Blueprint("products", __name__)

VISIBLE_STATUSES = ["active", "sold_out"]


def _fetch_one(query):
    """Run a Supabase query and return the first row or None.

    Deliberately avoids .maybe_single() — on this project's postgrest-py
    version it raises APIError("Missing response", code 204) instead of
    returning None when a query legitimately matches zero rows (see
    promo_codes/routes.py for the same fix). .limit(1) + indexing res.data
    ourselves sidesteps that entirely.
    """
    res = query.limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def _map_row(row: dict) -> dict:
    sku = (row.get("sku") or "").strip()
    return {
        "id": row.get("id"),
        "sku": sku or None,
        "slug": row.get("slug"),
        "name": row.get("name"),
        "category": row.get("category"),
        "pricePerPc": float(row.get("price_per_pc") or 0),
        "marketRate": float(row.get("market_rate") or 0),
        "moq": row.get("moq"),
        "stock": row.get("stock"),
        "status": row.get("status"),
        "tags": row.get("tags") or [],
        "variants": row.get("variants") or [],
        "images": row.get("images") or [],
        "description": row.get("description") or "",
        "specs": row.get("specs") or [],
        "sellerTips": row.get("seller_tips") or [],
        "showInTrending": bool(row.get("show_in_trending")),
        "trendingSort": row.get("trending_sort") or 0,
        "catalogType": "china" if row.get("catalog_type") == "china" else "standard",
        "showOnLanding": bool(row.get("show_on_landing")),
        "landingSort": row.get("landing_sort") or 0,
        "showInCategoryHome": bool(row.get("show_in_category_home")),
    }


# Columns needed for the home screen's trending strip — just enough to show
# an image + name + price and to re-fetch the full product by id on tap.
# Keeping this separate from _map_row's "*" select avoids shipping
# description, specs, variants etc. over the wire for a card that never
# displays them. `category` is included so the home screen can group
# curated show_in_category_home products into per-category rows client-side.
_LEAN_COLUMNS = "id, slug, name, images, tags, category, price_per_pc"


def _map_row_lean(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "name": row.get("name"),
        "images": row.get("images") or [],
        "tags": row.get("tags") or [],
        "category": row.get("category"),
        "pricePerPc": float(row.get("price_per_pc") or 0),
    }


@products_bp.get("")
def list_products():
    user = get_current_user()
    db = get_admin_client()

    lean = request.args.get("fields") == "lean"
    query = db.table("products").select(_LEAN_COLUMNS if lean else "*")

    if not is_admin(user):
        query = query.in_("status", VISIBLE_STATUSES)

    category = request.args.get("category")
    if category:
        query = query.eq("category", category)

    catalog_type = request.args.get("catalog_type")
    if catalog_type:
        query = query.eq("catalog_type", catalog_type)

    if request.args.get("trending") == "true":
        query = query.eq("show_in_trending", True).eq("status", "active")

    if request.args.get("landing") == "true":
        query = query.eq("show_on_landing", True).eq("status", "active")

    if request.args.get("home_category") == "true":
        query = query.eq("show_in_category_home", True).eq("status", "active")

    try:
        limit = int(request.args.get("limit", 0))
    except ValueError:
        limit = 0
    if limit > 0:
        query = query.limit(limit)

    res = query.order("updated_at", desc=True).execute()
    mapper = _map_row_lean if lean else _map_row
    return jsonify(success=True, products=[mapper(r) for r in (res.data or [])])


@products_bp.get("/<id_or_slug>")
def get_product(id_or_slug: str):
    user = get_current_user()
    db = get_admin_client()
    query = db.table("products").select("*")
    if not is_admin(user):
        query = query.in_("status", VISIBLE_STATUSES)

    # Try slug first (public URLs use slugs), fall back to id.
    row = _fetch_one(query.eq("slug", id_or_slug))
    if not row:
        query2 = db.table("products").select("*")
        if not is_admin(user):
            query2 = query2.in_("status", VISIBLE_STATUSES)
        row = _fetch_one(query2.eq("id", id_or_slug))

    if not row:
        return jsonify(success=False, error="Product not found"), 404
    return jsonify(success=True, product=_map_row(row))
