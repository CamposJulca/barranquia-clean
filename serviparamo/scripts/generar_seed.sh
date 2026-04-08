#!/usr/bin/env bash
# =============================================================================
# ServiPáramo — Generador de seed de desarrollo
# =============================================================================
# Ejecutar en el servidor con acceso al ERP (ts1.serviparamo.com.co:1433).
#
# Uso:
#   cd <raiz-del-repo>/serviparamo/scripts
#   bash generar_seed.sh
#
# Resultado:
#   serviparamo/docs/serviparamo_seed.sql  — dump listo para commitear
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SALIDA="$REPO_ROOT/serviparamo/docs/serviparamo_seed.sql"
CONTENEDOR_POSTGRES="barranquia_postgres"
CONTENEDOR_BACKEND="barranquia_serviparamo_backend"
API="http://localhost:8001"
MAX_ESPERA=600   # segundos máximos esperando al ETL

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ServiPáramo — Generador de seed de desarrollo"
echo "══════════════════════════════════════════════════════"
echo ""

# ── 0. Verificar que los contenedores están corriendo ─────────────────────────
for c in "$CONTENEDOR_POSTGRES" "$CONTENEDOR_BACKEND"; do
  if ! docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
    echo "[ERROR] El contenedor '$c' no está corriendo."
    echo "        Levanta la infraestructura con: cd shared && docker compose up -d"
    exit 1
  fi
done
echo "[OK] Contenedores activos."

# ── 1. Verificar conectividad al ERP ─────────────────────────────────────────
echo "[...] Probando conectividad al ERP (ts1.serviparamo.com.co:1433)..."
if ! docker exec "$CONTENEDOR_BACKEND" bash -c \
  "timeout 5 bash -c '</dev/tcp/ts1.serviparamo.com.co/1433'" 2>/dev/null; then
  echo "[ERROR] No se puede alcanzar el ERP."
  echo "        Verifica que estás en la red/VPN correcta de ServiPáramo."
  exit 1
fi
echo "[OK] ERP alcanzable."

# ── 2. Disparar el ETL ────────────────────────────────────────────────────────
echo "[...] Iniciando ETL..."
RESP=$(curl -s -X POST "$API/api/serviparamo/etl/run/" -H "Content-Type: application/json")
echo "      Respuesta: $RESP"

if ! echo "$RESP" | grep -q '"ok":true'; then
  echo "[ERROR] El ETL no pudo iniciarse. Revisa los logs del backend:"
  echo "        docker logs $CONTENEDOR_BACKEND --tail 30"
  exit 1
fi

# ── 3. Esperar a que el ETL termine ───────────────────────────────────────────
echo "[...] Esperando que el ETL complete (máx ${MAX_ESPERA}s)..."
INICIO=$(date +%s)
while true; do
  SKUS=$(docker exec "$CONTENEDOR_POSTGRES" \
    psql -U serviparamo -d serviparamo -t \
    -c "SELECT COUNT(*) FROM serviparamo_catalogo_skus;" 2>/dev/null | tr -d ' ')

  CORRIENDO=$(curl -s "$API/api/serviparamo/etl/status/" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('corriendo','?'))" 2>/dev/null || echo "?")

  TRANSCURRIDO=$(( $(date +%s) - INICIO ))
  printf "\r    SKUs cargados: %-6s | ETL corriendo: %-5s | %ds transcurridos" \
    "$SKUS" "$CORRIENDO" "$TRANSCURRIDO"

  if [ "$CORRIENDO" = "False" ] && [ "${SKUS:-0}" -gt 0 ] 2>/dev/null; then
    echo ""
    echo "[OK] ETL completado. SKUs en BD: $SKUS"
    break
  fi

  if [ "$TRANSCURRIDO" -ge "$MAX_ESPERA" ]; then
    echo ""
    echo "[ERROR] Timeout esperando el ETL (${MAX_ESPERA}s)."
    echo "        Revisa los logs: docker logs $CONTENEDOR_BACKEND --tail 50"
    exit 1
  fi

  sleep 10
done

# ── 4. Mostrar resumen de lo que se va a dumpear ──────────────────────────────
echo ""
echo "[...] Resumen de tablas a dumpear:"
docker exec "$CONTENEDOR_POSTGRES" psql -U serviparamo -d serviparamo \
  -c "SELECT tablename, (xpath('/row/c/text()',
        query_to_xml('SELECT COUNT(*) AS c FROM ' || quote_ident(tablename), false, true, '')))[1]::text::int AS filas
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'serviparamo_%'
      ORDER BY filas DESC;" 2>/dev/null

# ── 5. Generar el dump ────────────────────────────────────────────────────────
echo ""
echo "[...] Generando dump en el contenedor..."
docker exec "$CONTENEDOR_POSTGRES" pg_dump \
  -U serviparamo \
  -d serviparamo \
  --no-owner \
  --no-acl \
  --data-only \
  -t 'serviparamo_catalogo_skus' \
  -t 'serviparamo_raw_categorias' \
  -t 'serviparamo_raw_familias' \
  -t 'serviparamo_raw_ordenes_encabezado' \
  -t 'serviparamo_raw_ordenes_detalle' \
  -t 'serviparamo_raw_pedidos_encabezado' \
  -t 'serviparamo_raw_pedidos_detalle' \
  -t 'serviparamo_raw_presupuesto_detalle' \
  -t 'serviparamo_raw_presupuesto_resumen' \
  -t 'serviparamo_raw_kardex' \
  -f /tmp/serviparamo_seed.sql

# ── 6. Copiar el dump al repo ─────────────────────────────────────────────────
echo "[...] Copiando dump al repo..."
docker cp "$CONTENEDOR_POSTGRES":/tmp/serviparamo_seed.sql "$SALIDA"

TAMANO=$(du -sh "$SALIDA" | cut -f1)
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Dump generado exitosamente"
echo "  Archivo : $SALIDA"
echo "  Tamaño  : $TAMANO"
echo "══════════════════════════════════════════════════════"
echo ""
echo "Para cargar este seed en otro entorno:"
echo "  bash serviparamo/scripts/cargar_seed.sh"
echo ""
