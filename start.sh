#!/bin/bash
# Terionix MRIS — Portable Startup Script (Mac/Linux)

set -e

echo ""
echo "  ============================================================"
echo "   TERIONIX  |  Material Recovery Intelligence System"
echo "   Starting application..."
echo "  ============================================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "  [ERROR] Python 3 is not installed."
    echo "  Install it from https://python.org or via your package manager."
    exit 1
fi
echo "  [1/3] Python found: $(python3 --version)"

# Install dependencies
echo "  [2/3] Installing Python dependencies..."
cd "$(dirname "$0")/backend"
pip3 install -r requirements.txt --quiet --disable-pip-version-check

echo "  [3/3] Dependencies ready."
echo ""

# Seed demo data
echo "  Seeding demo data..."
python3 seed_demo.py 2>/dev/null || true

echo ""
echo "  ============================================================"
echo "   App is running at:  http://localhost:8000"
echo "   Press Ctrl+C to stop."
echo "  ============================================================"
echo ""

# Open browser (works on Mac and most Linux desktops)
sleep 2 && (open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null || true) &

# Start server
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
