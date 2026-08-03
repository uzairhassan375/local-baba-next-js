from flask import Blueprint, jsonify, request

from ...core.auth import require_admin
from ...core.supabase_client import get_admin_client

invoice_settings_bp = Blueprint("invoice_settings", __name__)

# Singleton row — always read/written by this fixed id, so there's never
# more than one settings row to reconcile.
SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_COMPANY_NAME = "Local Baba"


def _map_row(row: dict | None) -> dict:
    row = row or {}
    return {
        "companyName": row.get("company_name") or DEFAULT_COMPANY_NAME,
        "logoUrl": row.get("logo_url"),
    }


@invoice_settings_bp.get("")
@require_admin
def get_settings():
    db = get_admin_client()
    res = (
        db.table("invoice_settings")
        .select("*")
        .eq("id", SETTINGS_ROW_ID)
        .maybe_single()
        .execute()
    )
    row = res.data if res else None
    return jsonify(success=True, settings=_map_row(row))


@invoice_settings_bp.patch("")
@require_admin
def update_settings():
    body = request.get_json(silent=True) or {}
    updates: dict = {"id": SETTINGS_ROW_ID}
    if "companyName" in body:
        updates["company_name"] = (body.get("companyName") or "").strip() or DEFAULT_COMPANY_NAME
    if "logoUrl" in body:
        updates["logo_url"] = body.get("logoUrl") or None

    if len(updates) == 1:
        return jsonify(success=False, error="No writable fields provided."), 400

    db = get_admin_client()
    res = db.table("invoice_settings").upsert(updates).execute()
    if not res.data:
        return jsonify(success=False, error="Could not update invoice settings."), 500
    return jsonify(success=True, settings=_map_row(res.data[0]))
