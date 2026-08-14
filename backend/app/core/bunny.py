from urllib.parse import quote

import requests

from .config import config


class BunnyNotConfigured(Exception):
    pass


class BunnyUploadError(Exception):
    pass


def _encode_path(path: str) -> str:
    return quote(path, safe="/")


def get_bunny_config() -> tuple[str, str, str]:
    api_key = config.BUNNY_STORAGE_API_KEY
    api_base = config.BUNNY_STORAGE_API_BASE.rstrip("/")
    cdn_base = config.BUNNY_STORAGE_CDN_BASE.rstrip("/")
    if not api_key or not api_base or not cdn_base:
        raise BunnyNotConfigured("Storage is not configured on the server.")
    return api_key, api_base, cdn_base


def upload_bytes(data: bytes, content_type: str, object_path: str) -> str:
    """Uploads bytes to Bunny Storage and returns the public CDN URL."""
    api_key, api_base, cdn_base = get_bunny_config()
    encoded_path = _encode_path(object_path)

    try:
        upstream = requests.put(
            f"{api_base}/{encoded_path}",
            data=data,
            headers={"AccessKey": api_key, "Content-Type": content_type or "application/octet-stream"},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise BunnyUploadError("Failed to upload file.") from exc

    if not upstream.ok:
        raise BunnyUploadError("Failed to upload file.")

    return f"{cdn_base}/{encoded_path}"


def delete_by_url(cdn_url: str) -> None:
    """Deletes an object from Bunny Storage by its public CDN URL. No-op if the URL isn't ours."""
    api_key, api_base, cdn_base = get_bunny_config()
    prefix = f"{cdn_base}/"
    if not cdn_url.startswith(prefix):
        return

    object_path = cdn_url[len(prefix):]  # already percent-encoded
    try:
        res = requests.delete(f"{api_base}/{object_path}", headers={"AccessKey": api_key}, timeout=30)
    except requests.RequestException:
        return
    if not res.ok and res.status_code != 404:
        pass
