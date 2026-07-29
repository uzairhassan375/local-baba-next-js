from supabase import create_client, Client

from .config import config

_client: Client | None = None


def get_admin_client() -> Client:
    """Supabase client authenticated with the service-role key.

    Bypasses RLS entirely — every caller of this must enforce its own
    authorization (see app/auth.py + per-blueprint checks).
    """
    global _client
    if _client is None:
        _client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    return _client
