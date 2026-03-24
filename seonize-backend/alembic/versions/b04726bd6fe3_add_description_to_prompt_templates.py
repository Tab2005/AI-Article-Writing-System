"""add description to prompt_templates

Revision ID: b04726bd6fe3
Revises: be98247c8056
Create Date: 2026-03-24 10:50:39.736704

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b04726bd6fe3'
down_revision: Union[str, Sequence[str], None] = 'be98247c8056'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('prompt_templates', sa.Column('description', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('prompt_templates', 'description')
