#!/usr/bin/env bash
# Terionix MRIS — Uninstaller
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

[[ $EUID -ne 0 ]] && echo -e "${RED}Run as root: sudo ./uninstall.sh${NC}" && exit 1

echo -e "\n${BOLD}${CYAN}  Uninstalling Terionix MRIS...${NC}\n"

systemctl stop  terionix-mris 2>/dev/null && echo -e "${GREEN}  ✔${NC} Service stopped"     || true
systemctl disable terionix-mris 2>/dev/null && echo -e "${GREEN}  ✔${NC} Service disabled"  || true

rm -f /etc/systemd/system/terionix-mris.service
systemctl daemon-reload

rm -f /usr/share/applications/terionix-mris.desktop
rm -f /usr/share/icons/hicolor/256x256/apps/terionix-mris.svg
rm -f /usr/local/bin/terionix
rm -rf /opt/terionix-mris

update-desktop-database /usr/share/applications 2>/dev/null || true

echo -e "\n${GREEN}${BOLD}  Terionix MRIS has been removed.${NC}\n"
