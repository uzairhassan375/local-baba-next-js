from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ...core.auth import get_current_user, require_auth
from ...core.supabase_client import get_admin_client

applications_bp = Blueprint("applications", __name__)

MEMBER_PROFILE_FIELDS = {"name", "whatsapp", "city", "business_name", "avatar_url"}


def _fetch_one(query):
    """Run a Supabase query and return the first row or None.

    Deliberately avoids .maybe_single() — on this project's postgrest-py
    version it raises APIError("Missing response", code 204) instead of
    returning None when a query legitimately matches zero rows (see
    products/routes.py and promo_codes/routes.py for the same fix).
    .limit(1) + indexing res.data ourselves sidesteps that entirely.
    """
    res = query.limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "whatsapp": row.get("whatsapp"),
        "city": row.get("city"),
        "businessName": row.get("business_name"),
        "avatarUrl": row.get("avatar_url"),
        "sellsWhat": row.get("sells_what") or [],
        "sellsWhere": row.get("sells_where") or [],
        "monthlyVolume": row.get("monthly_volume"),
        "heardFrom": row.get("heard_from") or "",
        "appliedAt": row.get("applied_at"),
        "status": row.get("status"),
        "email": row.get("email"),
    }


@applications_bp.post("/applications")
def submit_application():
    body = request.get_json(silent=True) or {}
    required = ["name", "whatsapp", "city", "businessName"]
    if any(not body.get(f) for f in required):
        return jsonify(success=False, error="name, whatsapp, city and businessName are required."), 400

    user = get_current_user()

    record = {
        "name": body["name"].strip(),
        "whatsapp": str(body["whatsapp"]),
        "city": body["city"],
        "business_name": body["businessName"].strip(),
        "sells_what": body.get("sellsWhat") or [],
        "sells_where": body.get("sellsWhere") or [],
        "monthly_volume": body.get("monthlyVolume", ""),
        "heard_from": body.get("heardFrom", ""),
        "status": "pending",
        "email": body.get("email"),
        "auth_user_id": user["id"] if user else None,
    }

    db = get_admin_client()
    res = db.table("membership_applications").insert(record).execute()
    if not res.data:
        return jsonify(success=False, error="Could not submit application."), 500
    return jsonify(success=True, application=_map_row(res.data[0]))


@applications_bp.get("/profile")
@require_auth
def get_profile():
    db = get_admin_client()
    row = _fetch_one(
        db.table("membership_applications").select("*").eq("auth_user_id", g.user["id"])
    )
    if not row:
        return jsonify(success=False, error="No profile found for this account."), 404
    return jsonify(success=True, profile=_map_row(row))


@applications_bp.patch("/profile")
@require_auth
def update_profile():
    body = request.get_json(silent=True) or {}
    updates = {}
    if "name" in body:
        updates["name"] = str(body["name"]).strip()
    if "whatsapp" in body:
        updates["whatsapp"] = "".join(ch for ch in str(body["whatsapp"]) if ch.isdigit())
    if "city" in body:
        updates["city"] = body["city"]
    if "businessName" in body:
        updates["business_name"] = str(body["businessName"]).strip()
    if "avatarUrl" in body:
        updates["avatar_url"] = body["avatarUrl"]

    if not updates:
        return jsonify(success=False, error="No writable fields provided."), 400

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    db = get_admin_client()
    res = (
        db.table("membership_applications")
        .update(updates)
        .eq("auth_user_id", g.user["id"])
        .execute()
    )
    if not res.data:
        return jsonify(success=False, error="Could not update profile."), 500
    return jsonify(success=True, profile=_map_row(res.data[0]))
