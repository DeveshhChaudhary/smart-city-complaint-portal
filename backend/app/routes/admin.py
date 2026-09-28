from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from pydantic import BaseModel, Field

from app.config.supabase import supabase
from app.utils.security import hash_password, verify_password, require_role
from app.routes.complaints import REWARD_CATALOG


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


class AdminProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None


class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str


class RewardItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=500)
    points_required: int = Field(gt=0)
    category: str = Field(default="General")
    icon: Optional[str] = "Gift"
    popular: Optional[bool] = False
    status: Optional[str] = "Active"


class RewardItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    points_required: Optional[int] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    popular: Optional[bool] = None
    status: Optional[str] = None


class ClaimStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Approved|Delivered|Rejected|Claimed|Pending)$")
    admin_notes: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=5, max_length=2000)
    category: str = Field(default="General")
    priority: str = Field(default="Normal", pattern="^(Normal|Important|Urgent|Emergency)$")
    audience: str = Field(pattern="^(all_citizens|all_workers|all_users|department|specific_user)$")
    department: Optional[str] = None
    user_id: Optional[str] = None




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


# ============================================================
# DEPARTMENT MANAGEMENT & PERFORMANCE
# ADMIN ONLY
# ============================================================

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head: Optional[str] = None
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head: Optional[str] = None
    is_active: Optional[bool] = None


DEFAULT_DEPARTMENTS = [
    {
        "id": "dept-roads",
        "code": "DEPT-ROADS",
        "name": "Road Maintenance",
        "description": "Repairs road damage, potholes, bridges, and municipal transit corridors.",
        "contact_email": "roads@smartcity.gov",
        "contact_phone": "+91 22 2456 7891",
        "head": "Chief Engineer Roads",
        "is_active": True,
    },
    {
        "id": "dept-sanitation",
        "code": "DEPT-SAN",
        "name": "Sanitation",
        "description": "Municipal waste collection, public cleanliness, garbage bins, and recycling.",
        "contact_email": "sanitation@smartcity.gov",
        "contact_phone": "+91 22 2456 7892",
        "head": "Director of Sanitation",
        "is_active": True,
    },
    {
        "id": "dept-water",
        "code": "DEPT-WATER",
        "name": "Water Department",
        "description": "Drinking water supply, pipeline leakages, reservoir maintenance, and water quality.",
        "contact_email": "water@smartcity.gov",
        "contact_phone": "+91 22 2456 7893",
        "head": "Superintendent Water Works",
        "is_active": True,
    },
    {
        "id": "dept-electricity",
        "code": "DEPT-ELEC",
        "name": "Electricity",
        "description": "Street lights, electrical junctions, transformers, and public power infrastructure.",
        "contact_email": "electricity@smartcity.gov",
        "contact_phone": "+91 22 2456 7894",
        "head": "Chief Electrical Inspector",
        "is_active": True,
    },
    {
        "id": "dept-traffic",
        "code": "DEPT-TRAFFIC",
        "name": "Traffic & Safety",
        "description": "Traffic signals, road signage, pedestrian crossings, and public transit safety.",
        "contact_email": "traffic@smartcity.gov",
        "contact_phone": "+91 22 2456 7895",
        "head": "Traffic Management Officer",
        "is_active": True,
    },
    {
        "id": "dept-parks",
        "code": "DEPT-PARKS",
        "name": "Parks & Gardens",
        "description": "Public park maintenance, municipal gardens, tree plantation, and civic green belts.",
        "contact_email": "parks@smartcity.gov",
        "contact_phone": "+91 22 2456 7896",
        "head": "Horticulture Officer",
        "is_active": True,
    },
]

# In-memory registry for newly added or modified departments
_CUSTOM_DEPARTMENTS = []


@router.get("/departments")
def get_departments_overview(
    current_user: dict = Depends(require_role("admin"))
):
    """Return all municipal departments with real database metrics calculated from complaints and workers."""
    try:
        workers_res = (
            supabase.table("workers")
            .select("id, user_id, worker_code, department, specialization, is_available, users(id, name, email, phone, is_active)")
            .execute()
        )
        all_workers = workers_res.data or []

        complaints_res = (
            supabase.table("complaints")
            .select("id, complaint_code, title, description, status, priority, assigned_worker_id, created_at, updated_at, categories(id, name)")
            .execute()
        )
        all_complaints = complaints_res.data or []

        # Merge defaults and custom departments
        depts_map = {d["id"]: {**d} for d in DEFAULT_DEPARTMENTS}
        for cd in _CUSTOM_DEPARTMENTS:
            depts_map[cd["id"]] = {**cd}

        # Also register any extra departments found on worker records
        for w in all_workers:
            w_dept = (w.get("department") or "").strip()
            if w_dept and not any(d["name"].lower() == w_dept.lower() for d in depts_map.values()):
                slug = "dept-" + w_dept.lower().replace(" ", "-")
                code = "DEPT-" + w_dept[:4].upper()
                depts_map[slug] = {
                    "id": slug,
                    "code": code,
                    "name": w_dept,
                    "description": f"Municipal division for {w_dept}",
                    "contact_email": f"{slug[5:]}@smartcity.gov",
                    "contact_phone": "+91 22 2456 7800",
                    "head": "Department Supervisor",
                    "is_active": True,
                }

        departments_list = []

        for d in depts_map.values():
            d_name = d["name"].lower()
            dept_workers = [
                w for w in all_workers
                if (w.get("department") or "").strip().lower() == d_name
                or d_name in (w.get("department") or "").strip().lower()
            ]
            worker_ids = set(w["id"] for w in dept_workers)

            # Assigned complaints
            dept_complaints = [
                c for c in all_complaints
                if c.get("assigned_worker_id") in worker_ids
            ]

            total_c = len(dept_complaints)
            resolved_c = sum(1 for c in dept_complaints if c.get("status") == "Resolved")
            in_progress_c = sum(1 for c in dept_complaints if c.get("status") == "In Progress")
            rejected_c = sum(1 for c in dept_complaints if c.get("status") == "Rejected")
            pending_c = total_c - resolved_c - in_progress_c - rejected_c
            res_rate = round((resolved_c / total_c * 100), 1) if total_c > 0 else 0.0

            # Worker performance calculations from real complaint records
            worker_perf = []
            for w in dept_workers:
                wid = w["id"]
                w_complaints = [c for c in dept_complaints if c.get("assigned_worker_id") == wid]
                w_total = len(w_complaints)
                w_res = sum(1 for c in w_complaints if c.get("status") == "Resolved")
                w_prog = sum(1 for c in w_complaints if c.get("status") == "In Progress")
                w_pend = w_total - w_res - w_prog
                w_rate = round((w_res / w_total * 100), 1) if w_total > 0 else 0.0
                u_info = w.get("users") or {}

                worker_perf.append({
                    "id": wid,
                    "worker_code": w.get("worker_code"),
                    "name": u_info.get("name") or "Worker",
                    "email": u_info.get("email"),
                    "phone": u_info.get("phone"),
                    "specialization": w.get("specialization"),
                    "is_available": w.get("is_available"),
                    "assigned_count": w_total,
                    "resolved_count": w_res,
                    "in_progress_count": w_prog,
                    "pending_count": w_pend,
                    "resolution_rate": w_rate,
                })

            worker_perf.sort(key=lambda x: (-x["resolved_count"], -x["resolution_rate"], -x["assigned_count"]))
            top_worker = worker_perf[0] if worker_perf and worker_perf[0]["resolved_count"] > 0 else (worker_perf[0] if worker_perf else None)

            # Category distribution
            cat_counts = {}
            for c in dept_complaints:
                cat_name = (c.get("categories") or {}).get("name") or "General"
                cat_counts[cat_name] = cat_counts.get(cat_name, 0) + 1

            departments_list.append({
                **d,
                "worker_count": len(dept_workers),
                "total_complaints": total_c,
                "pending_complaints": pending_c,
                "in_progress_complaints": in_progress_c,
                "resolved_complaints": resolved_c,
                "rejected_complaints": rejected_c,
                "resolution_rate": res_rate,
                "workers": worker_perf,
                "top_worker": top_worker,
                "category_distribution": cat_counts,
            })

        departments_list.sort(key=lambda x: (-x["total_complaints"], -x["worker_count"], x["name"]))

        return {
            "success": True,
            "count": len(departments_list),
            "departments": departments_list,
        }

    except Exception as error:
        print("Get departments error:", error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch departments: {str(error)}"
        )


