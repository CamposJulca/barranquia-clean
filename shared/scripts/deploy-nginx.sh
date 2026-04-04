#!/usr/bin/env bash
# deploy-nginx.sh — Aplica la config nginx de BarranquIA Hub y recarga el servicio.
# Requiere sudo. Ejecutar desde la raíz del repo:
#   sudo bash shared/scripts/deploy-nginx.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_SRC="$REPO_DIR/hub/infra/server/nginx/barranquia-hub.conf"
NGINX_DST="/etc/nginx/sites-enabled/barranquia-hub"

echo "[1/3] Copiando config nginx..."
cp "$NGINX_SRC" "$NGINX_DST"

echo "[2/3] Verificando sintaxis..."
nginx -t

echo "[3/3] Recargando nginx..."
systemctl reload nginx

echo ""
echo "=== Deploy nginx completado ==="
echo "  ServiPáramo → http://localhost:9005/serviparamo/"
echo "  Avantika    → http://localhost:9005/avantika/"
echo "  Joz         → http://localhost:9005/joz/"
echo "  Público     → https://barranquia-hub.ngrok.io"
