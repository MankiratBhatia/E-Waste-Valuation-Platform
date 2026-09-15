from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Batch, Supplier, FeedbackLog
from app.schemas import DashboardResponse, BatchDetailResponse, SupplierOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    """Return aggregated recovery stats, segment distribution, and recent batches."""
    total_batches = db.query(func.count(Batch.batch_id)).scalar() or 0
    total_erv = db.query(func.coalesce(func.sum(Batch.expected_value), 0.0)).scalar()
    total_actual = db.query(func.coalesce(func.sum(Batch.actual_value), 0.0)).scalar()

    # Average prediction error
    avg_error = (
        db.query(func.avg(FeedbackLog.abs_error_pct)).scalar() or 0.0
    )

    # Segment counts
    segment_rows = (
        db.query(Batch.segment, func.count(Batch.batch_id))
        .group_by(Batch.segment)
        .all()
    )
    segment_counts = {row[0] or "UNKNOWN": row[1] for row in segment_rows}

    # Status counts
    status_rows = (
        db.query(Batch.status, func.count(Batch.batch_id))
        .group_by(Batch.status)
        .all()
    )
    status_counts = {row[0]: row[1] for row in status_rows}

    # Top 5 suppliers by SVI
    top_suppliers = (
        db.query(Supplier).order_by(Supplier.svi.desc()).limit(5).all()
    )

    # 10 most recent batches
    recent_batches = (
        db.query(Batch).order_by(Batch.submitted_at.desc()).limit(10).all()
    )

    return DashboardResponse(
        total_batches=total_batches,
        total_erv_usd=round(float(total_erv), 2),
        total_actual_recovered_usd=round(float(total_actual), 2),
        average_error_pct=round(float(avg_error), 2),
        segment_counts=segment_counts,
        status_counts=status_counts,
        top_suppliers=[SupplierOut.model_validate(s) for s in top_suppliers],
        recent_batches=[BatchDetailResponse.model_validate(b) for b in recent_batches],
    )
