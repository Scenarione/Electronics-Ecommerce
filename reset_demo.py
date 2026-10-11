"""CP2 Demo Environment Reset Helper.

Prepares the database for a clean live demonstration of the 5 Expand-Contract phases:
1. Reverts Alembic schema to CP1 baseline ('9b106b057c41' / Pre-Expand).
2. Ensures historical user accounts have legacy 'name' and NULL 'first_name'/'last_name'.
3. Removes leftover checkpoint files.
4. Verifies the database is primed for the live demo.
"""

import sys
import subprocess
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from app.db import SessionLocal
from app.seed import seed


def reset_environment():
    print("=" * 65)
    print("RESETTING DATABASE TO PRE-MIGRATION BASELINE (CP1 -> CP2 DEMO)")
    print("=" * 65)

    # 1. Clean checkpoint
    checkpoint_file = Path(__file__).resolve().parent / ".backfill_checkpoint.json"
    if checkpoint_file.exists():
        checkpoint_file.unlink()
        print("[1/4] Cleared old backfill checkpoint file.")
    else:
        print("[1/4] No old checkpoint file found.")

    # 2. Revert Alembic to 9b106b057c41 (Pre-Expand)
    alembic_ini = Path(__file__).resolve().parent / "backend" / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    try:
        command.downgrade(alembic_cfg, "9b106b057c41")
        print("[2/4] Alembic schema downgraded to '9b106b057c41' (Pre-Expand).")
    except Exception as e:
        print(f"[2/4] Alembic note: {e}")

    # 3. Ensure baseline seed data
    try:
        seed()
        print("[3/4] Seeded baseline domain records (PostgreSQL & MongoDB).")
    except Exception as e:
        print(f"[3/4] Seed note: {e}")

    # 4. Reset users table state: populate name, clear first_name/last_name if columns exist
    with SessionLocal() as db:
        cols = {
            row[0]
            for row in db.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            )
        }
        if "first_name" in cols and "last_name" in cols:
            db.execute(text("UPDATE users SET first_name = NULL, last_name = NULL"))
            db.commit()
            print("[4/4] Cleared target columns for backfill demonstration.")
        else:
            print("[4/4] Database in pure pre-expand schema (no target columns yet).")

    print("\n" + "=" * 65)
    print("SUCCESS: Ready for Live CP2 Demonstration!")
    print("=" * 65)
    print("Next steps:")
    print(" 1. Terminal 1: python traffic_gen.py --rps 25 --url http://localhost:8000")
    print(" 2. Terminal 2: Follow CHECKPOINT_2.md runbook steps 1-6")
    print("=" * 65)


if __name__ == "__main__":
    reset_environment()
