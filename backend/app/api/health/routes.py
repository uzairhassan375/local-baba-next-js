from datetime import datetime, timezone

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


def _health_payload():
    return {
        "status": "ok",
        "service": "Local Baba Backend (Flask)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@health_bp.get("/health")
def health_root():
    """Public liveness check — GET /health"""
    return jsonify(_health_payload()), 200


@health_bp.get("/api/health")
def health():
    """Public liveness check — GET /api/health (same as /health)"""
    return jsonify(_health_payload()), 200
