"""Where uploaded PDFs live.

Locally they go in a folder; deployed, in an S3-compatible bucket. The rest of the app
only calls save(), read() and delete(), so nothing else changes between the two.
"""

from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.config import Settings, get_settings


class Storage(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def read(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("invalid storage key")
        return path

    def save(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def read(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


class S3Storage:
    """Works with AWS S3 and anything that speaks its API (Neon Object Storage, Cloudflare R2)."""

    def __init__(self, bucket: str, client):
        self.bucket = bucket
        self.client = client

    def save(self, key: str, data: bytes) -> None:
        kind = "image/png" if key.endswith(".png") else "application/pdf"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=kind)

    def read(self, key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)


def make_storage(settings: Settings) -> Storage:
    if settings.storage == "local":
        return LocalStorage(settings.upload_dir)
    if not settings.s3_bucket:
        raise RuntimeError("P2L_S3_BUCKET must be set when P2L_STORAGE=s3")
    import boto3
    from botocore.config import Config

    # Non-AWS buckets (Neon, R2, MinIO) only understand path-style addresses: endpoint/bucket/key.
    style = "path" if settings.s3_endpoint_url else "auto"
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region,
        config=Config(s3={"addressing_style": style}),
    )
    return S3Storage(settings.s3_bucket, client)


@lru_cache
def _storage() -> Storage:
    return make_storage(get_settings())


def get_storage() -> Storage:
    """FastAPI dependency, so tests can use a temporary folder."""
    return _storage()
