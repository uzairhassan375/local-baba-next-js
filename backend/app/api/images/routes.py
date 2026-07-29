from flask import Blueprint, jsonify, request

from . import service as serp_service

images_bp = Blueprint("images", __name__)


@images_bp.post("/search")
def search():
    body = request.get_json(silent=True) or {}
    image_url = body.get("imageUrl")
    product_name = body.get("productName")
    raw_limit = body.get("limit")

    if not image_url and not product_name:
        return jsonify(success=False, error="Provide at least one of: imageUrl or productName."), 400

    try:
        limit = int(raw_limit) if raw_limit is not None else 10
    except (TypeError, ValueError):
        limit = 10
    limit = max(9, min(11, limit))

    try:
        images = serp_service.search_product_images(image_url, product_name, limit)
    except Exception as exc:  # noqa: BLE001 - surface as a clean API error
        return jsonify(success=False, error=str(exc) or "Image search failed."), 500

    return jsonify(
        success=True,
        source="SerpApi via Local Baba Backend",
        count=len(images),
        images=images,
    )
