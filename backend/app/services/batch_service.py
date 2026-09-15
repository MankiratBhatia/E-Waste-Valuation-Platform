import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Batch
from app.engines.feature_engine import FeatureEngine
from app.engines.composition_engine import CompositionEngine
from app.engines.valuation_engine import ValuationEngine
from app.engines.segmentation_engine import SegmentationEngine
from app.engines.pricing_engine import PricingEngine

logger = logging.getLogger(__name__)

_feature_engine = FeatureEngine()
_composition_engine = CompositionEngine()
_valuation_engine = ValuationEngine()
_segmentation_engine = SegmentationEngine()
_pricing_engine = PricingEngine()


def submit_batch(
    db: Session,
    supplier_id: str,
    device_type: str,
    weight: float,
    condition: str,
    specs: dict | None,
    supplier_svi: float,
) -> Batch:
    """
    Full MRIS pipeline:
      Feature → Composition → Valuation → Segmentation → Pricing → Persist
    """
    # 1. Feature vector
    feature_vector = _feature_engine.build_vector(device_type, weight, condition, specs)
    logger.info("BatchService | step=feature_vector batch_supplier=%s", supplier_id)

    # 2. Composition estimation
    material_weights = _composition_engine.estimate(feature_vector)
    logger.info("BatchService | step=composition materials=%s", list(material_weights.keys()))

    # 3. Valuation (ERV)
    erv, erv_breakdown = _valuation_engine.compute_erv(material_weights)
    logger.info("BatchService | step=valuation erv=%.2f", erv)

    # 4. Segmentation
    segment_info = _segmentation_engine.classify(erv)
    logger.info("BatchService | step=segmentation segment=%s", segment_info["segment"])

    # 5. Pricing
    pricing_info = _pricing_engine.compute_offer(erv, supplier_svi)
    logger.info("BatchService | step=pricing offer=%.2f", pricing_info["offer_price"])

    # 6. Persist
    batch = Batch(
        supplier_id=supplier_id,
        device_type=device_type,
        specs_json=json.dumps(specs or {}),
        weight=weight,
        condition=condition,
        expected_value=erv,
        offer_price=pricing_info["offer_price"],
        segment=segment_info["segment"],
        status="submitted",
        erv_breakdown_json=json.dumps(erv_breakdown),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    logger.info("BatchService | step=persisted batch_id=%s", batch.batch_id)

    return batch, erv_breakdown


def get_batch(db: Session, batch_id: str) -> Batch | None:
    return db.query(Batch).filter(Batch.batch_id == batch_id).first()
