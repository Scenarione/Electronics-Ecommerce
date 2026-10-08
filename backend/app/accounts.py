"""Account API endpoints: registration, authentication, and profiles."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .schemas import Login, Profile, Register
from .security import DUMMY_HASH, create_session, current_user, passwords, user_data

router = APIRouter(prefix="/api/v1", tags=["accounts"])
MIN_PASSWORD_LENGTH = 8


def normalize_email(email: str) -> str:
    """Normalize email input consistently for registration and authentication."""
    return email.strip().lower()


@router.post("/users", status_code=201)
def register(body: Register, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(str(body.email))
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email is already registered")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

    full_name = (
        body.name.strip()
        if body.name
        else f"{body.first_name or ''} {body.last_name or ''}".strip()
    )
    user = User(
        email=email,
        name=full_name,
        first_name=body.first_name.strip() if body.first_name else None,
        last_name=body.last_name.strip() if body.last_name else None,
        password_hash=passwords.hash(body.password),
    )
    db.add(user)
    db.flush()

    # CP2 Dual Write: write to legacy column 'name' in PostgreSQL if it exists
    if full_name:
        try:
            from sqlalchemy import text
            with db.begin_nested():
                db.execute(
                    text("UPDATE users SET name = :name WHERE id = :id"),
                    {"name": full_name, "id": user.id},
                )
        except Exception:
            pass

    result = create_session(db, user, response)
    db.commit()
    return result


@router.post("/auth/login")
def login(body: Login, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(str(body.email))
    user = db.scalar(select(User).where(User.email == email))
    valid = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Incorrect email or password")
    result = create_session(db, user, response)
    db.commit()
    return result


@router.get("/auth/me")
def me(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"user": user_data(user, db), "csrf_token": request.state.auth.csrf_token}


@router.post("/auth/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    db.delete(request.state.auth)
    db.commit()
    response.delete_cookie("session", path="/")


@router.get("/users/{user_id}")
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    return user_data(target, db)


@router.patch("/users/me")
def update_me(body: Profile, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.name is not None:
        user.name = body.name.strip()
    if body.first_name is not None:
        user.first_name = body.first_name.strip()
    if body.last_name is not None:
        user.last_name = body.last_name.strip()
    db.flush()

    # CP2 Dual Write: sync legacy column 'name' in PostgreSQL if it exists
    full_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()
    if full_name:
        try:
            from sqlalchemy import text
            with db.begin_nested():
                db.execute(
                    text("UPDATE users SET name = :name WHERE id = :id"),
                    {"name": full_name, "id": user.id},
                )
        except Exception:
            pass

    db.commit()
    return user_data(user, db)
