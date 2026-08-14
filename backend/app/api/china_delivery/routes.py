from flask import Blueprint, jsonify, request

from ...core.auth import require_admin
from ...core.supabase_client import get_admin_client

china_delivery_bp = Blueprint("china_delivery", __name__)


def _map_row(row: dict) -> dict:
    return {"id": row.get("id"), "category": row.get("category"), "deliveryPrice": float(row.get("delivery_price") or 0)}


@china_delivery_bp.get("/china-delivery-prices")
def list_prices():
    db = get_admin_client()
    res = db.table("china_delivery_prices").select("*").order("category").execute()
    return jsonify(success=True, prices=[_map_row(r) for r in (res.data or [])])


@china_delivery_bp.post("/china-delivery-prices")
@require_admin
def upsert_price():
    body = request.get_json(silent=True) or {}
    category = (body.get("category") or "").strip()
    delivery_price = body.get("deliveryPrice")
    if not category or delivery_price is None:
        return jsonify(success=False, error="category and deliveryPrice are required."), 400

    db = get_admin_client()
    res = (
        db.table("china_delivery_prices")
        .upsert({"category": category, "delivery_price": delivery_price}, on_conflict="category")
        .execute()
    )
    if not res.data:
        return jsonify(success=False, error="Could not save delivery price."), 500
    return jsonify(success=True, price=_map_row(res.data[0]))


@china_delivery_bp.delete("/china-delivery-prices/<id>")
@require_admin
def delete_price(id: str):
    db = get_admin_client()
    db.table("china_delivery_prices").delete().eq("id", id).execute()
    return jsonify(success=True)
