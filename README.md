# Terionix-MRIS Enterprise

**Material Recovery Intelligence System — v3.0.0**  
A pre-arrival e-waste valuation platform. Suppliers submit batch details before physical arrival; the system estimates material composition, computes Expected Recovery Value (ERV), offers dynamic pricing via Supplier Value Index (SVI), and continuously improves via a prediction-vs-actual feedback loop.

---

## Architecture

```
SEDS_HACK/
├── backend/               # FastAPI + SQLAlchemy + Python
│   ├── app/
│   │   ├── main.py        # Entry point (CORS, DB init, seed data)
│   │   ├── database.py    # SQLAlchemy engine + session
│   │   ├── models.py      # ORM: Suppliers, Batches, FeedbackLog
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   ├── engines/       # Core MRIS engines (feature→valuation→pricing)
│   │   ├── services/      # BatchService, SupplierService, FeedbackService
│   │   └── routers/       # FastAPI routers for each endpoint
│   ├── config/            # JSON config files (prices, rules, thresholds)
│   └── requirements.txt
├── frontend/              # Vite + React (designed via Stitch MCP)
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
copy ..\\.env.example ..\\.env

# Run API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend at: **http://localhost:5173**

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/batch/submit` | Submit e-waste batch → full valuation | Open |
| `GET` | `/batch/{id}` | Get batch details & lifecycle status | Open |
| `GET` | `/dashboard` | Aggregated dashboard stats | Open |
| `GET` | `/supplier` | List all suppliers ranked by SVI | **Admin** |
| `POST` | `/supplier` | Register a new supplier | Open |
| `GET` | `/supplier/{id}` | Get a single supplier | Open |
| `POST` | `/feedback` | Log actual recovery value → triggers learning | Open |
| `GET` | `/health` | Health check | Open |

> **Admin endpoints** require `X-API-Key: <ADMIN_API_KEY>` header.

---

## Core Formulas

| Engine | Formula |
|---|---|
| Composition | `m_adjusted = m_base × cond_multiplier × age_multiplier + material_deltas` |
| Valuation (ERV) | `ERV = Σ(m_i × P_i × Rc_i)` |
| Pricing | `Offer = ERV × (base_margin + svi × svi_uplift)` |
| SVI | `SVI = 0.6 × consistency_score + 0.4 × reliability_score` |

---

## UI Screens (Stitch MCP — "Digital Alchemist" Design System)

| Screen | Stitch ID |
|---|---|
| Intake Valuation Panel | `a216bd29f8f04b5987014c4b55e12e37` |
| Recovery Dashboard | `1d069f0fa7aa4d168483733d5f77e3d6` |
| Batch Lifecycle Tracker | `b521367242b842bba53b46215af49d50` |
| Supplier Intelligence Panel | `13f16acf477c402db6d1705ebc2bc227` |
| Feedback Reconciliation Panel | `0ba5b3a14a7f4602bc76cc9379c94031` |

Stitch Project: **13434323864268496996**

Design tokens: `#0e1322` navy base · `#47eaed` teal primary · `#ffbf00` gold accent · Glassmorphism cards · Inter font

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./terionix.db` | DB connection string |
| `ADMIN_API_KEY` | `change-me-super-secret-key` | API key for admin endpoints |
| `API_BASE_URL` | `http://localhost:8000` | Used by frontend |

---

## Design Principles

- **Separation of Concerns** — engines, services, routers are fully decoupled
- **Config-Driven Logic** — all material prices, rules, and thresholds are JSON files
- **Pre-Arrival Valuation** — ERV computed before batch physically arrives
- **Economic Segregation** — HIGH/MEDIUM/LOW tier classification drives processing priority
- **Continuous Learning Loop** — prediction error updates supplier SVI after every recovery
