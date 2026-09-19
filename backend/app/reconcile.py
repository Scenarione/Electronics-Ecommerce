"""Report cross-database inconsistencies; use --repair to make safe repairs."""

import argparse

from fastapi import HTTPException
from sqlalchemy import select

from .catalog import validate_specs
from .db import SessionLocal, catalog
from .models import Inventory, SellableItem


def reconcile(repair=False):
    findings = []
    with SessionLocal() as db:
        items = list(db.scalars(select(SellableItem).order_by(SellableItem.id).with_for_update()))
        known = {str(item.id) for item in items}
        for item in items:
            doc = catalog.products.find_one({"_id": str(item.id)})
            valid = bool(doc and doc["sku"] == item.sku and db.get(Inventory, item.id))
            if valid:
                try:
                    validate_specs(doc["category"], doc["specifications"])
                except HTTPException:
                    valid = False
            if not valid:
                findings.append(
                    {
                        "id": str(item.id),
                        "issue": "missing_or_invalid_catalog_or_inventory",
                        "action": "disabled; retry original creation or correct data"
                        if repair
                        else "requires review",
                    }
                )
                if repair:
                    item.active = False
            elif item.catalog_pending:
                findings.append(
                    {
                        "id": str(item.id),
                        "issue": "pending_creation",
                        "action": "activated" if repair else "can activate",
                    }
                )
                if repair:
                    item.catalog_pending, item.active = False, True
        for doc in catalog.products.find({}, {"_id": 1}):
            if doc["_id"] not in known:
                findings.append(
                    {
                        "id": doc["_id"],
                        "issue": "orphan_catalog",
                        "action": "manual review; no inferred price or stock",
                    }
                )
        if repair:
            db.commit()
    return findings


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repair", action="store_true")
    print(reconcile(parser.parse_args().repair))
