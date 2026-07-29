import re
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ..auth import is_admin, require_admin, require_auth
from ..supabase_client import get_admin_client

subscriptions_bp = Blueprint("subscriptions", __name__)

THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60
DEFAULT_BANK = {
    "bank_name": "Meezan Bank",
    "account_title": "The Local Baba Trading",
    "iban": "PK00MEZN000123456789",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_ts(value) -> float | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


@subscriptions_bp.get("/status")
@require_auth
def status():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify(isSubscribed=False, status="none")

    if email != g.user["email"] and not is_admin(g.user):
        return jsonify(success=False, error="Forbidden"), 403

    db = get_admin_client()
    res = (
        db.table("subscriptions")
        .select("*")
        .eq("user_email", email)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    row = res.data if res else None
    if not row:
        return jsonify(isSubscribed=False, status="none")

    sub_status = row.get("status")
    is_subscribed = sub_status == "active"

    if sub_status == "active":
        active_ts = _parse_ts(row.get("updated_at") or row.get("created_at"))
        if active_ts and (datetime.now(timezone.utc).timestamp() - active_ts) > THIRTY_DAYS_SECONDS:
            sub_status = "expired"
            is_subscribed = False

    return jsonify(isSubscribed=is_subscribed, status=sub_status, subscription={**row, "status": sub_status})


@subscriptions_bp.post("/submit")
@require_auth
def submit():
    body = request.get_json(silent=True) or {}
    user_email = (body.get("userEmail") or "").strip().lower()
    user_name = (body.get("userName") or "").strip()
    payment_proof_url = body.get("paymentProofUrl")
    amount = body.get("amount")

    if not user_email or not payment_proof_url:
        return jsonify(success=False, error="userEmail and paymentProofUrl are required."), 400

    if user_email != g.user["email"]:
        return jsonify(success=False, error="Forbidden"), 403

    if not re.match(r"^https?://", str(payment_proof_url), re.IGNORECASE):
        return jsonify(
            success=False,
            error="paymentProofUrl must already be hosted (upload via /api/upload-payment-proof first).",
        ), 400

    db = get_admin_client()
    existing_res = (
        db.table("subscriptions")
        .select("id")
        .eq("user_email", user_email)
        .limit(1)
        .maybe_single()
        .execute()
    )
    existing = existing_res.data if existing_res else None

    record = {
        "user_id": user_email,
        "user_email": user_email,
        "user_name": user_name or user_email.split("@")[0],
        "payment_proof_url": payment_proof_url,
        "amount": float(amount) if amount else 10.0,
        "currency": "USD",
        "status": "pending",
        "updated_at": _now_iso(),
        **DEFAULT_BANK,
    }

    if existing and existing.get("id"):
        res = db.table("subscriptions").update(record).eq("id", existing["id"]).execute()
    else:
        res = db.table("subscriptions").insert(record).execute()

    if not res.data:
        return jsonify(success=False, error="Could not save subscription."), 500

    return jsonify(
        success=True,
        message="Payment proof submitted! Admin will verify and activate your subscription.",
        subscription=res.data[0],
    )


@subscriptions_bp.get("/list")
@require_admin
def list_subscriptions():
    db = get_admin_client()
    res = db.table("subscriptions").select("*").order("created_at", desc=True).execute()
    return jsonify(success=True, subscriptions=res.data or [])


def _set_status(new_status: str):
    body = request.get_json(silent=True) or {}
    subscription_id = body.get("subscriptionId")
    user_email = (body.get("userEmail") or "").strip().lower()

    if not subscription_id and not user_email:
        return jsonify(success=False, error="subscriptionId or userEmail is required."), 400

    db = get_admin_client()
    query = db.table("subscriptions").update({"status": new_status, "updated_at": _now_iso()})
    query = query.eq("id", subscription_id) if subscription_id else query.eq("user_email", user_email)
    res = query.execute()

    if not res.data:
        return jsonify(success=False, error="Subscription not found."), 404

    row = res.data[0]
    verb = "confirmed" if new_status == "active" else "rejected"
    return jsonify(
        success=True,
        message=f"Subscription {verb} for {row.get('user_email')}.",
        subscription=row,
    )


@subscriptions_bp.post("/confirm")
@require_admin
def confirm():
    return _set_status("active")


@subscriptions_bp.post("/reject")
@require_admin
def reject():
    return _set_status("rejected")
