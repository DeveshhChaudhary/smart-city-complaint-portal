from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from app.config.settings import settings
from app.config.supabase import supabase


password_hash = PasswordHash.recommended()

bearer_scheme = HTTPBearer(auto_error=False)


def validate_jwt_configuration():
    if not settings.JWT_SECRET:
        raise RuntimeError(
            "JWT_SECRET is missing. Add JWT_SECRET to backend/.env"
        )


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    try:
        return password_hash.verify(
            password,
            hashed_password,
        )
    except Exception:
        return False


def create_access_token(user: dict) -> str:
    validate_jwt_configuration()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=settings.JWT_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> dict:
    validate_jwt_configuration()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )

        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


def get_current_user(
    credentials: Optional[
        HTTPAuthorizationCredentials
    ] = Depends(bearer_scheme),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    payload = decode_access_token(
        credentials.credentials
    )

    user_id = payload["sub"]

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
                created_at
                """
            )
            .eq("id", user_id)
            .single()
            .execute()
        )

        user = response.data

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account was not found.",
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        return user

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unable to verify user account: {error}",
        )


def require_role(*allowed_roles: str):
    def role_dependency(
        current_user: dict = Depends(
            get_current_user
        ),
    ):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )

        return current_user

    return role_dependency