"""
ETL Joz — SuperEfectivo API
============================
Consume la API REST de SuperEfectivo y carga los movimientos en la BD local.

Endpoints consumidos (Módulo de IA):
  POST /api/AportesRetiros/Movimientos/porfecha   → Transaccion

Credenciales (variables de entorno):
  JOZ_API_URL      Base URL de la API (ej: https://superefectivo.com)
  JOZ_API_USUARIO  Usuario asignado en el sistema SuperEfectivo
  JOZ_API_PASSWORD Contraseña del usuario
  JOZ_API_TOKEN    Token de sesión activo

Uso programático:
  from joz.etl import run
  run(fecha_inicio='2026-03-27', fecha_fin='2026-03-27', codalmacen=0)

Uso como script:
  python etl.py --fecha-inicio 2026-03-27 --fecha-fin 2026-03-27 --almacen 0
"""

import os
import logging
import threading
from datetime import date, timedelta, datetime
from decimal import Decimal, InvalidOperation

import django
import requests

logger = logging.getLogger(__name__)

# ── Estado global del ETL (thread-safe simple) ────────────────────────────────
_etl_lock = threading.Lock()
_etl_running = False

# ── Configuración ─────────────────────────────────────────────────────────────
API_BASE_URL = os.environ.get('JOZ_API_URL', '').rstrip('/')
API_USUARIO  = os.environ.get('JOZ_API_USUARIO', '')
API_PASSWORD = os.environ.get('JOZ_API_PASSWORD', '')
API_TOKEN    = os.environ.get('JOZ_API_TOKEN', '')

ENDPOINT_MOVIMIENTOS = '/api/AportesRetiros/Movimientos/porfecha'

BATCH_SIZE   = 500
TIMEOUT_SEG  = 30


# ── Helpers ───────────────────────────────────────────────────────────────────

def _swacceso():
    return {
        'usuario':  API_USUARIO,
        'password': API_PASSWORD,
        'token':    API_TOKEN,
    }


def _decimal(val):
    try:
        return Decimal(str(val))
    except (InvalidOperation, TypeError):
        return Decimal('0')


