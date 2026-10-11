"""CP2 Phase 3: Zero-downtime background backfill script.

Migrates historical un-migrated users from legacy `name` to `first_name` and `last_name`.
Features:
- Cursor-based pagination (O(1), avoids table locking and slow OFFSETs).
- Configurable batching and throttling delay to avoid connection/lock starvation.
- Persistent checkpointing: resumes safely if interrupted.
- Dry-run mode for pre-flight verification.
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from uuid import UUID

# Ensure backend modules can be imported
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from app.db import SessionLocal
from app.models import User
from app.name_utils import split_name

CHECKPOINT_FILE = Path(__file__).resolve().parent / ".backfill_checkpoint.json"
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill")


def load_checkpoint() -> str | None:
    """Load the last committed cursor ID from the checkpoint file."""
    if CHECKPOINT_FILE.exists():
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("last_cursor")
        except Exception as e:
            logger.warning(f"Failed to read checkpoint: {e}")
    return None


def save_checkpoint(cursor_id: str | None, processed_count: int):
    """Save progress checkpoint to disk."""
    try:
        with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "last_cursor": cursor_id,
                "processed_count": processed_count,
                "updated_at": time.time(),
            }, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to write checkpoint: {e}")


def clear_checkpoint():
    """Clear checkpoint file on complete migration."""
    if CHECKPOINT_FILE.exists():
        try:
            CHECKPOINT_FILE.unlink()
        except Exception:
            pass


def run_backfill(batch_size: int = 50, delay_sec: float = 0.05, dry_run: bool = False, reset: bool = False):
    """Execute non-blocking batch backfill using cursor pagination."""
    logger.info("=" * 60)
    logger.info("CP2 ZERO-DOWNTIME BACKFILL: users.name -> first_name, last_name")
    logger.info(f"Batch Size: {batch_size} | Throttle Delay: {delay_sec}s | Dry Run: {dry_run}")
    logger.info("=" * 60)

    if reset:
        clear_checkpoint()
        last_cursor = None
    else:
        last_cursor = load_checkpoint()

    if last_cursor:
        logger.info(f"Resuming from previous checkpoint cursor: {last_cursor}")
    else:
        logger.info("Starting backfill from beginning.")

    total_processed = 0
    total_updated = 0
    start_time = time.time()

    with SessionLocal() as db:
        # Check if legacy column 'name' exists in schema
        has_name_col = db.scalar(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'name'
        """)) is not None
        name_col_sql = "name" if has_name_col else "NULL AS name"

        # First check remaining count
        count_query = text(
            "SELECT COUNT(*) FROM users WHERE first_name IS NULL OR last_name IS NULL"
        )
        total_remaining = db.scalar(count_query) or 0
        logger.info(f"Total un-migrated records to process: {total_remaining}")

        if total_remaining == 0:
            logger.info("All records are already fully backfilled! Nothing to do.")
            clear_checkpoint()
            return

        batch_num = 0
        while True:
            batch_num += 1
            # Cursor pagination: filter by id > last_cursor, with NULL target fields
            if last_cursor:
                records = db.execute(
                    text(f"""
                        SELECT id, {name_col_sql}, first_name, last_name
                        FROM users
                        WHERE (first_name IS NULL OR last_name IS NULL)
                          AND id > :cursor
                        ORDER BY id
                        LIMIT :limit
                    """),
                    {"cursor": UUID(last_cursor), "limit": batch_size},
                ).fetchall()
            else:
                records = db.execute(
                    text(f"""
                        SELECT id, {name_col_sql}, first_name, last_name
                        FROM users
                        WHERE (first_name IS NULL OR last_name IS NULL)
                        ORDER BY id
                        LIMIT :limit
                    """),
                    {"limit": batch_size},
                ).fetchall()

            if not records:
                # If no records beyond cursor, re-check if any were inserted before cursor
                fallback_records = db.execute(
                    text(f"""
                        SELECT id, {name_col_sql}, first_name, last_name
                        FROM users
                        WHERE (first_name IS NULL OR last_name IS NULL)
                        ORDER BY id
                        LIMIT :limit
                    """),
                    {"limit": batch_size},
                ).fetchall()
                if not fallback_records:
                    break
                records = fallback_records

            batch_updated = 0
            for row in records:
                user_id = row[0]
                legacy_name = row[1] or ""
                curr_first = row[2]
                curr_last = row[3]
                total_processed += 1
                first, last = split_name(legacy_name)

                if curr_first != first or curr_last != last:
                    if not dry_run:
                        db.execute(
                            text("UPDATE users SET first_name = :first, last_name = :last WHERE id = :id"),
                            {"first": first, "last": last, "id": user_id},
                        )
                    batch_updated += 1
                    total_updated += 1

                last_cursor = str(user_id)

            if not dry_run:
                db.commit()
                save_checkpoint(last_cursor, total_processed)

            elapsed = time.time() - start_time
            rate = total_processed / elapsed if elapsed > 0 else 0
            logger.info(
                f"[Batch {batch_num}] Processed {len(records)} rows ({batch_updated} updated) | "
                f"Total Processed: {total_processed} | Rate: {rate:.1f} rows/s"
            )

            # Throttle between batches to guarantee zero locking/starvation for live traffic
            if delay_sec > 0:
                time.sleep(delay_sec)

    clear_checkpoint()
    elapsed = time.time() - start_time
    logger.info("=" * 60)
    logger.info(f"BACKFILL COMPLETE in {elapsed:.2f} seconds!")
    logger.info(f"Total Rows Processed: {total_processed} | Total Rows Updated: {total_updated}")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zero-Downtime Safe Backfill for CP2")
    parser.add_argument("--batch-size", type=int, default=50, help="Number of records per transaction")
    parser.add_argument("--delay", type=float, default=0.05, help="Throttle delay in seconds between batches")
    parser.add_argument("--dry-run", action="store_true", help="Preview backfill without committing writes")
    parser.add_argument("--reset", action="store_true", help="Reset checkpoint and start from beginning")
    args = parser.parse_args()

    run_backfill(batch_size=args.batch_size, delay_sec=args.delay, dry_run=args.dry_run, reset=args.reset)
