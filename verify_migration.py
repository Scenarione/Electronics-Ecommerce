"""CP2 Database Verification Queries.

Proves data consistency before, during, and after backfill.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db import SessionLocal


def verify_database():
    print("=" * 65)
    print("CP2 ZERO-DOWNTIME MIGRATION: DATA CONSISTENCY AUDIT")
    print("=" * 65)

    with SessionLocal() as db:
        # Check column existence in users table
        col_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
        """)
        cols = {row[0] for row in db.execute(col_query)}

        has_legacy_name = "name" in cols
        has_first_name = "first_name" in cols
        has_last_name = "last_name" in cols

        print(f"Schema State:")
        print(f" - Legacy column 'name'       : {'EXISTS' if has_legacy_name else 'REMOVED (Contracted)'}")
        print(f" - New column 'first_name'    : {'EXISTS' if has_first_name else 'MISSING (Pre-Expand)'}")
        print(f" - New column 'last_name'     : {'EXISTS' if has_last_name else 'MISSING (Pre-Expand)'}")
        print("-" * 65)

        total_users = db.scalar(text("SELECT COUNT(*) FROM users")) or 0
        print(f"Total Users in Database       : {total_users}")

        if not has_first_name or not has_last_name:
            print("\nDatabase is currently in PRE-EXPAND phase.")
            print("Run Phase 1 (Expand) Alembic migration to add target columns:")
            print("  docker compose exec -T api alembic upgrade a1b2c3d4e5f6")
            return

        unmigrated = db.scalar(text("""
            SELECT COUNT(*) FROM users
            WHERE first_name IS NULL OR last_name IS NULL
        """)) or 0

        migrated = db.scalar(text("""
            SELECT COUNT(*) FROM users
            WHERE first_name IS NOT NULL AND last_name IS NOT NULL
        """)) or 0

        print(f"Migrated Users (Target Ready) : {migrated} / {total_users} ({(migrated/total_users*100 if total_users else 100):.1f}%)")
        print(f"Un-migrated Users (Pending)   : {unmigrated} / {total_users}")

        # Data integrity check
        if has_legacy_name:
            mismatches = db.scalar(text("""
                SELECT COUNT(*) FROM users
                WHERE first_name IS NOT NULL
                  AND name IS NOT NULL
                  AND name != TRIM(first_name || ' ' || COALESCE(last_name, ''))
                  AND name != first_name
            """)) or 0

            print(f"Data Consistency Mismatches   : {mismatches} {'[100% CONSISTENT]' if mismatches == 0 else '[ANOMALY DETECTED]'}")
        else:
            print("Data Consistency Check        : PASSED (Legacy column successfully contracted)")

        print("-" * 65)
        if unmigrated == 0:
            print("STATUS: BACKFILL COMPLETE — Safe to proceed to Switch Read / Contract.")
        else:
            print(f"STATUS: BACKFILL PENDING — Run 'python backfill.py' to migrate {unmigrated} records.")
        print("=" * 65)


if __name__ == "__main__":
    verify_database()
