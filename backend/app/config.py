from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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
def settings():
    config = Settings()
    if config.app_env == "production" and not config.cookie_secure:
        raise RuntimeError("Production requires COOKIE_SECURE=true and HTTPS")
    return config
