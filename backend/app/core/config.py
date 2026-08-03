import os
import re
from pathlib import Path

from dotenv import load_dotenv

# Loads backend/.env.local into the process environment automatically, so
# `python wsgi.py` works whether or not it was manually sourced first (see
# README.md). No-op if the file doesn't exist (e.g. on Render, which sets
# real environment variables directly) — and never overrides a variable
# that's already set in the environment.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env.local")


def _split_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


class Config:
    PORT = int(os.environ.get("PORT", 5000))
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

    # Same Bunny Storage account the website's /api/upload-media route uses —
    # copy the same three values from frontend/.env.local (and Render env
    # vars) here so member-uploaded invoice logos go through this backend
    # instead of the website directly.
    BUNNY_STORAGE_API_KEY = os.environ.get("BUNNY_STORAGE_API_KEY", "")
    BUNNY_STORAGE_API_BASE = os.environ.get("BUNNY_STORAGE_API_BASE", "")
    BUNNY_STORAGE_CDN_BASE = os.environ.get("BUNNY_STORAGE_CDN_BASE", "")

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
