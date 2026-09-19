from fastapi import HTTPException

from .config import settings


def simulate_payment(outcome: str):
    if settings().app_env not in ("development", "test"):
        raise HTTPException(403, "Simulated checkout is disabled outside development and test")
    return outcome == "success"
