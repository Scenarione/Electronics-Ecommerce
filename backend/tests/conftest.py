import os

from sqlalchemy.engine import make_url

# Never let the suite touch the application's data. Both names are fixed test DBs.
base_url = make_url(
    os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://parts:local-development-only@127.0.0.1:5432/parts_store",
    )
)
os.environ["DATABASE_URL"] = base_url.set(database="parts_store_test").render_as_string(
    hide_password=False
)
os.environ["MONGO_DB"] = "parts_store_test"
os.environ["APP_ENV"] = "test"

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.catalog_setup import initialize_catalog
from app.db import catalog, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def initialize_test_databases():
    with psycopg.connect(
        base_url.set(drivername="postgresql").render_as_string(hide_password=False),
        autocommit=True,
        connect_timeout=5,
    ) as connection:
        if not connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = 'parts_store_test'"
        ).fetchone():
            connection.execute("CREATE DATABASE parts_store_test")
    command.upgrade(Config("alembic.ini"), "head")
    initialize_catalog()


@pytest.fixture(autouse=True)
def clean_test_data():
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE auth_sessions, payments, order_items, orders, inventory, sellable_items, users CASCADE"
            )
        )
    catalog.products.delete_many({})


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
