import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(200), nullable=False, unique=True)
    consistency_score = Column(Float, default=0.70, nullable=False)
    reliability_score = Column(Float, default=0.70, nullable=False)
    svi = Column(Float, default=0.70, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    batches = relationship("Batch", back_populates="supplier", lazy="dynamic")


class Batch(Base):
    __tablename__ = "batches"

    batch_id = Column(String, primary_key=True, default=_uuid)
    supplier_id = Column(String, ForeignKey("suppliers.supplier_id"), nullable=False)
    device_type = Column(String(100), nullable=False)
    specs_json = Column(Text, nullable=True)        # JSON-encoded raw specs
    weight = Column(Float, nullable=False)          # kg
    condition = Column(String(50), nullable=False)
    expected_value = Column(Float, nullable=True)   # ERV USD
    actual_value = Column(Float, nullable=True)     # actual USD (post-recovery)
    offer_price = Column(Float, nullable=True)      # supplier offer USD
    segment = Column(String(20), nullable=True)     # HIGH / MEDIUM / LOW
    status = Column(String(50), default="submitted") # submitted | processing | completed
    erv_breakdown_json = Column(Text, nullable=True) # per-material ERV JSON
    submitted_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    supplier = relationship("Supplier", back_populates="batches")
    feedback = relationship("FeedbackLog", back_populates="batch", uselist=False)


class FeedbackLog(Base):
    __tablename__ = "feedback_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String, ForeignKey("batches.batch_id"), nullable=False, unique=True)
    predicted_value = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=False)
    error_ratio = Column(Float, nullable=False)
    abs_error_pct = Column(Float, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="feedback")
