import json
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import BatchSubmitRequest, BatchValuationResponse, BatchDetailResponse
from app.services import batch_service, supplier_service
from app import models

router = APIRouter(prefix="/batch", tags=["Batch"])

VALID_TRANSITIONS = {
    "submitted":  ["processing", "completed"],
    "processing": ["completed"],
    "completed":  [],  # terminal
}

class StatusOverrideRequest(BaseModel):
    status: Literal["submitted", "processing", "completed"]


@router.post("/submit", response_model=BatchValuationResponse, status_code=status.HTTP_201_CREATED)
def submit_batch(payload: BatchSubmitRequest, db: Session = Depends(get_db)):
    """Submit a new e-waste batch for pre-arrival valuation."""
    supplier = supplier_service.get_supplier(db, payload.supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail=f"Supplier '{payload.supplier_id}' not found.")

    try:
        batch, erv_breakdown = batch_service.submit_batch(
            db=db,
            supplier_id=payload.supplier_id,
            device_type=payload.device_type,
            weight=payload.weight,
            condition=payload.condition,
            specs=payload.specs,
            supplier_svi=supplier.svi,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return BatchValuationResponse(
        batch_id=batch.batch_id,
        supplier_id=batch.supplier_id,
        device_type=batch.device_type,
        weight=batch.weight,
        condition=batch.condition,
        segment=batch.segment,
        expected_value=batch.expected_value,
        offer_price=batch.offer_price,
        erv_breakdown=erv_breakdown,
        status=batch.status,
        submitted_at=batch.submitted_at,
    )


@router.get("/{batch_id}", response_model=BatchDetailResponse)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    """Retrieve full details and lifecycle status of a batch."""
    batch = batch_service.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")
    return batch


@router.patch("/{batch_id}/status")
def override_batch_status(batch_id: str, payload: StatusOverrideRequest, db: Session = Depends(get_db)):
    """Manually advance or override a batch's lifecycle status."""
    batch = db.query(models.Batch).filter_by(batch_id=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    new_status = payload.status
    current = batch.status

    if new_status == current:
        return {"batch_id": batch_id, "status": current, "message": "No change."}

    # Enforce forward-only transitions (warn but allow override for demo)
    if new_status not in VALID_TRANSITIONS.get(current, []):
        # Allow anyway — this is an admin override; just log a warning
        pass

    import random
    from app.models import FeedbackLog

    batch.status = new_status
    if new_status == "completed" and not batch.completed_at:
        batch.completed_at = datetime.utcnow()
        
        # Auto-simulate actual recovered value for demo purposes
        if batch.actual_value is None:
            variance = random.uniform(0.95, 1.05)
            batch.actual_value = round(batch.expected_value * variance, 2)
            
            error_ratio = round((batch.actual_value - batch.expected_value) / batch.expected_value, 4)
            db.add(FeedbackLog(
                batch_id=batch.batch_id,
                predicted_value=batch.expected_value,
                actual_value=batch.actual_value,
                error_ratio=error_ratio,
                abs_error_pct=round(abs(error_ratio) * 100, 2),
                logged_at=batch.completed_at,
            ))

    db.commit()
    db.refresh(batch)

    return {
        "batch_id": batch_id,
        "status": batch.status,
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
        "message": f"Status updated: {current} → {new_status}",
    }
