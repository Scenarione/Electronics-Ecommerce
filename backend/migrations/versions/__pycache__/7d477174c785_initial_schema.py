"""Create the initial relational store schema.

Revision ID: 7d477174c785
Revises:
Create Date: 2026-09-20
"""

from alembic import op
import sqlalchemy as sa


revision = "7d477174c785"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="customer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('customer','admin')"),
    )
    op.create_table(
        "sellable_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("sku", sa.String(60), nullable=False, unique=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="THB"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("catalog_pending", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creation_hash", sa.String(64)),
        sa.CheckConstraint("price >= 0"),
        sa.CheckConstraint("currency = 'THB'"),
    )
    op.create_index("ix_sellable_items_active", "sellable_items", ["active"])
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("csrf_token", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.create_table(
        "inventory",
        sa.Column("item_id", sa.Uuid(), sa.ForeignKey("sellable_items.id"), primary_key=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("quantity >= 0"),
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="THB"),
        sa.Column("shipping_address", sa.JSON(), nullable=False),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key"),
        sa.CheckConstraint("total >= 0"),
        sa.CheckConstraint("status IN ('paid','payment_failed','shipped')"),
        sa.CheckConstraint("currency = 'THB'"),
    )
    op.create_index("ix_orders_user_created", "orders", ["user_id", "created_at"])
    op.create_table(
        "order_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("item_id", sa.Uuid(), sa.ForeignKey("sellable_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("sku", sa.String(60), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.CheckConstraint("quantity > 0"),
        sa.CheckConstraint("unit_price >= 0"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_item_id", "order_items", ["item_id"])
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False, unique=True),
        sa.Column("outcome", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("reference", sa.String(80), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount >= 0"),
        sa.CheckConstraint("outcome IN ('success','failure')"),
    )


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_index("ix_order_items_item_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_user_created", table_name="orders")
    op.drop_table("orders")
    op.drop_table("inventory")
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_index("ix_sellable_items_active", table_name="sellable_items")
    op.drop_table("sellable_items")
    op.drop_table("users")
