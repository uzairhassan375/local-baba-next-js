import random
import re
import string
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin, require_auth
from ...core.supabase_client import get_admin_client

promo_codes_bp = Blueprint("promo_codes", __name__)

DEFAULT_VALID_DAYS = 7
_CODE_RE = re.compile(r"^[A-Z0-9_-]{3,32}$")


def _fetch_one(query):
    """Run a Supabase query and return the first row or None.

    Deliberately avoids .maybe_single() — on this project's postgrest-py
    version it raises APIError("Missing response", code 204) instead of
    returning None when a query legitimately matches zero rows, which broke
    every "does this exist" check in this file. .limit(1) + indexing
    res.data ourselves sidesteps that entirely.
    """
    res = query.limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def _code_exists(db, code: str) -> bool:
    return _fetch_one(db.table("promo_codes").select("id").eq("code", code)) is not None


def _generate_code(db, discount_type: str, discount_value: float) -> str:
    """SAVE15-9F2K style code, unique against promo_codes.code. A handful of
    retries with a wider random suffix is more than enough — collisions on a
    4-char alnum suffix are astronomically unlikely at this table's scale."""
    prefix = f"SAVE{int(discount_value)}" if discount_type == "percent" else "OFF"
    for suffix_len in (4, 4, 4, 6, 8):
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=suffix_len))
        code = f"{prefix}-{suffix}"
        if not _code_exists(db, code):
            return code
    raise RuntimeError("Could not generate a unique promo code.")


def _map_promo(row: dict) -> dict:
    return {
        "id": row["id"],
        "code": row["code"],
        "productId": row.get("product_id"),
        "discountType": row["discount_type"],
        "discountValue": row["discount_value"],
        "minQuantity": row.get("min_quantity") or 0,
        "expiresAt": row.get("expires_at"),
    }


@promo_codes_bp.get("/admin/eligible-members")
@require_admin
def admin_eligible_members():
    """Approved members, optionally filtered by city — feeds the standalone
    "Promo Codes" sidebar tool's city-based targeting (as opposed to the
    Cart & Fav Stats flow, which targets by cart/favourite membership
    instead). Unlike member_cart/member_favorites, membership_applications
    has permissive admin-only RLS policies already, but we still route
    through the backend for consistency with the rest of this feature."""
    city = request.args.get("city")
    db = get_admin_client()
    query = (
        db.table("membership_applications")
        .select("auth_user_id, name, email, city")
        .eq("status", "approved")
    )
    if city:
        query = query.eq("city", city)
    res = query.execute()
    members = [
        {
            "authUserId": r["auth_user_id"],
            "name": r.get("name"),
            "email": r.get("email"),
            "city": r.get("city"),
        }
        for r in (res.data or [])
        if r.get("auth_user_id")
    ]
    return jsonify(success=True, members=members)


@promo_codes_bp.post("/admin/create")
@require_admin
def admin_create_promo():
    """Create a promo code scoped to a specific list of members — used by
    the "Inform members" flow on the admin Cart & Fav Stats panel to offer a
    discount to exactly the people who have a product in their cart/favourites.

    Accepts either a custom `code` (e.g. "FIRSTORDER" — validated for
    uniqueness) or auto-generates one (SAVE15-XXXX style) when omitted.
    """
    body = request.get_json(silent=True) or {}
    member_ids = body.get("memberIds")
    product_id = body.get("productId")
    discount_type = body.get("discountType")
    custom_code = (body.get("code") or "").strip().upper()

    try:
        discount_value = float(body.get("discountValue"))
    except (TypeError, ValueError):
        discount_value = 0

    try:
        min_quantity = int(body.get("minQuantity") or 0)
    except (TypeError, ValueError):
        min_quantity = 0

    try:
        valid_days = int(body.get("validDays") or DEFAULT_VALID_DAYS)
    except (TypeError, ValueError):
        valid_days = DEFAULT_VALID_DAYS

    if not isinstance(member_ids, list) or not member_ids:
        return jsonify(success=False, error="memberIds is required."), 400
    if discount_type not in ("percent", "fixed"):
        return jsonify(success=False, error="discountType must be 'percent' or 'fixed'."), 400
    if discount_value <= 0:
        return jsonify(success=False, error="discountValue must be greater than 0."), 400
    if min_quantity < 0:
        return jsonify(success=False, error="minQuantity cannot be negative."), 400

    db = get_admin_client()

    if custom_code:
        if not _CODE_RE.match(custom_code):
            return jsonify(
                success=False,
                error="Code must be 3-32 characters: letters, numbers, - or _ only.",
            ), 400
        if _code_exists(db, custom_code):
            return jsonify(success=False, error="This code is already in use."), 400
        code = custom_code
    else:
        code = _generate_code(db, discount_type, discount_value)

    expires_at = None
    if valid_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=valid_days)).isoformat()

    promo_res = (
        db.table("promo_codes")
        .insert(
            {
                "code": code,
                "product_id": product_id,
                "discount_type": discount_type,
                "discount_value": discount_value,
                "min_quantity": min_quantity,
                "expires_at": expires_at,
            }
        )
        .execute()
    )
    if not promo_res.data:
        return jsonify(success=False, error="Could not create promo code."), 500
    promo_row = promo_res.data[0]

    rows = [{"promo_code_id": promo_row["id"], "auth_user_id": uid} for uid in member_ids if uid]
    if rows:
        db.table("promo_code_members").upsert(
            rows, on_conflict="promo_code_id,auth_user_id", ignore_duplicates=True
        ).execute()

    return jsonify(success=True, promo=_map_promo(promo_row))


