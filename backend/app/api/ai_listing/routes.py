import base64
import uuid
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin
from ...core.bunny import BunnyNotConfigured, BunnyUploadError, upload_bytes
from ...core.config import config
from . import service

ai_listing_bp = Blueprint("ai_listing", __name__)

MAX_IMAGE_BYTES = 10 * 1024 * 1024


@ai_listing_bp.post("/generate-listing")
@require_admin
def generate_listing():
    gemini_key = config.GEMINI_API_KEY
    serp_key = config.SERPAPI_KEY
    if not gemini_key:
        return jsonify(error="GEMINI_API_KEY must be configured on the server."), 500
    if not serp_key:
        return jsonify(error="SERPAPI_KEY must be configured on the server."), 500

    file = request.files.get("image")
    if not file or not file.filename:
        return jsonify(error='Upload a single image as field "image"'), 400

    product_details = (request.form.get("productDetails") or "").strip()
    if len(product_details) < 8:
        return jsonify(error="Provide product details (at least a short description of what the product is)."), 400
    if len(product_details) > 4000:
        return jsonify(error="Product details are too long (max 4000 characters)."), 400

    mime_type = file.mimetype or ""
    if not mime_type.startswith("image/"):
        return jsonify(error="Only image files are allowed"), 400

    original_bytes = file.read()
    if len(original_bytes) > MAX_IMAGE_BYTES:
        return jsonify(error="Image must be 10MB or smaller"), 400

    base64_data = base64.b64encode(original_bytes).decode("ascii")
    ext = service.extension_for_mime(mime_type)
    folder = f"{g.user['id']}/ai-listings/{uuid.uuid4().hex}"

    try:
        original_image_url = upload_bytes(original_bytes, mime_type, f"{folder}/original.{ext}")
    except BunnyNotConfigured:
        return jsonify(error="Storage is not configured on the server."), 500
    except BunnyUploadError as exc:
        return jsonify(error=str(exc) or "Failed to upload original image"), 502

    def run_listing():
        try:
            return {"ok": True, "listing": service.generate_listing_copy(gemini_key, mime_type, base64_data, product_details)}
        except Exception as exc:  # noqa: BLE001 - surfaced to the client as listingError
            return {"ok": False, "error": str(exc) or "Listing failed"}

    def run_serp():
        try:
            return {"ok": True, "images": service.find_similar_images(serp_key, original_image_url, limit=10)}
        except Exception as exc:  # noqa: BLE001 - surfaced to the client as serpError
            return {"ok": False, "images": [], "error": str(exc) or "SerpAPI search failed"}

    with ThreadPoolExecutor(max_workers=2) as pool:
        listing_future = pool.submit(run_listing)
        serp_future = pool.submit(run_serp)
        listing_result = listing_future.result()
        serp_result = serp_future.result()

    similar_images = serp_result["images"] if serp_result["ok"] else []
    similar_image_urls = [i["url"] for i in similar_images]
    serp_error = None if serp_result["ok"] else serp_result["error"]
    listing = listing_result["listing"] if listing_result["ok"] else service.empty_listing()
    listing_error = None if listing_result["ok"] else listing_result["error"]

    if not similar_image_urls and listing_error:
        return jsonify(
            error="Failed to find similar images and write listing copy",
            listingError=listing_error,
            serpError=serp_error,
            originalImageUrl=original_image_url,
        ), 502

    return jsonify(
        originalImageUrl=original_image_url,
        similarImageUrls=similar_image_urls,
        similarImages=similar_images,
        serpError=serp_error,
        listingError=listing_error,
        **listing,
    )
