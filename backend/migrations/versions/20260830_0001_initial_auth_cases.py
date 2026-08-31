"""Create initial users and case workspace tables.

Revision ID: 20260830_0001
Revises: None
Create Date: 2026-08-30
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260830_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum(
        "administrator",
        "supervisor",
        "investigator",
        "analyst",
        "viewer",
        name="userrole",
        native_enum=False,
        length=32,
    )
    case_status = sa.Enum(
        "open",
        "under_review",
        "closed",
        "archived",
        name="casestatus",
        native_enum=False,
        length=32,
    )
    case_priority = sa.Enum(
        "low",
        "medium",
        "high",
        "critical",
        name="casepriority",
        native_enum=False,
        length=32,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_number", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", case_status, nullable=False),
        sa.Column("priority", case_priority, nullable=False),
        sa.Column("classification", sa.String(length=80), nullable=False),
        sa.Column("case_metadata", sa.JSON(), nullable=False),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("case_number"),
    )
    op.create_index("ix_cases_case_number", "cases", ["case_number"], unique=True)
    op.create_index("ix_cases_created_by_id", "cases", ["created_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_cases_created_by_id", table_name="cases")
    op.drop_index("ix_cases_case_number", table_name="cases")
    op.drop_table("cases")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
