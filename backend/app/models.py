"""The database tables.

libraries  one row per browser. There are no accounts yet: the first time someone adds a
           paper, the browser gets a random key in a cookie, and their papers belong to it.
           Only a hash of the key is stored, so a database leak can't be used to open them.
papers     one row per paper. The explanation itself is one JSON document (reading), since
           it is always written and read whole.
questions  one row per question asked about a paper, with its cited answer.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


def _id() -> str:
    return str(uuid.uuid4())


class Library(Base):
    __tablename__ = "libraries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    # Empty for the sample papers everyone can see.
    library_id: Mapped[str | None] = mapped_column(
        ForeignKey("libraries.id", ondelete="CASCADE"), index=True, nullable=True
    )
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)

    # "upload" or "arxiv" (or "sample"). arxiv_id is set for arXiv papers and samples taken from arXiv.
    source: Mapped[str] = mapped_column(String(10))
    arxiv_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # queued -> reading -> ready, or failed with a plain-words error.
    status: Mapped[str] = mapped_column(String(10), default="queued", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Copied out of the reading so lists don't have to load it.
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    authors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    field: Mapped[str | None] = mapped_column(String(80), nullable=True)

    reading: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Question(Base):
    """A question someone asked about a paper ("ask the paper"), and its cited answer.

    Questions belong to the browser that asked them, like papers do: asking about a sample paper
    doesn't show your question to anyone else.
    """

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    paper_id: Mapped[str] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    library_id: Mapped[str] = mapped_column(ForeignKey("libraries.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(10))

    # queued -> answering -> ready, or failed with a plain-words error.
    status: Mapped[str] = mapped_column(String(10), default="queued", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # {"parts": [{"text": ..., "citations": [{"quote", "start_page", "end_page"}]}]}
    answer: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