def _parse_fecha(val):
    """Convierte '2026-03-27T00:00:00' o '2026-03-27' a date."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace('Z', '')).date()
    except (ValueError, AttributeError):
        return None


def _hora_a_minutos(hora_obj):
    """
    Convierte el objeto 'hora' de la API a minutos desde medianoche.
    La API retorna: { "hours": 6, "minutes": 16, "seconds": 29, ... }
    """
    if not isinstance(hora_obj, dict):
        return None
    try:
        return hora_obj.get('hours', 0) * 60 + hora_obj.get('minutes', 0)
    except (TypeError, ValueError):
        return None


# ── Extracción ────────────────────────────────────────────────────────────────

def _fetch_movimientos(fecha_inicio: str, fecha_fin: str, codalmacen: int = 0):
    """
    Llama al endpoint de movimientos y retorna la lista de registros.
    Lanza requests.HTTPError si la respuesta no es 200.
    """
    url = f"{API_BASE_URL}{ENDPOINT_MOVIMIENTOS}"
    params = {
        'Codalmacen':   codalmacen,
        'fechaInicio':  fecha_inicio,
        'fechaFin':     fecha_fin,
    }
    payload = _swacceso()

    logger.info(f"Consultando {url} | almacen={codalmacen} | {fecha_inicio} → {fecha_fin}")

    resp = requests.post(url, params=params, json=payload, timeout=TIMEOUT_SEG,
                         verify=True)
    resp.raise_for_status()

    data = resp.json()
    if data.get('codigo') != 200:
        raise ValueError(f"API retornó código {data.get('codigo')}: {data.get('msj')}")

    registros = data.get('list', [])
    logger.info(f"  → {len(registros)} registros recibidos")
    return registros


# ── Transformación y carga ────────────────────────────────────────────────────

def _cargar_movimientos(registros: list, fecha_consulta, codalmacen: int) -> dict:
    """
    Inserta los movimientos en la BD evitando duplicados por id_externo.
    Retorna contadores: {'recibidas', 'insertadas', 'errores'}
    """
    from .models import Transaccion

    # IDs ya existentes en BD para este día → evitar duplicados
    ids_existentes = set(
        Transaccion.objects
        .filter(fecha=fecha_consulta, id_externo__isnull=False)
        .values_list('id_externo', flat=True)
    )

    nuevas = []
    errores = 0

    for row in registros:
        try:
            id_ext = row.get('id')
            if id_ext and int(id_ext) in ids_existentes:
                continue  # ya cargado

            valor = _decimal(row.get('valor', 0))

            t = Transaccion(
                id_externo           = id_ext,
                referencia           = row.get('nrodocumento', ''),
                almacen              = row.get('almorigen'),
                numero_identificacion= str(row.get('numeroidentificacion', '')),
                cliente              = row.get('nombre', ''),
                tipo                 = row.get('tipo', ''),
                descripcion          = row.get('descripcion', ''),
                monto                = valor,
                entrada              = _decimal(row.get('entrada', 0)),
                salida               = _decimal(row.get('salida', 0)),
                fecha                = _parse_fecha(row.get('fecha')) or fecha_consulta,
                hora_minutos         = _hora_a_minutos(row.get('hora')),
                usuario_cajero       = row.get('usuario', ''),
                estado               = 'cargado',
                raw_data             = row,
            )
            nuevas.append(t)

        except Exception as exc:
            logger.warning(f"  Error procesando fila id={row.get('id')}: {exc}")
            errores += 1

    # Inserción en lotes
    insertadas = 0
    for i in range(0, len(nuevas), BATCH_SIZE):
        lote = nuevas[i:i + BATCH_SIZE]
        Transaccion.objects.bulk_create(lote, ignore_conflicts=True)
        insertadas += len(lote)
        logger.info(f"  Lote {i // BATCH_SIZE + 1}: {len(lote)} insertadas")

    return {
        'recibidas':  len(registros),
        'insertadas': insertadas,
        'errores':    errores,
    }


# ── Orquestador principal ─────────────────────────────────────────────────────

def run(fecha_inicio: str = None, fecha_fin: str = None, codalmacen: int = 0):
    """
    Ejecuta el ETL completo para un rango de fechas.

    Args:
        fecha_inicio: 'YYYY-MM-DD' (default: ayer)
        fecha_fin:    'YYYY-MM-DD' (default: hoy)
        codalmacen:   0 = todos los almacenes
    """
    global _etl_running

    from .models import ETLLog
    from django.utils import timezone

    with _etl_lock:
        if _etl_running:
            logger.warning("ETL ya está corriendo — ignorando nueva solicitud.")
            return
        _etl_running = True

    hoy = date.today()
    if not fecha_inicio:
        fecha_inicio = (hoy - timedelta(days=1)).isoformat()
    if not fecha_fin:
        fecha_fin = hoy.isoformat()

    fecha_obj = _parse_fecha(fecha_inicio) or hoy

    log = ETLLog.objects.create(
        endpoint       = ENDPOINT_MOVIMIENTOS,
        fecha_consulta = fecha_obj,
        almacen        = codalmacen,
    )

    try:
        if not API_BASE_URL or not API_USUARIO:
            raise EnvironmentError(
                "Variables de entorno no configuradas: "
                "JOZ_API_URL, JOZ_API_USUARIO, JOZ_API_PASSWORD, JOZ_API_TOKEN"
            )

        registros = _fetch_movimientos(fecha_inicio, fecha_fin, codalmacen)
        contadores = _cargar_movimientos(registros, fecha_obj, codalmacen)

        log.filas_recibidas  = contadores['recibidas']
        log.filas_insertadas = contadores['insertadas']
        log.filas_error      = contadores['errores']
        log.mensaje          = (
            f"OK — {contadores['insertadas']} nuevas de {contadores['recibidas']} recibidas"
        )
        logger.info(f"ETL completado: {log.mensaje}")

    except Exception as exc:
        log.mensaje     = f"ERROR: {exc}"
        log.filas_error = 1
        logger.error(f"ETL falló: {exc}", exc_info=True)

    finally:
        log.finalizado_en = timezone.now()
        log.save()
        with _etl_lock:
            _etl_running = False


def run_en_background(**kwargs):
    """Dispara run() en un hilo de fondo. Usado desde la API."""
    t = threading.Thread(target=run, kwargs=kwargs, daemon=True)
    t.start()
    return t


def esta_corriendo() -> bool:
    return _etl_running


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import argparse

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    parser = argparse.ArgumentParser(description='ETL Joz — SuperEfectivo')
    parser.add_argument('--fecha-inicio', default=None, help='YYYY-MM-DD')
    parser.add_argument('--fecha-fin',    default=None, help='YYYY-MM-DD')
    parser.add_argument('--almacen',      type=int, default=0,
                        help='Código de almacén (0=todos)')
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s')

    run(fecha_inicio=args.fecha_inicio,
        fecha_fin=args.fecha_fin,
        codalmacen=args.almacen)
