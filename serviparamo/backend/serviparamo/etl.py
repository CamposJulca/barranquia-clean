"""
ETL ServiPáramo — extrae todas las tablas del ERP (SQL Server) y las carga
en PostgreSQL. Registra cada ejecución en ETLLog.

Tablas cubiertas:
  inv_ina01          → CatalogoSKU
  inv_ina01_categoria → RawCategoria
  inv_ina01_familia   → RawFamilia
  com_orden01         → RawOrdenEncabezado
  com_orden02         → RawOrdenDetalle
  com_peda01          → RawPedidoEncabezado
  com_peda02          → RawPedidoDetalle
  com_peda03          → RawPresupuestoDetalle
  com_peda03_mat      → RawPresupuestoResumen
  inv_ina02           → RawKardex
"""

import os
import sys
import json
import logging
from datetime import datetime, date
from decimal import Decimal

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import pyodbc
from django.utils import timezone
from serviparamo.models import (
    CatalogoSKU,
    RawCategoria, RawFamilia,
    RawOrdenEncabezado, RawOrdenDetalle,
    RawPedidoEncabezado, RawPedidoDetalle,
    RawPresupuestoDetalle, RawPresupuestoResumen,
    RawKardex, ETLLog,
)

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# ── Conexión SQL Server ──────────────────────────────────────────────────────

SQL_SERVER_DSN = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=ts1.serviparamo.com.co,1433;"
    "DATABASE=PRUEBA;"
    "UID=Test20Indicadores26;"
    f"PWD={os.environ.get('SERVIPARAMO_ERP_PASS', 'JspTa2i4axlm60')};"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)

BATCH_SIZE = 2000


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize(value):
    """Convierte tipos no serializables a JSON-safe."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row_to_dict(cursor, row) -> dict:
    cols = [desc[0].lower() for desc in cursor.description]
    return {k: _serialize(v) for k, v in zip(cols, row)}


def _get_field(row: dict, *candidates, default=None):
    """Busca el primer campo que exista en el dict de la fila."""
    for name in candidates:
        if name in row and row[name] not in (None, ''):
            return row[name]
    return default


def _parse_date(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except (ValueError, TypeError):
        return None


def _parse_decimal(value):
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _log_etl(tabla: str, insertadas: int, errores: int,
              inicio: datetime, fin: datetime, mensaje: str = ''):
    try:
        ETLLog.objects.create(
            tabla_destino=tabla,
            filas_insertadas=insertadas,
            filas_error=errores,
            iniciado_en=inicio,
            finalizado_en=fin,
            mensaje=mensaje,
        )
    except Exception as e:
        log.warning(f"No se pudo guardar ETLLog para {tabla}: {e}")


# ── Extracción de SKUs (inv_ina01) ───────────────────────────────────────────

SKU_QUERY = """
SELECT
    LTRIM(RTRIM(ISNULL(codigo,    ''))) AS codigo,
    LTRIM(RTRIM(ISNULL(familia,   ''))) AS familia,
    LTRIM(RTRIM(ISNULL(categoria, ''))) AS categoria,
    LTRIM(RTRIM(ISNULL(nombre,    ''))) AS nombre,
    LTRIM(RTRIM(ISNULL(nombre1,   ''))) AS nombre1,
    LTRIM(RTRIM(ISNULL(unidad,    ''))) AS unidad
