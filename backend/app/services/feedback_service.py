import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Batch, FeedbackLog
from app.engines.learning_engine import LearningEngine
from app.services import supplier_service

logger = logging.getLogger(__name__)

_learning_engine = LearningEngine()


def submit_feedback(
    db: Session,
    batch_id: str,
    actual_value: float,
) -> dict:
    """
    Process actual recovery value for a completed batch:
    1. Compute prediction error
    2. Log to FeedbackLog
    3. Update batch status + actual_value
    4. Update supplier SVI
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found.")
    if batch.status == "completed":
        raise ValueError(f"Batch {batch_id} already has feedback logged.")

    predicted = batch.expected_value or 0.0

    # 1. Compute error
    learn_report = _learning_engine.compute_error(predicted, actual_value)

    # 2. Persist FeedbackLog
    existing = db.query(FeedbackLog).filter(FeedbackLog.batch_id == batch_id).first()
    if not existing:
        feedback = FeedbackLog(
            batch_id=batch_id,
            predicted_value=predicted,
            actual_value=actual_value,
            error_ratio=learn_report["error_ratio"],
            abs_error_pct=learn_report["abs_error_pct"],
        )
        db.add(feedback)

    # 3. Update batch
    batch.actual_value = actual_value
    batch.status = "completed"
    batch.completed_at = datetime.utcnow()

    db.commit()

    # 4. Update supplier SVI
    supplier = supplier_service.get_supplier(db, batch.supplier_id)
    if supplier:
        supplier_service.update_svi_after_feedback(
            db, supplier, learn_report["error_ratio"]
        )

    reliability_adj = _learning_engine.compute_reliability_adjustment(
        learn_report["error_ratio"]
    )

    logger.info(
        "FeedbackService | batch_id=%s error_pct=%.2f%% trigger=%s",
        batch_id, learn_report["abs_error_pct"], learn_report["trigger_learning"],
    )

    return {
        **learn_report,
        "reliability_adjustment": round(reliability_adj, 4),
        "message": (
            "Learning triggered — supplier SVI updated."
            if learn_report["trigger_learning"]
            else "Prediction within tolerance. Minor SVI adjustment applied."
        ),
    }
