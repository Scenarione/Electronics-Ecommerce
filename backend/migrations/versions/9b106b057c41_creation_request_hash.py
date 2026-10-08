"""Keep product creation retries tied to the original payload."""

import sqlalchemy as sa
from alembic import op

revision = "9b106b057c41"
down_revision = "7d477174c785"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("sellable_items", sa.Column("creation_hash", sa.String(length=64), nullable=True))


def downgrade():
    op.drop_column("sellable_items", "creation_hash")
