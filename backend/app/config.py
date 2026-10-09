"""All settings in one place, read from environment variables (or a .env file).

Nothing secret is hard-coded: the Anthropic API key and the database URL come
from the environment, so the same code runs on a laptop and on a server.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="P2L_", extra="ignore")

    # "production" turns on secure cookies.
    env: Literal["development", "production"] = "development"

    # SQLite for local development; Postgres (Neon) in production.
    database_url: str = "sqlite:///./paper2lab.db"

    # Where uploaded PDFs are kept: a local folder, or any S3-compatible bucket
    # (Neon Object Storage, Cloudflare R2, AWS S3). S3 credentials come from the standard
    # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY variables.
    storage: Literal["local", "s3"] = "local"
    upload_dir: Path = Path("./uploads")
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # leave empty for AWS S3
    s3_region: str | None = None

    # Papers bigger than this are refused before anything is sent to the AI.
    max_upload_mb: int = 20
    max_pages: int = 60

    # Read from ANTHROPIC_API_KEY (no P2L_ prefix), the name every Anthropic tool uses.
    anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")

    # Which Claude model reads the papers, and how hard it thinks.
    claude_model: str = "claude-opus-5-5"
    claude_effort: str = "medium"
    # For "ask the paper" answers, which are short.
    answer_effort: str = "medium"

    # The web app's address, so a browser on another address may call this API.
    # (The web app normally forwards /api/* itself, so this is only for local tools.)
    cors_origins: list[str] = ["http://localhost:3000"]

    # Spending guards. Each paper is one AI call, so these cap what a visitor (or a bot) can cost.
    papers_per_library_per_day: int = 5
    papers_per_ip_per_hour: int = 10
    papers_per_day_total: int = 40
    # Questions are cheaper (the paper is cached by the API after the first one), so allow more.
    questions_per_library_per_day: int = 30
    questions_per_ip_per_hour: int = 40
    questions_per_day_total: int = 300

    # A shared secret the website sends with every /api request it forwards. When set, the API
    # refuses requests that don't carry it, so nobody can skip the website and fake the
    # X-Forwarded-For address the per-network limits count by. Empty turns the check off.
    proxy_secret: str = ""

    # Re-run papers a restart interrupted. Off when several API copies run at once.
    recover_jobs_on_start: bool = True

    @field_validator("database_url")
    @classmethod
    def _use_psycopg(cls, url: str) -> str:
        # Neon and Render hand out "postgres://" or "postgresql://" URLs. SQLAlchemy reads those as
        # the old psycopg2 driver, so point them at psycopg 3, which is what we install.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix) :]
        return url

    @property
    def ai_enabled(self) -> bool:
        """Without an Anthropic key the site runs as a demo: sample papers only, no new readings."""
        return bool(self.anthropic_api_key and self.anthropic_api_key.strip())

    @property
    def cookie_secure(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
