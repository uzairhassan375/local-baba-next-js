from .supabase_client import get_admin_client


def fetch_members_by_auth_ids(auth_user_ids: list) -> dict:
    """Look up membership_applications rows for a set of auth_user_ids, keyed
    by auth_user_id — turns raw member_cart/member_favorites rows (which only
    carry the auth uid) into human-readable member info for admin views."""
    ids = [i for i in set(auth_user_ids) if i]
    if not ids:
        return {}
    db = get_admin_client()
    res = (
        db.table("membership_applications")
        .select("auth_user_id, name, email, whatsapp, city")
        .in_("auth_user_id", ids)
        .execute()
    )
    return {r["auth_user_id"]: r for r in (res.data or []) if r.get("auth_user_id")}
