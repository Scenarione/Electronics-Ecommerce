"""Application configuration loaded from environment variables and .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for local development and deployment."""

    database_url: str = (
        "postgresql+psycopg://parts:local-development-only@127.0.0.1:5432/parts_store"
    )
    mongo_url: str = "mongodb://127.0.0.1:27017"
    mongo_db: str = "parts_store"
    app_env: str = "development"
    cookie_secure: bool = False
    seed_admin_password: str = "LocalAdmin123!"
    seed_customer_password: str = "LocalCustomer123!"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def settings() -> Settings:
    """Create cached settings and reject unsafe production defaults."""
    config = Settings()

    if config.app_env.lower() == "production":
        if not config.cookie_secure:
            raise RuntimeError("Production requires COOKIE_SECURE=true and HTTPS")
        if config.seed_admin_password == "LocalAdmin123!":
            raise RuntimeError("Production requires a non-default admin seed password")
        if config.seed_customer_password == "LocalCustomer123!":
            raise RuntimeError("Production requires a non-default customer seed password")

    return config
