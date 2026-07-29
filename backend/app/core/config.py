import os
import re


def _split_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


class Config:
    PORT = int(os.environ.get("PORT", 5000))
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
    SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

    FRONTEND_ORIGINS = _split_origins(
        os.environ.get(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,"
            "https://thelocalbaba.com,https://www.thelocalbaba.com",
        )
    )

    # Matches backend/src/index.ts CORS regexes (Vercel preview deployments)
    FRONTEND_ORIGIN_PATTERNS = [
        re.compile(r"^https:\/\/local-baba-[a-z0-9-]+\.vercel\.app$"),
        re.compile(r"^https:\/\/local-baba-.*-uzairhassan375s-projects\.vercel\.app$"),
    ]


config = Config()
