from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ...core.auth import require_auth
from . import service as shopify_service
from ...core.supabase_client import get_admin_client

shopify_bp = Blueprint("shopify", __name__)

DEFAULT_SYNC_PREFS = {"syncProducts": True, "syncOrders": True, "webhooksEnabled": False}


def _default_state() -> dict:
    return {
        "connected": False,
        "shopDomain": "",
        "storeName": "",
        "currency": "USD",
        "connectedAt": None,
        "lastSyncedAt": None,
        "syncedProductsCount": 0,
        "syncPreferences": DEFAULT_SYNC_PREFS,
    }


def _row_to_state(row: dict) -> dict:
    return {
        "connected": bool(row.get("connected")),
        "shopDomain": row.get("shop_domain") or "",
        "storeName": row.get("store_name") or "",
        "currency": row.get("currency") or "USD",
        "connectedAt": row.get("connected_at"),
        "lastSyncedAt": row.get("last_synced_at"),
        "syncedProductsCount": row.get("synced_products_count") or 0,
        "syncPreferences": row.get("sync_preferences") or DEFAULT_SYNC_PREFS,
    }


def _get_row(member_id: str) -> dict | None:
    db = get_admin_client()
    res = (
        db.table("shopify_integrations")
        .select("*")
        .eq("member_id", member_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


@shopify_bp.get("/status")
@require_auth
def status():
    row = _get_row(g.user["id"])
    if not row:
        return jsonify(_default_state())
    return jsonify(_row_to_state(row))


@shopify_bp.post("/verify")
@require_auth
def verify():
    body = request.get_json(silent=True) or {}
    shop_domain = (body.get("shopDomain") or "").strip()
    access_token = (body.get("accessToken") or "").strip()
    if not shop_domain or not access_token:
        return jsonify(success=False, error="shopDomain and accessToken are required"), 400

    result = shopify_service.verify_credentials(shop_domain, access_token)
    if not result["success"]:
        return jsonify(success=False, error=result["error"]), 400
    return jsonify(success=True, message="Connection verified", shop=result["shop"])


@shopify_bp.post("/connect")
@require_auth
def connect():
    body = request.get_json(silent=True) or {}
    shop_domain = (body.get("shopDomain") or "").strip()
    access_token = (body.get("accessToken") or "").strip()
    api_secret_key = (body.get("apiSecretKey") or "").strip()
    sync_preferences = body.get("syncPreferences") or DEFAULT_SYNC_PREFS

    if not shop_domain or not access_token:
        return jsonify(success=False, error="shopDomain and accessToken are required"), 400

    result = shopify_service.verify_credentials(shop_domain, access_token)
    if not result["success"]:
        return jsonify(success=False, error=result["error"]), 400

    shop = result["shop"]
    now = datetime.now(timezone.utc).isoformat()

    db = get_admin_client()
    db.table("shopify_integrations").upsert(
        {
            "member_id": g.user["id"],
            "shop_domain": shopify_service.clean_domain(shop_domain),
            "access_token": access_token,
            "api_secret_key": api_secret_key,
            "store_name": shop.get("name", shop_domain),
            "currency": shop.get("currency", "USD"),
            "connected": True,
            "connected_at": now,
            "sync_preferences": sync_preferences,
        },
        on_conflict="member_id",
    ).execute()

    row = _get_row(g.user["id"])
    return jsonify(
        success=True,
        message=f"Connected to Shopify store: {shop_domain}",
        integration=_row_to_state(row) if row else _default_state(),
    )


@shopify_bp.post("/sync-products")
@require_auth
def sync_products():
    row = _get_row(g.user["id"])
    if not row or not row.get("connected"):
        return jsonify(success=False, error="Shopify store is not connected"), 400

    result = shopify_service.fetch_products(row["shop_domain"], row["access_token"])
    if not result["success"]:
        return jsonify(success=False, error=result["error"]), 502

    products = result["products"]
    now = datetime.now(timezone.utc).isoformat()

    db = get_admin_client()
    db.table("shopify_integrations").update(
        {"synced_products_count": len(products), "last_synced_at": now}
    ).eq("member_id", g.user["id"]).execute()

    return jsonify(
        success=True,
        mode="live",
        productsCount=len(products),
        products=products,
        lastSyncedAt=now,
    )


@shopify_bp.post("/disconnect")
@require_auth
def disconnect():
    db = get_admin_client()
    db.table("shopify_integrations").update(
        {
            "connected": False,
            "shop_domain": "",
            "access_token": "",
            "api_secret_key": "",
            "store_name": "",
        }
    ).eq("member_id", g.user["id"]).execute()
    return jsonify(success=True, message="Disconnected Shopify store.")


@shopify_bp.post("/create-product")
@require_auth
def create_product():
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify(success=False, error="title is required"), 400

    row = _get_row(g.user["id"])
    if not row or not row.get("connected") or not row.get("access_token"):
        return jsonify(success=False, error="Connect a Shopify store before creating products"), 400

    result = shopify_service.create_product(row["shop_domain"], row["access_token"], body)
    if not result["success"]:
        return jsonify(success=False, error=result["error"]), 502

    product = result["product"]
    db = get_admin_client()
    db.table("shopify_integrations").update(
        {"synced_products_count": (row.get("synced_products_count") or 0) + 1}
    ).eq("member_id", g.user["id"]).execute()

    shop_domain = row["shop_domain"]
    admin_url = f"https://{shop_domain}/admin/products/{product.get('id')}" if product.get("id") else None

    return jsonify(
        success=True,
        mode="live",
        message="Product created in Shopify",
        product=product,
        shopifyAdminUrl=admin_url,
    )


@shopify_bp.post("/webhook")
def webhook():
    shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256")
    raw_body = request.get_data()

    db = get_admin_client()
    res = (
        db.table("shopify_integrations")
        .select("api_secret_key")
        .eq("shop_domain", shop_domain)
        .maybe_single()
        .execute()
    )
    row = res.data if res else None
    secret = (row or {}).get("api_secret_key", "")

    if not shopify_service.verify_hmac(raw_body, hmac_header, secret):
        return jsonify(success=False, error="Invalid webhook signature"), 401

    return jsonify(success=True, message="Webhook received")
