#!/usr/bin/env bash
# =============================================================================
#  Terionix MRIS — Linux Installer
#  Tested on: Linux Mint 21+, Ubuntu 22.04+, Debian 12+
#  Usage:  chmod +x install.sh && sudo ./install.sh
# =============================================================================
set -e

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}  ●${NC} $1"; }
success() { echo -e "${GREEN}  ✔${NC} $1"; }
warn()    { echo -e "${YELLOW}  ⚠${NC} $1"; }
error()   { echo -e "${RED}  ✖${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}$1${NC}"; echo "  $(printf '─%.0s' {1..54})"; }

# ── Must be root ─────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Run as root:  sudo ./install.sh"
fi

INSTALL_DIR="/opt/terionix-mris"
SERVICE_NAME="terionix-mris"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DESKTOP_FILE="/usr/share/applications/terionix-mris.desktop"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}  ║  TERIONIX MRIS — Installation Wizard     ║${NC}"
echo -e "${BOLD}  ║  Material Recovery Intelligence System   ║${NC}"
echo -e "${BOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check Python 3 ───────────────────────────────────────────────────
header "Step 1/6 — Checking Prerequisites"

PYTHON=""
for cmd in python3.11 python3.10 python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" -c 'import sys; print(sys.version_info[:2])' 2>/dev/null)
        if "$cmd" -c 'import sys; sys.exit(0 if sys.version_info >= (3,8) else 1)' 2>/dev/null; then
            PYTHON="$cmd"
            break
        fi
    fi
done

if [[ -z "$PYTHON" ]]; then
    info "Python 3.8+ not found — installing..."
    apt-get update -qq
    apt-get install -y -qq python3 python3-pip
    PYTHON="python3"
fi
success "Python: $($PYTHON --version)"

# Ensure pip
if ! "$PYTHON" -m pip --version &>/dev/null; then
    info "Installing pip..."
    apt-get install -y -qq python3-pip || "$PYTHON" -m ensurepip --upgrade
fi
success "pip ready"

# ── Step 2: Copy application files ───────────────────────────────────────────
header "Step 2/6 — Installing Application Files"

info "Creating install directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

info "Copying backend..."
cp -r "$SCRIPT_DIR/backend" "$INSTALL_DIR/"

info "Copying frontend (built)..."
mkdir -p "$INSTALL_DIR/frontend"
cp -r "$SCRIPT_DIR/frontend/dist" "$INSTALL_DIR/frontend/"

# Copy config if at root level
[[ -f "$SCRIPT_DIR/.env.example" ]] && cp "$SCRIPT_DIR/.env.example" "$INSTALL_DIR/.env.example"

# Create .env if not present
if [[ ! -f "$INSTALL_DIR/backend/.env" ]]; then
    cat > "$INSTALL_DIR/backend/.env" <<'ENVEOF'
ADMIN_API_KEY=change-me-super-secret-key
DATABASE_URL=sqlite:///./terionix.db
ENVEOF
fi

success "Application files installed to $INSTALL_DIR"

# ── Step 3: Install Python dependencies ──────────────────────────────────────
header "Step 3/6 — Installing Python Dependencies"

info "Running pip install..."
"$PYTHON" -m pip install -r "$INSTALL_DIR/backend/requirements.txt" \
    --quiet --disable-pip-version-check --no-warn-script-location
success "All Python packages installed"

# ── Step 4: Seed demo data ────────────────────────────────────────────────────
header "Step 4/6 — Setting Up Demo Database"

info "Seeding demo data..."
cd "$INSTALL_DIR/backend"
"$PYTHON" seed_demo.py 2>/dev/null && success "Demo database seeded (25 batches, 5 IT companies)" \
    || warn "Seed skipped (will auto-seed on first launch)"
cd "$SCRIPT_DIR"

# ── Step 5: Create systemd service ───────────────────────────────────────────
header "Step 5/6 — Creating System Service"

PYTHON_PATH=$(which "$PYTHON")

cat > "$SERVICE_FILE" <<SVCEOF
[Unit]
Description=Terionix MRIS — Material Recovery Intelligence System
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=3
User=root
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=${PYTHON_PATH} -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    success "Service '$SERVICE_NAME' is running"
else
    warn "Service may still be starting — check: systemctl status $SERVICE_NAME"
fi

# ── Step 6: Create desktop launcher ──────────────────────────────────────────
header "Step 6/6 — Creating Desktop Launcher"

# Create launcher icon (simple SVG → PNG using Python if Pillow available, else skip)
ICON_DIR="/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$ICON_DIR"
cat > "$ICON_DIR/terionix-mris.svg" <<'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="32" fill="#0e1322"/>
  <text x="128" y="168" font-size="140" text-anchor="middle" fill="#47eaed" font-family="monospace" font-weight="bold">T</text>
  <rect x="32" y="200" width="192" height="6" rx="3" fill="#ffbf00"/>
</svg>
SVGEOF

cat > "$DESKTOP_FILE" <<DESKEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Terionix MRIS
GenericName=E-Waste Valuation Platform
Comment=Material Recovery Intelligence System — E-waste pre-arrival valuation
Exec=bash -c 'sleep 1 && xdg-open http://localhost:8000'
Icon=terionix-mris
Terminal=false
Categories=Office;Science;
Keywords=ewaste;recycling;valuation;compliance;EPR;
StartupNotify=true
DESKEOF

# Also create a CLI launcher
cat > "/usr/local/bin/terionix" <<'CLIEOF'
#!/usr/bin/env bash
# Terionix MRIS CLI helper
case "${1:-open}" in
    start)  systemctl start  terionix-mris; echo "Started" ;;
    stop)   systemctl stop   terionix-mris; echo "Stopped" ;;
    restart)systemctl restart terionix-mris; echo "Restarted" ;;
    status) systemctl status  terionix-mris ;;
    logs)   journalctl -u terionix-mris -f ;;
    open|"") sleep 1; xdg-open http://localhost:8000 ;;
    *)      echo "Usage: terionix [start|stop|restart|status|logs|open]" ;;
esac
CLIEOF
chmod +x "/usr/local/bin/terionix"

# Update desktop database
update-desktop-database /usr/share/applications 2>/dev/null || true
gtk-update-icon-cache /usr/share/icons/hicolor 2>/dev/null || true

success "Desktop launcher created"
success "CLI command created: terionix [start|stop|restart|status|logs|open]"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}   Installation Complete!${NC}"
echo -e "${GREEN}${BOLD}  ════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Open the app:${NC}     http://localhost:8000"
echo -e "  ${BOLD}App menu:${NC}         Search 'Terionix MRIS'"
echo -e "  ${BOLD}CLI:${NC}              terionix open"
echo -e "  ${BOLD}Service logs:${NC}     terionix logs"
echo -e "  ${BOLD}Uninstall:${NC}        sudo ./uninstall.sh"
echo ""
echo -e "  Opening browser..."
sleep 1
DISPLAY="${DISPLAY:-:0}" xdg-open "http://localhost:8000" 2>/dev/null &
echo ""
