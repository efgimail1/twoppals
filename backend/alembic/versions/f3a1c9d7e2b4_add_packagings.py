"""
add packagings and product_packagings tables

Revision ID: f3a1c9d7e2b4
Revises: merge_1fbb_d1a2
Create Date: 2026-08-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f3a1c9d7e2b4'
down_revision = ('merge_1fbb_d1a2', 'c0f7a8b6f7bd')
branch_labels = None
depends_on = None

SCHEMA = 'cobi_kerupuk'


def upgrade():
    op.create_table(
        'packagings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='plastik'),
        sa.Column('current_price', sa.Numeric(14, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )

    op.create_table(
        'product_packagings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'product_id',
            sa.Integer(),
            sa.ForeignKey(f'{SCHEMA}.products.id'),
            nullable=False,
        ),
        sa.Column(
            'packaging_id',
            sa.Integer(),
            sa.ForeignKey(f'{SCHEMA}.packagings.id'),
            nullable=False,
        ),
        sa.Column('qty', sa.Numeric(10, 2), nullable=False, server_default='1'),
        schema=SCHEMA,
    )


def downgrade():
    op.drop_table('product_packagings', schema=SCHEMA)
    op.drop_table('packagings', schema=SCHEMA)