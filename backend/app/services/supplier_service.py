import json
import logging
from sqlalchemy.orm import Session

from app.models import Supplier
from app.engines.learning_engine import LearningEngine

logger = logging.getLogger(__name__)

_learning_engine = LearningEngine()

# SVI weights (from thresholds.json via learning engine config)
_CONSISTENCY_WEIGHT = 0.60
_RELIABILITY_WEIGHT = 0.40


def _recompute_svi(supplier: Supplier) -> float:
    svi = (
        _CONSISTENCY_WEIGHT * supplier.consistency_score
        + _RELIABILITY_WEIGHT * supplier.reliability_score
    )
    return round(max(0.10, min(1.00, svi)), 4)


def create_supplier(db: Session, name: str) -> Supplier:
    supplier = Supplier(name=name)
    supplier.svi = _recompute_svi(supplier)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def get_supplier(db: Session, supplier_id: str) -> Supplier | None:
    return db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()


def list_suppliers(db: Session, limit: int = 50) -> list[Supplier]:
    return (
        db.query(Supplier)
        .order_by(Supplier.svi.desc())
        .limit(limit)
        .all()
    )


def update_svi_after_feedback(
    db: Session,
    supplier: Supplier,
    error_ratio: float,
) -> Supplier:
    """
    Adjust reliability_score based on prediction error and recompute SVI.
    """
    adjustment = _learning_engine.compute_reliability_adjustment(error_ratio)
    supplier.reliability_score = round(
        max(0.10, min(1.00, supplier.reliability_score + adjustment)), 4
    )
    supplier.svi = _recompute_svi(supplier)
    db.commit()
    db.refresh(supplier)
    logger.info(
        "SupplierService | supplier_id=%s new_svi=%.4f adjustment=%.4f",
        supplier.supplier_id, supplier.svi, adjustment,
    )
    return supplier
