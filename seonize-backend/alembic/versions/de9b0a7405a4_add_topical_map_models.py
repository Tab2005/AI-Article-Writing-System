"""Add topical map models

Revision ID: de9b0a7405a4
Revises: b04726bd6fe3
Create Date: 2026-04-07 17:37:07.879721

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de9b0a7405a4'
down_revision: Union[str, Sequence[str], None] = 'b04726bd6fe3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Topical Map Tables ---
    op.create_table('topical_maps',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('topic', sa.String(length=255), nullable=False),
    sa.Column('country', sa.String(length=10), nullable=True),
    sa.Column('language', sa.String(length=10), nullable=True),
    sa.Column('total_keywords', sa.Integer(), nullable=True),
    sa.Column('total_search_volume', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_topical_maps_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_topical_maps'))
    )
    with op.batch_alter_table('topical_maps', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_topical_maps_user_id'), ['user_id'], unique=False)

    op.create_table('topical_clusters',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('topical_map_id', sa.String(length=36), nullable=False),
    sa.Column('parent_id', sa.String(length=36), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('level', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['topical_clusters.id'], name=op.f('fk_topical_clusters_parent_id_topical_clusters'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['topical_map_id'], ['topical_maps.id'], name=op.f('fk_topical_clusters_topical_map_id_topical_maps'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_topical_clusters'))
    )
    with op.batch_alter_table('topical_clusters', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_topical_clusters_topical_map_id'), ['topical_map_id'], unique=False)

    op.create_table('topical_keywords',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('cluster_id', sa.String(length=36), nullable=False),
    sa.Column('keyword', sa.String(length=255), nullable=False),
    sa.Column('search_volume', sa.Integer(), nullable=True),
    sa.Column('cpc', sa.Float(), nullable=True),
    sa.Column('competition', sa.Float(), nullable=True),
    sa.Column('intent', sa.String(length=50), nullable=True),
    sa.Column('suggested_title', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['cluster_id'], ['topical_clusters.id'], name=op.f('fk_topical_keywords_cluster_id_topical_clusters'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_topical_keywords'))
    )
    with op.batch_alter_table('topical_keywords', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_topical_keywords_cluster_id'), ['cluster_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('topical_keywords', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_topical_keywords_cluster_id'))
    op.drop_table('topical_keywords')
    
    with op.batch_alter_table('topical_clusters', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_topical_clusters_topical_map_id'))
    op.drop_table('topical_clusters')
    
    with op.batch_alter_table('topical_maps', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_topical_maps_user_id'))
    op.drop_table('topical_maps')
