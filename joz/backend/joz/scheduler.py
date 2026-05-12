"""
Scheduler de tareas ETL — JOZ
==============================
Ejecuta el ETL automáticamente 1 vez al día a las 03:00 (America/Bogota).
Usa APScheduler con BackgroundScheduler.

NOTA: El scheduler está DESACTIVADO por defecto.
Para activarlo, establecer ETL_SCHEDULER_ENABLED=true en el entorno.
Esto permite usar la BD estática sin consumir memoria con el ETL.
"""

import logging
import os
import threading

logger = logging.getLogger(__name__)

_scheduler = None
_scheduler_lock = threading.Lock()

# ETL 1 vez al día a las 03:00 AM (hora Colombia)
HORARIOS = [
    {'hour': 3, 'minute': 0},
]

TIMEZONE = 'America/Bogota'


def _ejecutar_etl_programado():
    """Callback del scheduler: ejecuta el ETL y marca origen='programado', luego detecta anomalías."""
    import time
    from joz.etl import run, esta_corriendo
    from joz.models import ETLLog

    MAX_REINTENTOS = 3
    ESPERA_ENTRE_REINTENTOS = 60  # segundos

    if esta_corriendo():
        logger.info("[Scheduler] ETL ya corriendo, se omite ejecución programada.")
        return

    exito = False
    for intento in range(1, MAX_REINTENTOS + 1):
        logger.info(f"[Scheduler] Iniciando ETL programado (intento {intento}/{MAX_REINTENTOS})...")
        try:
            run()
            ultimo = ETLLog.objects.order_by('-iniciado_en').first()
            if ultimo and not ultimo.origen:
                ultimo.origen = 'programado'
                ultimo.save(update_fields=['origen'])

            # Verificar si la ejecución tuvo errores
            if ultimo and ultimo.filas_error and ultimo.filas_error > 0 and ultimo.filas_insertadas == 0:
                logger.warning(f"[Scheduler] ETL completó con errores (intento {intento}): {ultimo.mensaje}")
                if intento < MAX_REINTENTOS:
                    time.sleep(ESPERA_ENTRE_REINTENTOS)
                    continue
            else:
                exito = True
                break
        except Exception as exc:
            logger.error(f"[Scheduler] ETL falló (intento {intento}): {exc}")
            if intento < MAX_REINTENTOS:
                time.sleep(ESPERA_ENTRE_REINTENTOS)

    if exito:
        logger.info("[Scheduler] ETL programado finalizado exitosamente.")
    else:
        logger.error("[Scheduler] ETL programado falló tras todos los reintentos.")

    # Ejecutar detección de anomalías sobre los últimos 2 días
    try:
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('detectar_anomalias', dias=2, stdout=out)
        logger.info(f"[Scheduler] Detección finalizada: {out.getvalue()[-150:]}")
    except Exception as exc:
        logger.error(f"[Scheduler] Detección de anomalías falló: {exc}")


def iniciar_scheduler():
    """Inicia el scheduler en background si no está corriendo."""
    global _scheduler

    # ETL desactivado por defecto. Activar con ETL_SCHEDULER_ENABLED=true
    if os.environ.get('ETL_SCHEDULER_ENABLED', '').lower() not in ('1', 'true'):
        logger.info("[Scheduler] ETL scheduler desactivado. Usar ETL_SCHEDULER_ENABLED=true para activar.")
        return

    with _scheduler_lock:
        if _scheduler is not None:
            return

        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger
        except ImportError:
            logger.warning("[Scheduler] apscheduler no instalado. pip install apscheduler")
            return

        _scheduler = BackgroundScheduler(timezone=TIMEZONE)

        for h in HORARIOS:
            _scheduler.add_job(
                _ejecutar_etl_programado,
                trigger=CronTrigger(
                    hour=h['hour'], minute=h['minute'], timezone=TIMEZONE
                ),
                id=f'etl_joz_{h["hour"]:02d}_{h["minute"]:02d}',
                name=f'ETL JOZ {h["hour"]:02d}:{h["minute"]:02d}',
                replace_existing=True,
                misfire_grace_time=3600,  # 1 hora de tolerancia para misfires
            )

        _scheduler.start()
        horas = ", ".join(f'{h["hour"]:02d}:{h["minute"]:02d}' for h in HORARIOS)
        logger.info(f"[Scheduler] Iniciado — horarios: {horas}")


def obtener_estado():
    """Retorna el estado del scheduler y próximas ejecuciones."""
    from django.utils import timezone as tz

    if _scheduler is None:
        return {
            'activo': False,
            'horarios': [f'{h["hour"]:02d}:{h["minute"]:02d}' for h in HORARIOS],
            'tareas': [],
        }

    tareas = []
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        tareas.append({
            'id': job.id,
            'nombre': job.name,
            'proxima_ejecucion': next_run.isoformat() if next_run else None,
            'proxima_ejecucion_humana': (
                next_run.strftime('%Y-%m-%d %H:%M') if next_run else None
            ),
        })

    return {
        'activo': _scheduler.running if _scheduler else False,
        'horarios': [f'{h["hour"]:02d}:{h["minute"]:02d}' for h in HORARIOS],
        'tareas': tareas,
        'timezone': TIMEZONE,
    }


def detener_scheduler():
    """Detiene el scheduler."""
    global _scheduler
    with _scheduler_lock:
        if _scheduler:
            _scheduler.shutdown(wait=False)
            _scheduler = None
            logger.info("[Scheduler] Detenido.")
