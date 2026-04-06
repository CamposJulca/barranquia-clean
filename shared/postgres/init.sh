#!/usr/bin/env bash
# BarranquIA Hub — PostgreSQL initialization
# Crea usuarios y bases de datos para cada microservicio.
# Se ejecuta una sola vez al crear el volumen (docker-entrypoint-initdb.d).
# Al ser .sh puede leer variables de entorno del contenedor.
set -e

SUPERUSER="${POSTGRES_USER:-barranquia}"

psql -v ON_ERROR_STOP=1 --username "$SUPERUSER" <<-EOSQL

-- ── Hub (base de datos principal) ────────────────────────────────────────────
-- POSTGRES_DB ya la crea automáticamente, pero la garantizamos aquí también.
SELECT 'CREATE DATABASE ${DB_NAME:-barranquia_hub} OWNER $SUPERUSER'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '${DB_NAME:-barranquia_hub}'
) \gexec

-- ── ServiPáramo ───────────────────────────────────────────────────────────────
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'serviparamo') THEN
    CREATE ROLE serviparamo WITH LOGIN PASSWORD '${SERVIPARAMO_DB_PASSWORD:-serviparamo2024}';
  END IF;
END \$\$;

SELECT 'CREATE DATABASE serviparamo OWNER serviparamo'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'serviparamo') \gexec

GRANT ALL PRIVILEGES ON DATABASE serviparamo TO serviparamo;

-- ── Avantika ──────────────────────────────────────────────────────────────────
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'avantika') THEN
    CREATE ROLE avantika WITH LOGIN PASSWORD '${AVANTIKA_DB_PASSWORD:-avantika2024}';
  END IF;
END \$\$;

SELECT 'CREATE DATABASE avantika OWNER avantika'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'avantika') \gexec

GRANT ALL PRIVILEGES ON DATABASE avantika TO avantika;

-- ── Joz ───────────────────────────────────────────────────────────────────────
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'joz') THEN
    CREATE ROLE joz WITH LOGIN PASSWORD '${JOZ_DB_PASSWORD:-joz2024}';
  END IF;
END \$\$;

SELECT 'CREATE DATABASE joz OWNER joz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'joz') \gexec

GRANT ALL PRIVILEGES ON DATABASE joz TO joz;

EOSQL
