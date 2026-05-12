"""
Cálculo unificado del Riesgo por tienda.

Fuente única de verdad para la fórmula y los umbrales que se usan tanto en
el motor de detección (`detectar_anomalias`) como en el recálculo manual
(`calcular_riesgos`) y para exponer los umbrales al frontend vía
`/api/joz/riesgos/config/`.
"""
from django.db.models import Avg, Count, Sum

from joz.models import Alerta, Riesgo, Transaccion


# ── Pesos del score compuesto (suman 1.0) ──────────────────────────────────
PESO_TASA = 0.40       # tasa de anomalía (alertas / txns)
PESO_AVG_SCORE = 0.30  # score promedio de las alertas
PESO_TASA_CRIT = 0.30  # tasa de alertas altas/críticas

# ── Saturación de cada componente antes de pesar ──────────────────────────
# Sin saturar, almacenes pequeños con pocas alertas dominarían el score.
SAT_TASA = 10           # tasa*SAT_TASA topea en 1.0
SAT_TASA_CRIT = 20      # tasa_crit*SAT_TASA_CRIT topea en 1.0

# ── Umbrales de nivel ──────────────────────────────────────────────────────
UMBRAL_ALTO_SCORE = 0.55
UMBRAL_ALTO_TASA_CRIT = 0.03
UMBRAL_MEDIO_SCORE = 0.30
UMBRAL_MEDIO_TASA_CRIT = 0.01


def calcular_score(tasa: float, avg_score: float, tasa_crit: float) -> float:
    """
    Score compuesto de riesgo. Recibe métricas crudas y devuelve [0, 1].

    - tasa: alertas / txns del almacén.
    - avg_score: promedio de score_anomalia de las alertas del almacén
      (escala 0-100, viene del motor de detección).
    - tasa_crit: alertas altas/críticas / txns del almacén.
    """
    return (
        min(tasa * SAT_TASA, 1.0) * PESO_TASA
        + (avg_score / 100) * PESO_AVG_SCORE
        + min(tasa_crit * SAT_TASA_CRIT, 1.0) * PESO_TASA_CRIT
    )


def clasificar_nivel(score: float, tasa_crit: float) -> str:
    """Mapea score y tasa_crit a {'alto','medio','bajo'}."""
    if score >= UMBRAL_ALTO_SCORE or tasa_crit >= UMBRAL_ALTO_TASA_CRIT:
        return 'alto'
    if score >= UMBRAL_MEDIO_SCORE or tasa_crit >= UMBRAL_MEDIO_TASA_CRIT:
        return 'medio'
    return 'bajo'


def get_config() -> dict:
    """Configuración serializable que consume el frontend."""
    return {
        'pesos': {
            'tasa_anomalia': PESO_TASA,
            'avg_score': PESO_AVG_SCORE,
            'tasa_critica': PESO_TASA_CRIT,
        },
        'saturacion': {
            'tasa_anomalia': SAT_TASA,
            'tasa_critica': SAT_TASA_CRIT,
        },
        'umbrales': {
            'alto': {
                'score': UMBRAL_ALTO_SCORE,
                'tasa_critica': UMBRAL_ALTO_TASA_CRIT,
            },
            'medio': {
                'score': UMBRAL_MEDIO_SCORE,
                'tasa_critica': UMBRAL_MEDIO_TASA_CRIT,
            },
        },
        'formula': (
            'score = min(tasa·10, 1)·0.4 + (avg_score/100)·0.3 '
            '+ min(tasa_crit·20, 1)·0.3'
        ),
    }


def actualizar_riesgo_tiendas(stdout=None, style=None) -> int:
    """
    Recalcula `Riesgo` para cada almacén con transacciones.

    Cuenta todas las alertas asociadas (sin filtrar por estado) — mismo
    comportamiento que el motor de detección original. Devuelve la
    cantidad de almacenes procesados.

    `stdout` y `style` son opcionales (compatibles con
    `BaseCommand.stdout` / `BaseCommand.style`). Si no se pasan, el
    comando corre en silencio.
    """
    tiendas = list(
        Transaccion.objects
        .filter(almacen__isnull=False)
        .values('almacen')
        .annotate(total_txns=Count('id'), monto_total=Sum('monto'))
    )

    for t in tiendas:
        alm = t['almacen']
        alertas = Alerta.objects.filter(transaccion__almacen=alm)
        n_alertas = alertas.count()
        n_criticas = alertas.filter(severidad__in=['alta', 'critica']).count()
        avg_score = alertas.aggregate(avg=Avg('score_anomalia'))['avg'] or 0

        tasa = n_alertas / t['total_txns'] if t['total_txns'] > 0 else 0
        tasa_crit = n_criticas / t['total_txns'] if t['total_txns'] > 0 else 0
        score = calcular_score(tasa, float(avg_score), tasa_crit)
        nivel = clasificar_nivel(score, tasa_crit)

        nombre = f'ALMACEN {str(alm).zfill(2)}'
        Riesgo.objects.update_or_create(
            categoria=nombre,
            defaults={
                'descripcion': (
                    f'{t["total_txns"]} txns, {n_alertas} alertas '
                    f'({n_criticas} altas/críticas). '
                    f'Score: {score:.2f}. Tasa anomalía: {tasa:.1%}.'
                ),
                'nivel': nivel,
                'probabilidad': round(score, 4),
                'impacto_estimado': t['monto_total'] or 0,
            },
        )

    if stdout is not None:
        msg = f'    → {len(tiendas)} almacenes actualizados'
        stdout.write(style.SUCCESS(msg) if style else msg)

    return len(tiendas)
