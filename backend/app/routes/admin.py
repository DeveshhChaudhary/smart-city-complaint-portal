from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config.supabase import supabase
from app.utils.security import hash_password, require_role


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


# ============================================================
# SCHEMAS
# ============================================================

class WorkerAssignment(BaseModel):
    worker_id: str


class WorkerAvailabilityUpdate(BaseModel):
    is_available: bool


class UserStatusUpdate(BaseModel):
    is_active: bool


class WorkerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    worker_code: str
    department: str
    specialization: Optional[str] = None


# ============================================================
# CREATE WORKER ACCOUNT
# ADMIN ONLY
# ============================================================

@router.post("/workers")
def create_worker(
    worker: WorkerCreate,
    current_user: dict = Depends(require_role("admin"))
):
    user_id = None

    try:
        name = worker.name.strip()
        email = worker.email.lower().strip()
        phone = worker.phone.strip() if worker.phone else None
        worker_code = worker.worker_code.strip()
        department = worker.department.strip()
        specialization = worker.specialization.strip() if worker.specialization else None

        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Worker name must be at least 2 characters.")

        if len(worker.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

        if not worker_code:
            raise HTTPException(status_code=400, detail="Worker code is required.")

        if not department:
            raise HTTPException(status_code=400, detail="Department is required.")

        existing_user = (
            supabase.table("users")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if existing_user.data:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        existing_worker = (
            supabase.table("workers")
            .select("id")
            .eq("worker_code", worker_code)
            .limit(1)
            .execute()
        )

        if existing_worker.data:
            raise HTTPException(status_code=409, detail="A worker with this worker code already exists.")

        user_response = (
            supabase.table("users")
            .insert({
                "name": name,
                "email": email,
                "phone": phone,
                "password_hash": hash_password(worker.password),
                "role": "worker",
                "is_active": True,
            })
            .execute()
        )

        if not user_response.data:
            raise HTTPException(status_code=500, detail="Worker account could not be created.")

        user = user_response.data[0]
        user_id = user["id"]

        worker_response = (
            supabase.table("workers")
            .insert({
                "user_id": user_id,
                "worker_code": worker_code,
                "department": department,
                "specialization": specialization,
                "is_available": True,
            })
            .execute()
        )

        if not worker_response.data:
            try:
                supabase.table("users").delete().eq("id", user_id).execute()
            except Exception:
                pass
            user_id = None
            raise HTTPException(status_code=500, detail="Worker profile could not be created.")

        created_worker = worker_response.data[0]

        return {
            "success": True,
            "message": "Worker account created successfully.",
            "worker": {
                **created_worker,
                "users": {
                    "id": user["id"],
                    "name": user.get("name"),
                    "email": user.get("email"),
                    "phone": user.get("phone"),
                    "role": "worker",
                    "profile_image_url": user.get("profile_image_url"),
                    "is_active": True,
                    "created_at": user.get("created_at"),
                },
            },
        }

    except HTTPException:
        raise
    except Exception as error:
        if user_id:
            try:
                supabase.table("users").delete().eq("id", user_id).execute()
            except Exception:
                pass
        print("Create worker error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to create worker: {str(error)}")


# ============================================================
# GET ALL WORKERS
# ADMIN ONLY
# ============================================================

@router.get("/workers")
def get_workers(
    current_user: dict = Depends(require_role("admin"))
):
    try:
        response = (
            supabase
            .table("workers")
            .select(
                """
                id,
                user_id,
                worker_code,
                department,
                specialization,
                is_available,
                created_at,
                updated_at,
                users(
                    id,
                    name,
                    email,
                    phone,
                    role,
                    profile_image_url,
                    is_active,
                    created_at
                )
                """
            )
            .order("worker_code")
            .execute()
        )

        workers = response.data or []

        return {
            "success": True,
            "count": len(workers),
            "workers": workers,
        }

    except Exception as error:
        print("Get workers error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch workers: {str(error)}"
        )


# ============================================================
# GET ALL USERS
# ADMIN ONLY
# ============================================================

@router.get("/users")
def get_users(
    current_user: dict = Depends(require_role("admin"))
):
    try:
        response = (
            supabase
            .table("users")
            .select(
                """
                id,
                name,
                email,
                phone,
                role,
                profile_image_url,
                is_active,
                created_at,
                updated_at
                """
            )
            .order("created_at", desc=True)
            .execute()
        )

        users = response.data or []

        return {
            "success": True,
            "count": len(users),
            "users": users,
        }

    except Exception as error:
        print("Get users error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(error)}"
        )


# ============================================================
# UPDATE WORKER AVAILABILITY
# ADMIN ONLY
# ============================================================

@router.patch("/workers/{worker_id}/availability")
def update_worker_availability(
    worker_id: str,
    update: WorkerAvailabilityUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    try:
        worker_response = (
            supabase
            .table("workers")
            .select(
                """
                id,
                user_id,
                worker_code,
                department,
                specialization,
                is_available
                """
            )
            .eq("id", worker_id)
            .limit(1)
            .execute()
        )

        workers = worker_response.data or []

        if not workers:
            raise HTTPException(
                status_code=404,
                detail="Worker not found."
            )

        worker = workers[0]

        response = (
            supabase
            .table("workers")
            .update({
                "is_available": update.is_available,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", worker_id)
            .execute()
        )

        updated_workers = response.data or []

        if not updated_workers:
            raise HTTPException(
                status_code=500,
                detail="Worker availability could not be updated."
            )

        return {
            "success": True,
            "message": (
                "Worker marked available."
                if update.is_available
                else "Worker marked unavailable."
            ),
            "worker": updated_workers[0],
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Update worker availability error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update worker availability: {str(error)}"
        )


# ============================================================
# UPDATE USER ACCOUNT STATUS
# ADMIN ONLY
# ============================================================

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    update: UserStatusUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    try:
        if user_id == current_user["id"] and not update.is_active:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own admin account."
            )

        user_response = (
            supabase
            .table("users")
            .select(
                """
                id,
                name,
                email,
                role,
                is_active
                """
            )
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        users = user_response.data or []

        if not users:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        user = users[0]

        response = (
            supabase
            .table("users")
            .update({
                "is_active": update.is_active,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", user_id)
            .execute()
        )

        updated_users = response.data or []

        if not updated_users:
            raise HTTPException(
                status_code=500,
                detail="User account status could not be updated."
            )

        return {
            "success": True,
            "message": (
                "User account activated."
                if update.is_active
                else "User account deactivated."
            ),
            "user": updated_users[0],
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Update user status error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update user status: {str(error)}"
        )


# ============================================================
# ASSIGN COMPLAINT TO WORKER
# ADMIN ONLY
# ============================================================

@router.patch("/complaints/{complaint_id}/assign")
def assign_worker(
    complaint_id: str,
    assignment: WorkerAssignment,
    current_user: dict = Depends(require_role("admin"))
):
    try:
        complaint_response = (
            supabase
            .table("complaints")
            .select(
                "id, complaint_code, assigned_worker_id, status"
            )
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )

        complaints = complaint_response.data or []

        if not complaints:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        complaint = complaints[0]

        worker_response = (
            supabase
            .table("workers")
            .select(
                """
                id,
                user_id,
                worker_code,
                department,
                specialization,
                is_available
                """
            )
            .eq("id", assignment.worker_id)
            .limit(1)
            .execute()
        )

        workers = worker_response.data or []

        if not workers:
            raise HTTPException(
                status_code=404,
                detail="Worker not found."
            )

        worker = workers[0]

        user_response = (
            supabase
            .table("users")
            .select("id, is_active, role")
            .eq("id", worker["user_id"])
            .limit(1)
            .execute()
        )

        worker_users = user_response.data or []

        if not worker_users:
            raise HTTPException(
                status_code=404,
                detail="Worker account not found."
            )

        worker_user = worker_users[0]

        if not worker_user.get("is_active", True):
            raise HTTPException(
                status_code=400,
                detail="This worker's account is inactive."
            )

        if not worker.get("is_available", True):
            raise HTTPException(
                status_code=400,
                detail="This worker is currently unavailable."
            )

        now = datetime.now(timezone.utc).isoformat()

        update_response = (
            supabase
            .table("complaints")
            .update(
                {
                    "assigned_worker_id": worker["id"],
                    "status": "Assigned",
                    "updated_at": now,
                }
            )
            .eq("id", complaint_id)
            .execute()
        )

        updated_complaints = update_response.data or []

        if not updated_complaints:
            raise HTTPException(
                status_code=500,
                detail="Complaint assignment failed."
            )

        history_response = (
            supabase
            .table("complaint_status_history")
            .insert(
                {
                    "complaint_id": complaint_id,
                    "old_status": complaint["status"],
                    "new_status": "Assigned",
                    "changed_by": current_user["id"],
                    "remarks": (
                        f"Complaint assigned to "
                        f"{worker['worker_code']} by admin."
                    ),
                }
            )
            .execute()
        )

        return {
            "success": True,
            "message": "Complaint assigned successfully.",
            "complaint": updated_complaints[0],
            "worker": worker,
            "history": history_response.data or [],
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Assign worker error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to assign worker: {str(error)}"
        )


# ============================================================
# VERIFY COMPLAINT
# ADMIN ONLY
# ============================================================

@router.patch("/complaints/{complaint_id}/verify")
def verify_complaint(
    complaint_id: str,
    current_user: dict = Depends(require_role("admin"))
):
    try:
        complaint_response = (
            supabase
            .table("complaints")
            .select(
                """
                id,
                complaint_code,
                citizen_id,
                status,
                verified_by,
                verified_at
                """
            )
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )

        complaints = complaint_response.data or []

        if not complaints:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        complaint = complaints[0]

        existing_reward_response = (
            supabase
            .table("rewards")
            .select("id, points, reason, complaint_id")
            .eq("complaint_id", complaint_id)
            .eq("reason", "Complaint verified")
            .limit(1)
            .execute()
        )

        existing_rewards = existing_reward_response.data or []
        reward_already_exists = len(existing_rewards) > 0

        now = datetime.now(timezone.utc).isoformat()

        response = (
            supabase
            .table("complaints")
            .update(
                {
                    "verified_by": current_user["id"],
                    "verified_at": now,
                    "status": "Verified",
                    "updated_at": now,
                }
            )
            .eq("id", complaint_id)
            .execute()
        )

        updated_complaints = response.data or []

        if not updated_complaints:
            raise HTTPException(
                status_code=500,
                detail="Complaint verification failed."
            )

        updated_complaint = updated_complaints[0]

        try:
            supabase.table("complaint_status_history").insert(
                {
                    "complaint_id": complaint_id,
                    "old_status": complaint["status"],
                    "new_status": "Verified",
                    "changed_by": current_user["id"],
                    "remarks": "Complaint verified by admin.",
                }
            ).execute()

        except Exception as history_error:
            print(
                "Warning: Failed to create verification history:",
                history_error
            )

        reward_created = False
        reward = None

        if not reward_already_exists:
            try:
                reward_response = (
                    supabase
                    .table("rewards")
                    .insert(
                        {
                            "user_id": complaint["citizen_id"],
                            "points": 10,
                            "reason": "Complaint verified",
                            "complaint_id": complaint_id,
                        }
                    )
                    .execute()
                )

                reward_rows = reward_response.data or []

                if reward_rows:
                    reward = reward_rows[0]
                    reward_created = True

            except Exception as reward_error:
                print(
                    "Warning: Failed to create verification reward:",
                    reward_error
                )

        return {
            "success": True,
            "message": "Complaint verified successfully.",
            "complaint": updated_complaint,
            "reward": reward,
            "reward_created": reward_created,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Verify complaint error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify complaint: {str(error)}"
        )
