import re
import time
import uuid

import requests
from flask import Blueprint, g, jsonify, request

from ...core.auth import require_admin
from ...core.bunny import BunnyNotConfigured, BunnyUploadError, delete_by_url, get_bunny_config, upload_bytes

media_bp = Blueprint("media", __name__)

MAX_FILES = 20
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB — room for short product clips

MAX_IMPORT_URLS = 20
MAX_IMPORT_BYTES = 15 * 1024 * 1024
IMPORT_TIMEOUT_SECONDS = 25

SLUG_RE = re.compile(r"^[a-z0-9-]+$", re.IGNORECASE)


def _extension_for_mime(mime: str) -> str:
    if mime == "image/png":
        return "png"
    if mime == "image/webp":
        return "webp"
    if mime == "image/gif":
        return "gif"
    return "jpg"


@media_bp.post("/upload")
@require_admin
def upload():
    files = request.files.getlist("files")
    if not files:
        return jsonify(success=False, error="No files uploaded"), 400
    if len(files) > MAX_FILES:
        return jsonify(success=False, error=f"At most {MAX_FILES} files per request"), 400

    raw_slug = request.form.get("slug", "")
    slug = raw_slug if SLUG_RE.match(raw_slug or "") else None
    folder = f"products/{slug}" if slug else f"{g.user['id']}/misc"

    urls: list[str] = []
    for file in files:
        content_type = file.mimetype or ""
        if not (content_type.startswith("image/") or content_type.startswith("video/")):
            return jsonify(success=False, error=f"Only image and video files are allowed ({file.filename})"), 400

        data = file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            return jsonify(success=False, error=f"File too large ({file.filename})"), 400

        safe_name = re.sub(r"[^\w.-]+", "_", file.filename or "file")
        object_path = f"{folder}/{int(time.time() * 1000)}-{uuid.uuid4().hex}-{safe_name}"

        try:
            urls.append(upload_bytes(data, content_type or "application/octet-stream", object_path))
        except BunnyNotConfigured:
            return jsonify(success=False, error="Storage is not configured on the server."), 500
        except BunnyUploadError:
            return jsonify(success=False, error=f"Upload failed for {file.filename}"), 502

    return jsonify(success=True, urls=urls)


def _fetch_image_bytes(url: str) -> tuple[bytes, str]:
    res = requests.get(
        url,
        timeout=IMPORT_TIMEOUT_SECONDS,
        headers={"User-Agent": "LocalBabaAdmin/1.0"},
        allow_redirects=True,
    )
    if not res.ok:
        raise ValueError(f"Download failed ({res.status_code})")
    content_type = (res.headers.get("content-type") or "image/jpeg").split(";")[0].strip()
    if not content_type.startswith("image/"):
        raise ValueError("URL is not an image")
    data = res.content
    if len(data) > MAX_IMPORT_BYTES:
        raise ValueError("Image too large")
    return data, content_type


@media_bp.post("/import")
@require_admin
def import_images():
    body = request.get_json(silent=True) or {}
    raw_urls = body.get("urls")
    urls = [u.strip() for u in raw_urls if isinstance(u, str) and re.match(r"^https?://", u.strip(), re.IGNORECASE)] if isinstance(raw_urls, list) else []

    if not urls:
        return jsonify(success=False, error="Provide urls: string[]"), 400
    if len(urls) > MAX_IMPORT_URLS:
        return jsonify(success=False, error=f"At most {MAX_IMPORT_URLS} URLs"), 400

    raw_slug = body.get("slug")
    slug = raw_slug if isinstance(raw_slug, str) and SLUG_RE.match(raw_slug) else None
    raw_purpose = body.get("purpose")
    purpose = raw_purpose if isinstance(raw_purpose, str) and SLUG_RE.match(raw_purpose) else "ai-listings"
    folder = f"products/{slug}" if slug else f"{g.user['id']}/{purpose}/{uuid.uuid4().hex}"

    try:
        _, _, cdn_base = get_bunny_config()
    except BunnyNotConfigured:
        cdn_base = None

    out: list[str] = []
    errors: list[str] = []

    for index, url in enumerate(urls):
        try:
            if cdn_base and url.startswith(f"{cdn_base}/{folder}/"):
                out.append(url)
                continue
            data, content_type = _fetch_image_bytes(url)
            ext = _extension_for_mime(content_type)
            object_path = f"{folder}/sel-{index + 1}-{int(time.time() * 1000)}.{ext}"
            cdn_url = upload_bytes(data, content_type, object_path)
            out.append(cdn_url)
            try:
                delete_by_url(url)
            except Exception:
                pass
        except (ValueError, BunnyUploadError, BunnyNotConfigured) as exc:
            errors.append(str(exc) or "import failed")
        except requests.RequestException:
            errors.append("import failed")

    if not out:
        return jsonify(success=False, error="Could not import any images", errors=errors), 502

    return jsonify(success=True, urls=out, errors=errors or None)
