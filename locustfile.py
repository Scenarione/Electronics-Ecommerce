"""CP3 Automated Load Testing & Benchmark with Locust.

Load Profile:
- 50 Virtual Users (VUs) executing concurrent read and write operations.
- Duration: 3 minutes.
- SLA Target: Throughput stable, p95 < 200ms, p99 < 500ms, Error rate < 1%.

Execution:
  locust -f locustfile.py --headless -u 50 -r 10 --run-time 3m --host http://localhost:8000
"""

import json
import random
from uuid import uuid4
from locust import HttpUser, task, between


FIRST_NAMES = ["Methas", "Haruto", "Komet", "Warinthon", "Somchai", "Somsak", "Arthit", "Kanya"]
LAST_NAMES = ["Ruttanaburee", "Aburatani", "Sasison", "Tosak", "Prasert", "Suksawat", "Boonmee"]


class StoreCustomer(HttpUser):
    # Simulated think time between user actions (0.1 to 0.5 seconds for high RPS)
    wait_time = between(0.1, 0.5)

    def on_start(self):
        """Register a unique user account and obtain session credentials."""
        self.email = f"locust_{uuid4().hex[:10]}@example.com"
        self.first_name = random.choice(FIRST_NAMES)
        self.last_name = random.choice(LAST_NAMES)
        self.csrf_token = None
        self.user_id = None

        resp = self.client.post(
            "/api/v1/users",
            json={
                "email": self.email,
                "first_name": self.first_name,
                "last_name": self.last_name,
                "password": "Password123!",
            },
            name="[Auth] Register",
        )
        if resp.status_code in (200, 201):
            try:
                body = resp.json()
                self.csrf_token = body.get("csrf_token")
                self.user_id = body.get("user", {}).get("id")
            except Exception:
                pass

    @task(40)
    def browse_catalog(self):
        """Browse paginated product catalog (Read benchmark exercising query projection)."""
        page = random.randint(1, 5)
        self.client.get(f"/api/v1/products?page={page}&page_size=12", name="[Catalog] List Products (Projected)")

    @task(25)
    def filter_by_category(self):
        """Filter products by hardware category with specifications."""
        cat = random.choice(["cpu", "gpu", "ram", "motherboard", "monitor", "laptop"])
        self.client.get(f"/api/v1/products?category={cat}&page_size=12", name="[Catalog] Category Filter")

    @task(15)
    def view_product_detail(self):
        """View individual product specification details."""
        resp = self.client.get("/api/v1/products?page_size=5", name="[Catalog] Quick Preview")
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            if items:
                target = random.choice(items)
                self.client.get(f"/api/v1/products/{target['id']}", name="[Catalog] Product Detail")

    @task(10)
    def view_profile(self):
        """Fetch user profile details."""
        if self.user_id:
            self.client.get(f"/api/v1/users/{self.user_id}", name="[User] Get Profile")

    @task(10)
    def perform_checkout(self):
        """Execute concurrent transactional order checkout (Exercising row lock concurrency)."""
        if not self.csrf_token:
            return

        # Fetch an in-stock product
        prod_resp = self.client.get("/api/v1/products?page_size=5", name="[Order] Get Cart Product")
        if prod_resp.status_code != 200:
            return
        items = prod_resp.json().get("items", [])
        if not items:
            return
        target = random.choice(items)

        payload = {
            "items": [{"item_id": target["id"], "quantity": 1}],
            "shipping_address": {
                "recipient": f"{self.first_name} {self.last_name}",
                "line1": "123 Suthep Road",
                "city": "Chiang Mai",
                "postal_code": "50200",
                "country": "TH",
            },
            "simulation": "success",
        }
        headers = {
            "X-CSRF-Token": self.csrf_token,
            "Idempotency-Key": f"locust-{uuid4()}",
        }
        # Status 201 (success) or 409 (stock conflict under concurrency) are expected valid behaviors
        with self.client.post(
            "/api/v1/orders",
            json=payload,
            headers=headers,
            catch_response=True,
            name="[Order] Checkout (PCC Row Lock)",
        ) as res:
            if res.status_code in (200, 201, 409):
                res.success()
            else:
                res.failure(f"Unexpected status: {res.status_code}")
