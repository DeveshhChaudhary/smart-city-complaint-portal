from fastapi import APIRouter, Depends, HTTPException
from app.config.supabase import supabase
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"]
)


# ============================================================
# GET MY NOTIFICATIONS
# ============================================================

@router.get("/")
def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    try:
        response = (
            supabase
            .table("notifications")
            .select(
                """
                id,
                user_id,
                complaint_id,
                title,
                message,
                type,
                is_read,
                created_at
                """
            )
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )

        notifications = response.data or []

        unread_count = sum(
            1
            for notification in notifications
            if not notification.get("is_read", False)
        )

        return {
            "success": True,
            "count": len(notifications),
            "unread_count": unread_count,
            "notifications": notifications,
        }

    except Exception as error:
        print("Get notifications error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch notifications: {str(error)}"
        )


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        existing_response = (
            supabase
            .table("notifications")
            .select("id, user_id")
            .eq("id", notification_id)
            .limit(1)
            .execute()
        )

        notifications = existing_response.data or []

        if not notifications:
            raise HTTPException(
                status_code=404,
                detail="Notification not found."
            )

        notification = notifications[0]

        if notification["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to modify this notification."
            )

        response = (
            supabase
            .table("notifications")
            .update({
                "is_read": True
            })
            .eq("id", notification_id)
            .eq("user_id", current_user["id"])
            .execute()
        )

        return {
            "success": True,
            "message": "Notification marked as read.",
            "notification": (
                response.data[0]
                if response.data
                else None
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Mark notification read error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update notification: {str(error)}"
        )


# ============================================================
# MARK ALL AS READ
# ============================================================

@router.patch("/read-all")
def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    try:
        response = (
            supabase
            .table("notifications")
            .update({
                "is_read": True
            })
            .eq("user_id", current_user["id"])
            .eq("is_read", False)
            .execute()
        )

        return {
            "success": True,
            "message": "All notifications marked as read.",
            "count": len(response.data or []),
        }

    except Exception as error:
        print("Mark all notifications read error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update notifications: {str(error)}"
        )