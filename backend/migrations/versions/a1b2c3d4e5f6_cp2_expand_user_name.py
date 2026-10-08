"""CP2 Phase 1: Expand schema by adding first_name and last_name columns to users.

Revision ID: a1b2c3d4e5f6
Revises: 7d477174c785
Create Date: 2026-10-03
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "9b106b057c41"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new target columns alongside legacy field 'name' without table locks
    op.add_column("users", sa.Column("first_name", sa.String(length=60), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=60), nullable=True))
    op.create_index("ix_users_first_name", "users", ["first_name"])
    # Relax NOT NULL on legacy column 'name' so dual-write / new writers do not fail
    op.alter_column("users", "name", nullable=True)


def downgrade() -> None:
    op.alter_column("users", "name", nullable=False)
    op.drop_index("ix_users_first_name", table_name="users")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
