"""Password hashing, session creation, authentication, and authorization helpers."""
import hashlib
import secrets
from datetime import timedelta
from typing import Any

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthSession, User, now

SESSION_COOKIE = "session"
SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
SESSION_MAX_AGE_DAYS = 7
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("dummy-password-for-timing")


def digest(token: str) -> str:
    """Hash a session token before storing or looking it up in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def user_data(user: User) -> dict[str, Any]:
    """Expose safe user fields without returning password or session data."""
    return {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role}


def create_session(db: Session, user: User, response: Response) -> dict[str, Any]:
    """Create a session and place its raw token in an HTTP-only cookie."""
    token, csrf = secrets.token_urlsafe(32), secrets.token_hex(32)
    db.add(
        AuthSession(
            token_hash=digest(token),
            user_id=user.id,
            csrf_token=csrf,
            expires_at=now() + timedelta(days=SESSION_MAX_AGE_DAYS),
        )
    )
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=settings().cookie_secure,
        samesite="lax",
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )
    return {"user": user_data(user), "csrf_token": csrf}


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the current session and enforce CSRF protection on writes."""
    token = request.cookies.get(SESSION_COOKIE)
    auth = db.get(AuthSession, digest(token)) if token else None

    if not auth or auth.expires_at <= now():
        raise HTTPException(401, "Please sign in")

    if request.method not in SAFE_METHODS:
        csrf_token = request.headers.get("X-CSRF-Token", "")
        if not secrets.compare_digest(csrf_token, auth.csrf_token):
            raise HTTPException(403, "Invalid CSRF token")

    request.state.auth = auth
    user = db.get(User, auth.user_id)
    if not user:
        raise HTTPException(401, "Please sign in")
    return user


def admin(user: User = Depends(current_user)) -> User:
    """Require the authenticated user to have the administrator role."""
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return user
