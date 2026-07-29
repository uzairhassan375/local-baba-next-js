from flask import Blueprint, jsonify

from ..supabase_client import get_admin_client

china_delivery_bp = Blueprint("china_delivery", __name__)


@china_delivery_bp.get("/china-delivery-prices")
def list_prices():
    db = get_admin_client()
    res = db.table("china_delivery_prices").select("*").order("category").execute()
    prices = [
        {"id": r.get("id"), "category": r.get("category"), "deliveryPrice": float(r.get("delivery_price") or 0)}
        for r in (res.data or [])
    ]
    return jsonify(success=True, prices=prices)
