"""CP2 Phase 5: Contract schema by dropping legacy name column from users.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-03
"""

from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safely drop legacy column after backfill and readers have completely switched
    op.drop_column("users", "name")


def downgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=120), nullable=True))
