"""
add unit_original to recipe_version_ingredients

Revision ID: d1a2b3c4d5e6
Revises: 052e7c2b8d43
Create Date: 2026-08-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd1a2b3c4d5e6'
down_revision = '052e7c2b8d43'
branch_labels = None
depends_on = None

SCHEMA = 'cobi_kerupuk'


def upgrade():
    op.add_column(
        'recipe_version_ingredients',
        sa.Column('unit_original', sa.String(length=20), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        'recipe_version_ingredients',
        sa.Column('qty_original', sa.Numeric(14, 3), nullable=True),
        schema=SCHEMA,
    )


def downgrade():
    op.drop_column('recipe_version_ingredients', 'unit_original', schema=SCHEMA)