FROM inv_ina01
"""


def _normalizar_familia(familia: str) -> str:
    return familia.strip().title() if familia.strip() else 'SIN FAMILIA'


def _detectar_duplicados(skus: list) -> None:
    from collections import Counter
    codigos = [s.codigo for s in skus]
    duplicados = {c for c, n in Counter(codigos).items() if n > 1}
    grupo_map: dict[str, int] = {}
    grupo_actual = 1
    for sku in skus:
        if sku.codigo in duplicados:
            sku.es_duplicado = True
            if sku.codigo not in grupo_map:
                grupo_map[sku.codigo] = grupo_actual
                grupo_actual += 1
            sku.grupo_duplicado = grupo_map[sku.codigo]


def run_skus(cursor) -> tuple[int, int]:
    """Extrae inv_ina01 → CatalogoSKU. Retorna (insertadas, errores)."""
    log.info("Extrayendo inv_ina01 → CatalogoSKU…")
    inicio = timezone.now()

    try:
        cursor.execute("SELECT COUNT(*) FROM inv_ina01")
        total_erp = cursor.fetchone()[0]
        log.info(f"  Total filas ERP: {total_erp:,}")

        cursor.execute(SKU_QUERY)
        columnas = [col[0] for col in cursor.description]

        CatalogoSKU.objects.all().delete()

        batch = []
        procesados = 0

        while True:
            filas = cursor.fetchmany(BATCH_SIZE)
            if not filas:
                break
            for fila in filas:
                row = dict(zip(columnas, fila))
                sku = CatalogoSKU(
                    codigo=row.get('codigo', ''),
                    familia=row.get('familia', ''),
                    familia_normalizada=_normalizar_familia(row.get('familia', '')),
                    categoria=row.get('categoria', ''),
                    nombre=row.get('nombre', ''),
                    nombre1=row.get('nombre1', ''),
                    unidad=row.get('unidad', ''),
                )
                batch.append(sku)

            _detectar_duplicados(batch)
            CatalogoSKU.objects.bulk_create(batch, batch_size=BATCH_SIZE)
            procesados += len(batch)
            batch = []
            log.info(f"  {procesados:,} / {total_erp:,} SKUs cargados…")

        total_final = CatalogoSKU.objects.count()
        dups = CatalogoSKU.objects.filter(es_duplicado=True).count()
        msg = f"OK: {total_final:,} SKUs, {dups:,} duplicados"
        log.info(f"✓ CatalogoSKU: {msg}")
        _log_etl('CatalogoSKU', total_final, 0, inicio, timezone.now(), msg)
        return total_final, 0

    except Exception as e:
        msg = f"ERROR: {e}"
        log.error(f"run_skus: {msg}")
        _log_etl('CatalogoSKU', 0, 1, inicio, timezone.now(), msg)
        return 0, 1


# ── Extracción genérica para tablas de staging ───────────────────────────────

def _extract_and_load(cursor, erp_table: str, Model, field_map: dict,
                      truncate: bool = True) -> tuple[int, int]:
    """
    Extrae todos los registros de `erp_table` del ERP y los guarda en `Model`.

    field_map: {campo_modelo: [candidatos_en_erp]}
    Siempre guarda la fila completa en raw_data.
    """
    log.info(f"Extrayendo {erp_table} → {Model.__name__}…")
    inicio = timezone.now()

    try:
        cursor.execute(f"SELECT * FROM {erp_table}")
        columnas = [desc[0].lower() for desc in cursor.description]

        if truncate:
            Model.objects.all().delete()

        batch = []
        total = 0

        while True:
            filas = cursor.fetchmany(BATCH_SIZE)
            if not filas:
                break

            for fila in filas:
                row = {k: _serialize(v) for k, v in zip(columnas, fila)}
                kwargs = {'raw_data': row}
                for model_field, candidates in field_map.items():
                    val = _get_field(row, *candidates)
                    # Coerce types based on model field class
                    field_obj = Model._meta.get_field(model_field)
                    if 'Date' in type(field_obj).__name__ and val is not None:
                        val = _parse_date(val)
                    elif 'Decimal' in type(field_obj).__name__ and val is not None:
                        val = _parse_decimal(val)
                    kwargs[model_field] = val
                batch.append(Model(**kwargs))

            Model.objects.bulk_create(batch, batch_size=BATCH_SIZE)
            total += len(batch)
            batch = []

        msg = f"OK: {total:,} filas"
        log.info(f"✓ {Model.__name__}: {msg}")
        _log_etl(Model.__name__, total, 0, inicio, timezone.now(), msg)
        return total, 0

    except Exception as e:
        msg = f"ERROR: {e}"
        log.error(f"{Model.__name__}: {msg}")
        _log_etl(Model.__name__, 0, 1, inicio, timezone.now(), msg)
        return 0, 1


# ── Mapas de campos por tabla ─────────────────────────────────────────────────
# Formato: campo_en_modelo → lista de posibles nombres de columna en el ERP
# (el primero que exista y no sea None se usa)

FIELD_MAPS = {
    'RawCategoria': {
        'erp_table': 'inv_ina01_categoria',
        'model': RawCategoria,
        'truncate': True,
        'fields': {
            'categoria_id': ['categoria', 'id_categoria', 'cod_categoria', 'codigo'],
            'nombre': ['nombre', 'descripcion', 'desc_categoria'],
        },
    },
    'RawFamilia': {
        'erp_table': 'inv_ina01_familia',
        'model': RawFamilia,
        'truncate': True,
        'fields': {
            'familia_id': ['familia', 'id_familia', 'cod_familia', 'codigo'],
            'nombre': ['nombre', 'descripcion', 'desc_familia'],
        },
    },
    'RawOrdenEncabezado': {
        'erp_table': 'com_orden01',
        'model': RawOrdenEncabezado,
        'truncate': True,
        'fields': {
            'numfac': ['numfac', 'num_oc', 'numero', 'nro_oc'],
            'proveedor_id': ['proveedor', 'id_proveedor', 'cod_proveedor', 'nit'],
            'fecha_oc': ['fecha', 'fecha_oc', 'fecha_orden'],
            'estado': ['estado', 'estado_oc', 'status'],
        },
    },
    'RawOrdenDetalle': {
        'erp_table': 'com_orden02',
        'model': RawOrdenDetalle,
        'truncate': True,
        'fields': {
            'numfac': ['numfac', 'num_oc', 'numero'],
            'codigo_item': ['codigo', 'cod_item', 'item', 'referencia'],
            'descripcion': ['descripcion', 'nombre', 'descrip', 'desc_item'],
            'cantidad': ['cantidad', 'cant', 'qty'],
            'precio_unitario': ['precio', 'precio_unitario', 'vlr_unitario', 'valor_unitario'],
        },
    },
    'RawPedidoEncabezado': {
        'erp_table': 'com_peda01',
        'model': RawPedidoEncabezado,
        'truncate': True,
        'fields': {
            'pedido': ['pedido', 'num_pedido', 'id_pedido'],
            'solicitante': ['solicitante', 'usuario', 'quien_pide', 'empleado'],
            'fecha_pedido': ['fecha', 'fecha_pedido', 'fecha_solicitud'],
            'estado': ['estado', 'status', 'estado_pedido'],
        },
    },
    'RawPedidoDetalle': {
        'erp_table': 'com_peda02',
        'model': RawPedidoDetalle,
        'truncate': True,
        'fields': {
            'pedido': ['pedido', 'num_pedido'],
            'codigo_item': ['codigo', 'cod_item', 'item'],
            'descripcion': ['descripcion', 'nombre', 'descrip'],
            'cantidad': ['cantidad', 'cant', 'qty'],
        },
    },
    'RawPresupuestoDetalle': {
        'erp_table': 'com_peda03',
        'model': RawPresupuestoDetalle,
        'truncate': True,
        'fields': {
            'pedido': ['pedido', 'num_pedido'],
            'codigo_item': ['codigo', 'cod_item', 'item'],
            'descripcion': ['descripcion', 'nombre', 'descrip'],
            'cantidad': ['cantidad', 'cant'],
            'precio': ['precio', 'valor', 'vlr', 'precio_unitario'],
        },
    },
    'RawPresupuestoResumen': {
        'erp_table': 'com_peda03_mat',
        'model': RawPresupuestoResumen,
        'truncate': True,
        'fields': {
            'pedido': ['pedido', 'num_pedido'],
            'familia': ['familia', 'categoria', 'grupo'],
            'total': ['total', 'valor_total', 'monto', 'vlr_total'],
        },
    },
    'RawKardex': {
        'erp_table': 'inv_ina02',
        'model': RawKardex,
        'truncate': True,
        'fields': {
            'numfac': ['numfac', 'numero', 'num_doc'],
            'nomsis': ['nomsis', 'tipo_mov', 'sistema', 'origen'],
            'codigo_item': ['codigo', 'cod_item', 'item'],
            'cantidad': ['cantidad', 'cant'],
            'fecha_mov': ['fecha', 'fecha_mov', 'fecha_movimiento'],
        },
    },
}


# ── Entry point ───────────────────────────────────────────────────────────────

def run(tablas: list[str] | None = None):
    """
    Ejecuta el ETL completo o solo las tablas especificadas.

    tablas: None = todas, o lista de nombres como ['CatalogoSKU', 'RawCategoria']
    """
    todas = ['CatalogoSKU'] + list(FIELD_MAPS.keys())
    tablas = tablas or todas

    log.info(f"=== ETL ServiPáramo — tablas: {tablas} ===")

    try:
        conn = pyodbc.connect(SQL_SERVER_DSN, timeout=30)
    except Exception as e:
        log.error(f"No se pudo conectar al ERP: {e}")
        sys.exit(1)

    cursor = conn.cursor()
    resultados = {}

    for tabla in tablas:
        if tabla == 'CatalogoSKU':
            insertadas, errores = run_skus(cursor)
        elif tabla in FIELD_MAPS:
            cfg = FIELD_MAPS[tabla]
            insertadas, errores = _extract_and_load(
                cursor,
                erp_table=cfg['erp_table'],
                Model=cfg['model'],
                field_map=cfg['fields'],
                truncate=cfg['truncate'],
            )
        else:
            log.warning(f"Tabla desconocida: {tabla}")
            continue
        resultados[tabla] = {'insertadas': insertadas, 'errores': errores}

    conn.close()

    log.info("=== ETL finalizado ===")
    for tabla, res in resultados.items():
        log.info(f"  {tabla}: {res['insertadas']:,} filas, {res['errores']} errores")

    return resultados


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='ETL ServiPáramo')
    parser.add_argument(
        '--tablas', nargs='*',
        help='Tablas a procesar (default: todas). Ej: CatalogoSKU RawCategoria',
    )
    args = parser.parse_args()
    run(tablas=args.tablas)
