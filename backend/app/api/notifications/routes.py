import uuid

from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin, require_auth
from ...core.notifications import create_notification
from ...core.supabase_client import get_admin_client

notifications_bp = Blueprint("notifications", __name__)


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "type": row.get("type"),
        "title": row.get("title"),
        "body": row.get("body"),
        "icon": row.get("icon"),
        "relatedId": row.get("related_id"),
        "isRead": bool(row.get("is_read")),
        "createdAt": row.get("created_at"),
    }


@notifications_bp.get("")
@require_auth
def list_notifications():
    db = get_admin_client()
    res = (
        db.table("member_notifications")
        .select("*")
        .eq("auth_user_id", g.user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(success=True, notifications=[_map_row(r) for r in (res.data or [])])


@notifications_bp.post("/mark-all-read")
@require_auth
def mark_all_read():
    db = get_admin_client()
    db.table("member_notifications").update({"is_read": True}).eq(
        "auth_user_id", g.user["id"]
    ).eq("is_read", False).execute()
    return jsonify(success=True)


@notifications_bp.patch("/<notification_id>/read")
@require_auth
def mark_read(notification_id: str):
    db = get_admin_client()
    res = (
        db.table("member_notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("auth_user_id", g.user["id"])
        .execute()
    )
    if not res.data:
        return jsonify(success=False, error="Notification not found."), 404
    return jsonify(success=True)


@notifications_bp.delete("/<notification_id>")
@require_auth
def delete_notification(notification_id: str):
    db = get_admin_client()
    db.table("member_notifications").delete().eq("id", notification_id).eq(
        "auth_user_id", g.user["id"]
    ).execute()
    return jsonify(success=True)


@notifications_bp.post("/admin/send")
@require_admin
def admin_send_to_members():
    """Admin broadcast to a specific list of members — used by the "Cart
    Stats" / "Fav Stats" panels to message everyone who has a given product
    in their cart/favorites (e.g. a discount or restock alert).

    A fresh related_id is generated per send so `create_notification`'s
    (auth_user_id, type, related_id) dedupe doesn't silently swallow a
    second message about the same product to the same member.
    """
    body = request.get_json(silent=True) or {}
    member_ids = body.get("memberIds")
    title = (body.get("title") or "").strip()
    message = (body.get("body") or "").strip()
    product_id = body.get("productId")

    if not isinstance(member_ids, list) or not member_ids:
        return jsonify(success=False, error="memberIds is required."), 400
    if not title or not message:
        return jsonify(success=False, error="title and body are required."), 400

    related_id = f"admin-msg:{product_id or 'general'}:{uuid.uuid4().hex[:12]}"

    db = get_admin_client()
    sent = 0
    for auth_user_id in member_ids:
        if not auth_user_id:
            continue
        create_notification(db, auth_user_id, "admin_message", title, message, related_id=related_id)
        sent += 1

    return jsonify(success=True, sent=sent)