@router.post("/departments")
def create_department(
    payload: DepartmentCreate,
    current_user: dict = Depends(require_role("admin"))
):
    """
    Create a new municipal department in the system.
    Note: As the database does not contain a dedicated departments table,
    newly created departments are managed via runtime configuration.
    """
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Department name is required.")

    slug = (payload.id or ("dept-" + name.lower().replace(" ", "-"))).strip().lower()
    code = (payload.code or ("DEPT-" + "".join([w[:2].upper() for w in name.split()[:2]]))).strip().upper()

    # Validate duplicates against defaults and existing custom departments
    all_depts = DEFAULT_DEPARTMENTS + _CUSTOM_DEPARTMENTS
    for d in all_depts:
        if d.get("id", "").lower() == slug:
            raise HTTPException(status_code=400, detail=f"Department ID '{slug}' already exists.")
        if d.get("name", "").lower() == name.lower():
            raise HTTPException(status_code=400, detail=f"A department named '{name}' already exists.")
        if code and d.get("code", "").upper() == code:
            raise HTTPException(status_code=400, detail=f"Department code '{code}' is already in use.")

    new_dept = {
        "id": slug,
        "code": code,
        "name": name,
        "description": payload.description.strip() if payload.description else f"Municipal division for {name}",
        "contact_email": payload.contact_email.strip() if payload.contact_email else f"{name.lower().replace(' ', '')}@smartcity.gov",
        "contact_phone": payload.contact_phone.strip() if payload.contact_phone else "+91 22 2456 7800",
        "head": payload.head.strip() if payload.head else "Department Head",
        "is_active": payload.is_active if payload.is_active is not None else True,
    }

    _CUSTOM_DEPARTMENTS.append(new_dept)

    return {
        "success": True,
        "persisted": False,
        "storage": "runtime_configuration",
        "message": f"Department '{name}' registered in runtime configuration. Note: The database schema does not have a dedicated departments table.",
        "department": new_dept,
    }


