#!/usr/bin/env bash
# deploy-ngrok.sh — Instala y habilita el servicio systemd de ngrok para BarranquIA Hub.
# Requiere sudo. Ejecutar desde la raíz del repo:
#   sudo bash scripts/deploy-ngrok.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_SRC="$REPO_DIR/infra/systemd/barranquia-ngrok.service"
SERVICE_DST="/etc/systemd/system/barranquia-ngrok.service"

echo "[1/4] Copiando unit file..."
cp "$SERVICE_SRC" "$SERVICE_DST"

echo "[2/4] Recargando systemd..."
systemctl daemon-reload

echo "[3/4] Habilitando servicio (autostart)..."
systemctl enable barranquia-ngrok

echo "[4/4] Iniciando ngrok..."
systemctl restart barranquia-ngrok
sleep 3
systemctl status barranquia-ngrok --no-pager

echo ""
echo "=== Ngrok activo ==="
echo "  Público → https://barranquia-hub.ngrok.io/serviparamo/"
