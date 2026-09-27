from fastapi import APIRouter, Depends, HTTPException

from app.config.supabase import supabase
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"],
)


@router.get("/")
def get_categories(
    current_user: dict = Depends(get_current_user),
):
    try:
        response = (
            supabase
            .table("categories")
            .select("id, name, description")
            .order("name")
            .execute()
        )

        categories = response.data or []

        return {
            "success": True,
            "count": len(categories),
            "categories": categories,
        }

    except Exception as error:
        print("Get categories error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch categories: {str(error)}",
        )