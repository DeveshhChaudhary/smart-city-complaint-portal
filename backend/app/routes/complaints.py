from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.config.supabase import supabase
from app.utils.security import get_current_user, require_role


router = APIRouter(
    prefix="/api/complaints",
    tags=["Complaints"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class ComplaintCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)

    category_id: Optional[str] = None
    photo_url: Optional[str] = None

    latitude: float
    longitude: float

    address: Optional[str] = None
    priority: str = "Normal"


class ComplaintStatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None


# ============================================================
# HELPERS
# ============================================================

def generate_complaint_code() -> str:
    timestamp = datetime.now(timezone.utc).strftime(
        "%Y%m%d%H%M%S%f"
    )

    return f"CMP-{timestamp}"


def get_complaint_for_user(
    complaint_id: str,
    current_user: dict,
):
    """
    Fetch a complaint and verify that the current user
    is allowed to access it.
    """

    response = (
        supabase
        .table("complaints")
        .select(
            """
            *,
            categories (
                id,
                name,
                description
            ),
            workers (
                id,
                worker_code,
                department,
                specialization,
                user_id
            )
            """
        )
        .eq("id", complaint_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    complaint = response.data[0]

    # Citizen can only view their own complaint
    if current_user["role"] == "citizen":
        if complaint["citizen_id"] != current_user["id"]:
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to view this complaint.",
            )

    return complaint


# ============================================================
# CREATE COMPLAINT
# ============================================================

@router.post("/")
def create_complaint(
    complaint: ComplaintCreate,
    current_user: dict = Depends(require_role("citizen")),
):
    """
    Create a complaint for the currently authenticated citizen.

    citizen_id is NOT accepted from the frontend.
    It is taken from the authenticated JWT/user.
    """

    try:
        citizen_id = current_user["id"]

        # Validate priority
        allowed_priorities = {
            "Low",
            "Normal",
            "High",
            "Critical",
        }

        if complaint.priority not in allowed_priorities:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid priority. Allowed values: "
                    "Low, Normal, High, Critical."
                ),
            )

        # Validate category if provided
        if complaint.category_id:
            category_response = (
                supabase
                .table("categories")
                .select("id")
                .eq("id", complaint.category_id)
                .limit(1)
                .execute()
            )

            if not category_response.data:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid category_id.",
                )

        complaint_code = generate_complaint_code()

        complaint_data = {
            "complaint_code": complaint_code,
            "citizen_id": citizen_id,
            "title": complaint.title.strip(),
            "description": complaint.description.strip(),
            "category_id": complaint.category_id,
            "photo_url": complaint.photo_url,
            "latitude": complaint.latitude,
            "longitude": complaint.longitude,
            "address": complaint.address,
            "status": "Submitted",
            "priority": complaint.priority,
        }

        response = (
            supabase
            .table("complaints")
            .insert(complaint_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Complaint could not be created.",
            )

        created_complaint = response.data[0]

        # Add initial status history
        try:
            supabase.table(
                "complaint_status_history"
            ).insert(
                {
                    "complaint_id": created_complaint["id"],
                    "old_status": None,
                    "new_status": "Submitted",
                    "changed_by": citizen_id,
                    "remarks": "Complaint submitted by citizen.",
                }
            ).execute()

        except Exception as history_error:
            # Complaint itself was already created.
            # Do not fail the whole request because history insertion failed.
            print(
                "Warning: Failed to create complaint status history:",
                history_error,
            )

        return {
            "success": True,
            "message": "Complaint submitted successfully.",
            "complaint": created_complaint,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Create complaint error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create complaint: {str(error)}",
        )


# ============================================================
# GET ALL COMPLAINTS
# ============================================================

@router.get("/")
def get_complaints(
    current_user: dict = Depends(
        require_role("admin", "worker")
    ),
):
    """
    Admin and workers can view all complaints.
    """

    try:
        response = (
            supabase
            .table("complaints")
            .select(
                """
                *,
                categories (
                    id,
                    name,
                    description
                ),
                workers (
                    id,
                    worker_code,
                    department,
                    specialization,
                    user_id
                )
                """
            )
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "success": True,
            "count": len(response.data or []),
            "complaints": response.data or [],
        }

    except Exception as error:
        print("Get complaints error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch complaints: {str(error)}",
        )


# ============================================================
# GET CITY-WIDE COMPLAINT PROGRESS
# AGGREGATED DATA ONLY
# ============================================================

@router.get("/city/stats")
def get_city_complaint_stats(
    current_user: dict = Depends(get_current_user),
):
    """Return city-wide aggregated complaint progress using lightweight count queries."""
    try:
        total_response = supabase.table("complaints").select("id", count="exact").execute()
        resolved_response = supabase.table("complaints").select("id", count="exact").eq("status", "Resolved").execute()
        rejected_response = supabase.table("complaints").select("id", count="exact").eq("status", "Rejected").execute()

        total = int(total_response.count or 0)
        resolved = int(resolved_response.count or 0)
        rejected = int(rejected_response.count or 0)
        ongoing = max(total - resolved - rejected, 0)

        return {"success": True, "stats": {
            "total": total, "resolved": resolved, "ongoing": ongoing,
            "rejected": rejected,
            "resolution_rate": round((resolved / total) * 100, 1) if total else 0,
        }}
    except Exception as error:
        print("Get city complaint stats error:", error)
        raise HTTPException(status_code=500, detail="Failed to fetch city complaint statistics.")


# ============================================================
# GET SINGLE COMPLAINT
# ============================================================

# ============================================================
# CIVIC REWARDS & LEADERBOARD
# ============================================================

REWARD_CATALOG = [
    {
        "id": "rew-transit-pass",
        "name": "City Metro 1-Day Transit Pass",
        "description": "Unlimited one-day travel on municipal city metro and bus transit networks.",
        "points_required": 50,
        "category": "Transit",
        "status": "Active",
        "icon": "Bus",
        "popular": True,
    },
    {
        "id": "rew-parking-voucher",
        "name": "Smart Parking 2-Hour Voucher",
        "description": "2 hours of complimentary municipal public parking at any Smart City designated lot.",
        "points_required": 40,
        "category": "Mobility",
        "status": "Active",
        "icon": "Car",
    },
    {
        "id": "rew-tree-plant",
        "name": "Plant a Tree in City Park",
        "description": "Dedicate a native sapling planted by the Parks Department with a geotagged civic certificate.",
        "points_required": 80,
        "category": "Environment",
        "status": "Active",
        "icon": "TreePine",
        "popular": True,
    },
    {
        "id": "rew-library-gold",
        "name": "Central Library Gold Pass",
        "description": "3-month priority access to municipal digital archives, research rooms, and coworking spaces.",
        "points_required": 60,
        "category": "Education",
        "status": "Active",
        "icon": "BookOpen",
    },
    {
        "id": "rew-eco-kit",
        "name": "Civic Eco-Friendly Kit",
        "description": "Jute tote bag, reusable stainless steel bottle, and municipal compost starter kit.",
        "points_required": 75,
        "category": "Sustainability",
        "status": "Active",
        "icon": "ShoppingBag",
    },
    {
        "id": "rew-civic-certificate",
        "name": "Official Civic Champion Certificate",
        "description": "Personalized digital certificate of civic excellence signed by City Municipal Authority.",
        "points_required": 100,
        "category": "Recognition",
        "status": "Active",
        "icon": "Award",
    },
    {
        "id": "rew-heritage-pass",
        "name": "Municipal Heritage & Museum Pass",
        "description": "Free admission for 2 persons to all city museums and cultural heritage sites.",
        "points_required": 90,
        "category": "Culture",
        "status": "Active",
        "icon": "Landmark",
    },
]


class RewardClaimRequest(BaseModel):
    reward_id: str


@router.get("/rewards/me")
def get_my_rewards(
    current_user: dict = Depends(require_role("citizen")),
):
    """Return the authenticated citizen's total points, rewards catalog, claims, and transaction history."""
    try:
        response = (
            supabase
            .table("rewards")
            .select("id, points, reason, complaint_id, created_at")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )

        rewards = response.data or []
        total_points = sum(int(reward.get("points") or 0) for reward in rewards)
        all_time_earned = sum(int(r.get("points") or 0) for r in rewards if int(r.get("points") or 0) > 0)
        total_spent = abs(sum(int(r.get("points") or 0) for r in rewards if int(r.get("points") or 0) < 0))

        claims = []
        for r in rewards:
            pts = int(r.get("points") or 0)
            reason = r.get("reason") or ""
            if pts < 0 or reason.startswith("Claimed:"):
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

                claims.append({
                    "id": r.get("id"),
                    "reward_name": reward_name,
                    "points_spent": abs(pts),
                    "claim_code": ref_code,
                    "status": status,
                    "created_at": r.get("created_at"),
                })

        return {
            "success": True,
            "total_points": total_points,
            "all_time_earned": all_time_earned,
            "total_spent": total_spent,
            "reward_count": len(rewards),
            "rewards": rewards,
            "claims": claims,
            "catalog": REWARD_CATALOG,
        }

    except Exception as error:
        print("Get rewards error:", error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch rewards: {str(error)}",
        )


@router.post("/rewards/claim")
def claim_reward(
    payload: RewardClaimRequest,
    current_user: dict = Depends(require_role("citizen")),
):
    """Claim a reward from the catalog using accumulated civic points."""
    try:
        reward = next((r for r in REWARD_CATALOG if r["id"] == payload.reward_id), None)
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found in catalog.")

        if reward.get("status") != "Active":
            raise HTTPException(status_code=400, detail="This reward is currently unavailable.")

        res = (
            supabase
            .table("rewards")
            .select("points")
            .eq("user_id", current_user["id"])
            .execute()
        )
        current_rows = res.data or []
        current_points = sum(int(r.get("points") or 0) for r in current_rows)
        points_cost = int(reward["points_required"])

        if current_points < points_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient points. You have {current_points} points, but this reward requires {points_cost} points."
            )

        # Guard against duplicate claims from rapid repeated requests / double clicks
        recent_check = (
            supabase.table("rewards")
            .select("id, reason, created_at")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if recent_check.data:
            last_record = recent_check.data[0]
            last_reason = last_record.get("reason") or ""
            last_created = last_record.get("created_at")
            if f"Claimed: {reward['name']}" in last_reason and last_created:
                try:
                    last_time = datetime.fromisoformat(last_created.replace("Z", "+00:00"))
                    diff_seconds = (datetime.now(timezone.utc) - last_time).total_seconds()
                    if diff_seconds < 5:
                        raise HTTPException(
                            status_code=429,
                            detail="Please wait a moment before claiming this reward again."
                        )
                except (ValueError, TypeError):
                    pass

        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        short_id = uuid.uuid4().hex[:4].upper()
        claim_code = f"CLM-{today_str}-{short_id}"
        claim_reason = f"Claimed: {reward['name']} (Ref: {claim_code})"

        insert_res = (
            supabase
            .table("rewards")
            .insert({
                "user_id": current_user["id"],
                "points": -points_cost,
                "reason": claim_reason,
                "complaint_id": None,
            })
            .execute()
        )

        new_row = insert_res.data[0] if insert_res.data else {}

        try:
            supabase.table("notifications").insert({
                "user_id": current_user["id"],
                "title": "Reward Claimed!",
                "message": f"You successfully claimed '{reward['name']}' for {points_cost} points. Ref: {claim_code}",
                "type": "reward_claim",
            }).execute()
        except Exception as notif_err:
            print("Warning: could not insert reward claim notification:", notif_err)

        new_total_points = current_points - points_cost
        claim_item = {
            "id": new_row.get("id"),
            "reward_name": reward["name"],
            "claim_code": claim_code,
            "points_spent": points_cost,
            "status": "Claimed",
            "created_at": new_row.get("created_at") or datetime.now(timezone.utc).isoformat(),
        }

        return {
            "success": True,
            "message": f"Successfully claimed {reward['name']}! Your reference code is {claim_code}.",
            "claim": claim_item,
            "total_points": new_total_points,
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Claim reward error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to claim reward: {str(error)}")


@router.get("/leaderboard")
def get_leaderboard(
    period: Optional[str] = Query("all", pattern="^(all|month)$"),
    current_user: dict = Depends(require_role("citizen")),
):
    """Return the civic leaderboard with bounded database reads and optional period filter."""
    try:
        users = (supabase.table("users").select("id, name, profile_image_url, created_at").eq("role", "citizen").eq("is_active", True).limit(500).execute().data or [])
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
                "email": None,
                "profile_image_url": u.get("profile_image_url"),
                "total_points": points.get(uid, 0),
                "all_time_points": all_time_points.get(uid, 0),
                "complaints_submitted": submitted.get(uid, 0),
                "complaints_resolved": resolved.get(uid, 0),
                "member_since": u.get("created_at")
            })
        board.sort(key=lambda x: (-x["total_points"], -x["complaints_resolved"], -x["complaints_submitted"], x["name"].lower()))
        for i, c in enumerate(board, 1): c["rank"] = i
        rank = next((c["rank"] for c in board if c["user_id"] == current_user["id"]), None)
        return {
            "success": True,
            "total_citizens": len(board),
            "current_user_rank": rank,
            "period": period,
            "leaderboard": board
        }
    except Exception as error:
        print("Get leaderboard error:", error)
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard.")



