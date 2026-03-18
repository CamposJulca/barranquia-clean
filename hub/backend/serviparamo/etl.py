"""
ETL ServiPáramo — Fase 1
Extrae inv_ina01 desde SQL Server y carga en PostgreSQL (serviparamo_catalogo_skus).
"""

import os
import sys
import django

# Bootstrap Django fuera del contexto de manage.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barranquia.settings')
django.setup()

import pyodbc
from serviparamo.models import CatalogoSKU

# ── Conexión SQL Server ──────────────────────────────────────────────────────
SQL_SERVER_DSN = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=ts1.serviparamo.com.co,1433;"
    "DATABASE=PRUEBA;"
    "UID=Test20Indicadores26;"
    "PWD=JspTa2i4axlm60;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)

QUERY = """
SELECT
    LTRIM(RTRIM(ISNULL(codigo,    ''))) AS codigo,
    LTRIM(RTRIM(ISNULL(familia,   ''))) AS familia,
    LTRIM(RTRIM(ISNULL(categoria, ''))) AS categoria,
    LTRIM(RTRIM(ISNULL(nombre,    ''))) AS nombre,
    LTRIM(RTRIM(ISNULL(nombre1,   ''))) AS nombre1,
    LTRIM(RTRIM(ISNULL(unidad,    ''))) AS unidad
FROM inv_ina01
"""

BATCH_SIZE = 2000


def _normalizar_familia(familia: str) -> str:
    """Normalización básica: title-case y strip."""
    return familia.strip().title() if familia.strip() else 'SIN FAMILIA'


def _detectar_duplicados(skus: list[CatalogoSKU]) -> None:
    """Marca como duplicado todos los SKUs con código repetido."""
    from collections import Counter
    codigos = [s.codigo for s in skus]
    conteo = Counter(codigos)
    duplicados = {c for c, n in conteo.items() if n > 1}

    grupo_map: dict[str, int] = {}
    grupo_actual = 1
    for sku in skus:
        if sku.codigo in duplicados:
            sku.es_duplicado = True
            if sku.codigo not in grupo_map:
                grupo_map[sku.codigo] = grupo_actual
                grupo_actual += 1
            sku.grupo_duplicado = grupo_map[sku.codigo]


def run():
    print("=== ETL ServiPáramo ===")
    print("Conectando a SQL Server…")

    try:
        conn = pyodbc.connect(SQL_SERVER_DSN, timeout=30)
    except Exception as e:
        print(f"ERROR al conectar: {e}")
        sys.exit(1)

    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM inv_ina01")
    total = cursor.fetchone()[0]
    print(f"Total filas en inv_ina01: {total:,}")

    cursor.execute(QUERY)
    columnas = [col[0] for col in cursor.description]

    print("Vaciando tabla destino…")
    CatalogoSKU.objects.all().delete()

    print("Cargando registros…")
    batch = []
    procesados = 0

    while True:
        filas = cursor.fetchmany(BATCH_SIZE)
        if not filas:
            break

        for fila in filas:
            row = dict(zip(columnas, fila))
            sku = CatalogoSKU(
                codigo=row['codigo'],
                familia=row['familia'],
                familia_normalizada=_normalizar_familia(row['familia']),
                categoria=row['categoria'],
                nombre=row['nombre'],
                nombre1=row['nombre1'],
                unidad=row['unidad'],
            )
            batch.append(sku)

        _detectar_duplicados(batch)
        CatalogoSKU.objects.bulk_create(batch, batch_size=BATCH_SIZE)
        procesados += len(batch)
        batch = []
        print(f"  {procesados:,} / {total:,} registros cargados…", end='\r')

    conn.close()

    total_cargado = CatalogoSKU.objects.count()
    total_dups = CatalogoSKU.objects.filter(es_duplicado=True).count()
    total_sin_familia = CatalogoSKU.objects.filter(familia='').count()

    print(f"\n✓ Carga completa: {total_cargado:,} registros")
    print(f"  Duplicados detectados : {total_dups:,}")
    print(f"  Sin familia           : {total_sin_familia:,}")


if __name__ == '__main__':
    run()
