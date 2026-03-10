"""add images columns to projects and kalpa_nodes

Revision ID: 6a7b8c9d0e1f
Revises: e9f2a8b7c6d5
Create Date: 2026-03-10 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6a7b8c9d0e1f'
down_revision: Union[str, Sequence[str], None] = 'e9f2a8b7c6d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 增加 images 欄位到 projects 表
    op.add_column('projects', sa.Column('images', sa.JSON(), nullable=True))
    # 增加 images 欄位到 kalpa_nodes 表
    op.add_column('kalpa_nodes', sa.Column('images', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('kalpa_nodes', 'images')
    op.drop_column('projects', 'images')
