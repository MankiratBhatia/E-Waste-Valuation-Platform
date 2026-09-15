# Terionix MRIS — Portable Setup Guide

## What Your Friend Needs

**Only Python 3.10+** — that's it. No Node.js, no Docker, no other tools.

Download Python: https://python.org/downloads
> ⚠️ During install on Windows — tick **"Add Python to PATH"**

---

## Running the App

### Windows
1. Open the `SEDS_HACK` folder
2. Double-click **`START.bat`**
3. A browser window opens at **http://localhost:8000**

### Mac / Linux
```bash
chmod +x start.sh
./start.sh
```

---

## What happens automatically
- Python dependencies are installed (first run takes ~30 seconds)
- Demo database is seeded with 25 batches and 5 IT companies
- The browser opens automatically
- The full app (frontend + API) runs on **http://localhost:8000**

---

## Stopping the App
Press **Ctrl+C** in the terminal/command window.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python is not recognized` | Re-install Python and tick "Add to PATH" |
| Port 8000 in use | Kill the process using port 8000, or change `--port 8000` in START.bat |
| Page not loading | Wait 5 seconds and refresh — first startup installs packages |
| No data showing | The seed runs automatically; wait for the startup to finish |

---

## Folder Structure

```
SEDS_HACK/
├── START.bat          ← Double-click this on Windows
├── start.sh           ← Run this on Mac/Linux
├── backend/
│   ├── app/           ← FastAPI application + engines
│   ├── config/        ← Market prices, thresholds (INR)
│   ├── requirements.txt
│   └── seed_demo.py   ← Demo data seeder
└── frontend/
    └── dist/          ← Built React app (served by FastAPI)
```

---

## API Documentation
Once running, visit: **http://localhost:8000/docs**
