"""SQLAlchemy declarative base shared by all relational models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for SUTRA relational entities."""

