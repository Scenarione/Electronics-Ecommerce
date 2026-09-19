"""Deterministic, insert-only development fixtures. Safe to rerun after purchases."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import func, select

from .catalog_setup import CATEGORIES, initialize_catalog
from .config import settings
from .db import SessionLocal, catalog
from .models import Inventory, Order, OrderItem, Payment, SellableItem, User
from .security import passwords


def stable_id(value):
    return uuid5(NAMESPACE_URL, f"circuit-supply/{value}")


def fixture(index):
    category = CATEGORIES[index % 6]["_id"]
    variant = index // 6
    alternate = variant % 2
    if category == "cpu":
        brand = ["AMD", "Intel"][alternate]
        name = ["Ryzen 7 7700", "Core i7-13700"][alternate]
        specs = {
            "socket": ["AM5", "LGA1700"][alternate],
            "cores": [8, 16][alternate],
            "threads": [16, 24][alternate],
            "base_clock": [3.8, 2.1][alternate],
            "power": 65,
        }
        price = 10900
    elif category == "gpu":
        brand = ["ASUS", "MSI"][alternate]
        name = ["GeForce RTX 4070 SUPER", "Radeon RX 7800 XT"][alternate]
        specs = {
            "chipset": name,
            "vram": [12, 16][alternate],
            "memory_type": ["GDDR6X", "GDDR6"][alternate],
            "length": 280 + (variant % 5) * 10,
        }
        price = 21900
    elif category == "ram":
        brand = ["Kingston", "Corsair"][alternate]
        name = ["FURY Beast", "Vengeance"][alternate] + " DDR5 32GB"
        specs = {
            "generation": "DDR5",
            "capacity": 32,
            "modules": 2,
            "speed": [5600, 6000][alternate],
        }
        price = 3490
    elif category == "motherboard":
        brand = ["ASUS", "Gigabyte"][alternate]
        name = ["TUF Gaming B650-PLUS", "B760 Gaming X"][alternate]
        specs = {
            "socket": ["AM5", "LGA1700"][alternate],
            "chipset": ["B650", "B760"][alternate],
            "form_factor": "ATX",
            "memory_support": "DDR5",
        }
        price = 6890
    elif category == "monitor":
        brand = ["Dell", "LG"][alternate]
        name = ["G2724D", "UltraGear 27GP850"][alternate]
        specs = {
            "resolution": "2560x1440",
            "refresh_rate": [165, 180][alternate],
            "panel": "IPS",
            "size": 27,
        }
        price = 8990
    else:
        brand = ["Lenovo", "ASUS"][alternate]
        name = ["Legion Slim 5", "TUF Gaming A15"][alternate]
        specs = {
            "cpu": "Ryzen 7 7840HS",
            "gpu": "GeForce RTX 4060",
            "memory": [16, 32][alternate],
            "storage": [512, 1024][alternate],
            "display": [16, 15.6][alternate],
            "battery": [80, 90][alternate],
        }
        price = 36900
    identifier = stable_id(f"product/{index}")
    name = f"{brand} {name} · Bundle {variant + 1:03d}"
    return {
        "_id": str(identifier),
        "sku": f"CS-{category.upper()}-{variant + 1:03d}",
        "slug": f"{category}-bundle-{variant + 1:03d}",
        "name": name,
        "brand": brand,
        "category": category,
        "description": "A sample catalog bundle for the Circuit Supply course project. Specifications are illustrative, not a manufacturer listing. Includes local demo warranty and free delivery.",
        "images": [],
        "specifications": specs,
        "schema_version": 1,
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }, Decimal(price + (variant % 10) * 100)


def seed():
    if settings().app_env not in ("development", "test"):
        raise RuntimeError("Demo seeding is allowed only in development/test")
    initialize_catalog()
    admin_hash = passwords.hash(settings().seed_admin_password)
    customer_hash = passwords.hash(settings().seed_customer_password)
    with SessionLocal() as db:
        for i in range(51):
            identifier = stable_id(f"user/{i}")
            if not db.get(User, identifier):
                db.add(
                    User(
                        id=identifier,
                        email="admin@example.com"
                        if i == 0
                        else ("customer@example.com" if i == 1 else f"customer{i}@example.com"),
                        name="Store Admin" if i == 0 else f"Customer {i:02d}",
                        role="admin" if i == 0 else "customer",
                        password_hash=admin_hash if i == 0 else customer_hash,
                    )
                )
        db.commit()
        for i in range(1000):
            doc, price = fixture(i)
            identifier = stable_id(f"product/{i}")
            item = db.get(SellableItem, identifier)
            if not item:
                item = SellableItem(
                    id=identifier, sku=doc["sku"], price=price, active=False, catalog_pending=True
                )
                db.add(item)
                db.flush()
                db.add(Inventory(item_id=identifier, quantity=20 + i % 40))
                db.commit()
            catalog.products.update_one(
                {"_id": str(identifier)}, {"$setOnInsert": doc}, upsert=True
            )
            if item.catalog_pending:
                item.active, item.catalog_pending = True, False
                db.commit()
        for i in range(100):
            order_id = stable_id(f"order/{i}")
            if db.get(Order, order_id):
                continue
            item = db.get(SellableItem, stable_id(f"product/{i}"))
            doc, _ = fixture(i)
            success = i % 10 != 0
            stock = db.get(Inventory, item.id)
            if success and stock.quantity < 1:
                continue
            order = Order(
                id=order_id,
                user_id=stable_id(f"user/{i % 50 + 1}"),
                status="paid" if success else "payment_failed",
                total=item.price,
                shipping_address={
                    "recipient": f"Customer {i % 50 + 1:02d}",
                    "line1": f"{i + 1} Suthep Road",
                    "city": "Chiang Mai",
                    "postal_code": "50200",
                    "country": "TH",
                },
                idempotency_key=f"seed-order-{i}",
                request_hash="seed",
                created_at=datetime(2026, 8, 1, tzinfo=timezone.utc) + timedelta(hours=i),
            )
            db.add(order)
            db.flush()
            db.add(
                OrderItem(
                    id=stable_id(f"line/{i}"),
                    order_id=order_id,
                    item_id=item.id,
                    quantity=1,
                    unit_price=item.price,
                    sku=item.sku,
                    name=doc["name"],
                )
            )
            db.add(
                Payment(
                    id=stable_id(f"payment/{i}"),
                    order_id=order_id,
                    outcome="success" if success else "failure",
                    amount=item.price,
                    reference=f"SIM-SEED-{i:04d}",
                )
            )
            if success:
                stock.quantity -= 1
            db.commit()
        counts = {
            model.__tablename__: db.scalar(select(func.count()).select_from(model))
            for model in (User, SellableItem, Inventory, Order, OrderItem, Payment)
        }
    print(
        {
            "postgresql": counts,
            "mongodb": {
                "products": catalog.products.count_documents({}),
                "category_definitions": catalog.category_definitions.count_documents({}),
            },
        }
    )


if __name__ == "__main__":
    seed()
