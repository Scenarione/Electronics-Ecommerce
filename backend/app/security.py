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


def user_data(user: User, db: Session | None = None) -> dict[str, Any]:
    """Expose safe user fields without returning password or session data.
    
    In CP2, smoothly supports reading from new fields (first_name, last_name)
    with seamless fallback to legacy column 'name' for historical records.
    """
    display_name = user.name
    if not display_name and db:
        try:
            from sqlalchemy import text
            with db.begin_nested():
                legacy = db.scalar(text("SELECT name FROM users WHERE id = :id"), {"id": user.id})
                if legacy:
                    display_name = str(legacy).strip()
        except Exception:
            pass

    display_name = display_name or f"{user.first_name or ''} {user.last_name or ''}".strip()
    first = user.first_name or (display_name.split()[0] if display_name else "")
    last = user.last_name or (" ".join(display_name.split()[1:]) if len(display_name.split()) > 1 else "")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": display_name,
        "first_name": first,
        "last_name": last,
        "role": user.role,
    }


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
    using_bearer = False
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            using_bearer = True

    auth = db.get(AuthSession, digest(token)) if token else None

    if not auth or auth.expires_at <= now():
        raise HTTPException(401, "Please sign in")

    if not using_bearer and request.method not in SAFE_METHODS:
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
