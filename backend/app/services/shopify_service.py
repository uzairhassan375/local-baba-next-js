import base64
import hashlib
import hmac
import re

import requests

API_VERSION = "2024-01"
TIMEOUT = 15


def clean_domain(domain: str) -> str:
    clean = domain.strip().lower()
    clean = re.sub(r"^https?://", "", clean)
    clean = re.sub(r"/.*$", "", clean)
    if ".myshopify.com" not in clean and "." not in clean:
        clean = f"{clean}.myshopify.com"
    return clean


def _headers(access_token: str) -> dict:
    return {"X-Shopify-Access-Token": access_token, "Content-Type": "application/json"}


def verify_credentials(shop_domain: str, access_token: str) -> dict:
    domain = clean_domain(shop_domain)
    try:
        res = requests.get(
            f"https://{domain}/admin/api/{API_VERSION}/shop.json",
            headers=_headers(access_token),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        return {"success": False, "error": f"Could not reach Shopify: {exc}"}

    if res.status_code == 401:
        return {"success": False, "error": "Invalid Shopify Admin API access token"}
    if res.status_code == 404:
        return {"success": False, "error": "Shop not found — check the store domain"}
    if not res.ok:
        return {"success": False, "error": f"Shopify verification failed ({res.status_code})"}

    shop = res.json().get("shop", {})
    return {"success": True, "shop": shop}


def fetch_products(shop_domain: str, access_token: str, limit: int = 50) -> dict:
    domain = clean_domain(shop_domain)
    try:
        res = requests.get(
            f"https://{domain}/admin/api/{API_VERSION}/products.json",
            params={"limit": limit},
            headers=_headers(access_token),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        return {"success": False, "error": f"Could not reach Shopify: {exc}"}

    if not res.ok:
        return {"success": False, "error": f"Failed to fetch products ({res.status_code})"}

    return {"success": True, "products": res.json().get("products", [])}


def create_product(shop_domain: str, access_token: str, product_data: dict) -> dict:
    domain = clean_domain(shop_domain)
    payload = {
        "product": {
            "title": product_data.get("title"),
            "body_html": product_data.get("body_html", ""),
            "vendor": product_data.get("vendor"),
            "product_type": product_data.get("product_type"),
            "tags": product_data.get("tags"),
            "variants": [
                {
                    "price": product_data.get("price", "0.00"),
                    "inventory_quantity": product_data.get("inventory_quantity", 0),
                }
            ],
            "images": product_data.get("images", []),
        }
    }

    try:
        res = requests.post(
            f"https://{domain}/admin/api/{API_VERSION}/products.json",
            json=payload,
            headers=_headers(access_token),
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        return {"success": False, "error": f"Could not reach Shopify: {exc}"}

    if res.status_code == 401:
        return {"success": False, "error": "Invalid Shopify Admin API access token"}
    if res.status_code == 403:
        return {
            "success": False,
            "error": "This access token is missing the write_products scope",
        }
    if not res.ok:
        return {"success": False, "error": f"Failed to create product ({res.status_code}): {res.text[:300]}"}

    return {"success": True, "product": res.json().get("product", {})}


def verify_hmac(raw_body: bytes, hmac_header: str | None, secret_key: str) -> bool:
    if not hmac_header or not secret_key:
        return False
    digest = hmac.new(secret_key.encode("utf-8"), raw_body, hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(computed, hmac_header)
