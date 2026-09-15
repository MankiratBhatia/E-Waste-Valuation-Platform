from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────
# Supplier Schemas
# ─────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)

class SupplierOut(BaseModel):
    supplier_id: str
    name: str
    consistency_score: float
    reliability_score: float
    svi: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────
# Batch Schemas
# ─────────────────────────────────────────────────────────

class BatchSubmitRequest(BaseModel):
    supplier_id: str
    device_type: str = Field(..., examples=["smartphone", "laptop"])
    weight: float = Field(..., gt=0, description="Batch weight in kg")
    condition: str = Field(..., examples=["good", "fair"])
    specs: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional specs: age_years, battery_health, quantity"
    )


class BatchValuationResponse(BaseModel):
    batch_id: str
    supplier_id: str
    device_type: str
    weight: float
    condition: str
    segment: str
    expected_value: float       # ERV
    offer_price: float
    erv_breakdown: Dict[str, float]
    status: str
    submitted_at: datetime


class BatchDetailResponse(BaseModel):
    batch_id: str
    supplier_id: str
    device_type: str
    weight: float
    condition: str
    segment: Optional[str]
    expected_value: Optional[float]
    actual_value: Optional[float]
    offer_price: Optional[float]
    status: str
    submitted_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────
# Dashboard Schemas
# ─────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    total_batches: int
    total_erv_usd: float
    total_actual_recovered_usd: float
    average_error_pct: float
    segment_counts: Dict[str, int]
    status_counts: Dict[str, int]
    top_suppliers: List[SupplierOut]
    recent_batches: List[BatchDetailResponse]


# ─────────────────────────────────────────────────────────
# Feedback Schemas
# ─────────────────────────────────────────────────────────

class FeedbackSubmitRequest(BaseModel):
    batch_id: str
    actual_value: float = Field(..., gt=0, description="Actual recovery value in USD")


class FeedbackResponse(BaseModel):
    batch_id: str
    predicted_value: float
    actual_value: float
    error_ratio: float
    abs_error_pct: float
    trigger_learning: bool
    reliability_adjustment: float
    message: str
