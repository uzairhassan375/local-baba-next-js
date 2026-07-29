from datetime import datetime, timezone

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    return jsonify(
        status="ok",
        service="Local Baba Backend (Flask)",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
