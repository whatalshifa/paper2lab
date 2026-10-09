"""The public accuracy numbers: how many quotes and captions were found word for word in the PDF."""

from fastapi import APIRouter, Depends

from app.api.guard import require_proxy
from app.api.papers import SessionDep
from app.schemas import AccuracyReport
from app.services.accuracy import accuracy_report

router = APIRouter(prefix="/api", dependencies=[Depends(require_proxy)])


@router.get("/accuracy", response_model=AccuracyReport)
def get_accuracy(session: SessionDep) -> dict:
    return accuracy_report(session)
