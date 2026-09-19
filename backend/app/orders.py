import hashlib
import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .db import catalog, get_db
from .models import Inventory, Order, OrderItem, Payment, SellableItem, User
from .payments import simulate_payment
from .schemas import Checkout
from .security import admin, current_user

router = APIRouter(prefix="/api/v1", tags=["orders"])


def order_data(db, order, details=True):
    result = {
        "id": str(order.id),
        "status": order.status,
        "total": str(order.total),
        "currency": order.currency,
        "created_at": order.created_at,
        "shipping_address": order.shipping_address,
    }
    if details:
        result["items"] = [
            {
                "item_id": str(line.item_id),
                "name": line.name,
                "sku": line.sku,
                "quantity": line.quantity,
                "unit_price": str(line.unit_price),
            }
            for line in db.scalars(select(OrderItem).where(OrderItem.order_id == order.id))
        ]
        payment = db.scalar(select(Payment).where(Payment.order_id == order.id))
        result["payment"] = (
            {
                "outcome": payment.outcome,
                "reference": payment.reference,
                "amount": str(payment.amount),
            }
            if payment
            else None
        )
    return result


@router.post("/orders", status_code=201)
def checkout(
    body: Checkout,
    response: Response,
    idempotency_key: str = Header(min_length=8, max_length=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    successful = simulate_payment(body.simulation)
    quantities = {}
    for line in body.items:
        quantities[line.item_id] = quantities.get(line.item_id, 0) + line.quantity
    if any(q > 100 for q in quantities.values()):
        raise HTTPException(400, "Maximum 100 units per product")
    normalized = {
        **body.model_dump(mode="json"),
        "items": [{"item_id": str(k), "quantity": v} for k, v in sorted(quantities.items())],
    }
    request_hash = hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()
    # Transaction-scoped advisory lock also serializes same-key requests with disjoint carts.
    lock_key = int.from_bytes(
        hashlib.sha256(f"{user.id}:{idempotency_key}".encode()).digest()[:8], "big", signed=True
    )
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})
    previous = db.scalar(
        select(Order).where(Order.user_id == user.id, Order.idempotency_key == idempotency_key)
    )
    if previous:
        if previous.request_hash != request_hash:
            raise HTTPException(409, "Idempotency key was used with different checkout data")
        response.status_code = 200
        return order_data(db, previous)
    docs = {
        doc["_id"]: doc
        for doc in catalog.products.find({"_id": {"$in": [str(k) for k in quantities]}})
    }
    if len(docs) != len(quantities):
        raise HTTPException(404, "A product is no longer available")
    items = list(
        db.scalars(
            select(SellableItem)
            .where(SellableItem.id.in_(quantities))
            .order_by(SellableItem.id)
            .with_for_update()
        )
    )
    stocks = {
        s.item_id: s
        for s in db.scalars(
            select(Inventory)
            .where(Inventory.item_id.in_(quantities))
            .order_by(Inventory.item_id)
            .with_for_update()
        )
    }
    if len(items) != len(quantities) or len(stocks) != len(quantities):
        raise HTTPException(409, "Product inventory is incomplete")
    for item in items:
        if not item.active or item.catalog_pending:
            raise HTTPException(409, f"{item.sku} is unavailable")
        if stocks[item.id].quantity < quantities[item.id]:
            raise HTTPException(409, f"Insufficient stock for {item.sku}")
    total = sum(item.price * quantities[item.id] for item in items)
    order = Order(
        user_id=user.id,
        status="paid" if successful else "payment_failed",
        total=total,
        shipping_address=body.shipping_address.model_dump(),
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )
    db.add(order)
    db.flush()
    for item in items:
        doc = docs[str(item.id)]
        db.add(
            OrderItem(
                order_id=order.id,
                item_id=item.id,
                quantity=quantities[item.id],
                unit_price=item.price,
                sku=item.sku,
                name=doc["name"],
            )
        )
        if successful:
            stocks[item.id].quantity -= quantities[item.id]
    db.add(
        Payment(
            order_id=order.id,
            outcome="success" if successful else "failure",
            amount=total,
            reference=f"SIM-{uuid4()}",
        )
    )
    db.commit()
    return order_data(db, order)


@router.get("/orders")
def my_orders(
    page: int = Query(1, ge=1), user: User = Depends(current_user), db: Session = Depends(get_db)
):
    orders = db.scalars(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * 20)
        .limit(20)
    )
    return {"items": [order_data(db, order, False) for order in orders], "page": page}


@router.get("/orders/{order_id}")
def get_order(order_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order or (order.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Order not found")
    return order_data(db, order)


@router.get("/admin/orders")
def all_orders(
    page: int = Query(1, ge=1), user: User = Depends(admin), db: Session = Depends(get_db)
):
    orders = db.scalars(
        select(Order).order_by(Order.created_at.desc()).offset((page - 1) * 20).limit(20)
    )
    return {"items": [order_data(db, order, False) for order in orders], "page": page}


@router.post("/admin/orders/{order_id}/ship")
def ship_order(order_id: UUID, user: User = Depends(admin), db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in ("paid", "shipped"):
        raise HTTPException(409, "Only paid orders can be shipped")
    order.status = "shipped"
    db.commit()
    return order_data(db, order)
