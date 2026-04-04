#!/bin/bash
set -e

echo "=== ServiPáramo Backend — iniciando ==="

# Esperar PostgreSQL
echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
until python - <<'EOF'
import os, psycopg2, sys
try:
    psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "serviparamo"),
        user=os.environ.get("DB_USER", "serviparamo"),
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

# Migraciones
echo "Ejecutando migraciones..."
python manage.py migrate --noinput

# Gunicorn
echo "Iniciando Gunicorn en 0.0.0.0:8001 con ${GUNICORN_WORKERS:-3} workers..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8001 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
