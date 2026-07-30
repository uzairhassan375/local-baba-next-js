from flask import Blueprint, g, jsonify

from ...core.auth import require_auth
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
