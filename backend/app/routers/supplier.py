import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SupplierCreate, SupplierOut
from app.services import supplier_service

router = APIRouter(prefix="/supplier", tags=["Supplier"])

ADMIN_KEY = os.getenv("ADMIN_API_KEY", "change-me-super-secret-key")


def _require_admin(x_api_key: str = Header(default=None)):
    """Simple API-key guard for admin-restricted endpoints."""
    if x_api_key != ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin API key required for this endpoint.",
        )


@router.post("", response_model=SupplierOut, status_code=201)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    """Register a new supplier."""
    existing = db.query(__import__('app.models', fromlist=['Supplier']).Supplier).filter_by(name=payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Supplier '{payload.name}' already exists.")
    return supplier_service.create_supplier(db, payload.name)


@router.get("", response_model=list[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    """List all suppliers ranked by SVI. Admin only."""
    return supplier_service.list_suppliers(db)


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: str, db: Session = Depends(get_db)):
    """Get a single supplier's details."""
    s = supplier_service.get_supplier(db, supplier_id)
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return s
