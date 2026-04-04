#!/bin/bash
set -e

echo "=== Joz Backend — iniciando ==="

echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
until python - <<'EOF'
import os, psycopg2, sys
try:
    psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "joz"),
        user=os.environ.get("DB_USER", "joz"),
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

echo "Iniciando Gunicorn en 0.0.0.0:8003 con ${GUNICORN_WORKERS:-3} workers..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8003 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
