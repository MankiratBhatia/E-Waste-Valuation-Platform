"""
seed_demo.py — Populate Terionix MRIS with realistic demo data (INR, IT companies).
Run: python seed_demo.py
"""
import sys, os, json, uuid, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ─── 1. Wipe existing data for clean re-seed ─────────────────────────────
db.query(models.FeedbackLog).delete()
db.query(models.Batch).delete()
db.query(models.Supplier).delete()
db.commit()

# ─── 2. IT Company Suppliers ────────────────────────────────────────────
SUPPLIERS = [
    {"name": "Nexacore Infosystems Pvt. Ltd.",  "consistency": 0.91, "reliability": 0.88, "svi": 0.90},
    {"name": "CloudVault Technologies",          "consistency": 0.83, "reliability": 0.79, "svi": 0.82},
    {"name": "DataForge IT Solutions",           "consistency": 0.72, "reliability": 0.74, "svi": 0.73},
    {"name": "Luminary Systems India",           "consistency": 0.65, "reliability": 0.68, "svi": 0.66},
    {"name": "QuantumEdge Software Ltd.",        "consistency": 0.55, "reliability": 0.52, "svi": 0.54},
]

supplier_ids = {}
for s in SUPPLIERS:
    sup = models.Supplier(
        supplier_id=str(uuid.uuid4()),
        name=s["name"],
        consistency_score=s["consistency"],
        reliability_score=s["reliability"],
        svi=s["svi"],
    )
    db.add(sup)
    supplier_ids[s["name"]] = sup.supplier_id

db.flush()
print(f"✓ Seeded {len(SUPPLIERS)} IT company suppliers")

# ─── 3. INR material prices ──────────────────────────────────────────────
PRICES_INR = {
    "copper": 743.85, "aluminum": 195.05, "pcb": 431.60,
    "lithium": 2365.50, "precious_metals": 4316000.0,
    "plastic": 29.05, "glass": 9.96
}
RECOVERY = {"copper": 0.90, "aluminum": 0.88, "pcb": 0.70,
            "lithium": 0.75, "precious_metals": 0.95, "plastic": 0.60, "glass": 0.50}

DEVICE_SPECS = {
    "smartphone":  {"copper": 0.018, "aluminum": 0.022, "pcb": 0.035, "lithium": 0.009, "precious_metals": 0.0004, "plastic": 0.062, "glass": 0.018},
    "laptop":      {"copper": 0.028, "aluminum": 0.085, "pcb": 0.052, "lithium": 0.035, "precious_metals": 0.0003, "plastic": 0.094, "glass": 0.013},
    "tablet":      {"copper": 0.015, "aluminum": 0.038, "pcb": 0.028, "lithium": 0.022, "precious_metals": 0.0002, "plastic": 0.048, "glass": 0.022},
    "desktop":     {"copper": 0.072, "aluminum": 0.095, "pcb": 0.078, "lithium": 0.002, "precious_metals": 0.0006, "plastic": 0.155, "glass": 0.002},
    "server":      {"copper": 0.185, "aluminum": 0.145, "pcb": 0.165, "lithium": 0.008, "precious_metals": 0.0015, "plastic": 0.115, "glass": 0.002},
    "monitor":     {"copper": 0.025, "aluminum": 0.038, "pcb": 0.022, "lithium": 0.00,  "precious_metals": 0.0001, "plastic": 0.095, "glass": 0.142},
}
COND_MULT = {"excellent": 1.15, "good": 1.0, "fair": 0.80, "poor": 0.60, "damaged": 0.40}

def age_factor(age):
    for (lo, hi), m in {(0,2):1.1,(2,5):1.0,(5,8):0.88,(8,12):0.72,(12,99):0.58}.items():
        if lo <= age < hi: return m
    return 0.58

def compute_erv(device, weight, condition, age):
    specs = DEVICE_SPECS.get(device, DEVICE_SPECS["laptop"])
    cond = COND_MULT.get(condition, 1.0)
    af = age_factor(age)
    breakdown, total = {}, 0.0
    for mat, frac in specs.items():
        val = weight * frac * cond * af * PRICES_INR[mat] * RECOVERY[mat]
        breakdown[mat] = round(val, 2)
        total += val
    return round(total, 2), breakdown

def segment(erv):
    if erv >= 41500: return "HIGH"
    if erv >= 12450: return "MEDIUM"
    return "LOW"

# ─── 4. No prepopulated batches ────────────────────────────────────────────
BATCHES_DEF = []

created = 0
for (sup_name, device, weight, cond, age, status, days_ago, actual_pct) in BATCHES_DEF:
    sid = supplier_ids.get(sup_name)
    if not sid: continue

    erv, breakdown = compute_erv(device, weight, cond, age)
    seg = segment(erv)
    offer = round(erv * random.uniform(0.70, 0.78), 2)

    submitted_at = datetime.utcnow() - timedelta(days=days_ago)
    completed_at = None
    actual_value = None

    if status == "completed":
        completed_at = submitted_at + timedelta(days=random.randint(7, 21))
        actual_value = round(erv * actual_pct + random.uniform(-500, 500), 2)

    batch = models.Batch(
        batch_id=str(uuid.uuid4()),
        supplier_id=sid,
        device_type=device,
        weight=weight,
        condition=cond,
        specs_json=json.dumps({"age_years": age, "battery_health": random.randint(55, 95)}),
        expected_value=erv,
        actual_value=actual_value,
        offer_price=offer,
        segment=seg,
        status=status,
        erv_breakdown_json=json.dumps(breakdown),
        submitted_at=submitted_at,
        completed_at=completed_at,
    )
    db.add(batch)

    if status == "completed" and actual_value:
        error_ratio = round((actual_value - erv) / erv, 4)
        db.add(models.FeedbackLog(
            batch_id=batch.batch_id,
            predicted_value=erv,
            actual_value=actual_value,
            error_ratio=error_ratio,
            abs_error_pct=round(abs(error_ratio) * 100, 2),
            logged_at=completed_at,
        ))

    created += 1

db.commit()
db.close()

completed_n = sum(1 for b in BATCHES_DEF if b[5] == 'completed')
processing_n = sum(1 for b in BATCHES_DEF if b[5] == 'processing')
submitted_n  = sum(1 for b in BATCHES_DEF if b[5] == 'submitted')

print(f"✓ Seeded {created} batches  (INR pricing)")
print(f"  Completed: {completed_n}  |  Processing: {processing_n}  |  Submitted: {submitted_n}")
print()
print("✓ Refresh http://localhost:5173 — all values now in INR ₹")