@promo_codes_bp.get("/admin/product/<product_id>")
@require_admin
def admin_active_promo_for_product(product_id: str):
    """The currently-active promo (if any) for a product — feeds the
    "Disable promo" button on the Cart & Fav Stats page."""
    db = get_admin_client()
    row = _fetch_one(
        db.table("promo_codes")
        .select("id, code, product_id, discount_type, discount_value, min_quantity, expires_at")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
    )
    return jsonify(success=True, promo=_map_promo(row) if row else None)


@promo_codes_bp.get("/admin/product-counts")
@require_admin
def admin_active_promo_counts():
    """Active promo codes for every product with one, keyed by product_id —
    lets the Cart & Fav Stats table show "Disable promo" per row without a
    request per product."""
    db = get_admin_client()
    res = (
        db.table("promo_codes")
        .select("id, code, product_id, discount_type, discount_value, min_quantity, expires_at")
        .eq("is_active", True)
        .execute()
    )
    promos = {}
    for row in res.data or []:
        pid = row.get("product_id")
        if not pid or pid in promos:
            continue
        promos[pid] = _map_promo(row)
    return jsonify(success=True, promos=promos)


@promo_codes_bp.patch("/admin/<promo_id>/disable")
@require_admin
def admin_disable_promo(promo_id: str):
    db = get_admin_client()
    res = db.table("promo_codes").update({"is_active": False}).eq("id", promo_id).execute()
    if not res.data:
        return jsonify(success=False, error="Promo code not found."), 404
    return jsonify(success=True)


@promo_codes_bp.post("/apply")
@require_auth
def apply_promo():
    """Member-facing: validate a promo code for the current member at
    checkout. Only succeeds if this exact member is on the code's allow-list,
    the code hasn't expired or been disabled by admin. The minimum-quantity
    requirement (if any) is enforced client-side against the member's actual
    cart contents — this endpoint just reports minQuantity back so the
    checkout page can check it against the relevant line item's quantity.
    """
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip().upper()
    if not code:
        return jsonify(success=False, error="Enter a promo code."), 400

    db = get_admin_client()
    promo = _fetch_one(
        db.table("promo_codes")
        .select("id, code, product_id, discount_type, discount_value, min_quantity, expires_at, is_active")
        .eq("code", code)
    )
    if not promo:
        return jsonify(success=False, error="Invalid promo code."), 404
    if not promo.get("is_active"):
        return jsonify(success=False, error="This promo code is no longer active."), 400

    expires_at = promo.get("expires_at")
    if expires_at:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            return jsonify(success=False, error="This promo code has expired."), 400

    member_row = _fetch_one(
        db.table("promo_code_members")
        .select("id, used_at")
        .eq("promo_code_id", promo["id"])
        .eq("auth_user_id", g.user["id"])
    )
    if not member_row:
        return jsonify(success=False, error="This promo code isn't available for your account."), 403

    db.table("promo_code_members").update(
        {"used_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", member_row["id"]).execute()

    return jsonify(success=True, promo=_map_promo(promo))
