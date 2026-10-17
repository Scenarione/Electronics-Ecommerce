"""Pytest integration test verifying race condition prevention under concurrent load.

Demonstrates Checkpoint 3 Concurrency Control (Option B: Pessimistic Concurrency Control).
20 concurrent threads attempt to purchase the LAST unit of stock.
Asserts exactly 1 success, 19 conflicts (HTTP 409), and 0 remaining stock in database.
"""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.db import SessionLocal
from app.main import app
from app.models import Inventory, Order, SellableItem, User
from tests.test_store import register, create_product, checkout_body, purchase

pytestmark = pytest.mark.integration


def test_concurrency_race_condition_pessimistic_lock(client):
    """Prove race condition prevention: 20 parallel threads competing for 1 unit of stock."""
    # 1. Setup admin and create product with stock = 1
    register(client, admin=True)
    product, _ = create_product(client, quantity=1)
    target_id = UUID(product["id"])

    # 2. Setup 20 concurrent threads with barrier
    num_threads = 20
    barrier = Barrier(num_threads)
    shared_body = checkout_body(product)

    # Pre-register 20 client sessions with distinct users
    user_clients = []
    for _ in range(num_threads):
        tc = TestClient(app)
        register(tc)
        user_clients.append(tc)

    def attempt_checkout(thread_idx):
        tc = user_clients[thread_idx]
        # Align all threads to fire simultaneously
        barrier.wait()
        res = purchase(tc, shared_body, key=f"race-key-{uuid4()}")
        return res.status_code

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        statuses = list(executor.map(attempt_checkout, range(num_threads)))

    # 3. Assertions proving race condition prevention
    successes = statuses.count(201)
    conflicts = statuses.count(409)
    server_errors = [s for s in statuses if s >= 500]

    assert len(server_errors) == 0, f"Server errors detected: {server_errors}"
    assert successes == 1, f"Expected exactly 1 successful purchase, got {successes}!"
    assert conflicts == 19, f"Expected 19 conflict responses, got {conflicts}!"

    # 4. Verify database state
    with SessionLocal() as db:
        final_stock = db.get(Inventory, target_id)
        assert final_stock.quantity == 0, f"Expected stock 0, found {final_stock.quantity}!"

        # Assert exactly 1 order was placed
        order_count = db.scalar(
            select(func.count()).select_from(Order).where(Order.status == "paid")
        )
        assert order_count >= 1
