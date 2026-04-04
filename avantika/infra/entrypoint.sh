#!/bin/bash
set -e

echo "=== Avantika Backend — iniciando ==="

echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
until python - <<'EOF'
import os, psycopg2, sys
try:
    psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "avantika"),
        user=os.environ.get("DB_USER", "avantika"),
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

echo "Ejecutando migraciones..."
python manage.py migrate --noinput

echo "Iniciando Gunicorn en 0.0.0.0:8002 con ${GUNICORN_WORKERS:-3} workers..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8002 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
