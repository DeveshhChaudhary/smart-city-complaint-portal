from supabase import Client, create_client

from app.config.settings import settings


if not settings.SUPABASE_URL:
    raise ValueError(
        "SUPABASE_URL is missing. "
        "Please add it to backend/.env"
    )


if not settings.SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_KEY is missing. "
        "Please add it to backend/.env"
    )


supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY,
)