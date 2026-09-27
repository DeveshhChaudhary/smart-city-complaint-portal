import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = os.getenv(
        "APP_NAME",
        "Smart City Complaint Portal",
    )

    APP_ENV: str = os.getenv(
        "APP_ENV",
        "development",
    )

    SUPABASE_URL: str = os.getenv(
        "SUPABASE_URL",
        "",
    )

    SUPABASE_KEY: str = os.getenv(
        "SUPABASE_KEY",
        "",
    )

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173",
    )

    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "",
    )

    JWT_EXPIRE_MINUTES: int = int(
        os.getenv(
            "JWT_EXPIRE_MINUTES",
            "1440",
        )
    )


settings = Settings()