# ============================================================
# COMMUNITY SUPPORT / FEEDBACK / COMMENTS
# ============================================================

class CommunityFeedbackCreate(BaseModel):
    feedback_type: str


class CommunityCommentCreate(BaseModel):
    comment: str = Field(min_length=1, max_length=1000)


def _community_complaint(complaint_id: str):
    response = (
        supabase.table("complaints")
        .select("id, citizen_id, complaint_code, title, description, status, priority, photo_url, latitude, longitude, address, created_at, category_id, categories(id, name)")
        .eq("id", complaint_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return response.data[0]


@router.get("/community")
def get_community_complaints(current_user: dict = Depends(require_role("citizen"))):
    """Return a bounded recent community feed and its interaction counts."""
    try:
        complaints = (
            supabase.table("complaints")
            .select("id, citizen_id, complaint_code, title, description, status, priority, photo_url, latitude, longitude, address, created_at, category_id, categories(id, name)")
            .neq("status", "Rejected")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
            .data
            or []
        )
        if not complaints: return {"success":True,"count":0,"complaints":[]}
        ids=[c["id"] for c in complaints]
        supports=supabase.table("complaint_supports").select("complaint_id,user_id").in_("complaint_id",ids).limit(5000).execute().data or []
        feedback=supabase.table("complaint_feedback").select("complaint_id,user_id,feedback_type").in_("complaint_id",ids).limit(5000).execute().data or []
        comments=supabase.table("complaint_comments").select("complaint_id,id").in_("complaint_id",ids).limit(5000).execute().data or []
        sc,gc,ngc,cc={}, {}, {}, {}; us=set(); uf={}
        for r in supports:
            cid=r.get("complaint_id"); sc[cid]=sc.get(cid,0)+1
            if r.get("user_id")==current_user["id"]: us.add(cid)
        for r in feedback:
            cid=r.get("complaint_id"); typ=r.get("feedback_type")
            if typ=="genuine": gc[cid]=gc.get(cid,0)+1
            elif typ=="not_genuine": ngc[cid]=ngc.get(cid,0)+1
            if r.get("user_id")==current_user["id"]: uf[cid]=typ
        for r in comments:
            cid=r.get("complaint_id"); cc[cid]=cc.get(cid,0)+1
        for c in complaints:
            cid=c["id"]
            c.update({
                "support_count":sc.get(cid,0),
                "genuine_count":gc.get(cid,0),
                "not_genuine_count":ngc.get(cid,0),
                "comment_count":cc.get(cid,0),
                "user_supported":cid in us,
                "user_feedback":uf.get(cid),
                "is_owner": c.get("citizen_id") == current_user["id"],
            })
        return {"success":True,"count":len(complaints),"complaints":complaints}
    except HTTPException: raise
    except Exception as error:
        print("Get community complaints error:", error)
        raise HTTPException(status_code=500, detail="Failed to fetch community complaints.")



@router.get("/{complaint_id}/community")
def get_community_details(
    complaint_id: str,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        complaint = _community_complaint(complaint_id)
        if complaint.get("status") == "Rejected":
            raise HTTPException(status_code=404, detail="This complaint is not available in the community feed.")

        supports = supabase.table("complaint_supports").select("user_id").eq("complaint_id", complaint_id).execute().data or []
        feedback = supabase.table("complaint_feedback").select("user_id, feedback_type").eq("complaint_id", complaint_id).execute().data or []
        comments = supabase.table("complaint_comments").select("id, user_id, comment, created_at, updated_at").eq("complaint_id", complaint_id).order("created_at", desc=False).execute().data or []

        user_ids = list({row.get("user_id") for row in comments if row.get("user_id")})
        users = []
        if user_ids:
            users = supabase.table("users").select("id, name, profile_image_url").in_("id", user_ids).execute().data or []
        users_by_id = {u["id"]: u for u in users}

        genuine_count = sum(1 for row in feedback if row.get("feedback_type") == "genuine")
        not_genuine_count = sum(1 for row in feedback if row.get("feedback_type") == "not_genuine")
        user_feedback = next((row.get("feedback_type") for row in feedback if row.get("user_id") == current_user["id"]), None)

        safe_comments = []
        for row in comments:
            profile = users_by_id.get(row.get("user_id"), {})
            safe_comments.append({
                "id": row.get("id"),
                "user_id": row.get("user_id"),
                "user_name": profile.get("name") or "Citizen",
                "profile_image_url": profile.get("profile_image_url"),
                "comment": row.get("comment"),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
            })

        is_owner = (complaint.get("citizen_id") == current_user["id"])
        complaint["is_owner"] = is_owner
        return {
            "success": True,
            "complaint": complaint,
            "is_owner": is_owner,
            "support_count": len(supports),
            "user_supported": any(row.get("user_id") == current_user["id"] for row in supports),
            "genuine_count": genuine_count,
            "not_genuine_count": not_genuine_count,
            "user_feedback": user_feedback,
            "comment_count": len(safe_comments),
            "comments": safe_comments,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Get community details error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch community discussion: {str(error)}")


@router.post("/{complaint_id}/support")
def support_community_complaint(
    complaint_id: str,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        complaint = _community_complaint(complaint_id)
        if complaint.get("status") == "Rejected":
            raise HTTPException(status_code=404, detail="This complaint is not available for community support.")
        if complaint.get("citizen_id") == current_user["id"]:
            raise HTTPException(status_code=400, detail="You cannot support your own complaint.")

        existing = supabase.table("complaint_supports").select("id").eq("complaint_id", complaint_id).eq("user_id", current_user["id"]).limit(1).execute().data or []
        if existing:
            return {"success": True, "message": "You already support this complaint."}

        supabase.table("complaint_supports").insert({"complaint_id": complaint_id, "user_id": current_user["id"]}).execute()
        return {"success": True, "message": "Community support added."}
    except HTTPException:
        raise
    except Exception as error:
        print("Support complaint error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to add support: {str(error)}")


@router.delete("/{complaint_id}/support")
def remove_community_support(
    complaint_id: str,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        supabase.table("complaint_supports").delete().eq("complaint_id", complaint_id).eq("user_id", current_user["id"]).execute()
        return {"success": True, "message": "Community support removed."}
    except Exception as error:
        print("Remove support error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to remove support: {str(error)}")


@router.post("/{complaint_id}/feedback")
def add_community_feedback(
    complaint_id: str,
    feedback_data: CommunityFeedbackCreate,
    current_user: dict = Depends(require_role("citizen")),
):
    if feedback_data.feedback_type not in {"genuine", "not_genuine"}:
        raise HTTPException(status_code=400, detail="feedback_type must be 'genuine' or 'not_genuine'.")
    try:
        complaint = _community_complaint(complaint_id)
        if complaint.get("status") == "Rejected":
            raise HTTPException(status_code=404, detail="This complaint is not available for community feedback.")
        if complaint.get("citizen_id") == current_user["id"]:
            raise HTTPException(status_code=400, detail="You cannot vote on the genuineness of your own complaint.")

        existing = supabase.table("complaint_feedback").select("id").eq("complaint_id", complaint_id).eq("user_id", current_user["id"]).limit(1).execute().data or []
        if existing:
            supabase.table("complaint_feedback").update({"feedback_type": feedback_data.feedback_type, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", existing[0]["id"]).execute()
        else:
            supabase.table("complaint_feedback").insert({"complaint_id": complaint_id, "user_id": current_user["id"], "feedback_type": feedback_data.feedback_type}).execute()
        return {"success": True, "message": "Community feedback saved."}
    except HTTPException:
        raise
    except Exception as error:
        print("Community feedback error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to save community feedback: {str(error)}")


@router.delete("/{complaint_id}/feedback")
def remove_community_feedback(
    complaint_id: str,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        supabase.table("complaint_feedback").delete().eq("complaint_id", complaint_id).eq("user_id", current_user["id"]).execute()
        return {"success": True, "message": "Community feedback removed."}
    except Exception as error:
        print("Remove feedback error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to remove community feedback: {str(error)}")


@router.post("/{complaint_id}/comments")
def add_community_comment(
    complaint_id: str,
    comment_data: CommunityCommentCreate,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        complaint = _community_complaint(complaint_id)
        if complaint.get("status") == "Rejected":
            raise HTTPException(status_code=404, detail="This complaint is not available for comments.")

        response = supabase.table("complaint_comments").insert({
            "complaint_id": complaint_id,
            "user_id": current_user["id"],
            "comment": comment_data.comment.strip(),
        }).execute()
        new_comment = response.data[0] if response.data else None
        if new_comment:
            new_comment["user_name"] = current_user.get("name") or "Citizen"
            new_comment["profile_image_url"] = current_user.get("profile_image_url")
        return {"success": True, "comment": new_comment}
    except HTTPException:
        raise
    except Exception as error:
        print("Add comment error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to add comment: {str(error)}")


@router.delete("/{complaint_id}/comments/{comment_id}")
def delete_community_comment(
    complaint_id: str,
    comment_id: str,
    current_user: dict = Depends(require_role("citizen")),
):
    try:
        existing = supabase.table("complaint_comments").select("id, user_id").eq("id", comment_id).eq("complaint_id", complaint_id).limit(1).execute().data or []
        if not existing:
            raise HTTPException(status_code=404, detail="Comment not found.")
        if existing[0]["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete your own comments.")
        supabase.table("complaint_comments").delete().eq("id", comment_id).execute()
        return {"success": True, "message": "Comment deleted."}
    except HTTPException:
        raise
    except Exception as error:
        print("Delete comment error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(error)}")


@router.get("/{complaint_id}")
def get_complaint(
    complaint_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single complaint.

    Citizens can only view their own complaints.
    Admins and workers can view any complaint.

    The response also includes complete status history.
    """

    try:
        complaint = get_complaint_for_user(
            complaint_id,
            current_user,
        )

        # Get status history
        history_response = (
            supabase
            .table("complaint_status_history")
            .select("*")
            .eq("complaint_id", complaint_id)
            .order("created_at", desc=False)
            .execute()
        )

        status_history = history_response.data or []

        return {
            "success": True,
            "complaint": complaint,
            "status_history": status_history,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Get complaint error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch complaint: {str(error)}",
        )


# ============================================================
# GET COMPLAINT STATUS HISTORY
# ============================================================

@router.get("/{complaint_id}/history")
def get_complaint_history(
    complaint_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get the complete status history of a complaint.

    Citizens can only access history for their own complaints.
    Admins and workers can access any complaint history.
    """

    try:
        # First verify that the complaint exists
        # and that the current user can access it.
        get_complaint_for_user(
            complaint_id,
            current_user,
        )

        history_response = (
            supabase
            .table("complaint_status_history")
            .select("*")
            .eq("complaint_id", complaint_id)
            .order("created_at", desc=False)
            .execute()
        )

        history = history_response.data or []

        return {
            "success": True,
            "complaint_id": complaint_id,
            "count": len(history),
            "history": history,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Get complaint history error:", error)

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to fetch complaint status history: "
                f"{str(error)}"
            ),
        )


# ============================================================
# GET CITIZEN'S OWN COMPLAINTS
# ============================================================

@router.get("/citizen/{citizen_id}")
def get_citizen_complaints(
    citizen_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Citizens can only fetch their own complaints.

    Admins can fetch complaints for any citizen.
    Workers are not allowed to use this endpoint.
    """

    try:
        # Citizen cannot request another citizen's complaints
        if current_user["role"] == "citizen":
            if citizen_id != current_user["id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only view your own complaints.",
                )

        elif current_user["role"] == "worker":
            raise HTTPException(
                status_code=403,
                detail="Workers cannot access citizen complaint history.",
            )

        elif current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this resource.",
            )

        response = (
            supabase
            .table("complaints")
            .select(
                """
                *,
                categories (
                    id,
                    name,
                    description
                ),
                workers (
                    id,
                    worker_code,
                    department,
                    specialization
                )
                """
            )
            .eq("citizen_id", citizen_id)
            .order("created_at", desc=True)
            .execute()
        )

        complaints = response.data or []

        return {
            "success": True,
            "count": len(complaints),
            "complaints": complaints,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Get citizen complaints error:", error)

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to fetch citizen complaints: "
                f"{str(error)}"
            ),
        )


# ============================================================
# UPDATE COMPLAINT STATUS
# ============================================================

@router.patch("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    status_update: ComplaintStatusUpdate,
    current_user: dict = Depends(
        require_role("admin", "worker")
    ),
):
    """
    Update complaint status.

    changed_by is always taken from the authenticated user.
    It is never accepted from the frontend.
    """

    allowed_statuses = {
        "Submitted",
        "Verified",
        "Assigned",
        "In Progress",
        "Resolved",
        "Rejected",
    }

    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                + ", ".join(sorted(allowed_statuses))
            ),
        )

    try:
        # Get existing complaint
        existing_response = (
            supabase
            .table("complaints")
            .select(
                """
                id,
                citizen_id,
                status,
                assigned_worker_id
                """
            )
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )

        if not existing_response.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found.",
            )

        existing_complaint = existing_response.data[0]

        old_status = existing_complaint["status"]

        # Worker authorization:
        # worker can update only complaints assigned to them.
        if current_user["role"] == "worker":
            worker_response = (
                supabase
                .table("workers")
                .select("id")
                .eq("user_id", current_user["id"])
                .limit(1)
                .execute()
            )

            if not worker_response.data:
                raise HTTPException(
                    status_code=403,
                    detail="Worker profile not found.",
                )

            worker_id = worker_response.data[0]["id"]

            if (
                existing_complaint["assigned_worker_id"]
                != worker_id
            ):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "You can only update complaints "
                        "assigned to you."
                    ),
                )

        update_data = {
            "status": status_update.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if status_update.status == "Resolved":
            update_data["resolved_at"] = (
                datetime.now(timezone.utc).isoformat()
            )
        else:
            update_data["resolved_at"] = None

        update_response = (
            supabase
            .table("complaints")
            .update(update_data)
            .eq("id", complaint_id)
            .execute()
        )

        if not update_response.data:
            raise HTTPException(
                status_code=500,
                detail="Complaint status could not be updated.",
            )

        updated_complaint = update_response.data[0]

        # Status history
        history_data = {
            "complaint_id": complaint_id,
            "old_status": old_status,
            "new_status": status_update.status,
            "changed_by": current_user["id"],
            "remarks": status_update.remarks,
        }

        try:
            supabase.table(
                "complaint_status_history"
            ).insert(history_data).execute()

        except Exception as history_error:
            print(
                "Warning: Failed to create status history:",
                history_error,
            )

        return {
            "success": True,
            "message": "Complaint status updated successfully.",
            "complaint": updated_complaint,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Update complaint status error:", error)

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update complaint status: "
                f"{str(error)}"
            ),
        )


@router.get("/{complaint_id}/completion-evidence")
def get_complaint_completion_evidence(
    complaint_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve work completion evidence for a complaint.
    Accessible by:
    - The citizen who filed the complaint
    - The worker assigned to the complaint
    - Any administrator
    """
    try:
        comp_res = (
            supabase.table("complaints")
            .select("id, complaint_code, title, status, photo_url, citizen_id, assigned_worker_id, verified_at, verified_by")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        if not comp_res.data:
            raise HTTPException(status_code=404, detail="Complaint not found.")

        complaint = comp_res.data[0]

        # Role-based authorization: citizen owner, assigned worker, or admin
        user_role = current_user.get("role")
        user_id = current_user.get("id")

        if user_role == "citizen" and complaint.get("citizen_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only view completion evidence for your own complaints.")

        if user_role == "worker":
            worker_res = (
                supabase.table("workers")
                .select("id")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            worker_id = worker_res.data[0]["id"] if worker_res.data else None
            if complaint.get("assigned_worker_id") != worker_id:
                raise HTTPException(status_code=403, detail="You can only view completion evidence for complaints assigned to you.")

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
        history_rows = hist_res.data or []

        for row in history_rows:
            rem = row.get("remarks") or ""
            if "completion_evidence" in rem:
                try:
                    evidence = json.loads(rem)
                    break
                except Exception:
                    pass

        for row in history_rows:
            rem = row.get("remarks") or ""
            if "rework_required" in rem:
                try:
                    parsed = json.loads(rem)
                    rework_reason = parsed.get("rework_reason")
                    break
                except Exception:
                    pass

        # Determine verification status
        comp_status = complaint.get("status")
        if comp_status == "Verified":
            verification_status = "verified"
        elif comp_status == "In Progress" and rework_reason:
            verification_status = "rework_required"
        elif comp_status == "Resolved" and evidence:
            verification_status = "submitted"
        else:
            verification_status = "pending" if not evidence else "submitted"

        return {
            "success": True,
            "complaint_id": complaint_id,
            "complaint_code": complaint.get("complaint_code"),
            "status": comp_status,
            "original_photo_url": complaint.get("photo_url"),
            "evidence": evidence,
            "rework_reason": rework_reason,
            "verification_status": verification_status,
            "is_verified": comp_status == "Verified",
            "verified_at": complaint.get("verified_at"),
            "verified_by": complaint.get("verified_by"),
        }
    except HTTPException:
        raise
    except Exception as error:
        print("Get completion evidence error:", error)
        raise HTTPException(status_code=500, detail=f"Failed to fetch completion evidence: {str(error)}")