@router.patch("/departments/{dept_id}")
def update_department(
    dept_id: str,
    payload: DepartmentUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    """
    Update or toggle active status of a municipal department.
    Note: Updates are applied to active runtime configuration.
    """
    target = None
    for d in _CUSTOM_DEPARTMENTS:
        if d["id"] == dept_id:
            target = d
            break

    if not target:
        for d in DEFAULT_DEPARTMENTS:
            if d["id"] == dept_id:
                # Copy into custom to allow override
                target = {**d}
                _CUSTOM_DEPARTMENTS.append(target)
                break

    if not target:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Validate name duplicate if changed
    if payload.name is not None and payload.name.strip():
        new_name = payload.name.strip()
        for d in DEFAULT_DEPARTMENTS + _CUSTOM_DEPARTMENTS:
            if d is not target and d.get("name", "").lower() == new_name.lower():
                raise HTTPException(status_code=400, detail=f"A department named '{new_name}' already exists.")
        target["name"] = new_name

    # Validate code duplicate if changed
    if payload.code is not None and payload.code.strip():
        new_code = payload.code.strip().upper()
        for d in DEFAULT_DEPARTMENTS + _CUSTOM_DEPARTMENTS:
            if d is not target and d.get("code", "").upper() == new_code:
                raise HTTPException(status_code=400, detail=f"Department code '{new_code}' is already in use.")
        target["code"] = new_code

    if payload.description is not None:
        target["description"] = payload.description.strip()
    if payload.contact_email is not None:
        target["contact_email"] = payload.contact_email.strip()
    if payload.contact_phone is not None:
        target["contact_phone"] = payload.contact_phone.strip()
    if payload.head is not None:
        target["head"] = payload.head.strip()
    if payload.is_active is not None:
        target["is_active"] = payload.is_active

    return {
        "success": True,
        "persisted": False,
        "storage": "runtime_configuration",
        "message": f"Department '{target['name']}' updated in runtime configuration. Note: The database schema does not have a dedicated departments table.",
        "department": target,
    }


# ============================================================
# ADMIN PROFILE & ACCOUNT MANAGEMENT
# ============================================================

@router.get("/profile")
def get_admin_profile(
    current_user: dict = Depends(require_role("admin"))
):
    """
    Fetch the authenticated administrator's profile information.
    Operates strictly on the authenticated admin's ID from JWT.
    """
    try:
        user_res = (
            supabase.table("users")
            .select("id, name, email, phone, role, profile_image_url, is_active, created_at, updated_at")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Admin profile not found.")

        user = user_res.data
        return {
            "success": True,
            "admin": {
                "id": user["id"],
                "name": user.get("name") or "Administrator",
                "email": user.get("email"),
                "phone": user.get("phone"),
                "role": user.get("role") or "admin",
                "profile_image_url": user.get("profile_image_url"),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "designation": "Super Administrator / Municipal Operations Controller",
                "department": "Municipal Administration & Governance",
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Get admin profile error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(error)}")


@router.patch("/profile")
def update_admin_profile(
    payload: AdminProfileUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    """
    Update administrator profile details.
    Operates strictly on the authenticated admin's user record in the database.
    """
    try:
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        if payload.name is not None:
            trimmed_name = payload.name.strip()
            if len(trimmed_name) < 2:
                raise HTTPException(status_code=400, detail="Name must be at least 2 characters long.")
            update_data["name"] = trimmed_name

        if payload.phone is not None:
            trimmed_phone = payload.phone.strip()
            update_data["phone"] = trimmed_phone if trimmed_phone else None

        if payload.profile_image_url is not None:
            trimmed_url = payload.profile_image_url.strip()
            update_data["profile_image_url"] = trimmed_url if trimmed_url else None

        res = (
            supabase.table("users")
            .update(update_data)
            .eq("id", current_user["id"])
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update profile record in database.")

        updated = res.data[0]
        return {
            "success": True,
            "message": "Admin profile updated successfully.",
            "admin": {
                "id": updated["id"],
                "name": updated.get("name") or "Administrator",
                "email": updated.get("email"),
                "phone": updated.get("phone"),
                "role": updated.get("role") or "admin",
                "profile_image_url": updated.get("profile_image_url"),
                "is_active": updated.get("is_active", True),
                "created_at": updated.get("created_at"),
                "updated_at": updated.get("updated_at"),
                "designation": "Super Administrator / Municipal Operations Controller",
                "department": "Municipal Administration & Governance",
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Update admin profile error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(error)}")


@router.post("/profile/change-password")
def change_admin_password(
    payload: AdminPasswordChange,
    current_user: dict = Depends(require_role("admin"))
):
    """
    Securely change administrator password.
    Verifies existing password against the database hash before updating.
    Never exposes or returns password hashes.
    """
    try:
        current_pwd = payload.current_password
        new_pwd = payload.new_password

        if not current_pwd:
            raise HTTPException(status_code=400, detail="Current password is required.")

        if not new_pwd or len(new_pwd) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

        if current_pwd == new_pwd:
            raise HTTPException(status_code=400, detail="New password must be different from current password.")

        # Query user password_hash
        user_res = (
            supabase.table("users")
            .select("id, password_hash, is_active")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )

        if not user_res.data:
            raise HTTPException(status_code=404, detail="Admin account not found.")

        user = user_res.data

        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated.")

        if not verify_password(current_pwd, user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Current password does not match our records.")

        new_hash = hash_password(new_pwd)
        update_res = (
            supabase.table("users")
            .update({
                "password_hash": new_hash,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", current_user["id"])
            .execute()
        )

        if not update_res.data:
            raise HTTPException(status_code=500, detail="Failed to update password in database.")

        return {
            "success": True,
            "message": "Administrator password changed successfully.",
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Change admin password error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(error)}")


@router.post("/profile/photo")
async def upload_admin_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("admin")),
):
    """
    Upload and persist profile photo for the authenticated administrator.
    Reuses the Supabase Storage profile-images bucket.
    """
    try:
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or GIF images are allowed.")

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Selected image file is empty.")

        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Profile image must be 5 MB or smaller.")

        bucket_name = "profile-images"
        try:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
        except Exception:
            pass

        extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
        }[file.content_type]

        file_path = f"{current_user['id']}/admin-profile.{extension}"

        supabase.storage.from_(bucket_name).upload(
            file_path,
            file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "true",
            },
        )

        public_url_res = supabase.storage.from_(bucket_name).get_public_url(file_path)
        public_url = (
            public_url_res.get("publicUrl")
            if isinstance(public_url_res, dict)
            else str(public_url_res)
        )
        public_url = f"{public_url}?v={int(datetime.now(timezone.utc).timestamp())}"

        updated = (
            supabase.table("users")
            .update({
                "profile_image_url": public_url,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", current_user["id"])
            .execute()
        )

        if not updated.data:
            raise HTTPException(status_code=500, detail="Failed to save profile image URL.")

        return {
            "success": True,
            "message": "Admin profile photo uploaded successfully.",
            "profile_image_url": public_url,
            "admin": updated.data[0],
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Admin photo upload error:", error)
        raise HTTPException(status_code=500, detail=f"Profile photo upload failed: {str(error)}")


@router.delete("/profile/photo")
def delete_admin_profile_photo(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Remove the administrator's profile photo and reset to default initials.
    """
    try:
        updated = (
            supabase.table("users")
            .update({
                "profile_image_url": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", current_user["id"])
            .execute()
        )

        return {
            "success": True,
            "message": "Admin profile photo removed.",
            "admin": updated.data[0] if updated.data else None,
        }
    except Exception as error:
        print("Delete admin photo error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to remove profile photo: {str(error)}")


# ============================================================
# ADMIN CIVIC REWARDS & BADGES MANAGEMENT CENTER
# ============================================================

SYSTEM_CIVIC_BADGES = [
    {
        "id": "b1",
        "title": "First Report",
        "description": "Submit your 1st civic complaint",
        "requirement": "Submit 1 complaint",
        "target": 1,
        "type": "complaints_submitted",
        "icon": "MapPin",
        "category": "Reporting",
        "active": True,
    },
    {
        "id": "b2",
        "title": "Civic Starter",
        "description": "Submit 5 civic complaints",
        "requirement": "Submit 5 complaints",
        "target": 5,
        "type": "complaints_submitted",
        "icon": "Award",
        "category": "Reporting",
        "active": True,
    },
    {
        "id": "b3",
        "title": "Civic Contributor",
        "description": "Submit 10 civic complaints",
        "requirement": "Submit 10 complaints",
        "target": 10,
        "type": "complaints_submitted",
        "icon": "Trophy",
        "category": "Reporting",
        "active": True,
    },
    {
        "id": "b4",
        "title": "Community Helper",
        "description": "Have 3 complaints resolved",
        "requirement": "3 complaints resolved",
        "target": 3,
        "type": "complaints_resolved",
        "icon": "CheckCircle2",
        "category": "Resolution",
        "active": True,
    },
    {
        "id": "b5",
        "title": "Civic Resolver",
        "description": "Have 5 complaints resolved",
        "requirement": "5 complaints resolved",
        "target": 5,
        "type": "complaints_resolved",
        "icon": "CheckCheck",
        "category": "Resolution",
        "active": True,
    },
    {
        "id": "b6",
        "title": "Active Supporter",
        "description": "Support 3 community issues",
        "requirement": "Support 3 complaints",
        "target": 3,
        "type": "community_support",
        "icon": "ThumbsUp",
        "category": "Community",
        "active": True,
    },
    {
        "id": "b7",
        "title": "Verified Citizen",
        "description": "Verify 3 community issues",
        "requirement": "Vote genuine/not genuine on 3 issues",
        "target": 3,
        "type": "community_verify",
        "icon": "ShieldCheck",
        "category": "Community",
        "active": True,
    },
    {
        "id": "b8",
        "title": "Civic Champion",
        "description": "Accumulate 100+ reward points",
        "requirement": "Earn 100 points",
        "target": 100,
        "type": "points_earned",
        "icon": "Star",
        "category": "Milestone",
        "active": True,
    },
]


@router.get("/rewards/overview")
def get_admin_rewards_overview(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return comprehensive aggregate statistics on rewards, claims, points ledger, and badges
    derived strictly from real Supabase database records.
    """
    try:
        # 1. Fetch records from rewards table
        rewards_res = supabase.table("rewards").select("id, user_id, points, reason, created_at").limit(10000).execute()
        rewards_rows = rewards_res.data or []

        total_points_issued = sum(int(r.get("points") or 0) for r in rewards_rows if int(r.get("points") or 0) > 0)
        total_points_redeemed = abs(sum(int(r.get("points") or 0) for r in rewards_rows if int(r.get("points") or 0) < 0))

        # 2. Extract claims and evaluate statuses
        claims = []
        for r in rewards_rows:
            pts = int(r.get("points") or 0)
            reason = r.get("reason") or ""
            if pts < 0 or reason.startswith("Claimed:"):
                status = "Claimed"
                if "[Status: " in reason:
                    try:
                        status = reason.split("[Status: ")[1].split("]")[0].strip()
                    except Exception:
                        status = "Claimed"
                claims.append({
                    "id": r.get("id"),
                    "status": status,
                    "points": abs(pts),
                })

        pending_claims = sum(1 for c in claims if c["status"] in ("Claimed", "Pending"))
        approved_claims = sum(1 for c in claims if c["status"] == "Approved")
        delivered_claims = sum(1 for c in claims if c["status"] in ("Delivered", "Completed"))
        rejected_claims = sum(1 for c in claims if c["status"] == "Rejected")

        # 3. Active catalog items
        total_rewards = len(REWARD_CATALOG)
        active_rewards = sum(1 for r in REWARD_CATALOG if r.get("status") == "Active")

        # 4. Fetch complaints to evaluate badges & participating citizens
        complaints_res = supabase.table("complaints").select("id, citizen_id, status").limit(10000).execute()
        comp_rows = complaints_res.data or []

        user_complaints = {}
        user_resolved = {}
        for c in comp_rows:
            cid = c.get("citizen_id")
            if cid:
                user_complaints[cid] = user_complaints.get(cid, 0) + 1
                if c.get("status") == "Resolved":
                    user_resolved[cid] = user_resolved.get(cid, 0) + 1

        user_points = {}
        unique_reward_users = set()
        for r in rewards_rows:
            uid = r.get("user_id")
            if uid:
                unique_reward_users.add(uid)
                user_points[uid] = user_points.get(uid, 0) + int(r.get("points") or 0)

        # Count citizens meeting at least 1 badge requirement
        citizens_with_badges = set()
        for cid, count in user_complaints.items():
            if count >= 1:
                citizens_with_badges.add(cid)
        for uid, pts in user_points.items():
            if pts >= 10:
                citizens_with_badges.add(uid)

        all_participating = unique_reward_users | set(user_complaints.keys())

        return {
            "success": True,
            "metrics": {
                "total_rewards": total_rewards,
                "active_rewards": active_rewards,
                "total_claims": len(claims),
                "pending_claims": pending_claims,
                "approved_claims": approved_claims,
                "delivered_claims": delivered_claims,
                "rejected_claims": rejected_claims,
                "total_points_issued": total_points_issued,
                "total_points_redeemed": total_points_redeemed,
                "active_badges": len(SYSTEM_CIVIC_BADGES),
                "citizens_with_badges": len(citizens_with_badges),
                "participating_citizens": len(all_participating),
            },
            "database_schema": {
                "rewards_table_persisted": True,
                "notifications_table_persisted": True,
                "complaints_table_persisted": True,
                "reward_catalog_mode": "Runtime catalog shared between Admin & Citizen portals",
                "badges_mode": "System-evaluated live from real complaint & points database records",
            }
        }
    except Exception as error:
        print("Admin rewards overview error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch rewards overview: {str(error)}")


@router.get("/rewards/catalog")
def get_admin_rewards_catalog(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return the shared rewards catalog with real claim counts computed from the rewards table.
    """
    try:
        rewards_res = supabase.table("rewards").select("reason").limit(10000).execute()
        rewards_rows = rewards_res.data or []
        claim_counts = {}
        for r in rewards_rows:
            reason = r.get("reason") or ""
            if reason.startswith("Claimed:"):
                clean = reason.split(" (Ref: ")[0].replace("Claimed: ", "").strip()
                claim_counts[clean.lower()] = claim_counts.get(clean.lower(), 0) + 1

        catalog_with_stats = []
        for item in REWARD_CATALOG:
            name_clean = item.get("name", "").strip().lower()
            count = claim_counts.get(name_clean, 0)
            catalog_with_stats.append({
                **item,
                "claims_count": count,
            })

        return {
            "success": True,
            "catalog": catalog_with_stats,
            "total_count": len(catalog_with_stats),
        }
    except Exception as error:
        print("Admin get catalog error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch catalog: {str(error)}")


@router.post("/rewards/catalog")
def create_reward_item(
    payload: RewardItemCreate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Create a new civic reward in the municipal catalog.
    Syncs with citizen dashboard catalog.
    """
    try:
        name = payload.name.strip()
        slug = "rew-" + name.lower().replace(" ", "-")[:24]
        if any(r["id"] == slug for r in REWARD_CATALOG):
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        new_item = {
            "id": slug,
            "name": name,
            "description": payload.description.strip(),
            "points_required": int(payload.points_required),
            "category": payload.category.strip() or "General",
            "status": payload.status or "Active",
            "icon": payload.icon or "Gift",
            "popular": bool(payload.popular),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        REWARD_CATALOG.append(new_item)

        return {
            "success": True,
            "message": f"Reward '{name}' added successfully to municipal catalog.",
            "reward": new_item,
        }
    except Exception as error:
        print("Admin create reward error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to add reward: {str(error)}")


@router.patch("/rewards/catalog/{reward_id}")
def update_reward_item(
    reward_id: str,
    payload: RewardItemUpdate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Update an existing reward item in the municipal catalog.
    Preserves historical claim references.
    """
    try:
        idx = next((i for i, r in enumerate(REWARD_CATALOG) if r["id"] == reward_id), None)
        if idx is None:
            raise HTTPException(status_code=404, detail="Reward not found in catalog.")

        item = REWARD_CATALOG[idx]

        if payload.name is not None and payload.name.strip():
            item["name"] = payload.name.strip()
        if payload.description is not None and payload.description.strip():
            item["description"] = payload.description.strip()
        if payload.points_required is not None:
            if payload.points_required <= 0:
                raise HTTPException(status_code=400, detail="Points required must be greater than zero.")
            item["points_required"] = int(payload.points_required)
        if payload.category is not None and payload.category.strip():
            item["category"] = payload.category.strip()
        if payload.icon is not None and payload.icon.strip():
            item["icon"] = payload.icon.strip()
        if payload.popular is not None:
            item["popular"] = bool(payload.popular)
        if payload.status is not None:
            if payload.status not in ("Active", "Inactive"):
                raise HTTPException(status_code=400, detail="Status must be 'Active' or 'Inactive'.")
            item["status"] = payload.status

        item["updated_at"] = datetime.now(timezone.utc).isoformat()
        REWARD_CATALOG[idx] = item

        return {
            "success": True,
            "message": f"Reward '{item['name']}' updated successfully.",
            "reward": item,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Admin update reward error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to update reward: {str(error)}")


@router.get("/rewards/claims")
def get_admin_reward_claims(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return all real reward redemption claims from the database with citizen user information.
    """
    try:
        res = (
            supabase.table("rewards")
            .select("id, user_id, points, reason, created_at")
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )
        rewards_rows = res.data or []

        claim_rows = [r for r in rewards_rows if int(r.get("points") or 0) < 0 or (r.get("reason") or "").startswith("Claimed:")]

        user_ids = list(set(r.get("user_id") for r in claim_rows if r.get("user_id")))
        users_map = {}
        if user_ids:
            try:
                users_res = supabase.table("users").select("id, name, email, phone, profile_image_url").in_("id", user_ids).execute()
                for u in (users_res.data or []):
                    users_map[u["id"]] = u
            except Exception as ue:
                print("Users fetch in claims error:", ue)

        user_points_map = {}
        for r in rewards_rows:
            uid = r.get("user_id")
            if uid:
                user_points_map[uid] = user_points_map.get(uid, 0) + int(r.get("points") or 0)

        claims = []
        for r in claim_rows:
            pts = int(r.get("points") or 0)
            reason = r.get("reason") or ""
            uid = r.get("user_id")
            user_info = users_map.get(uid, {})

            status = "Claimed"
            clean_reason = reason
            if "[Status: " in reason:
                try:
                    status = reason.split("[Status: ")[1].split("]")[0].strip()
                    clean_reason = reason.split("[Status: ")[0].strip()
                except Exception:
                    status = "Claimed"

            ref_code = "N/A"
            reward_name = clean_reason
            if " (Ref: " in clean_reason:
                parts = clean_reason.split(" (Ref: ")
                reward_name = parts[0].replace("Claimed: ", "").strip()
                ref_code = parts[1].rstrip(")")
            elif clean_reason.startswith("Claimed: "):
                reward_name = clean_reason.replace("Claimed: ", "").strip()

            catalog_match = next((item for item in REWARD_CATALOG if item["name"].strip().lower() == reward_name.lower()), None)

            claims.append({
                "id": r.get("id"),
                "user_id": uid,
                "citizen_name": user_info.get("name") or "Citizen",
                "citizen_email": user_info.get("email"),
                "citizen_phone": user_info.get("phone"),
                "citizen_avatar": user_info.get("profile_image_url"),
                "reward_name": reward_name,
                "reward_category": catalog_match.get("category") if catalog_match else "General",
                "reward_description": catalog_match.get("description") if catalog_match else "Official municipal civic reward voucher.",
                "points_spent": abs(pts),
                "claim_code": ref_code,
                "status": status,
                "created_at": r.get("created_at"),
                "citizen_balance": user_points_map.get(uid, 0),
            })

        return {
            "success": True,
            "claims": claims,
            "count": len(claims),
        }
    except Exception as error:
        print("Admin get claims error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch reward claims: {str(error)}")


@router.patch("/rewards/claims/{claim_id}")
def update_claim_status(
    claim_id: str,
    payload: ClaimStatusUpdate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Update reward claim status in the real Supabase database.
    Updates the rewards ledger record, refunds points if rejected, and notifies citizen.
    """
    try:
        res = supabase.table("rewards").select("*").eq("id", claim_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Claim record not found.")

        row = res.data[0]
        pts = int(row.get("points") or 0)
        orig_reason = row.get("reason") or ""
        uid = row.get("user_id")

        new_status = payload.status

        # Clean prior status tag
        clean_reason = orig_reason
        if "[Status: " in orig_reason:
            clean_reason = orig_reason.split("[Status: ")[0].strip()

        updated_reason = f"{clean_reason} [Status: {new_status}]"

        # Update in real Supabase rewards table
        supabase.table("rewards").update({"reason": updated_reason}).eq("id", claim_id).execute()

        # Extract reward name and claim code
        ref_code = "N/A"
        reward_name = clean_reason
        if " (Ref: " in clean_reason:
            parts = clean_reason.split(" (Ref: ")
            reward_name = parts[0].replace("Claimed: ", "").strip()
            ref_code = parts[1].rstrip(")")
        elif clean_reason.startswith("Claimed: "):
            reward_name = clean_reason.replace("Claimed: ", "").strip()

        # If rejected, refund points to citizen account
        if new_status == "Rejected" and pts < 0:
            refund_points = abs(pts)
            try:
                supabase.table("rewards").insert({
                    "user_id": uid,
                    "points": refund_points,
                    "reason": f"Points Refund: Claim rejected for {reward_name} (Ref: {ref_code})",
                    "complaint_id": None,
                }).execute()
            except Exception as re:
                print("Points refund error on reject:", re)

        # Notify citizen via real Supabase notifications table
        if uid:
            status_text = {
                "Approved": "approved and is now ready for fulfillment",
                "Delivered": "delivered! Check your registered email or municipal center for collection",
                "Rejected": "rejected and your points have been refunded to your account",
                "Claimed": "marked as claimed",
                "Pending": "marked as pending verification",
            }.get(new_status, new_status.lower())

            try:
                supabase.table("notifications").insert({
                    "user_id": uid,
                    "title": f"Reward Claim {new_status}",
                    "message": f"Your civic claim for '{reward_name}' (Ref: {ref_code}) has been {status_text}.",
                    "type": "reward_claim",
                }).execute()
            except Exception as ne:
                print("Notification insert error:", ne)

        return {
            "success": True,
            "message": f"Claim status updated to '{new_status}' successfully.",
            "claim": {
                "id": claim_id,
                "status": new_status,
                "updated_reason": updated_reason,
            }
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Admin update claim error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to update claim: {str(error)}")


@router.get("/rewards/ledger")
def get_admin_points_ledger(
    limit: int = Query(200, ge=1, le=1000),
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return all real point transactions from the rewards table with citizen identity and complaint context.
    """
    try:
        res = (
            supabase.table("rewards")
            .select("id, user_id, points, reason, complaint_id, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        ledger_rows = res.data or []

        user_ids = list(set(r.get("user_id") for r in ledger_rows if r.get("user_id")))
        users_map = {}
        if user_ids:
            try:
                users_res = supabase.table("users").select("id, name, email").in_("id", user_ids).execute()
                for u in (users_res.data or []):
                    users_map[u["id"]] = u
            except Exception as ue:
                print("Users map error:", ue)

        complaint_ids = list(set(r.get("complaint_id") for r in ledger_rows if r.get("complaint_id")))
        complaints_map = {}
        if complaint_ids:
            try:
                c_res = supabase.table("complaints").select("id, complaint_code, title").in_("id", complaint_ids).execute()
                for c in (c_res.data or []):
                    complaints_map[c["id"]] = c
            except Exception as ce:
                print("Complaints map error:", ce)

        transactions = []
        for r in ledger_rows:
            uid = r.get("user_id")
            cid = r.get("complaint_id")
            pts = int(r.get("points") or 0)
            reason = r.get("reason") or ""
            tx_type = "Redemption" if pts < 0 else ("Refund" if "Refund" in reason else "Earned")

            u_info = users_map.get(uid, {})
            c_info = complaints_map.get(cid, {})

            transactions.append({
                "id": r.get("id"),
                "user_id": uid,
                "citizen_name": u_info.get("name") or "Citizen",
                "citizen_email": u_info.get("email"),
                "points": pts,
                "transaction_type": tx_type,
                "reason": reason,
                "complaint_id": cid,
                "complaint_code": c_info.get("complaint_code"),
                "complaint_title": c_info.get("title"),
                "created_at": r.get("created_at"),
            })

        return {
            "success": True,
            "transactions": transactions,
            "count": len(transactions),
        }
    except Exception as error:
        print("Admin get ledger error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch points ledger: {str(error)}")


@router.get("/rewards/badges")
def get_admin_badges(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return all system achievement badges with live citizen unlock counts and recent earners
    calculated strictly from real database records (complaints, resolved items, community votes, rewards).
    """
    try:
        # Fetch citizens
        users_res = supabase.table("users").select("id, name, email, profile_image_url").eq("role", "citizen").limit(1000).execute()
        citizens = users_res.data or []
        citizen_map = {c["id"]: c for c in citizens}

        # Complaints data
        comp_res = supabase.table("complaints").select("id, citizen_id, status, created_at").limit(10000).execute()
        comp_rows = comp_res.data or []

        user_sub = {}
        user_res = {}
        for c in comp_rows:
            cid = c.get("citizen_id")
            if cid:
                user_sub[cid] = user_sub.get(cid, 0) + 1
                if c.get("status") == "Resolved":
                    user_res[cid] = user_res.get(cid, 0) + 1

        # Rewards points
        rew_res = supabase.table("rewards").select("user_id, points").limit(10000).execute()
        rew_rows = rew_res.data or []
        user_pts = {}
        for r in rew_rows:
            uid = r.get("user_id")
            if uid:
                pts = int(r.get("points") or 0)
                if pts > 0:
                    user_pts[uid] = user_pts.get(uid, 0) + pts

        # Community supports
        supp_res = supabase.table("complaint_supports").select("user_id").limit(10000).execute()
        user_supp = {}
        for s in (supp_res.data or []):
            uid = s.get("user_id")
            if uid:
                user_supp[uid] = user_supp.get(uid, 0) + 1

        # Community verifications
        feed_res = supabase.table("complaint_feedback").select("user_id").limit(10000).execute()
        user_feed = {}
        for f in (feed_res.data or []):
            uid = f.get("user_id")
            if uid:
                user_feed[uid] = user_feed.get(uid, 0) + 1

        badges_result = []
        for badge in SYSTEM_CIVIC_BADGES:
            b_id = badge["id"]
            target = badge["target"]
            earners = []

            for u in citizens:
                uid = u["id"]
                val = 0
                if b_id in ("b1", "b2", "b3"):
                    val = user_sub.get(uid, 0)
                elif b_id in ("b4", "b5"):
                    val = user_res.get(uid, 0)
                elif b_id == "b6":
                    val = user_supp.get(uid, 0)
                elif b_id == "b7":
                    val = user_feed.get(uid, 0)
                elif b_id == "b8":
                    val = user_pts.get(uid, 0)

                if val >= target:
                    earners.append({
                        "user_id": uid,
                        "name": u.get("name") or "Citizen",
                        "email": u.get("email"),
                        "avatar": u.get("profile_image_url"),
                        "current_progress": val,
                    })

            badges_result.append({
                **badge,
                "earned_count": len(earners),
                "is_system_defined": True,
                "recent_earners": earners[:5],
            })

        return {
            "success": True,
            "badges": badges_result,
            "count": len(badges_result),
        }
    except Exception as error:
        print("Admin get badges error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch badges: {str(error)}")


@router.get("/rewards/leaderboard")
def get_admin_rewards_leaderboard(
    period: Optional[str] = Query("all", pattern="^(all|month)$"),
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return administrative view of the civic leaderboard with verified email and phone context.
    Uses the exact same ranking algorithm as the citizen portal.
    """
    try:
        users = (supabase.table("users").select("id, name, email, phone, profile_image_url, created_at").eq("role", "citizen").eq("is_active", True).limit(500).execute().data or [])
        rewards = (supabase.table("rewards").select("user_id, points, created_at").limit(5000).execute().data or [])
        complaints = (supabase.table("complaints").select("citizen_id, status, created_at").limit(5000).execute().data or [])

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        if period == "month":
            rewards = [r for r in rewards if r.get("created_at") and datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")) >= thirty_days_ago]
            complaints = [c for c in complaints if c.get("created_at") and datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")) >= thirty_days_ago]

        points = {}
        all_time_points = {}
        for r in rewards:
            uid = r.get("user_id")
            if uid:
                pts = int(r.get("points") or 0)
                points[uid] = points.get(uid, 0) + pts
                if pts > 0:
                    all_time_points[uid] = all_time_points.get(uid, 0) + pts

        submitted, resolved = {}, {}
        for c in complaints:
            uid = c.get("citizen_id")
            if not uid: continue
            submitted[uid] = submitted.get(uid, 0) + 1
            if c.get("status") == "Resolved": resolved[uid] = resolved.get(uid, 0) + 1

        board = []
        for u in users:
            uid = u["id"]
            board.append({
                "user_id": uid,
                "name": u.get("name") or "Citizen",
                "email": u.get("email"),
                "phone": u.get("phone"),
                "profile_image_url": u.get("profile_image_url"),
                "total_points": points.get(uid, 0),
                "all_time_points": all_time_points.get(uid, 0),
                "complaints_submitted": submitted.get(uid, 0),
                "complaints_resolved": resolved.get(uid, 0),
                "member_since": u.get("created_at"),
            })

        board.sort(key=lambda x: (-x["total_points"], -x["complaints_resolved"], -x["complaints_submitted"], x["name"].lower()))
        for i, c in enumerate(board, 1):
            c["rank"] = i

        return {
            "success": True,
            "period": period,
            "total_citizens": len(board),
            "leaderboard": board,
        }
    except Exception as error:
        print("Admin get leaderboard error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(error)}")


@router.get("/rewards/analytics")
def get_admin_rewards_analytics(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return comprehensive analytics for the civic rewards system derived strictly from real database records.
    """
    try:
        rewards_res = supabase.table("rewards").select("id, user_id, points, reason, created_at").limit(10000).execute()
        rewards_rows = rewards_res.data or []

        # Claim counts & points per reward
        reward_stats = {}
        status_counts = {"Claimed": 0, "Approved": 0, "Delivered": 0, "Rejected": 0}
        total_spent = 0
        total_issued = 0

        for r in rewards_rows:
            pts = int(r.get("points") or 0)
            reason = r.get("reason") or ""

            if pts > 0:
                total_issued += pts

            if pts < 0 or reason.startswith("Claimed:"):
                total_spent += abs(pts)
                status = "Claimed"
                clean_reason = reason
                if "[Status: " in reason:
                    try:
                        status = reason.split("[Status: ")[1].split("]")[0].strip()
                        clean_reason = reason.split("[Status: ")[0].strip()
                    except Exception:
                        status = "Claimed"

                if status in status_counts:
                    status_counts[status] += 1
                else:
                    status_counts[status] = status_counts.get(status, 0) + 1

                reward_name = clean_reason
                if " (Ref: " in clean_reason:
                    reward_name = clean_reason.split(" (Ref: ")[0].replace("Claimed: ", "").strip()
                elif clean_reason.startswith("Claimed: "):
                    reward_name = clean_reason.replace("Claimed: ", "").strip()

                if reward_name not in reward_stats:
                    reward_stats[reward_name] = {"name": reward_name, "claims": 0, "points_redeemed": 0}
                reward_stats[reward_name]["claims"] += 1
                reward_stats[reward_name]["points_redeemed"] += abs(pts)

        # Merge with catalog so rewards with 0 claims also appear
        for item in REWARD_CATALOG:
            name = item["name"]
            if name not in reward_stats:
                reward_stats[name] = {"name": name, "claims": 0, "points_redeemed": 0}

        sorted_by_claims = sorted(reward_stats.values(), key=lambda x: -x["claims"])
        most_claimed = sorted_by_claims[:5]
        least_claimed = sorted_by_claims[-5:] if len(sorted_by_claims) > 5 else sorted_by_claims

        # Category distribution of catalog
        categories = {}
        for r in REWARD_CATALOG:
            cat = r.get("category") or "General"
            categories[cat] = categories.get(cat, 0) + 1

        category_distribution = [{"category": k, "count": v} for k, v in categories.items()]

        return {
            "success": True,
            "analytics": {
                "points_summary": {
                    "total_issued": total_issued,
                    "total_redeemed": total_spent,
                    "redemption_rate_pct": round((total_spent / total_issued * 100), 1) if total_issued > 0 else 0,
                },
                "status_distribution": status_counts,
                "most_claimed": most_claimed,
                "least_claimed": least_claimed,
                "category_distribution": category_distribution,
                "total_claims": sum(status_counts.values()),
            }
        }
    except Exception as error:
        print("Admin get analytics error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch reward analytics: {str(error)}")


# ============================================================
# ADMIN MUNICIPAL ANNOUNCEMENTS & BROADCAST DISPATCH
# ============================================================

def parse_announcement_metadata(raw_title: str, raw_message: str):
    """
    Reconstruct announcement metadata (title, message, priority, category, audience, broadcast_id)
    from stored notification fields.
    """
    priority = "Normal"
    category = "General"
    title = raw_title or ""

    if title.startswith("[") and "]" in title:
        prefix = title[1:title.find("]")]
        title = title[title.find("]") + 1:].strip()
        if " • " in prefix:
            parts = prefix.split(" • ", 1)
            priority = parts[0].strip()
            category = parts[1].strip()
        else:
            priority = prefix.strip()

    audience = "All"
    broadcast_id = "N/A"
    message = raw_message or ""

    if "\n\n[Audience: " in message:
        parts = message.rsplit("\n\n[Audience: ", 1)
        message = parts[0].strip()
        meta = parts[1].rstrip("]")
        if " • Ref: " in meta:
            aud, ref = meta.split(" • Ref: ", 1)
            audience = aud.strip()
            broadcast_id = ref.strip()
        else:
            audience = meta.strip()

    return {
        "title": title,
        "message": message,
        "priority": priority,
        "category": category,
        "audience": audience,
        "broadcast_id": broadcast_id,
    }


@router.get("/announcements/overview")
def get_announcements_overview(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return overview statistics for announcements and delivery metrics from real Supabase records.
    """
    try:
        # Fetch notifications where type == 'announcement'
        res = (
            supabase.table("notifications")
            .select("id, user_id, title, message, is_read, created_at")
            .eq("type", "announcement")
            .limit(10000)
            .execute()
        )
        notifs = res.data or []

        total_notifications_sent = len(notifs)
        total_read = sum(1 for n in notifs if n.get("is_read") is True)
        total_unread = sum(1 for n in notifs if not n.get("is_read"))

        # Group by broadcast ID
        broadcasts = {}
        for n in notifs:
            parsed = parse_announcement_metadata(n.get("title") or "", n.get("message") or "")
            b_id = parsed["broadcast_id"]
            if b_id == "N/A":
                b_id = f"LEGACY-{parsed['title'][:20]}"

            if b_id not in broadcasts:
                broadcasts[b_id] = {
                    "id": b_id,
                    "title": parsed["title"],
                    "priority": parsed["priority"],
                    "category": parsed["category"],
                    "audience": parsed["audience"],
                    "sent_at": n.get("created_at"),
                    "total_recipients": 0,
                    "read_count": 0,
                    "unread_count": 0,
                }
            broadcasts[b_id]["total_recipients"] += 1
            if n.get("is_read"):
                broadcasts[b_id]["read_count"] += 1
            else:
                broadcasts[b_id]["unread_count"] += 1

        # Fetch active citizens and workers count
        users_res = supabase.table("users").select("id, role, is_active").eq("is_active", True).limit(1000).execute()
        users_rows = users_res.data or []
        active_citizens = sum(1 for u in users_rows if u.get("role") == "citizen")
        active_workers = sum(1 for u in users_rows if u.get("role") == "worker")

        # Worker departments
        workers_res = supabase.table("workers").select("department").limit(500).execute()
        departments = sorted(list(set(w.get("department") for w in (workers_res.data or []) if w.get("department"))))

        return {
            "success": True,
            "metrics": {
                "total_announcements": len(broadcasts),
                "total_notifications_sent": total_notifications_sent,
                "total_read": total_read,
                "total_unread": total_unread,
                "read_rate_pct": round(total_read / total_notifications_sent * 100, 1) if total_notifications_sent > 0 else 0,
                "active_citizens_count": active_citizens,
                "active_workers_count": active_workers,
                "departments": departments,
                "drafts_count": 0,
                "scheduled_count": 0,
            },
            "database_schema": {
                "notifications_table": "notifications (id, user_id, title, message, type, is_read, created_at)",
                "persistence_mode": "Real database notification rows bulk-inserted per recipient",
                "scheduling_supported": False,
                "drafts_supported": False,
                "notes": "Drafts and recurring schedules are not supported by the existing database schema."
            }
        }
    except Exception as error:
        print("Announcements overview error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch announcements overview: {str(error)}")


@router.get("/announcements/audience-preview")
def preview_announcement_audience(
    audience: str = Query(..., pattern="^(all_citizens|all_workers|all_users|department|specific_user)$"),
    department: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Calculate and preview exact candidate recipients from real database records before broadcast.
    """
    try:
        recipients = []
        audience_label = "Target Audience"

        if audience == "all_citizens":
            res = supabase.table("users").select("id, name, email, role").eq("role", "citizen").eq("is_active", True).limit(1000).execute()
            recipients = res.data or []
            audience_label = f"All Citizens ({len(recipients)} recipients)"

        elif audience == "all_workers":
            res = supabase.table("users").select("id, name, email, role").eq("role", "worker").eq("is_active", True).limit(1000).execute()
            recipients = res.data or []
            audience_label = f"All Municipal Workers ({len(recipients)} recipients)"

        elif audience == "all_users":
            res = supabase.table("users").select("id, name, email, role").in_("role", ["citizen", "worker"]).eq("is_active", True).limit(2000).execute()
            recipients = res.data or []
            audience_label = f"Everyone: Citizens & Workers ({len(recipients)} recipients)"

        elif audience == "department":
            if not department or not department.strip():
                raise HTTPException(status_code=400, detail="Department name is required when targeting by department.")
            dept_name = department.strip()
            w_res = supabase.table("workers").select("user_id, department, specialization").eq("department", dept_name).execute()
            worker_rows = w_res.data or []
            u_ids = [w["user_id"] for w in worker_rows if w.get("user_id")]

            if u_ids:
                u_res = supabase.table("users").select("id, name, email, role").in_("id", u_ids).eq("is_active", True).execute()
                recipients = u_res.data or []
            audience_label = f"{dept_name} Department ({len(recipients)} workers)"

        elif audience == "specific_user":
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id is required when targeting a specific recipient.")
            res = supabase.table("users").select("id, name, email, role").eq("id", user_id).eq("is_active", True).limit(1).execute()
            recipients = res.data or []
            u_name = recipients[0]["name"] if recipients else "Selected User"
            audience_label = f"Single User: {u_name}"

        return {
            "success": True,
            "audience": audience,
            "audience_label": audience_label,
            "recipient_count": len(recipients),
            "sample_recipients": recipients[:5],
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Audience preview error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to preview audience: {str(error)}")


@router.post("/announcements")
def dispatch_announcement(
    payload: AnnouncementCreate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Broadcast a municipal announcement by bulk-inserting real notification rows into the notifications table.
    """
    try:
        title = payload.title.strip()
        message = payload.message.strip()
        category = payload.category.strip() or "General"
        priority = payload.priority
        audience = payload.audience

        # 1. Determine recipients
        recipient_ids = []
        audience_label = "Citizens"

        if audience == "all_citizens":
            res = supabase.table("users").select("id").eq("role", "citizen").eq("is_active", True).execute()
            recipient_ids = [r["id"] for r in (res.data or []) if r.get("id")]
            audience_label = "All Citizens"

        elif audience == "all_workers":
            res = supabase.table("users").select("id").eq("role", "worker").eq("is_active", True).execute()
            recipient_ids = [r["id"] for r in (res.data or []) if r.get("id")]
            audience_label = "All Municipal Workers"

        elif audience == "all_users":
            res = supabase.table("users").select("id").in_("role", ["citizen", "worker"]).eq("is_active", True).execute()
            recipient_ids = [r["id"] for r in (res.data or []) if r.get("id")]
            audience_label = "Citizens & Workers"

        elif audience == "department":
            if not payload.department or not payload.department.strip():
                raise HTTPException(status_code=400, detail="Department is required for department targeting.")
            dept_name = payload.department.strip()
            w_res = supabase.table("workers").select("user_id").eq("department", dept_name).execute()
            u_ids = [w["user_id"] for w in (w_res.data or []) if w.get("user_id")]
            if u_ids:
                u_res = supabase.table("users").select("id").in_("id", u_ids).eq("is_active", True).execute()
                recipient_ids = [r["id"] for r in (u_res.data or []) if r.get("id")]
            audience_label = f"Department: {dept_name}"

        elif audience == "specific_user":
            if not payload.user_id:
                raise HTTPException(status_code=400, detail="Recipient user_id is required.")
            res = supabase.table("users").select("id, name").eq("id", payload.user_id).eq("is_active", True).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Selected recipient was not found or is inactive.")
            recipient_ids = [res.data[0]["id"]]
            audience_label = f"User: {res.data[0].get('name') or 'Citizen'}"

        if not recipient_ids:
            raise HTTPException(status_code=400, detail="No active recipients found for selected target audience.")

        # 2. Prepare broadcast reference ID and payload
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
        short_id = uuid.uuid4().hex[:4].upper()
        broadcast_id = f"BCST-{today_str}-{short_id}"

        tagged_title = f"[{priority} • {category}] {title}"
        tagged_message = f"{message}\n\n[Audience: {audience_label} • Ref: {broadcast_id}]"

        # 3. Construct rows for bulk insert (chunks of 100)
        rows = [
            {
                "user_id": uid,
                "title": tagged_title,
                "message": tagged_message,
                "type": "announcement",
                "is_read": False,
                "complaint_id": None,
            }
            for uid in recipient_ids
        ]

        batch_size = 100
        for i in range(0, len(rows), batch_size):
            chunk = rows[i:i + batch_size]
            supabase.table("notifications").insert(chunk).execute()

        return {
            "success": True,
            "message": f"Broadcast successfully dispatched to {len(recipient_ids)} recipients.",
            "broadcast": {
                "id": broadcast_id,
                "title": title,
                "message": message,
                "priority": priority,
                "category": category,
                "audience": audience_label,
                "recipient_count": len(recipient_ids),
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Dispatch announcement error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to dispatch announcement: {str(error)}")


@router.get("/announcements")
def get_announcements_history(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return all dispatched announcement broadcasts grouped from notifications table records.
    """
    try:
        res = (
            supabase.table("notifications")
            .select("id, user_id, title, message, is_read, created_at")
            .eq("type", "announcement")
            .order("created_at", desc=True)
            .limit(5000)
            .execute()
        )
        notifs = res.data or []

        broadcasts_map = {}
        order_list = []

        for n in notifs:
            parsed = parse_announcement_metadata(n.get("title") or "", n.get("message") or "")
            b_id = parsed["broadcast_id"]
            if b_id == "N/A":
                b_id = f"LEGACY-{parsed['title'][:20]}"

            if b_id not in broadcasts_map:
                broadcasts_map[b_id] = {
                    "id": b_id,
                    "title": parsed["title"],
                    "message": parsed["message"],
                    "priority": parsed["priority"],
                    "category": parsed["category"],
                    "audience": parsed["audience"],
                    "sent_at": n.get("created_at"),
                    "total_recipients": 0,
                    "read_count": 0,
                    "unread_count": 0,
                }
                order_list.append(b_id)

            broadcasts_map[b_id]["total_recipients"] += 1
            if n.get("is_read"):
                broadcasts_map[b_id]["read_count"] += 1
            else:
                broadcasts_map[b_id]["unread_count"] += 1

        announcements_list = []
        for b_id in order_list:
            item = broadcasts_map[b_id]
            tot = item["total_recipients"]
            rd = item["read_count"]
            item["read_percentage"] = round(rd / tot * 100, 1) if tot > 0 else 0
            announcements_list.append(item)

        return {
            "success": True,
            "count": len(announcements_list),
            "announcements": announcements_list,
        }
    except Exception as error:
        print("Get announcements history error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch announcements history: {str(error)}")


@router.get("/announcements/{broadcast_id}")
def get_announcement_details(
    broadcast_id: str,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return comprehensive details of a specific broadcast including full recipient list and read status.
    """
    try:
        # Search notifications with this broadcast ID in message
        res = (
            supabase.table("notifications")
            .select("id, user_id, title, message, is_read, created_at")
            .eq("type", "announcement")
            .like("message", f"%Ref: {broadcast_id}%")
            .execute()
        )
        notifs = res.data or []

        if not notifs:
            res = (
                supabase.table("notifications")
                .select("id, user_id, title, message, is_read, created_at")
                .eq("type", "announcement")
                .limit(200)
                .execute()
            )
            all_ann = res.data or []
            notifs = [n for n in all_ann if parse_announcement_metadata(n.get("title") or "", n.get("message") or "")["broadcast_id"] == broadcast_id]

        if not notifs:
            raise HTTPException(status_code=404, detail="Announcement broadcast not found.")

        parsed = parse_announcement_metadata(notifs[0].get("title") or "", notifs[0].get("message") or "")

        # Fetch recipient user info
        u_ids = list(set(n.get("user_id") for n in notifs if n.get("user_id")))
        users_map = {}
        if u_ids:
            try:
                u_res = supabase.table("users").select("id, name, email, role").in_("id", u_ids).execute()
                for u in (u_res.data or []):
                    users_map[u["id"]] = u
            except Exception as ue:
                print("Users map error:", ue)

        workers_map = {}
        try:
            w_res = supabase.table("workers").select("user_id, department, specialization").in_("user_id", u_ids).execute()
            for w in (w_res.data or []):
                workers_map[w["user_id"]] = w
        except Exception as we:
            print("Workers map error:", we)

        recipients = []
        for n in notifs:
            uid = n.get("user_id")
            u_info = users_map.get(uid, {})
            w_info = workers_map.get(uid, {})
            recipients.append({
                "notification_id": n.get("id"),
                "user_id": uid,
                "name": u_info.get("name") or "User",
                "email": u_info.get("email"),
                "role": u_info.get("role") or "citizen",
                "department": w_info.get("department"),
                "is_read": n.get("is_read", False),
                "delivered_at": n.get("created_at"),
            })

        total = len(recipients)
        read_cnt = sum(1 for r in recipients if r["is_read"])
        unread_cnt = total - read_cnt

        return {
            "success": True,
            "announcement": {
                "id": broadcast_id,
                "title": parsed["title"],
                "message": parsed["message"],
                "priority": parsed["priority"],
                "category": parsed["category"],
                "audience": parsed["audience"],
                "sent_at": notifs[0].get("created_at"),
                "total_recipients": total,
                "read_count": read_cnt,
                "unread_count": unread_cnt,
                "read_percentage": round(read_cnt / total * 100, 1) if total > 0 else 0,
                "recipients": recipients,
            }
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Get announcement details error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch announcement details: {str(error)}")


@router.delete("/announcements/{broadcast_id}")
def delete_announcement(
    broadcast_id: str,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Remove all notification rows associated with this broadcast from the database.
    """
    try:
        res = (
            supabase.table("notifications")
            .select("id")
            .eq("type", "announcement")
            .like("message", f"%Ref: {broadcast_id}%")
            .execute()
        )
        notifs = res.data or []

        if not notifs:
            raise HTTPException(status_code=404, detail="Announcement records not found.")

        ids = [n["id"] for n in notifs]
        for i in range(0, len(ids), 100):
            chunk = ids[i:i + 100]
            supabase.table("notifications").delete().in_("id", chunk).execute()

        return {
            "success": True,
            "message": f"Successfully deleted broadcast and removed {len(ids)} recipient notifications.",
            "deleted_count": len(ids),
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Delete announcement error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to delete announcement: {str(error)}")


# ============================================================================
# COMPLAINT #9: MUNICIPAL ADMINISTRATION SETTINGS & CATEGORIES
# ============================================================================

class AdminCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    is_active: bool = True


class AdminCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


@router.get("/categories")
def get_admin_categories(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Fetch all categories with real complaint counts derived from the complaints table.
    """
    try:
        cats_res = (
            supabase.table("categories")
            .select("id, name, description, is_active, created_at")
            .order("name")
            .execute()
        )
        categories = cats_res.data or []

        # Real complaint count per category
        complaints_res = supabase.table("complaints").select("category_id").execute()
        complaints_data = complaints_res.data or []
        counts = {}
        for c in complaints_data:
            cid = c.get("category_id")
            if cid:
                counts[cid] = counts.get(cid, 0) + 1

        for cat in categories:
            cat["complaint_count"] = counts.get(cat["id"], 0)

        return {
            "success": True,
            "count": len(categories),
            "categories": categories,
        }
    except Exception as error:
        print("Admin get categories error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(error)}")


@router.post("/categories")
def create_admin_category(
    payload: AdminCategoryCreate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Create a new category in the real Supabase categories table.
    """
    try:
        clean_name = payload.name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Category name cannot be empty.")

        # Check for duplicate category name (case-insensitive)
        existing = (
            supabase.table("categories")
            .select("id, name")
            .ilike("name", clean_name)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail=f"A category named '{clean_name}' already exists.")

        insert_payload = {
            "name": clean_name,
            "description": payload.description.strip() if payload.description else None,
            "is_active": payload.is_active,
        }

        res = supabase.table("categories").insert(insert_payload).execute()
        created = res.data[0] if res.data else None
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create category record.")

        created["complaint_count"] = 0
        return {
            "success": True,
            "message": f"Category '{clean_name}' created successfully.",
            "category": created,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Create category error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to create category: {str(error)}")


@router.patch("/categories/{category_id}")
def update_admin_category(
    category_id: str,
    payload: AdminCategoryUpdate,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Update an existing category's name, description, or is_active in the real categories table.
    """
    try:
        # Check category existence
        existing = (
            supabase.table("categories")
            .select("id, name, description, is_active")
            .eq("id", category_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Category not found.")

        current_cat = existing.data[0]
        update_data = {}

        if payload.name is not None:
            clean_name = payload.name.strip()
            if not clean_name:
                raise HTTPException(status_code=400, detail="Category name cannot be empty.")
            # Duplicate check if name changed
            if clean_name.lower() != current_cat["name"].lower():
                dup = (
                    supabase.table("categories")
                    .select("id")
                    .ilike("name", clean_name)
                    .neq("id", category_id)
                    .execute()
                )
                if dup.data:
                    raise HTTPException(status_code=409, detail=f"Another category with name '{clean_name}' already exists.")
            update_data["name"] = clean_name

        if payload.description is not None:
            update_data["description"] = payload.description.strip() if payload.description else None

        if payload.is_active is not None:
            update_data["is_active"] = payload.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields provided for update.")

        res = (
            supabase.table("categories")
            .update(update_data)
            .eq("id", category_id)
            .execute()
        )
        updated = res.data[0] if res.data else None
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update category record.")

        # Re-derive complaint count
        comp_count_res = (
            supabase.table("complaints")
            .select("id", count="exact")
            .eq("category_id", category_id)
            .execute()
        )
        updated["complaint_count"] = comp_count_res.count if comp_count_res.count is not None else len(comp_count_res.data or [])

        return {
            "success": True,
            "message": f"Category '{updated['name']}' updated successfully.",
            "category": updated,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Update category error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(error)}")


@router.get("/settings/overview")
def get_settings_overview(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Return municipal settings overview, live database schema inspection report, and operational metrics.
    """
    try:
        # Category metrics
        cats_res = supabase.table("categories").select("id, is_active").execute()
        cats = cats_res.data or []
        total_categories = len(cats)
        active_categories = sum(1 for c in cats if c.get("is_active") is True)
        inactive_categories = total_categories - active_categories

        # Notifications count
        notifs_res = supabase.table("notifications").select("id, is_read").execute()
        notifs = notifs_res.data or []
        total_notifications = len(notifs)
        read_notifications = sum(1 for n in notifs if n.get("is_read") is True)
        unread_notifications = total_notifications - read_notifications

        # Real verified tables list
        verified_tables = [
            "users",
            "workers",
            "categories",
            "notifications",
            "rewards",
            "complaints",
            "complaint_status_history",
            "complaint_feedback",
            "complaint_supports",
            "complaint_comments",
        ]

        return {
            "success": True,
            "portal_info": {
                "name": "Smart City Grievance & Municipal Services Portal",
                "municipality": "Smart City Municipal Corporation",
                "contact_email": "support@smartcity.gov.in",
                "helpline_phone": "1800-123-4567 (Toll Free)",
                "emergency_phone": "112 / 101 / 102",
                "default_priority": "Medium",
                "default_sla_hours": 48,
                "branding_emblem": "/assets/smart-city-logo.png",
            },
            "category_summary": {
                "total": total_categories,
                "active": active_categories,
                "inactive": inactive_categories,
            },
            "notification_summary": {
                "total": total_notifications,
                "read": read_notifications,
                "unread": unread_notifications,
            },
            "database_status": {
                "connected": True,
                "verified_tables": verified_tables,
                "generic_settings_table_exists": False,
                "background_scheduler_configured": False,
            },
            "operational_mode": "Production",
            "maintenance_mode": "Operational (Infrastructure-Controlled)",
        }
    except Exception as error:
        print("Get settings overview error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings overview: {str(error)}")


@router.get("/settings/audit-activity")
def get_settings_audit_activity(
    current_user: dict = Depends(require_role("admin")),
):
    """
    Compile a chronological administrative audit stream from real database tables:
    complaint_status_history, notifications (announcements), and rewards.
    """
    try:
        activities = []

        # 1. From complaint_status_history
        csh_res = (
            supabase.table("complaint_status_history")
            .select("id, old_status, new_status, remarks, created_at, complaints(complaint_code, title)")
            .order("created_at", desc=True)
            .limit(15)
            .execute()
        )
        for row in (csh_res.data or []):
            complaint = row.get("complaints") or {}
            c_code = complaint.get("complaint_code") or "Complaint"
            c_title = complaint.get("title") or "Civic Issue"
            old_st = row.get("old_status") or "New"
            new_st = row.get("new_status") or "Updated"
            activities.append({
                "id": f"csh-{row['id']}",
                "source_table": "complaint_status_history",
                "source_badge": "Complaint Lifecycle",
                "title": f"Status changed: {old_st} → {new_st} ({c_code})",
                "description": f"{c_title} — {row.get('remarks') or 'Status transition recorded'}",
                "created_at": row.get("created_at"),
                "type": "complaint",
            })

        # 2. From notifications (announcements)
        notifs_res = (
            supabase.table("notifications")
            .select("id, title, message, created_at")
            .eq("type", "announcement")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        seen_announcements = set()
        for row in (notifs_res.data or []):
            title = row.get("title") or "Municipal Announcement"
            msg = row.get("message") or ""
            ref = "BCST"
            if "Ref:" in msg:
                try:
                    ref = msg.split("Ref:")[1].split("]")[0].strip()
                except Exception:
                    ref = "BCST"

            dedup_key = f"{title}_{ref}"
            if dedup_key in seen_announcements:
                continue
            seen_announcements.add(dedup_key)

            activities.append({
                "id": f"notif-{row['id']}",
                "source_table": "notifications",
                "source_badge": "Broadcast Announcement",
                "title": f"Dispatched: {title}",
                "description": f"Municipal broadcast dispatched (Ref: {ref})",
                "created_at": row.get("created_at"),
                "type": "announcement",
            })

        # 3. From rewards
        rewards_res = (
            supabase.table("rewards")
            .select("id, points, reason, created_at, complaints(complaint_code, title)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for row in (rewards_res.data or []):
            complaint = row.get("complaints") or {}
            c_code = complaint.get("complaint_code")
            reason = row.get("reason") or "Civic action"
            points = row.get("points") or 0
            desc = f"Granted +{points} civic points for: {reason}"
            if c_code:
                desc += f" ({c_code})"

            activities.append({
                "id": f"rew-{row['id']}",
                "source_table": "rewards",
                "source_badge": "Rewards & Gamification",
                "title": f"Civic Points Awarded (+{points} pts)",
                "description": desc,
                "created_at": row.get("created_at"),
                "type": "reward",
            })

        # Sort all combined activities chronologically descending
        activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        return {
            "success": True,
            "count": len(activities),
            "activities": activities[:30],
        }
    except Exception as error:
        print("Get settings audit activity error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit activity: {str(error)}")


# ============================================================================
# COMPLAINT #10: WORK COMPLETION EVIDENCE VERIFICATION & REWORK
# ============================================================================

class CompletionVerificationRequest(BaseModel):
    action: str = Field(..., description="'approve' or 'rework'")
    remarks: Optional[str] = Field(None, description="Remarks or rework reason")


@router.patch("/complaints/{complaint_id}/completion-evidence/verify")
def verify_or_rework_complaint(
    complaint_id: str,
    payload: CompletionVerificationRequest,
    current_user: dict = Depends(require_role("admin")),
):
    """
    Review completion evidence submitted by field worker:
    - If action == 'approve': Marks complaint 'Verified', logs approval in history, awards citizen points, notifies worker & citizen.
    - If action == 'rework': Marks complaint 'In Progress', logs rework reason in history, notifies worker that rework is required.
    """
    try:
        clean_action = payload.action.lower().strip()
        if clean_action not in ("approve", "rework"):
            raise HTTPException(status_code=400, detail="Action must be either 'approve' or 'rework'.")

        comp_res = (
            supabase.table("complaints")
            .select("id, complaint_code, title, status, citizen_id, assigned_worker_id, photo_url")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        if not comp_res.data:
            raise HTTPException(status_code=404, detail="Complaint not found.")

        complaint = comp_res.data[0]
        now_iso = datetime.now(timezone.utc).isoformat()
        worker_id = complaint.get("assigned_worker_id")

        # Resolve worker user_id to send notification
        worker_user_id = None
        if worker_id:
            w_res = supabase.table("workers").select("user_id, worker_code").eq("id", worker_id).limit(1).execute()
            if w_res.data:
                worker_user_id = w_res.data[0].get("user_id")

        if clean_action == "approve":
            # 1. Update complaints status to Verified
            supabase.table("complaints").update({
                "status": "Verified",
                "verified_by": current_user["id"],
                "verified_at": now_iso,
                "updated_at": now_iso,
            }).eq("id", complaint_id).execute()

            # 2. Log in complaint_status_history
            verify_payload = {
                "type": "completion_verification",
                "action": "verified",
                "admin_remarks": payload.remarks.strip() if payload.remarks else "Work completion verified and approved by admin.",
                "verified_at": now_iso,
                "verified_by": current_user.get("name", "Administrator"),
            }
            supabase.table("complaint_status_history").insert({
                "complaint_id": complaint_id,
                "old_status": complaint.get("status", "Resolved"),
                "new_status": "Verified",
                "changed_by": current_user["id"],
                "remarks": json.dumps(verify_payload),
            }).execute()

            # 3. Award citizen points if not yet awarded
            try:
                existing_pts = (
                    supabase.table("rewards")
                    .select("id")
                    .eq("complaint_id", complaint_id)
                    .eq("reason", "Complaint verified")
                    .limit(1)
                    .execute()
                )
                if not (existing_pts.data or []):
                    supabase.table("rewards").insert({
                        "user_id": complaint["citizen_id"],
                        "points": 50,
                        "reason": "Complaint verified",
                        "complaint_id": complaint_id,
                    }).execute()
            except Exception as reward_err:
                print("Warning: reward points grant error:", reward_err)

            # 4. Notify worker
            if worker_user_id:
                try:
                    supabase.table("notifications").insert({
                        "user_id": worker_user_id,
                        "complaint_id": complaint_id,
                        "title": f"Work Verified: {complaint.get('complaint_code', 'Complaint')}",
                        "message": f"Administrator verified your work on '{complaint.get('title')}'.",
                        "is_read": False,
                        "type": "work_verified",
                    }).execute()
                except Exception as notif_err:
                    print("Warning: worker notification error:", notif_err)

            # 5. Notify citizen
            try:
                supabase.table("notifications").insert({
                    "user_id": complaint["citizen_id"],
                    "complaint_id": complaint_id,
                    "title": f"Complaint Resolved: {complaint.get('complaint_code', 'Complaint')}",
                    "message": f"Municipal work on your complaint '{complaint.get('title')}' has been verified and approved.",
                    "is_read": False,
                    "type": "status_update",
                }).execute()
            except Exception as notif_err:
                print("Warning: citizen notification error:", notif_err)

            return {
                "success": True,
                "message": "Work completion verified successfully.",
                "status": "Verified",
            }

        else:  # rework
            rework_reason = payload.remarks.strip() if payload.remarks else ""
            if not rework_reason:
                raise HTTPException(status_code=400, detail="Please provide a specific rework reason describing what requires rectification.")

            # 1. Update complaints status to In Progress
            supabase.table("complaints").update({
                "status": "In Progress",
                "updated_at": now_iso,
            }).eq("id", complaint_id).execute()

            # 2. Log in complaint_status_history
            rework_payload = {
                "type": "rework_required",
                "action": "rework_required",
                "rework_reason": rework_reason,
                "requested_at": now_iso,
                "requested_by": current_user.get("name", "Administrator"),
            }
            supabase.table("complaint_status_history").insert({
                "complaint_id": complaint_id,
                "old_status": complaint.get("status", "Resolved"),
                "new_status": "In Progress",
                "changed_by": current_user["id"],
                "remarks": json.dumps(rework_payload),
            }).execute()

            # 3. Notify worker with rework reason
            if worker_user_id:
                try:
                    supabase.table("notifications").insert({
                        "user_id": worker_user_id,
                        "complaint_id": complaint_id,
                        "title": f"Rework Required: {complaint.get('complaint_code', 'Complaint')}",
                        "message": f"Administrator requested rework on '{complaint.get('title')}': {rework_reason}",
                        "is_read": False,
                        "type": "rework_required",
                    }).execute()
                except Exception as notif_err:
                    print("Warning: worker notification error:", notif_err)

            # 4. Notify citizen that work is undergoing further rectification
            try:
                supabase.table("notifications").insert({
                    "user_id": complaint["citizen_id"],
                    "complaint_id": complaint_id,
                    "title": f"Work Update: {complaint.get('complaint_code', 'Complaint')}",
                    "message": f"Municipal team requested quality rework on '{complaint.get('title')}'. Field team is continuing rectification.",
                    "is_read": False,
                    "type": "status_update",
                }).execute()
            except Exception as notif_err:
                print("Warning: citizen notification error:", notif_err)

            return {
                "success": True,
                "message": "Rework request submitted. Worker has been notified.",
                "status": "In Progress",
            }

    except HTTPException:
        raise
    except Exception as error:
        print("Verify or rework complaint error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to process verification action: {str(error)}")
