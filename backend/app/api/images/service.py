import uuid

import requests

from ...core.config import config

TIMEOUT = 20

FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600",
    "https://images.unsplash.com/photo-1503602642458-232111445657?w=600",
]


def _fetch_google_lens(image_url: str, api_key: str, limit: int) -> list[dict]:
    params = {"engine": "google_lens", "url": image_url, "api_key": api_key}
    try:
        res = requests.get("https://serpapi.com/search.json", params=params, timeout=TIMEOUT)
    except requests.RequestException:
        return []
    if not res.ok:
        return []
    data = res.json()
    results = data.get("visual_matches", []) or []
    out = []
    for item in results[:limit]:
        url = item.get("thumbnail") or item.get("image")
        if url:
            out.append({"url": url, "source": item.get("source", "google_lens")})
    return out


def _fetch_google_images(product_name: str, api_key: str, limit: int) -> list[dict]:
    params = {"engine": "google_images", "q": product_name, "api_key": api_key}
    try:
        res = requests.get("https://serpapi.com/search.json", params=params, timeout=TIMEOUT)
    except requests.RequestException:
        return []
    if not res.ok:
        return []
    data = res.json()
    results = data.get("images_results", []) or []
    out = []
    for item in results[:limit]:
        url = item.get("thumbnail") or item.get("original")
        if url:
            out.append({"url": url, "source": item.get("source", "google_images")})
    return out


def search_product_images(image_url: str | None, product_name: str | None, limit: int) -> list[dict]:
    api_key = config.SERPAPI_KEY
    raw: list[dict] = []

    if api_key and image_url:
        raw.extend(_fetch_google_lens(image_url, api_key, limit))

    if api_key and len(raw) < limit and product_name:
        raw.extend(_fetch_google_images(product_name, api_key, limit - len(raw)))

    if len(raw) < limit:
        needed = limit - len(raw)
        raw.extend({"url": u, "source": "fallback"} for u in FALLBACK_IMAGES[:needed])

    images = []
    for i, item in enumerate(raw[:limit]):
        images.append(
            {
                "id": str(uuid.uuid4()),
                "url": item["url"],
                "source": item["source"],
                "selected": i < 5,
                "isOriginal": i == 0,
            }
        )
    return images
