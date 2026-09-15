from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import FeedbackSubmitRequest, FeedbackResponse
from app.services import feedback_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse)
def submit_feedback(payload: FeedbackSubmitRequest, db: Session = Depends(get_db)):
    """
    Log the actual recovery value for a completed batch.
    Triggers the learning engine and updates the supplier's SVI.
    """
    try:
        result = feedback_service.submit_feedback(
            db=db,
            batch_id=payload.batch_id,
            actual_value=payload.actual_value,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return FeedbackResponse(
        batch_id=payload.batch_id,
        **result,
    )
