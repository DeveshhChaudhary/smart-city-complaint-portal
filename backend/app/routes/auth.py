from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel, Field

from app.config.supabase import supabase
from app.utils.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    profile_image_url: Optional[str] = Field(default=None, max_length=1000)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "profile_image_url": user.get("profile_image_url"),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at"),
    }


@router.post("/register")
def register(request: RegisterRequest):
    try:
        email = request.email.lower().strip()
        existing_response = supabase.table("users").select("id").eq("email", email).execute()
        if existing_response.data:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        user_data = {
            "name": request.name.strip(),
            "email": email,
            "phone": request.phone,
            "password_hash": hash_password(request.password),
            "role": "citizen",
            "is_active": True,
        }
        response = supabase.table("users").insert(user_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Account could not be created.")

        user = response.data[0]
        token = create_access_token(user)
        return {
            "success": True,
            "message": "Account created successfully.",
            "access_token": token,
            "token_type": "bearer",
            "user": public_user(user),
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/login")
def login(request: LoginRequest):
    try:
        response = (
            supabase.table("users")
            .select("id, name, email, phone, password_hash, role, profile_image_url, is_active, created_at")
            .eq("email", request.email.lower().strip())
            .single()
            .execute()
        )
        user = response.data
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Your account has been deactivated.")

        stored_password = user.get("password_hash")
        if not stored_password or not verify_password(request.password, stored_password):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        token_user = dict(user)
        token_user["updated_at"] = datetime.now(timezone.utc).isoformat()
        token = create_access_token(token_user)
        return {
            "success": True,
            "message": "Login successful.",
            "access_token": token,
            "token_type": "bearer",
            "user": public_user(user),
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    try:
        response = (
            supabase.table("users")
            .select("id, name, email, phone, role, profile_image_url, is_active, created_at")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="User profile not found.")
        return {"success": True, "user": public_user(response.data)}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG, WEBP, or GIF images are allowed.",
            )

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="The selected image is empty.")

        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Profile image must be 5 MB or smaller.")

        bucket_name = "profile-images"
        try:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
        except Exception:
            # Bucket may already exist; continue with the upload.
            pass

        extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
        }[file.content_type]

        file_path = f"{current_user['id']}/profile.{extension}"

        supabase.storage.from_(bucket_name).upload(
            file_path,
            file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "true",
            },
        )

        public_url_response = supabase.storage.from_(bucket_name).get_public_url(file_path)
        public_url = (
            public_url_response.get("publicUrl")
            if isinstance(public_url_response, dict)
            else str(public_url_response)
        )

        # Cache-bust the browser when the citizen replaces an existing photo.
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
            raise HTTPException(status_code=500, detail="Profile image could not be saved.")

        return {
            "success": True,
            "message": "Profile photo uploaded successfully.",
            "profile_image_url": public_url,
            "user": public_user(updated.data[0]),
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Profile photo upload failed: {error}")


@router.patch("/profile")
def update_profile(request: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        response = (
            supabase.table("users")
            .update({
                "name": request.name.strip(),
                "phone": request.phone.strip() if request.phone else None,
                "profile_image_url": request.profile_image_url.strip() if request.profile_image_url else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="User profile not found.")
        return {"success": True, "message": "Profile updated successfully.", "user": public_user(response.data[0])}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.patch("/password")
def change_password(request: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    try:
        response = (
            supabase.table("users")
            .select("id, password_hash, is_active")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )
        user = response.data
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Your account has been deactivated.")
        if not verify_password(request.current_password, user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        if request.current_password == request.new_password:
            raise HTTPException(status_code=400, detail="New password must be different from the current password.")

        updated = (
            supabase.table("users")
            .update({
                "password_hash": hash_password(request.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", current_user["id"])
            .execute()
        )
        if not updated.data:
            raise HTTPException(status_code=500, detail="Password could not be changed.")
        return {"success": True, "message": "Password changed successfully."}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
