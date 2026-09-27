from fastapi import APIRouter, Depends, HTTPException
from app.config.supabase import supabase
from app.utils.security import require_role

router = APIRouter(
    prefix="/api/worker",
    tags=["Worker"]
)


def get_worker_profile(current_user: dict):
    response = (
        supabase
        .table("workers")
        .select("*")
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )

    workers = response.data or []

    if not workers:
        raise HTTPException(
            status_code=404,
            detail="Worker profile not found for this account."
        )

    return workers[0]


@router.get("/me")
def get_my_worker_profile(
    current_user: dict = Depends(require_role("worker"))
):
    try:
        worker = get_worker_profile(current_user)

        return {
            "success": True,
            "worker": {
                "id": worker["id"],
                "user_id": worker["user_id"],
                "worker_code": worker["worker_code"],
                "department": worker["department"],
                "specialization": worker["specialization"],
                "is_available": worker["is_available"],
                "user": current_user,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Get worker profile error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch worker profile: {str(error)}"
        )


@router.get("/complaints")
def get_my_complaints(
    current_user: dict = Depends(require_role("worker"))
):
    try:
        worker = get_worker_profile(current_user)

        response = (
            supabase
            .table("complaints")
            .select(
                """
                *,
                categories(
                    id,
                    name,
                    description
                )
                """
            )
            .eq("assigned_worker_id", worker["id"])
            .order("created_at", desc=True)
            .execute()
        )

        complaints = response.data or []

        return {
            "success": True,
            "worker": {
                "id": worker["id"],
                "worker_code": worker["worker_code"],
                "department": worker["department"],
                "specialization": worker["specialization"],
            },
            "count": len(complaints),
            "complaints": complaints,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Get worker complaints error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch worker complaints: {str(error)}"
        )