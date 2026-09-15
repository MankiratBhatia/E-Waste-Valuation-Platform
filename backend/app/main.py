import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from app.database import engine, Base, SessionLocal
from app.routers import batch, dashboard, supplier, feedback, certificate

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("terionix.main")

# Path to built React app — relative to this file (backend/app/main.py)
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def _seed_demo_data():
    """Insert demo suppliers if the DB is empty."""
    from app.models import Supplier
    from app.services.supplier_service import _recompute_svi

    db = SessionLocal()
    try:
        if db.query(Supplier).count() == 0:
            demo = [
                Supplier(name="Nexacore Infosystems Pvt. Ltd.", consistency_score=0.92, reliability_score=0.88),
                Supplier(name="CloudVault Technologies",        consistency_score=0.78, reliability_score=0.82),
                Supplier(name="DataForge IT Solutions",         consistency_score=0.65, reliability_score=0.70),
                Supplier(name="Luminary Systems India",         consistency_score=0.55, reliability_score=0.60),
            ]
            for s in demo:
                s.svi = _recompute_svi(s)
            db.add_all(demo)
            db.commit()
            logger.info("Seeded %d demo suppliers.", len(demo))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")
    _seed_demo_data()
    yield
    logger.info("Terionix-MRIS shutting down.")


app = FastAPI(
    title="Terionix-MRIS API",
    description="Material Recovery Intelligence System",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers (must be registered BEFORE the static file catch-all) ─────────
app.include_router(batch.router)
app.include_router(dashboard.router)
app.include_router(supplier.router)
app.include_router(feedback.router)
app.include_router(certificate.router)


@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok", "system": "Terionix-MRIS", "version": "3.0.0"}


# ── Serve built React app (SPA) ───────────────────────────────────────────────
if STATIC_DIR.exists():
    # Serve static assets (JS/CSS/images)
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Return index.html for all non-API routes so React Router works."""
        # Serve specific static files if they exist (favicon, manifest, etc.)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))

    logger.info("Serving React app from: %s", STATIC_DIR)
else:
    logger.warning(
        "Frontend dist not found at %s — run `npm run build` inside frontend/",
        STATIC_DIR,
    )
