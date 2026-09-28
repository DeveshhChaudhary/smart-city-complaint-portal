from datetime import datetime, timezone
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from pydantic import BaseModel, Field

from app.config.supabase import supabase
from app.utils.security import require_role


router = APIRouter(
    prefix="/api/worker",
    tags=["Worker"]
)


class WorkerProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    specialization: Optional[str] = Field(None, max_length=150)
    is_available: Optional[bool] = None


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
@router.get("/profile")
def get_my_worker_profile(
    current_user: dict = Depends(require_role("worker"))
):
    try:
        worker = get_worker_profile(current_user)

        # Get fresh user details from database
        user_res = (
            supabase.table("users")
            .select("id, name, email, phone, role, profile_image_url, is_active, created_at, updated_at")
            .eq("id", current_user["id"])
            .limit(1)
            .execute()
        )
        fresh_user = user_res.data[0] if user_res.data else current_user

        # Compute worker statistics from real assigned complaints
        complaints_res = (
            supabase.table("complaints")
            .select("id, status")
            .eq("assigned_worker_id", worker["id"])
            .execute()
        )
        complaints_list = complaints_res.data or []
        assigned_count = sum(1 for c in complaints_list if c.get("status") == "Assigned")
        in_progress_count = sum(1 for c in complaints_list if c.get("status") == "In Progress")
        resolved_count = sum(1 for c in complaints_list if c.get("status") in ("Resolved", "Verified"))
        verified_count = sum(1 for c in complaints_list if c.get("status") == "Verified")

        # Check rework count from complaint_status_history
        c_ids = [c["id"] for c in complaints_list]
        rework_count = 0
        if c_ids:
            try:
                hist_res = (
                    supabase.table("complaint_status_history")
                    .select("id, remarks")
                    .in_("complaint_id", c_ids)
                    .like("remarks", "%rework_required%")
                    .execute()
                )
                rework_count = len(hist_res.data or [])
            except Exception:
                pass

        return {
            "success": True,
            "worker": {
                "id": worker["id"],
                "user_id": worker["user_id"],
                "worker_code": worker["worker_code"],
                "department": worker["department"],
                "specialization": worker.get("specialization") or "General Field Maintenance",
                "is_available": worker.get("is_available", True),
                "created_at": worker.get("created_at"),
                "updated_at": worker.get("updated_at"),
                "user": fresh_user,
                "stats": {
                    "total_assigned": len(complaints_list),
                    "assigned": assigned_count,
                    "in_progress": in_progress_count,
                    "resolved": resolved_count,
                    "verified": verified_count,
                    "rework_count": rework_count,
                },
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


@router.patch("/profile")
def update_worker_profile(
    payload: WorkerProfileUpdate,
    current_user: dict = Depends(require_role("worker")),
):
    """
    Update editable profile fields for the authenticated worker:
    Name & Phone in 'users' table; Specialization & Availability in 'workers' table.
    """
    try:
        worker = get_worker_profile(current_user)
        now = datetime.now(timezone.utc).isoformat()

        # Update users table if name or phone changed
        user_update = {}
        if payload.name is not None:
            clean_name = payload.name.strip()
            if not clean_name:
                raise HTTPException(status_code=400, detail="Name cannot be empty.")
            user_update["name"] = clean_name

        if payload.phone is not None:
            user_update["phone"] = payload.phone.strip() if payload.phone else None

        if user_update:
            user_update["updated_at"] = now
            supabase.table("users").update(user_update).eq("id", current_user["id"]).execute()

        # Update workers table if specialization or availability changed
        worker_update = {}
        if payload.specialization is not None:
            worker_update["specialization"] = payload.specialization.strip() if payload.specialization else None

        if payload.is_available is not None:
            worker_update["is_available"] = payload.is_available

        if worker_update:
            worker_update["updated_at"] = now
            supabase.table("workers").update(worker_update).eq("id", worker["id"]).execute()

        return {
            "success": True,
            "message": "Worker profile updated successfully.",
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Update worker profile error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(error)}")


@router.post("/profile/photo")
async def upload_worker_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("worker")),
):
    """
    Upload and persist profile photo for the authenticated worker.
    Uses the Supabase Storage profile-images bucket.
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
        extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
        }[file.content_type]

        file_path = f"{current_user['id']}/worker-profile.{extension}"

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
            "message": "Worker profile photo uploaded successfully.",
            "profile_image_url": public_url,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Worker photo upload error:", error)
        raise HTTPException(status_code=500, detail=f"Profile photo upload failed: {str(error)}")


@router.delete("/profile/photo")
def delete_worker_profile_photo(
    current_user: dict = Depends(require_role("worker")),
):
    """
    Remove the worker's profile photo and reset to default initials.
    """
    try:
        supabase.table("users").update({
            "profile_image_url": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", current_user["id"]).execute()

        return {
            "success": True,
            "message": "Worker profile photo removed.",
        }
    except Exception as error:
        print("Delete worker photo error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to remove profile photo: {str(error)}")


@router.post("/complaints/{complaint_id}/completion-evidence")
async def submit_work_completion_evidence(
    complaint_id: str,
    file: UploadFile = File(...),
    work_performed: str = Form(...),
    remarks: Optional[str] = Form(None),
    current_user: dict = Depends(require_role("worker")),
):
    """
    Submit photographic evidence and description of work performed on an assigned complaint.
    Stores the photo in Supabase Storage, updates status to Resolved, records evidence in complaint_status_history,
    and alerts municipal administration for review.
    """
    try:
        worker = get_worker_profile(current_user)

        # Verify complaint exists and is assigned to this worker
        comp_res = (
            supabase.table("complaints")
            .select("id, complaint_code, title, status, assigned_worker_id, citizen_id, photo_url")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        if not comp_res.data:
            raise HTTPException(status_code=404, detail="Complaint not found.")

        complaint = comp_res.data[0]

        if complaint.get("assigned_worker_id") != worker["id"]:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to submit completion evidence for a complaint assigned to another worker."
            )

        clean_work = work_performed.strip()
        if len(clean_work) < 5:
            raise HTTPException(status_code=400, detail="Work performed description must be at least 5 characters.")

        # Validate file
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Evidence photo must be a JPG, PNG, or WEBP image.")

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded evidence photo is empty.")

        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Evidence photo must be 10 MB or smaller.")

        bucket_name = "completion-evidence"
        extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }[file.content_type]

        timestamp = int(datetime.now(timezone.utc).timestamp())
        file_path = f"{complaint_id}/completion-{timestamp}.{extension}"

        supabase.storage.from_(bucket_name).upload(
            file_path,
            file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "true",
            },
        )

        public_url_res = supabase.storage.from_(bucket_name).get_public_url(file_path)
        photo_url = (
            public_url_res.get("publicUrl")
            if isinstance(public_url_res, dict)
            else str(public_url_res)
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        # Update complaint status to Resolved
        supabase.table("complaints").update({
            "status": "Resolved",
            "resolved_at": now_iso,
            "updated_at": now_iso,
        }).eq("id", complaint_id).execute()

        # Structure evidence metadata into complaint_status_history
        evidence_payload = {
            "type": "completion_evidence",
            "photo_url": photo_url,
            "work_performed": clean_work,
            "completion_remarks": remarks.strip() if remarks else "",
            "submitted_at": now_iso,
            "verification_status": "submitted",
            "worker_code": worker.get("worker_code", "WORKER"),
            "worker_name": current_user.get("name", "Field Worker"),
        }

        supabase.table("complaint_status_history").insert({
            "complaint_id": complaint_id,
            "old_status": complaint.get("status", "In Progress"),
            "new_status": "Resolved",
            "changed_by": current_user["id"],
            "remarks": json.dumps(evidence_payload),
        }).execute()

        # Notify administrators of work completion
        try:
            admins_res = supabase.table("users").select("id").eq("role", "admin").execute()
            for admin_user in (admins_res.data or []):
                supabase.table("notifications").insert({
                    "user_id": admin_user["id"],
                    "complaint_id": complaint_id,
                    "title": f"Work Completion: {complaint.get('complaint_code', 'Complaint')}",
                    "message": f"Worker {worker.get('worker_code')} completed work: {clean_work}",
                    "is_read": False,
                    "type": "work_completion",
                }).execute()
        except Exception as notif_err:
            print("Warning: failed to dispatch admin notification:", notif_err)

        return {
            "success": True,
            "message": "Work completion evidence submitted successfully. Awaiting administrative review.",
            "evidence": evidence_payload,
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Submit completion evidence error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to submit completion evidence: {str(error)}")


@router.get("/complaints/{complaint_id}/completion-evidence")
def get_complaint_completion_evidence_worker(
    complaint_id: str,
    current_user: dict = Depends(require_role("worker")),
):
    """
    Fetch completion evidence for a complaint assigned to this worker.
    """
    try:
        worker = get_worker_profile(current_user)

        comp_res = (
            supabase.table("complaints")
            .select("id, complaint_code, title, status, photo_url, assigned_worker_id, verified_at, verified_by")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        if not comp_res.data:
            raise HTTPException(status_code=404, detail="Complaint not found.")

        complaint = comp_res.data[0]
        if complaint.get("assigned_worker_id") != worker["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access to complaint evidence.")

        # Search complaint_status_history for latest completion evidence
        hist_res = (
            supabase.table("complaint_status_history")
            .select("id, old_status, new_status, remarks, created_at, changed_by")
            .eq("complaint_id", complaint_id)
            .order("created_at", desc=True)
            .execute()
        )

        evidence = None
        rework_reason = None
        for row in (hist_res.data or []):
            rem = row.get("remarks") or ""
            if "completion_evidence" in rem:
                try:
                    evidence = json.loads(rem)
                    break
                except Exception:
                    pass

        for row in (hist_res.data or []):
            rem = row.get("remarks") or ""
            if "rework_required" in rem:
                try:
                    parsed = json.loads(rem)
                    rework_reason = parsed.get("rework_reason")
                    break
                except Exception:
                    pass

        return {
            "success": True,
            "complaint_id": complaint_id,
            "complaint_code": complaint.get("complaint_code"),
            "status": complaint.get("status"),
            "original_photo_url": complaint.get("photo_url"),
            "evidence": evidence,
            "rework_reason": rework_reason,
            "is_verified": complaint.get("status") == "Verified",
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Get completion evidence error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch completion evidence: {str(error)}")


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
                "specialization": worker.get("specialization"),
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