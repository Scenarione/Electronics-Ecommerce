import hashlib
import secrets
from datetime import timedelta

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthSession, User, now

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("dummy-password-for-timing")


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def user_data(user):
    return {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role}


def create_session(db: Session, user: User, response: Response):
    token, csrf = secrets.token_urlsafe(32), secrets.token_hex(32)
    db.add(
        AuthSession(
            token_hash=digest(token),
            user_id=user.id,
            csrf_token=csrf,
            expires_at=now() + timedelta(days=7),
        )
    )
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=settings().cookie_secure,
        samesite="lax",
        max_age=604800,
        path="/",
    )
    return {"user": user_data(user), "csrf_token": csrf}


def current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("session")
    auth = db.get(AuthSession, digest(token)) if token else None
    if not auth or auth.expires_at <= now():
        raise HTTPException(401, "Please sign in")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        if not secrets.compare_digest(request.headers.get("X-CSRF-Token", ""), auth.csrf_token):
            raise HTTPException(403, "Invalid CSRF token")
    request.state.auth = auth
    user = db.get(User, auth.user_id)
    if not user:
        raise HTTPException(401, "Please sign in")
    return user


def admin(user: User = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return user
