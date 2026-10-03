-- Initial relational store schema for PostgreSQL
-- Chiang Mai University - 269340 Data Centric Application Development (Checkpoint 1)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_users_role CHECK (role IN ('customer', 'admin'))
);

CREATE TABLE IF NOT EXISTS sellable_items (
    id UUID PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    active BOOLEAN NOT NULL DEFAULT FALSE,
    catalog_pending BOOLEAN NOT NULL DEFAULT TRUE,
    creation_hash VARCHAR(64),
    CONSTRAINT chk_sellable_items_price CHECK (price >= 0),
    CONSTRAINT chk_sellable_items_currency CHECK (currency = 'THB')
);

CREATE INDEX IF NOT EXISTS ix_sellable_items_active ON sellable_items (active);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS inventory (
    item_id UUID PRIMARY KEY REFERENCES sellable_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    shipping_address JSONB NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_orders_user_idempotency UNIQUE (user_id, idempotency_key),
    CONSTRAINT chk_orders_total CHECK (total >= 0),
    CONSTRAINT chk_orders_status CHECK (status IN ('paid', 'payment_failed', 'shipped')),
    CONSTRAINT chk_orders_currency CHECK (currency = 'THB')
);

CREATE INDEX IF NOT EXISTS ix_orders_user_created ON orders (user_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES sellable_items(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    sku VARCHAR(60) NOT NULL,
    name VARCHAR(200) NOT NULL,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS ix_order_items_item_id ON order_items (item_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reference VARCHAR(80) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_payments_amount CHECK (amount >= 0),
    CONSTRAINT chk_payments_outcome CHECK (outcome IN ('success', 'failure'))
);

-- Register Alembic schema version so migrations stay synchronized
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('7d477174c785') ON CONFLICT DO NOTHING;
