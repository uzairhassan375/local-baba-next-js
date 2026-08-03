import random
import string

from flask import Blueprint, g, jsonify, request

from ...core.auth import is_admin, require_auth
from ...core.supabase_client import get_admin_client

manual_invoices_bp = Blueprint("manual_invoices", __name__)

TABLE_NAME = "invoice_by_members"

PAYMENT_METHODS = {"bank_transfer", "easypaisa", "cod"}
PAYMENT_STATUSES = {"pending", "confirmed", "failed"}


def _map_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "memberId": row.get("member_id"),
        "invoiceNumber": row.get("invoice_number"),
        "customerName": row.get("customer_name"),
        "customerPhone": row.get("customer_phone"),
        "deliveryAddress": row.get("delivery_address") or "",
        "city": row.get("city") or "",
        "items": row.get("items") or [],
        "subtotal": float(row.get("subtotal") or 0),
        "deliveryCharges": float(row.get("delivery_charges") or 0),
        "discount": float(row.get("discount") or 0),
        "total": float(row.get("total") or 0),
        "paymentMethod": row.get("payment_method") or "bank_transfer",
        "paymentStatus": row.get("payment_status") or "pending",
        "dueDate": row.get("due_date"),
        "notes": row.get("notes"),
        "createdAt": row.get("created_at"),
    }


def _generate_invoice_number() -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"INV-LB-{suffix}"


@manual_invoices_bp.get("")
@require_auth
def list_manual_invoices():
    db = get_admin_client()
    query = db.table(TABLE_NAME).select("*")
    if not is_admin(g.user):
        query = query.eq("member_id", g.user["id"])
    res = query.order("created_at", desc=True).execute()
    return jsonify(success=True, invoices=[_map_row(r) for r in (res.data or [])])


@manual_invoices_bp.get("/<invoice_id>")
@require_auth
def get_manual_invoice(invoice_id: str):
    db = get_admin_client()
    res = db.table(TABLE_NAME).select("*").eq("id", invoice_id).maybe_single().execute()
    row = res.data if res else None
    if not row or (row.get("member_id") != g.user["id"] and not is_admin(g.user)):
        return jsonify(success=False, error="Invoice not found"), 404
    return jsonify(success=True, invoice=_map_row(row))


@manual_invoices_bp.post("")
@require_auth
def create_manual_invoice():
    body = request.get_json(silent=True) or {}

    customer_name = (body.get("customerName") or "").strip()
    if not customer_name:
        return jsonify(success=False, error="Customer name is required."), 400

    items = body.get("items") or []
    if not isinstance(items, list) or not items:
        return jsonify(success=False, error="At least one line item is required."), 400

    normalized_items = []
    subtotal = 0.0
    for it in items:
        qty = float(it.get("qty") or 0)
        rate = float(it.get("rate") or 0)
        amount = qty * rate
        subtotal += amount
        normalized_items.append({
            "description": it.get("description") or "Item",
            "qty": qty,
            "rate": rate,
            "amount": amount,
        })

    delivery_charges = float(body.get("deliveryCharges") or 0)
    discount = float(body.get("discount") or 0)
    total = max(0.0, subtotal + delivery_charges - discount)

    payment_method = body.get("paymentMethod") or "bank_transfer"
    if payment_method not in PAYMENT_METHODS:
        payment_method = "bank_transfer"
    payment_status = body.get("paymentStatus") or "pending"
    if payment_status not in PAYMENT_STATUSES:
        payment_status = "pending"

    invoice_id = _generate_invoice_number()
    record = {
        "id": invoice_id,
        "member_id": g.user["id"],
        "invoice_number": invoice_id,
        "customer_name": customer_name,
        "customer_phone": body.get("customerPhone"),
        "delivery_address": body.get("deliveryAddress", ""),
        "city": body.get("city", ""),
        "items": normalized_items,
        "subtotal": subtotal,
        "delivery_charges": delivery_charges,
        "discount": discount,
        "total": total,
        "payment_method": payment_method,
        "payment_status": payment_status,
        "due_date": body.get("dueDate") or None,
        "notes": body.get("notes"),
    }

    db = get_admin_client()
    res = db.table(TABLE_NAME).insert(record).execute()
    if not res.data:
        return jsonify(success=False, error="Could not create invoice."), 500

    return jsonify(success=True, invoice=_map_row(res.data[0]))


@manual_invoices_bp.delete("/<invoice_id>")
@require_auth
def delete_manual_invoice(invoice_id: str):
    db = get_admin_client()
    res = db.table(TABLE_NAME).select("id, member_id").eq("id", invoice_id).maybe_single().execute()
    row = res.data if res else None
    if not row or (row.get("member_id") != g.user["id"] and not is_admin(g.user)):
        return jsonify(success=False, error="Invoice not found"), 404

    db.table(TABLE_NAME).delete().eq("id", invoice_id).execute()
    return jsonify(success=True)
