"""What the API sends back, so the web app always gets the same shape."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SiteConfig(BaseModel):
    ai_enabled: bool
    max_upload_mb: int
    max_pages: int


class PaperSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str | None
    authors: list[str] | None
    year: int | None
    field: str | None
    status: str
    error: str | None
    source: str
    arxiv_id: str | None
    filename: str | None
    page_count: int | None
    is_sample: bool
    created_at: datetime


class PaperDetail(PaperSummary):
    reading: dict[str, Any] | None
    pdf_url: str | None


class PaperLists(BaseModel):
    samples: list[PaperSummary]
    mine: list[PaperSummary]


class ArxivRequest(BaseModel):
    link: str


class QuestionRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)
    level: Literal["beginner", "student", "expert"] = "student"


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    paper_id: str
    text: str
    level: str
    status: str
    error: str | None
    answer: dict[str, Any] | None
    created_at: datetime
