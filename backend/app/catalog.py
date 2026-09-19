import hashlib
import json
import math
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import catalog, get_db
from .models import Inventory, SellableItem, User, now
from .schemas import CommerceEdit, ProductEdit, ProductInput, StockAdjustment
from .security import admin

router = APIRouter(prefix="/api/v1", tags=["catalog"])


def validate_specs(category, specs):
    definition = catalog.category_definitions.find_one({"_id": category})
    if not definition:
        raise HTTPException(400, "Unknown category")
    attrs = definition["attributes"]
    if set(specs) - set(attrs):
        raise HTTPException(400, "Unknown specification attributes")
    for key, rule in attrs.items():
        value = specs.get(key)
        if value is None:
            if rule["required"]:
                raise HTTPException(400, f"Missing specification: {key}")
            continue
        valid = (
            (type(value) in (int, float) and math.isfinite(value) and value >= 0)
            if rule["type"] == "number"
            else (isinstance(value, str) and 0 < len(value.strip()) <= 200)
        )
        if not valid or ("values" in rule and value not in rule["values"]):
            raise HTTPException(400, f"Invalid specification: {key}")
    return definition


def serialize_product(doc, item, stock):
    return {
        **{k: v for k, v in doc.items() if k != "_id"},
        "id": str(item.id),
        "price": str(item.price),
        "currency": item.currency,
        "quantity": stock.quantity,
        "active": item.active,
    }


def product_list(db, page, page_size, category, brand, q, filters, include_inactive=False):
    statement = select(SellableItem, Inventory).join(Inventory)
    if not include_inactive:
        statement = statement.where(
            SellableItem.active.is_(True), SellableItem.catalog_pending.is_(False)
        )
    commercial = {str(item.id): (item, stock) for item, stock in db.execute(statement)}
    query = {"_id": {"$in": list(commercial)}}
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if q:
        query["$text"] = {"$search": q}
    if filters:
        try:
            values = json.loads(filters)
        except (ValueError, TypeError):
            raise HTTPException(400, "Filters must be a JSON object")
        definition = catalog.category_definitions.find_one({"_id": category}) if category else None
        if not isinstance(values, dict) or not definition:
            raise HTTPException(400, "Specification filters require a category")
        for key, value in values.items():
            rule = definition["attributes"].get(key)
            if not rule or not rule["filterable"] or type(value) not in (str, int, float):
                raise HTTPException(400, "Invalid specification filter")
            if rule["type"] == "number" and (
                type(value) not in (int, float) or not math.isfinite(value)
            ):
                raise HTTPException(400, "Numeric specification filter required")
            query[f"specifications.{key}"] = value
    count = catalog.products.count_documents(query)
    docs = catalog.products.find(query).sort("_id", 1).skip((page - 1) * page_size).limit(page_size)
    return {
        "items": [serialize_product(doc, *commercial[doc["_id"]]) for doc in docs],
        "total": count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/categories")
def categories():
    result = []
    for doc in catalog.category_definitions.find().sort("_id", 1):
        facets = {
            key: sorted(
                catalog.products.distinct(f"specifications.{key}", {"category": doc["_id"]}),
                key=str,
            )
            for key, rule in doc["attributes"].items()
            if rule["filterable"]
        }
        result.append(
            {
                "id": doc["_id"],
                "name": doc["name"],
                "attributes": doc["attributes"],
                "facets": facets,
            }
        )
    return result


@router.get("/products")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category: str | None = None,
    brand: str | None = None,
    q: str | None = Query(None, max_length=200),
    filters: str | None = Query(None, max_length=2000),
    db: Session = Depends(get_db),
):
    return product_list(db, page, page_size, category, brand, q, filters)


@router.get("/admin/products")
def admin_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    user: User = Depends(admin),
    db: Session = Depends(get_db),
):
    return product_list(db, page, page_size, None, None, q, None, True)


