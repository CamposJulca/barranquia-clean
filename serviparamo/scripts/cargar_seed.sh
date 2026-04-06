#!/usr/bin/env bash
# =============================================================================
# ServiPáramo — Cargador de seed de desarrollo
# =============================================================================
# Carga el dump generado por generar_seed.sh en el PostgreSQL local.
# No requiere acceso al ERP — trabaja solo con el archivo SQL.
#
# Uso:
#   cd <raiz-del-repo>
#   bash serviparamo/scripts/cargar_seed.sh
#
# Prerequisito:
#   - docker compose up -d (infraestructura corriendo)
#   - serviparamo/docs/serviparamo_seed.sql existe
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SEED="$REPO_ROOT/serviparamo/docs/serviparamo_seed.sql"
CONTENEDOR_POSTGRES="barranquia_postgres"
CONTENEDOR_BACKEND="barranquia_serviparamo_backend"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ServiPáramo — Cargador de seed de desarrollo"
echo "══════════════════════════════════════════════════════"
echo ""

# ── 0. Verificar prerequisitos ────────────────────────────────────────────────
if [ ! -f "$SEED" ]; then
  echo "[ERROR] No se encontró el seed en: $SEED"
  echo "        Pídele al equipo el archivo serviparamo_seed.sql"
  echo "        o ejecútalo tú desde una red con acceso al ERP:"
  echo "        bash serviparamo/scripts/generar_seed.sh"
  exit 1
fi

for c in "$CONTENEDOR_POSTGRES" "$CONTENEDOR_BACKEND"; do
  if ! docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
    echo "[ERROR] El contenedor '$c' no está corriendo."
    echo "        Levanta la infraestructura con: cd shared && docker compose up -d"
    exit 1
  fi
done

echo "[OK] Seed encontrado: $(du -sh "$SEED" | cut -f1)"
echo "[OK] Contenedores activos."

# ── 1. Aplicar migraciones (por si acaso) ────────────────────────────────────
echo "[...] Verificando migraciones..."
docker exec "$CONTENEDOR_BACKEND" python manage.py migrate --run-syncdb 2>/dev/null || true
echo "[OK] Migraciones aplicadas."

# ── 2. Limpiar tablas destino antes de cargar ─────────────────────────────────
echo "[...] Limpiando tablas existentes..."
docker exec "$CONTENEDOR_POSTGRES" psql -U serviparamo -d serviparamo -c "
TRUNCATE TABLE
  serviparamo_catalogo_skus,
  serviparamo_raw_categorias,
  serviparamo_raw_familias,
  serviparamo_raw_ordenes_encabezado,
  serviparamo_raw_ordenes_detalle,
  serviparamo_raw_pedidos_encabezado,
  serviparamo_raw_pedidos_detalle,
  serviparamo_raw_presupuesto_detalle,
  serviparamo_raw_presupuesto_resumen,
  serviparamo_raw_kardex
RESTART IDENTITY CASCADE;
" 2>/dev/null
echo "[OK] Tablas limpias."

# ── 3. Copiar y cargar el seed ────────────────────────────────────────────────
echo "[...] Copiando seed al contenedor..."
docker cp "$SEED" "$CONTENEDOR_POSTGRES":/tmp/serviparamo_seed.sql

echo "[...] Cargando datos (puede tardar unos minutos)..."
docker exec "$CONTENEDOR_POSTGRES" psql -U serviparamo -d serviparamo \
  -f /tmp/serviparamo_seed.sql 2>/dev/null | tail -5

# ── 4. Verificar carga ────────────────────────────────────────────────────────
echo ""
echo "[...] Verificando carga:"
docker exec "$CONTENEDOR_POSTGRES" psql -U serviparamo -d serviparamo \
  -c "SELECT tablename,
        (xpath('/row/c/text()',
          query_to_xml('SELECT COUNT(*) AS c FROM ' || quote_ident(tablename), false, true, '')))[1]::text::int AS filas
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'serviparamo_%'
      ORDER BY filas DESC;" 2>/dev/null

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Seed cargado exitosamente"
echo "══════════════════════════════════════════════════════"
echo ""
echo "Siguiente paso — generar embeddings para búsqueda semántica:"
echo "  curl -X POST http://localhost:8001/api/serviparamo/embeddings/generar/"
echo ""
