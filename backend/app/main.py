from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.config.supabase import supabase

from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.complaints import router as complaints_router
from app.routes.admin import router as admin_router
from app.routes.worker import router as worker_router
from app.routes.notifications import router as notifications_router


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(complaints_router)
app.include_router(admin_router)
app.include_router(worker_router)
app.include_router(notifications_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message": "Smart City Complaint Portal API is running.",
        "environment": settings.APP_ENV,
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "healthy",
    }


# ============================================================
# DATABASE TEST
# ============================================================

@app.get("/api/test/database")
def test_database():
    try:
        response = (
            supabase
            .table("categories")
            .select("id, name")
            .limit(5)
            .execute()
        )

        return {
            "success": True,
            "message": "Database connection successful.",
            "data": response.data or [],
        }

    except Exception as error:
        print("Database test error:", error)

        return {
            "success": False,
            "message": "Database connection failed.",
            "error": str(error),
        }


# ============================================================
# CONFIG TEST
# ============================================================

@app.get("/api/test/config")
def test_config():
    return {
        "success": True,
        "supabase_url_loaded": bool(settings.SUPABASE_URL),
        "supabase_key_loaded": bool(settings.SUPABASE_KEY),
        "jwt_secret_loaded": bool(settings.JWT_SECRET),
        "jwt_expire_minutes": settings.JWT_EXPIRE_MINUTES,
        "frontend_url": settings.FRONTEND_URL,
    }