@router.get("/products/{product_id}")
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    doc = catalog.products.find_one({"_id": str(product_id)})
    item, stock = db.get(SellableItem, product_id), db.get(Inventory, product_id)
    if not doc or not item or not stock or not item.active or item.catalog_pending:
        raise HTTPException(404, "Product is unavailable")
    return serialize_product(doc, item, stock)


@router.post("/products", status_code=201)
def create_product(body: ProductInput, user: User = Depends(admin), db: Session = Depends(get_db)):
    validate_specs(body.category, body.specifications)
    normalized = body.model_dump(mode="json")
    normalized["price"] = str(body.price.quantize(Decimal("0.01")))
    creation_hash = hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()
    item = db.get(SellableItem, body.id)
    existing_doc = catalog.products.find_one({"_id": str(body.id)})
    payload = body.model_dump(mode="json", exclude={"id", "price", "quantity"})
    if item:
        if item.creation_hash != creation_hash:
            raise HTTPException(409, "Product ID was used with different creation data")
        if item.sku != body.sku or item.price != body.price:
            raise HTTPException(409, "Product ID already belongs to a different creation request")
        if existing_doc and any(existing_doc.get(k) != v for k, v in payload.items()):
            raise HTTPException(409, "Product already exists with different catalog data")
        if not item.catalog_pending:
            return (
                serialize_product(existing_doc, item, db.get(Inventory, body.id))
                if existing_doc
                else _missing_catalog()
            )
    else:
        item = SellableItem(
            id=body.id,
            sku=body.sku,
            price=body.price,
            active=False,
            catalog_pending=True,
            creation_hash=creation_hash,
        )
        db.add(item)
        db.flush()
        db.add(Inventory(item_id=body.id, quantity=body.quantity))
        db.commit()
    # Idempotent Mongo upsert; a failure leaves an explicitly pending SQL record.
    catalog.products.update_one(
        {"_id": str(body.id)},
        {
            "$setOnInsert": {
                **payload,
                "schema_version": 1,
                "created_at": now(),
                "updated_at": now(),
            }
        },
        upsert=True,
    )
    item = db.scalar(select(SellableItem).where(SellableItem.id == body.id).with_for_update())
    item.catalog_pending, item.active = False, True
    db.commit()
    return serialize_product(
        catalog.products.find_one({"_id": str(body.id)}), item, db.get(Inventory, body.id)
    )


def _missing_catalog():
    raise HTTPException(409, "Catalog record is missing; run reconciliation")


@router.patch("/products/{product_id}")
def edit_product(
    product_id: UUID, body: ProductEdit, user: User = Depends(admin), db: Session = Depends(get_db)
):
    doc = catalog.products.find_one({"_id": str(product_id)})
    if not doc or not db.get(SellableItem, product_id):
        raise HTTPException(404, "Product not found")
    validate_specs(doc["category"], body.specifications)
    catalog.products.update_one(
        {"_id": str(product_id)}, {"$set": {**body.model_dump(mode="json"), "updated_at": now()}}
    )
    return {"updated": True}


@router.patch("/products/{product_id}/commerce")
def edit_commerce(
    product_id: UUID, body: CommerceEdit, user: User = Depends(admin), db: Session = Depends(get_db)
):
    item = db.scalar(select(SellableItem).where(SellableItem.id == product_id).with_for_update())
    if not item:
        raise HTTPException(404, "Product not found")
    if body.active and (
        item.catalog_pending or not catalog.products.find_one({"_id": str(product_id)})
    ):
        raise HTTPException(409, "Cannot activate an incomplete product")
    item.price, item.active = body.price, body.active
    db.commit()
    return {"updated": True}


@router.post("/products/{product_id}/inventory")
def adjust_inventory(
    product_id: UUID,
    body: StockAdjustment,
    user: User = Depends(admin),
    db: Session = Depends(get_db),
):
    stock = db.scalar(select(Inventory).where(Inventory.item_id == product_id).with_for_update())
    if not stock:
        raise HTTPException(404, "Inventory record not found")
    if stock.quantity + body.delta < 0:
        raise HTTPException(409, "Stock cannot become negative")
    stock.quantity += body.delta
    db.commit()
    return {"quantity": stock.quantity}
