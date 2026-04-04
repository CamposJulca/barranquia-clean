#!/bin/bash
set -e

echo "=== BarranquIA Hub — iniciando ==="

# ── Esperar PostgreSQL ────────────────────────────────────────────────────────
echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
until python - <<'EOF'
import os, psycopg2, sys
try:
    psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "barranquia_hub"),
        user=os.environ.get("DB_USER", "barranquia"),
        password=os.environ.get("DB_PASSWORD", ""),
    ).close()
    sys.exit(0)
except Exception:
    sys.exit(1)
EOF
do
    echo "  PostgreSQL no disponible, reintentando en 2s..."
    sleep 2
done
echo "PostgreSQL listo."

# ── Migraciones ───────────────────────────────────────────────────────────────
echo "Ejecutando migraciones..."
python manage.py migrate --noinput

# ── Archivos estáticos ────────────────────────────────────────────────────────
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear

# ── Gunicorn ──────────────────────────────────────────────────────────────────
echo "Iniciando Gunicorn en 0.0.0.0:8005 con ${GUNICORN_WORKERS:-3} workers..."
exec gunicorn barranquia.wsgi:application \
    --bind 0.0.0.0:8005 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
