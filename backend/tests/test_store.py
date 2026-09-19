from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError, WriteError
from sqlalchemy import event, func, select
from sqlalchemy.exc import OperationalError

from app import catalog as catalog_module
from app.config import settings
from app.db import SessionLocal, catalog, engine
from app.main import app
from app.models import Inventory, Order, OrderItem, Payment, SellableItem, User
from app.reconcile import reconcile
from app.seed import fixture, seed

pytestmark = pytest.mark.integration


def register(client, admin=False):
    response = client.post(
        "/api/v1/users",
        json={
            "email": f"{uuid4()}@example.com",
            "name": "Test Customer",
            "password": "TestPassword123!",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    client.headers["X-CSRF-Token"] = body["csrf_token"]
    if admin:
        with SessionLocal() as db:
            db.get(User, UUID(body["user"]["id"])).role = "admin"
            db.commit()
    return body["user"]


def product_payload(quantity=5, index=0):
    doc, price = fixture(index)
    identifier = str(uuid4())
    return {
        "id": identifier,
        "sku": f"TEST-{identifier}",
        "slug": f"test-{identifier}",
        "name": doc["name"],
        "brand": doc["brand"],
        "category": doc["category"],
        "description": doc["description"],
        "images": [],
        "specifications": doc["specifications"],
        "price": str(price),
        "quantity": quantity,
    }


def create_product(client, quantity=5, index=0):
    body = product_payload(quantity, index)
    response = client.post("/api/v1/products", json=body)
    assert response.status_code == 201, response.text
    return response.json(), body


def checkout_body(product, outcome="success"):
    return {
        "items": [{"item_id": product["id"], "quantity": 1}],
        "shipping_address": {
            "recipient": "Test Customer",
            "line1": "123 Suthep Road",
            "city": "Chiang Mai",
            "postal_code": "50200",
            "country": "TH",
        },
        "simulation": outcome,
    }


def purchase(client, body, key=None):
    return client.post(
        "/api/v1/orders", json=body, headers={"Idempotency-Key": key or str(uuid4())}
    )


def test_required_endpoints_and_category_validation(client):
    user = register(client, True)
    assert client.get(f"/api/v1/users/{user['id']}").json()["email"] == user["email"]
    for index in (0, 1, 4):
        product, body = create_product(client, index=index)
        assert client.get(f"/api/v1/products/{product['id']}").status_code == 200
        body["id"], body["sku"], body["slug"] = str(uuid4()), str(uuid4()), str(uuid4())
        body["specifications"]["unexpected"] = "bad"
        assert client.post("/api/v1/products", json=body).status_code == 400
    listing = client.get("/api/v1/products?page_size=2").json()
    assert listing["total"] == 3 and len(listing["items"]) == 2
    assert client.get("/api/v1/products?page_size=101").status_code == 400
    assert client.get('/api/v1/products?category=cpu&filters={"socket":"AM5"}').json()["total"] == 1
    assert (
        client.get('/api/v1/products?category=cpu&filters={"socket":{"$ne":null}}').status_code
        == 400
    )
    assert len(client.get("/api/v1/categories").json()) == 6
    assert purchase(client, checkout_body(product)).status_code == 201


def test_mongo_validator_rejects_bad_specifications(client):
    register(client, True)
    product, _ = create_product(client)
    with pytest.raises(WriteError):
        catalog.products.update_one(
            {"_id": product["id"]}, {"$set": {"specifications.cores": "six"}}
        )


def test_idempotency_stock_snapshot_and_shipping(client):
    register(client, True)
    product, body = create_product(client, 2)
    key = str(uuid4())
    order = purchase(client, checkout_body(product), key)
    assert order.status_code == 201
    repeated = purchase(client, checkout_body(product), key)
    assert repeated.status_code == 200 and repeated.json()["id"] == order.json()["id"]
    changed = checkout_body(product)
    changed["items"][0]["quantity"] = 2
    assert purchase(client, changed, key).status_code == 409
    assert client.get(f"/api/v1/products/{product['id']}").json()["quantity"] == 1
    edit = {k: body[k] for k in ("name", "brand", "description", "images", "specifications")}
    edit["name"] = "Renamed after purchase"
    assert client.patch(f"/api/v1/products/{product['id']}", json=edit).status_code == 200
    client.patch(
        f"/api/v1/products/{product['id']}/commerce", json={"price": "1.00", "active": True}
    )
    detail = client.get(f"/api/v1/orders/{order.json()['id']}").json()
    assert detail["items"][0]["name"] == product["name"]
    assert Decimal(detail["total"]) == Decimal(product["price"])
    assert client.post(f"/api/v1/admin/orders/{detail['id']}/ship").json()["status"] == "shipped"


def test_failed_payment_preserves_stock(client):
    register(client, True)
    product, _ = create_product(client, 2)
    response = purchase(client, checkout_body(product, "failure"))
    assert response.status_code == 201 and response.json()["status"] == "payment_failed"
    assert response.json()["payment"]["outcome"] == "failure"
    assert client.get(f"/api/v1/products/{product['id']}").json()["quantity"] == 2
    assert client.post(f"/api/v1/admin/orders/{response.json()['id']}/ship").status_code == 409


def test_authorization_csrf_and_session_logout(client):
    register(client, True)
    product, _ = create_product(client)
    order = purchase(client, checkout_body(product)).json()
    with TestClient(app) as other:
        register(other)
        assert other.get(f"/api/v1/orders/{order['id']}").status_code == 404
        assert other.post("/api/v1/products", json=product_payload()).status_code == 403
        assert (
            other.post(f"/api/v1/products/{product['id']}/inventory", json={"delta": 1}).status_code
            == 403
        )
        other.headers.pop("X-CSRF-Token")
        assert purchase(other, checkout_body(product)).status_code == 403
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "wrong"},
            headers={"Origin": "https://evil.example"},
        ).status_code
        == 403
    )


