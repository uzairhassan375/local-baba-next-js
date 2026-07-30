import random
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ...core.auth import is_admin, require_auth
from ...core.notifications import create_notification
from ...core.supabase_client import get_admin_client

orders_bp = Blueprint("orders", __name__)

ORDER_STATUS_NOTIFICATIONS = {
    "dispatched": ("order_dispatched", "Order dispatched"),
    "delivered": ("order_delivered", "Order delivered"),
    "cancelled": ("order_cancelled", "Order cancelled"),
}

MEMBER_WRITABLE_FIELDS = {"order_status", "notes", "delivery_address", "city"}
CANCELLABLE_FROM = {"processing"}


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "memberId": row.get("member_id"),
        "customerName": row.get("customer_name"),
        "items": row.get("items") or [],
        "total": float(row.get("total") or 0),
        "deliveryCharges": float(row.get("delivery_charges") or 250),
        "discount": float(row.get("discount") or 0),
        "paymentMethod": row.get("payment_method") or "bank_transfer",
        "paymentStatus": row.get("payment_status") or "pending",
        "orderStatus": row.get("order_status") or "processing",
        "courier": row.get("courier"),
        "trackingNumber": row.get("tracking_number"),
        "deliveryAddress": row.get("delivery_address") or "",
        "city": row.get("city") or "",
        "notes": row.get("notes"),
        "paymentScreenshot": row.get("payment_screenshot"),
        "transactionRef": row.get("transaction_ref"),
        "timeline": row.get("timeline") or [],
        "createdAt": row.get("created_at"),
    }


def _default_timeline() -> list[dict]:
    now = datetime.now(timezone.utc)
    return [
        {"step": "Order placed", "timestamp": now.strftime("%d %b, %I:%M %p"), "status": "completed"},
        {"step": "Payment confirmation", "timestamp": "within 2 hours of transfer", "status": "active"},
        {"step": "Packed", "status": "pending"},
        {"step": "Dispatched", "status": "pending"},
        {"step": "Out for delivery", "status": "pending"},
        {"step": "Delivered", "status": "pending"},
    ]


@orders_bp.get("")
@require_auth
def list_orders():
    db = get_admin_client()
    query = db.table("member_orders").select("*")
    if not is_admin(g.user):
        query = query.eq("member_id", g.user["id"])
    res = query.order("created_at", desc=True).execute()
    return jsonify(success=True, orders=[_map_row(r) for r in (res.data or [])])


@orders_bp.get("/<order_id>")
@require_auth
def get_order(order_id: str):
    db = get_admin_client()
    res = db.table("member_orders").select("*").eq("id", order_id).maybe_single().execute()
    row = res.data if res else None
    if not row or (row.get("member_id") != g.user["id"] and not is_admin(g.user)):
        return jsonify(success=False, error="Order not found"), 404
    return jsonify(success=True, order=_map_row(row))


@orders_bp.post("")
@require_auth
def create_order():
    body = request.get_json(silent=True) or {}

    order_id = f"LB-{random.randint(1000, 9999)}"
    record = {
        "id": order_id,
        "member_id": g.user["id"],
        "customer_name": body.get("customerName"),
        "items": body.get("items") or [],
        "total": body.get("total") or 0,
        "delivery_charges": body.get("deliveryCharges", 250),
        "discount": body.get("discount", 0),
        "payment_method": body.get("paymentMethod", "bank_transfer"),
        "payment_status": "pending",
        "order_status": "processing",
        "delivery_address": body.get("deliveryAddress", ""),
        "city": body.get("city", ""),
        "notes": body.get("notes"),
        "payment_screenshot": body.get("paymentScreenshot"),
        "transaction_ref": body.get("transactionRef"),
        "timeline": _default_timeline(),
    }

    db = get_admin_client()
    res = db.table("member_orders").insert(record).execute()
    if not res.data:
        return jsonify(success=False, error="Could not create order."), 500

    create_notification(
        db,
        g.user["id"],
        "order_placed",
        "Order placed",
        f"Your order #{order_id} has been placed and is awaiting payment confirmation.",
        related_id=order_id,
    )

    return jsonify(success=True, order=_map_row(res.data[0]))


@orders_bp.patch("/<order_id>")
@require_auth
def update_order(order_id: str):
    body = request.get_json(silent=True) or {}
    db = get_admin_client()

    res = db.table("member_orders").select("*").eq("id", order_id).maybe_single().execute()
    row = res.data if res else None
    admin = is_admin(g.user)
    if not row or (row.get("member_id") != g.user["id"] and not admin):
        return jsonify(success=False, error="Order not found"), 404

    if admin:
        updates = {k: v for k, v in body.items() if k in {
            "payment_status", "order_status", "courier", "tracking_number",
            "delivery_address", "city", "notes", "total", "delivery_charges", "discount",
            "items", "timeline",
        }}
    else:
        updates = {k: v for k, v in body.items() if k in MEMBER_WRITABLE_FIELDS}
        if updates.get("order_status") and row.get("order_status") not in CANCELLABLE_FROM:
            return jsonify(success=False, error="Order can no longer be cancelled."), 400
        if updates.get("order_status") not in (None, "cancelled"):
            return jsonify(success=False, error="Members may only cancel an order."), 403

    if not updates:
        return jsonify(success=False, error="No writable fields provided."), 400

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res2 = db.table("member_orders").update(updates).eq("id", order_id).execute()
    if not res2.data:
        return jsonify(success=False, error="Could not update order."), 500

    member_id = row.get("member_id")
    if updates.get("payment_status") == "confirmed" and row.get("payment_status") != "confirmed":
        create_notification(
            db,
            member_id,
            "payment_confirmed",
            "Payment confirmed",
            f"Admin confirmed your payment for order #{order_id} — it's now in packing!",
            related_id=order_id,
        )
    new_order_status = updates.get("order_status")
    if new_order_status and new_order_status != row.get("order_status") and new_order_status in ORDER_STATUS_NOTIFICATIONS:
        notif_type, notif_title = ORDER_STATUS_NOTIFICATIONS[new_order_status]
        if new_order_status == "dispatched":
            courier = updates.get("courier") or row.get("courier")
            tracking_number = updates.get("tracking_number") or row.get("tracking_number")
            suffix = f" via {courier}{f' ({tracking_number})' if tracking_number else ''}" if courier else ""
            notif_body = f"Your order #{order_id} has been dispatched{suffix}."
        elif new_order_status == "delivered":
            notif_body = f"Your order #{order_id} has been delivered. Thanks for shopping with us!"
        else:
            notif_body = f"Your order #{order_id} was cancelled."
        create_notification(db, member_id, notif_type, notif_title, notif_body, related_id=order_id)

    return jsonify(success=True, order=_map_row(res2.data[0]))
