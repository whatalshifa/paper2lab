"""Whose papers are whose, without accounts (accounts come in a later phase).

The first time a browser adds a paper it is given a long random key in a cookie that page
scripts can't read (HttpOnly). Papers added from that browser belong to its "library".
The database keeps only a SHA-256 hash of the key, so even someone holding a copy of the
database can't use it to open other people's papers.
"""

import hashlib
import secrets

from fastapi import Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Library

COOKIE = "p2l_library"
ONE_YEAR = 365 * 24 * 3600


def _hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def current_library(request: Request, session: Session) -> Library | None:
    key = request.cookies.get(COOKIE)
    if not key or len(key) > 200:
        return None
    return session.scalar(select(Library).where(Library.key_hash == _hash(key)))


def get_or_create_library(request: Request, response: Response, session: Session) -> Library:
    library = current_library(request, session)
    if library is not None:
        return library
    key = secrets.token_urlsafe(32)
    library = Library(key_hash=_hash(key))
    session.add(library)
    session.flush()
    response.set_cookie(
        COOKIE,
        key,
        max_age=ONE_YEAR,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )
    return library