@pytest.mark.parametrize("same_key", [False, True])
def test_concurrent_last_unit_and_duplicate_submissions(client, same_key):
    register(client, True)
    product, _ = create_product(client, 1)
    barrier = Barrier(2)
    shared_key = str(uuid4())
    cookies, csrf = dict(client.cookies), client.headers["X-CSRF-Token"]

    def attempt(_):
        with TestClient(app) as concurrent:
            concurrent.cookies.update(cookies)
            concurrent.headers["X-CSRF-Token"] = csrf
            barrier.wait()
            response = purchase(
                concurrent, checkout_body(product), shared_key if same_key else str(uuid4())
            )
            return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(attempt, range(2)))
    assert statuses == ([200, 201] if same_key else [201, 409])
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Order)) == 1
        assert db.get(Inventory, UUID(product["id"])).quantity == 0


def test_catalog_outage_and_recovery(client, monkeypatch):
    register(client, True)
    payload = product_payload()
    real_products = catalog_module.catalog.products

    def fail_update(*args, **kwargs):
        raise ServerSelectionTimeoutError("simulated outage")

    with monkeypatch.context() as m:
        m.setattr(type(real_products), "update_one", fail_update)
        assert client.post("/api/v1/products", json=payload).status_code == 503
    with SessionLocal() as db:
        item = db.get(SellableItem, UUID(payload["id"]))
        assert item.catalog_pending and not item.active
    assert client.get("/api/v1/products").json()["total"] == 0
    assert client.post("/api/v1/products", json=payload).status_code == 201
    assert reconcile(True) == []
    client.patch(
        f"/api/v1/products/{payload['id']}/commerce",
        json={"price": payload["price"], "active": False},
    )
    reconcile(True)
    with SessionLocal() as db:
        assert not db.get(SellableItem, UUID(payload["id"])).active


def test_reconcile_completes_pending_catalog(client):
    register(client, True)
    product, _ = create_product(client)
    with SessionLocal() as db:
        item = db.get(SellableItem, UUID(product["id"]))
        item.active, item.catalog_pending = False, True
        db.commit()
    assert reconcile(False)[0]["issue"] == "pending_creation"
    assert reconcile(True)[0]["action"] == "activated"
    assert client.get(f"/api/v1/products/{product['id']}").status_code == 200


def test_product_creation_retry_cannot_change_opening_stock(client):
    register(client, True)
    product, body = create_product(client, 7)
    assert client.post("/api/v1/products", json=body).status_code == 201
    body["quantity"] = 30
    assert client.post("/api/v1/products", json=body).status_code == 409
    assert client.get(f"/api/v1/products/{product['id']}").json()["quantity"] == 7


def test_checkout_mongo_outage_has_no_writes(client, monkeypatch):
    register(client, True)
    product, _ = create_product(client)
    with monkeypatch.context() as m:
        m.setattr(
            type(catalog.products),
            "find",
            lambda *a, **k: (_ for _ in ()).throw(ServerSelectionTimeoutError("outage")),
        )
        assert purchase(client, checkout_body(product)).status_code == 503
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Order)) == 0
        assert db.get(Inventory, UUID(product["id"])).quantity == 5


def test_postgres_failure_rolls_back_whole_checkout(client):
    register(client, True)
    product, _ = create_product(client)

    def fail_payment(connection, cursor, statement, parameters, context, executemany):
        if statement.startswith("INSERT INTO payments"):
            raise OperationalError("simulated write failure", {}, Exception("test"))

    event.listen(engine, "before_cursor_execute", fail_payment)
    try:
        assert purchase(client, checkout_body(product)).status_code == 503
    finally:
        event.remove(engine, "before_cursor_execute", fail_payment)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Order)) == 0
        assert db.scalar(select(func.count()).select_from(OrderItem)) == 0
        assert db.get(Inventory, UUID(product["id"])).quantity == 5


def test_payment_simulation_disabled_in_production(client, monkeypatch):
    register(client, True)
    product, _ = create_product(client)
    monkeypatch.setattr(settings(), "app_env", "production")
    assert purchase(client, checkout_body(product)).status_code == 403


def test_seed_counts_and_repeatability():
    seed()
    with SessionLocal() as db:
        first = {
            model.__tablename__: db.scalar(select(func.count()).select_from(model))
            for model in (User, SellableItem, Inventory, Order, OrderItem, Payment)
        }
        stock = list(
            db.execute(select(Inventory.item_id, Inventory.quantity).order_by(Inventory.item_id))
        )
    seed()
    with SessionLocal() as db:
        second = {
            model.__tablename__: db.scalar(select(func.count()).select_from(model))
            for model in (User, SellableItem, Inventory, Order, OrderItem, Payment)
        }
        assert stock == list(
            db.execute(select(Inventory.item_id, Inventory.quantity).order_by(Inventory.item_id))
        )
    assert first == second and sum(first.values()) >= 1000
    assert catalog.products.count_documents({}) == 1000
    assert catalog.category_definitions.count_documents({}) == 6
