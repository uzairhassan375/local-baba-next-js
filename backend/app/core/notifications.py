from supabase import Client


def create_notification(
    db: Client,
    auth_user_id: str,
    type_: str,
    title: str,
    body: str,
    related_id: str | None = None,
    icon: str | None = None,
) -> None:
    """Insert a per-user notification row. Silently a no-op on a duplicate
    (auth_user_id, type, related_id) — e.g. re-confirming an already-confirmed
    payment shouldn't spam a second notification."""
    if not auth_user_id:
        return
    db.table("member_notifications").upsert(
        {
            "auth_user_id": auth_user_id,
            "type": type_,
            "title": title,
            "body": body,
            "related_id": related_id,
            "icon": icon,
        },
        on_conflict="auth_user_id,type,related_id",
        ignore_duplicates=True,
    ).execute()
