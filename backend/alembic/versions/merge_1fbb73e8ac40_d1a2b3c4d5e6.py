"""
merge 1fbb73e8ac40 and d1a2b3c4d5e6

Revision ID: merge_1fbb_d1a2
Revises: 1fbb73e8ac40, d1a2b3c4d5e6
Create Date: 2026-08-29 00:00:00.000000
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'merge_1fbb_d1a2'
down_revision = ('1fbb73e8ac40', 'd1a2b3c4d5e6')
branch_labels = None
depends_on = None


def upgrade():
    # merge-only revision; no DB changes
    pass


def downgrade():
    pass
