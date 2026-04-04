-- BarranquIA Hub — PostgreSQL initialization
-- Crea una base de datos y usuario dedicado para cada microservicio.
-- El superusuario (POSTGRES_USER) tiene acceso a todas las BDs.
-- Este script se ejecuta una sola vez al crear el volumen.

-- ── ServiPáramo ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'serviparamo') THEN
    CREATE ROLE serviparamo WITH LOGIN PASSWORD 'serviparamo2024';
  END IF;
END $$;

SELECT 'CREATE DATABASE serviparamo OWNER serviparamo'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'serviparamo') \gexec

GRANT ALL PRIVILEGES ON DATABASE serviparamo TO serviparamo;

-- ── Avantika ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'avantika') THEN
    CREATE ROLE avantika WITH LOGIN PASSWORD 'avantika2024';
  END IF;
END $$;

SELECT 'CREATE DATABASE avantika OWNER avantika'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'avantika') \gexec

GRANT ALL PRIVILEGES ON DATABASE avantika TO avantika;

-- ── Joz ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'joz') THEN
    CREATE ROLE joz WITH LOGIN PASSWORD 'joz2024';
  END IF;
END $$;

SELECT 'CREATE DATABASE joz OWNER joz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'joz') \gexec

GRANT ALL PRIVILEGES ON DATABASE joz TO joz;
