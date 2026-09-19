import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="customer")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("role IN ('customer','admin')"),)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class SellableItem(Base):
    __tablename__ = "sellable_items"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    sku: Mapped[str] = mapped_column(String(60), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="THB")
    active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    # A pending creation is distinct from intentional deactivation.
    catalog_pending: Mapped[bool] = mapped_column(Boolean, default=True)
    creation_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    __table_args__ = (CheckConstraint("price >= 0"), CheckConstraint("currency = 'THB'"))


class Inventory(Base):
    __tablename__ = "inventory"
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sellable_items.id"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (CheckConstraint("quantity >= 0"),)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="THB")
    shipping_address: Mapped[dict] = mapped_column(JSON)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key"),
        Index("ix_orders_user_created", "user_id", "created_at"),
        CheckConstraint("total >= 0"),
        CheckConstraint("status IN ('paid','payment_failed','shipped')"),
        CheckConstraint("currency = 'THB'"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sellable_items.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    sku: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(200))
    __table_args__ = (CheckConstraint("quantity > 0"), CheckConstraint("unit_price >= 0"))


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), unique=True)
    outcome: Mapped[str] = mapped_column(String(20))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    reference: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        CheckConstraint("amount >= 0"),
        CheckConstraint("outcome IN ('success','failure')"),
    )
