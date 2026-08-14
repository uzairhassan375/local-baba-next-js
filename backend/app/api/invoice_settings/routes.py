import re
import time
import uuid

from flask import Blueprint, g, jsonify, request
from postgrest.exceptions import APIError

from ...core.auth import is_admin, require_auth
from ...core.bunny import BunnyNotConfigured, BunnyUploadError, upload_bytes
from ...core.supabase_client import get_admin_client

invoice_settings_bp = Blueprint("invoice_settings", __name__)

TABLE_NAME = "invoice_settings"

# Singleton platform-default row — always read/written by this fixed id when
# acting as admin. Members instead get their own row (member_id set), so
# each member can brand their own invoices without touching the platform
# default that admin manages.
SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_COMPANY_NAME = "Local Baba"

# postgrest-py's .maybe_single() is supposed to return data=None when zero
# rows match, but this version raises an APIError instead (a known
# supabase-py/postgrest-py quirk) — treat those specific "no row" errors as
# a normal empty result rather than a real failure.
_NO_ROW_CODES = {"204", "PGRST116"}


def _maybe_single(query) -> dict | None:
    try:
        res = query.maybe_single().execute()
    except APIError as exc:
        if exc.code in _NO_ROW_CODES:
            return None
        raise
    return res.data if res else None


def _map_row(row: dict | None) -> dict:
    row = row or {}
    return {
        "companyName": row.get("company_name") or DEFAULT_COMPANY_NAME,
        "logoUrl": row.get("logo_url"),
        "isCustom": bool(row.get("member_id")),
    }


def _get_default_row(db) -> dict | None:
    return _maybe_single(db.table(TABLE_NAME).select("*").eq("id", SETTINGS_ROW_ID))


@invoice_settings_bp.get("")
@require_auth
def get_settings():
    db = get_admin_client()

    if not is_admin(g.user):
        member_row = _maybe_single(db.table(TABLE_NAME).select("*").eq("member_id", g.user["id"]))
        if member_row:
            return jsonify(success=True, settings=_map_row(member_row))

    return jsonify(success=True, settings=_map_row(_get_default_row(db)))


@invoice_settings_bp.patch("")
@require_auth
def update_settings():
    body = request.get_json(silent=True) or {}
    updates: dict = {}
    if "companyName" in body:
        updates["company_name"] = (body.get("companyName") or "").strip() or DEFAULT_COMPANY_NAME
    if "logoUrl" in body:
        updates["logo_url"] = body.get("logoUrl") or None

    if not updates:
        return jsonify(success=False, error="No writable fields provided."), 400

    db = get_admin_client()
    if is_admin(g.user):
        updates["id"] = SETTINGS_ROW_ID
        res = db.table(TABLE_NAME).upsert(updates).execute()
    else:
        updates["member_id"] = g.user["id"]
        res = db.table(TABLE_NAME).upsert(updates, on_conflict="member_id").execute()

    if not res.data:
        return jsonify(success=False, error="Could not update invoice settings."), 500
    return jsonify(success=True, settings=_map_row(res.data[0]))


@invoice_settings_bp.post("/logo")
@require_auth
def upload_logo():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify(success=False, error="No image file provided."), 400
    if not (file.mimetype or "").startswith("image/"):
        return jsonify(success=False, error="File must be an image (PNG, JPG, WEBP)."), 400

    data = file.read()
    if len(data) > 10 * 1024 * 1024:
        return jsonify(success=False, error="File size exceeds 10 MB limit."), 400

    safe_name = re.sub(r"[^\w.-]+", "_", file.filename)
    object_path = f"{g.user['id']}/misc/{int(time.time() * 1000)}-{uuid.uuid4().hex}-{safe_name}"

    try:
        url = upload_bytes(data, file.mimetype or "application/octet-stream", object_path)
    except BunnyNotConfigured:
        return jsonify(success=False, error="Storage is not configured on the server."), 500
    except BunnyUploadError:
        return jsonify(success=False, error="Failed to upload logo."), 502

    return jsonify(success=True, url=url)


@invoice_settings_bp.delete("")
@require_auth
def reset_settings():
    if is_admin(g.user):
        return jsonify(success=False, error="Use PATCH to update the default branding."), 400

    db = get_admin_client()
    db.table(TABLE_NAME).delete().eq("member_id", g.user["id"]).execute()
    return jsonify(success=True, settings=_map_row(_get_default_row(db)))
