import json

import requests

GEMINI_MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.0-flash"]
GEMINI_TIMEOUT_SECONDS = 45
SERP_TIMEOUT_SECONDS = 45

_LISTING_KEYS = {"title", "description", "category", "tags", "key_features", "suggested_attributes"}


def extension_for_mime(mime: str) -> str:
    if mime == "image/png":
        return "png"
    if mime == "image/webp":
        return "webp"
    if mime == "image/gif":
        return "gif"
    return "jpg"


def _build_listing_prompt(details: str) -> str:
    return "\n".join(
        [
            "You write ecommerce product listings for LocalBaba (Pakistan wholesale / B2B catalogue).",
            "The admin provided product details below. Use those as the primary source of truth.",
            "If an image is attached, use it to enrich color, material, style, and visual attributes.",
            "Write a clear commercial title and a polished product description yourself — do not copy the notes verbatim;",
            "expand them into proper listing copy while staying faithful to the facts given.",
            "Return ONLY valid JSON (no markdown) with keys:",
            "title (string — compelling product name), description (string — 2-5 short paragraphs or bullet-friendly prose),",
            "category (string; prefer one of Fashion, Electronics, Home, Beauty, Kids when possible),",
            "tags (string array of short marketing tags), key_features (string array),",
            "suggested_attributes (object of attributes like color/material/size when known).",
            "Do not invent a price or quantity.",
            "",
            "Admin product details:",
            details,
        ]
    )


def _extract_text(payload: dict) -> str:
    error = payload.get("error") or {}
    if error.get("message"):
        raise ValueError(error["message"])

    prompt_feedback = payload.get("promptFeedback") or {}
    block_reason = prompt_feedback.get("blockReason")
    if block_reason:
        reason_msg = prompt_feedback.get("blockReasonMessage")
        raise ValueError(f"Gemini blocked the prompt ({block_reason}{f': {reason_msg}' if reason_msg else ''})")

    candidates = payload.get("candidates") or []
    if not candidates:
        raise ValueError("Gemini returned no candidates")
    candidate = candidates[0]

    finish_reason = candidate.get("finishReason")
    if finish_reason and finish_reason not in ("STOP", "MAX_TOKENS"):
        raise ValueError(f"Gemini finished with {finish_reason}")

    parts = (candidate.get("content") or {}).get("parts") or []
    text = "".join(p.get("text") or "" for p in parts)
    if not text.strip():
        raise ValueError(f"Gemini returned empty text (finishReason={finish_reason or 'unknown'})")
    return text


def _extract_json_object(text: str) -> dict:
    trimmed = text.strip()
    try:
        return json.loads(trimmed)
    except ValueError:
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        if start >= 0 and end > start:
            return json.loads(trimmed[start : end + 1])
        raise ValueError("No JSON object in model response")


def _parse_listing_json(raw) -> dict:
    if not isinstance(raw, dict):
        return empty_listing()
    tags = [t for t in (raw.get("tags") or []) if isinstance(t, str)]
    key_features = [t for t in (raw.get("key_features") or []) if isinstance(t, str)]
    suggested = raw.get("suggested_attributes")
    suggested_attributes = {}
    if isinstance(suggested, dict):
        suggested_attributes = {k: str(v) for k, v in suggested.items() if isinstance(v, (str, int, float))}
    return {
        "title": raw.get("title") if isinstance(raw.get("title"), str) else "",
        "description": raw.get("description") if isinstance(raw.get("description"), str) else "",
        "category": raw.get("category") if isinstance(raw.get("category"), str) else "",
        "tags": tags,
        "key_features": key_features,
        "suggested_attributes": suggested_attributes,
    }


def empty_listing() -> dict:
    return {"title": "", "description": "", "category": "", "tags": [], "key_features": [], "suggested_attributes": {}}


def _call_gemini(api_key: str, model: str, parts: list[dict], use_json_mime: bool) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {"contents": [{"role": "user", "parts": parts}]}
    if use_json_mime:
        body["generationConfig"] = {"responseMimeType": "application/json"}

    res = requests.post(url, params={"key": api_key}, json=body, timeout=GEMINI_TIMEOUT_SECONDS)
    try:
        payload = res.json()
    except ValueError:
        raise ValueError(f"Gemini listing failed ({res.status_code}): {res.text[:240]}")

    if not res.ok:
        raise ValueError((payload.get("error") or {}).get("message") or f"Gemini listing failed ({res.status_code}): {res.text[:240]}")

    try:
        return _parse_listing_json(_extract_json_object(_extract_text(payload)))
    except ValueError as exc:
        raise ValueError(str(exc) or "Gemini returned invalid listing JSON")


def generate_listing_copy(api_key: str, mime_type: str, base64_data: str, product_details: str) -> dict:
    details = product_details.strip()
    if not details:
        raise ValueError("Product details are required")

    prompt = _build_listing_prompt(details)
    with_image_parts = [{"inlineData": {"mimeType": mime_type, "data": base64_data}}, {"text": prompt}]
    text_only_parts = [{"text": prompt}]

    attempts = []
    for model in GEMINI_MODELS:
        attempts.append((model, with_image_parts, True))
        attempts.append((model, with_image_parts, False))
        attempts.append((model, text_only_parts, True))

    errors: list[str] = []
    for model, parts, use_json_mime in attempts:
        try:
            listing = _call_gemini(api_key, model, parts, use_json_mime)
            if not listing["title"] and not listing["description"]:
                raise ValueError("Parsed listing was empty")
            return listing
        except (ValueError, requests.RequestException) as exc:
            errors.append(f"{model}: {exc}")

    raise ValueError(errors[0] if errors else "Gemini listing failed")


def _pick_image_url(match: dict) -> str | None:
    full = (match.get("image") or "").strip() if isinstance(match.get("image"), str) else ""
    thumb = (match.get("thumbnail") or "").strip() if isinstance(match.get("thumbnail"), str) else ""
    url = full or thumb
    if not url or not url.lower().startswith(("http://", "https://")):
        return None
    return url


def find_similar_images(api_key: str, image_url: str, limit: int = 10) -> list[dict]:
    """Google Lens visual matches for a public image URL — used to suggest
    similar product photos when writing an AI-generated listing."""
    limit = max(1, min(20, limit))
    params = {"engine": "google_lens", "type": "visual_matches", "url": image_url, "api_key": api_key, "hl": "en"}

    res = requests.get("https://serpapi.com/search.json", params=params, timeout=SERP_TIMEOUT_SECONDS)
    if not res.ok:
        raise ValueError(f"SerpAPI failed ({res.status_code}): {res.text[:200]}")

    payload = res.json()
    if payload.get("error"):
        raise ValueError(f"SerpAPI error: {payload['error']}")

    matches = [*(payload.get("visual_matches") or []), *(payload.get("products") or [])]
    seen: set[str] = set()
    out: list[dict] = []
    for match in matches:
        url = _pick_image_url(match)
        if not url or url in seen:
            continue
        seen.add(url)
        out.append({"url": url, "title": match.get("title") if isinstance(match.get("title"), str) else None,
                     "source": match.get("source") if isinstance(match.get("source"), str) else None})
        if len(out) >= limit:
            break
    return out
