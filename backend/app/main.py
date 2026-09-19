import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError, PyMongoError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from . import accounts, catalog, orders
from .db import SessionLocal, mongo_client

app = FastAPI(title="Circuit Supply API", version="1.0.0")
logger = logging.getLogger("store")
for router in (accounts.router, catalog.router, orders.router):
    app.include_router(router)


def error(status, message):
    return JSONResponse(
        status_code=status, content={"error": {"status": status, "message": message}}
    )


@app.middleware("http")
async def same_origin(request: Request, call_next):
    # Protect login/registration too, before a session CSRF token exists.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if request.headers.get("sec-fetch-site") == "cross-site" or (
            origin and origin.rstrip("/") != f"{request.url.scheme}://{request.headers.get('host')}"
        ):
            return error(403, "Cross-origin writes are not allowed")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return error(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    messages = [f"{'.'.join(str(v) for v in e['loc'])}: {e['msg']}" for e in exc.errors()]
    return error(400, "; ".join(messages))


@app.exception_handler(IntegrityError)
@app.exception_handler(DuplicateKeyError)
async def conflict_error(request, exc):
    return error(409, "A unique value or database constraint conflicts with this request")


@app.exception_handler(SQLAlchemyError)
@app.exception_handler(PyMongoError)
async def database_error(request, exc):
    logger.error("Database operation failed: %s", type(exc).__name__)
    return error(503, "A database is temporarily unavailable. Please retry.")


@app.get("/api/v1/health")
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    mongo_client.admin.command("ping")
    return {"status": "ok", "postgresql": "ok", "mongodb": "ok"}
