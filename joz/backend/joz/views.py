from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import timedelta, date

from .models import Transaccion, Alerta, Riesgo, ETLLog


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ok(data, **kwargs):
    return {'ok': True, 'data': data, **kwargs}


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'ok': False, 'error': msg}, status=code)


RIESGO_MAP = {
    'baja':    'low',
    'media':   'medium',
    'alta':    'high',
    'critica': 'high',
}

NIVEL_MAP = {
    'bajo':  'low',
    'medio': 'medium',
    'alto':  'high',
}


def _nombre_almacen(codigo):
    if codigo is None:
        return 'Sin almacén'
    return f'ALMACEN {str(codigo).zfill(2)}'


# ── Vistas ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def stats(request):
    """
    Resumen general del sistema JOZ.
    Formato compatible con Dashboard.tsx del frontend.
    """
    hoy = timezone.now().date()
    hace_30_dias = hoy - timedelta(days=30)

    # Distribución de riesgos (modelo Riesgo)
    dist = {
        'alto':  Riesgo.objects.filter(nivel='alto').count(),
        'medio': Riesgo.objects.filter(nivel='medio').count(),
        'bajo':  Riesgo.objects.filter(nivel='bajo').count(),
    }

    # Tiendas: top 6 almacenes por volumen de transacciones
    tiendas_qs = (
        Transaccion.objects
        .filter(almacen__isnull=False)
        .values('almacen')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )
    max_total = max((t['total'] for t in tiendas_qs), default=1)

    def _nivel(total):
        pct = total / max_total if max_total else 0
        if pct >= 0.7:
            return 'high'
        if pct >= 0.4:
            return 'medium'
        return 'low'

    tiendas = [
        {
            'id':             t['almacen'],
            'nombre':         _nombre_almacen(t['almacen']),
            'codigo':         t['almacen'],
            'nivel_riesgo':   _nivel(t['total']),
            'anomalias_count':t['total'],
            'activa':         True,
        }
        for t in tiendas_qs
    ]

    return Response(_ok({
        # Campos que usa el Dashboard
        'alertas_hoy':            Alerta.objects.filter(generado_en__date=hoy).count(),
        'distribucion_riesgo':    dist,
        'transacciones_analizadas': Transaccion.objects.count(),
        'anomalias_detectadas':   Alerta.objects.count(),
        # Campos adicionales para Risks.tsx
        'tiendas':  tiendas,
        'top5':     tiendas[:5],
        # Compatibilidad con versiones anteriores
        'total_transacciones':  Transaccion.objects.count(),
        'alertas_abiertas':     Alerta.objects.filter(estado='abierta').count(),
        'alertas_criticas':     Alerta.objects.filter(severidad='critica', estado='abierta').count(),
        'riesgos_altos':        dist['alto'],
        'transacciones_30d':    Transaccion.objects.filter(fecha__gte=hace_30_dias).count(),
    }))


@api_view(['GET'])
def anomalias_por_dia(request):
    """
    Anomalías agrupadas por día (últimos 30 días).
    Formato: { anomalias: [{ date, anomalies }] }
    """
    hace_30_dias = timezone.now().date() - timedelta(days=30)
    qs = (
        Alerta.objects
        .filter(generado_en__date__gte=hace_30_dias)
        .extra(select={'dia': "DATE(generado_en)"})
        .values('dia')
        .annotate(total=Count('id'))
        .order_by('dia')
    )
    anomalias = [
        {'date': str(row['dia']), 'anomalies': row['total']}
        for row in qs
    ]
    return Response(_ok({'anomalias': anomalias}))


@api_view(['GET', 'PATCH'])
def alertas(request, pk=None):
    """
    GET  → Listado de alertas paginado.
           Formato: { results: [{ id, date, store, anomalyType, amount, riskLevel, estado }] }
    PATCH → Actualizar estado de una alerta.
    """
    if request.method == 'PATCH':
        if pk is None:
            return _err('Se requiere id de la alerta.')
        try:
            alerta = Alerta.objects.get(pk=pk)
        except Alerta.DoesNotExist:
            return _err('Alerta no encontrada.', status.HTTP_404_NOT_FOUND)
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in dict(Alerta.ESTADO_CHOICES):
            return _err(f'Estado inválido. Opciones: {list(dict(Alerta.ESTADO_CHOICES).keys())}')
        alerta.estado = nuevo_estado
        alerta.save(update_fields=['estado', 'actualizado_en'])
        return Response(_ok({'id': alerta.id, 'estado': alerta.estado}))

    qs = Alerta.objects.select_related('transaccion').all()
    severidad    = request.GET.get('severidad', '').strip()
    estado_filter= request.GET.get('estado', '').strip()
    nivel_riesgo = request.GET.get('nivel_riesgo', '').strip()

    if severidad:
        qs = qs.filter(severidad=severidad)
    if estado_filter:
        qs = qs.filter(estado=estado_filter)
    if nivel_riesgo:
        sev_inverso = {v: k for k, v in RIESGO_MAP.items()}
        sev = sev_inverso.get(nivel_riesgo)
        if sev:
            qs = qs.filter(severidad=sev)

    page      = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', 50)), 200)
    total     = qs.count()
    offset    = (page - 1) * page_size
    items     = qs[offset:offset + page_size]

    results = []
    for a in items:
        tx = a.transaccion
        results.append({
            'id':          a.id,
            'date':        a.generado_en.date().isoformat(),
            'store':       _nombre_almacen(tx.almacen) if tx else '—',
            'anomalyType': a.tipo,
            'amount':      float(tx.monto) if tx else 0,
            'riskLevel':   RIESGO_MAP.get(a.severidad, 'low'),
            'estado':      a.estado,
            'score':       a.score_anomalia,
            'descripcion': a.descripcion,
        })

    return Response(_ok({'results': results}, count=total, page=page, page_size=page_size))


@api_view(['GET'])
def riesgos(request):
    """
    Listado de riesgos + tiendas para Risks.tsx.
    Formato: { tiendas: [...], riesgos: [...] }
    """
    nivel = request.GET.get('nivel', '').strip()

    # Riesgos del modelo
    qs = Riesgo.objects.all().order_by('-calculado_en')
    if nivel:
        qs = qs.filter(nivel=nivel)

    riesgos_data = [
        {
            'id':              r.id,
            'categoria':       r.categoria,
            'descripcion':     r.descripcion,
            'nivel':           r.nivel,
            'nivel_riesgo':    NIVEL_MAP.get(r.nivel, 'low'),
            'probabilidad':    r.probabilidad,
            'impacto_estimado':float(r.impacto_estimado) if r.impacto_estimado else None,
        }
        for r in qs
    ]

    # Tiendas calculadas desde transacciones
    tiendas_qs = (
        Transaccion.objects
        .filter(almacen__isnull=False)
        .values('almacen')
        .annotate(total=Count('id'), monto_total=Sum('monto'))
        .order_by('-total')
    )
    max_total = max((t['total'] for t in tiendas_qs), default=1)

    def _nivel(total):
        pct = total / max_total if max_total else 0
        if pct >= 0.7: return 'high'
        if pct >= 0.4: return 'medium'
        return 'low'

    tiendas = [
        {
            'id':              t['almacen'],
            'nombre':          _nombre_almacen(t['almacen']),
            'codigo':          t['almacen'],
            'nivel_riesgo':    _nivel(t['total']),
            'anomalias_count': t['total'],
            'monto_total':     float(t['monto_total'] or 0),
            'activa':          True,
        }
        for t in tiendas_qs
    ]

    return Response(_ok({
        'tiendas': tiendas,
        'riesgos': riesgos_data,
        'count':   len(riesgos_data),
    }))


@api_view(['GET'])
def historial(request):
    """
    Historial de transacciones de SuperEfectivo.
    Formato compatible con History.tsx.
    """
    qs = Transaccion.objects.all()

    desde   = request.GET.get('fecha_desde', '').strip()
    hasta   = request.GET.get('fecha_hasta', '').strip()
    tipo    = request.GET.get('tipo', '').strip()
    almacen = request.GET.get('almacen', '').strip()
    q       = request.GET.get('q', '').strip()

    if desde:
        qs = qs.filter(fecha__gte=desde)
    if hasta:
        qs = qs.filter(fecha__lte=hasta)
    if tipo:
        qs = qs.filter(tipo__icontains=tipo)
    if almacen:
        qs = qs.filter(almacen=almacen)
    if q:
        qs = qs.filter(
            Q(cliente__icontains=q) |
            Q(referencia__icontains=q) |
            Q(numero_identificacion__icontains=q) |
            Q(descripcion__icontains=q)
        )

    page      = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', 50)), 200)
    total     = qs.count()
    offset    = (page - 1) * page_size
    items     = qs[offset:offset + page_size]

    results = [
        {
            'id':          t.id,
            'date':        t.fecha.isoformat(),
            'store':       _nombre_almacen(t.almacen),
            'anomalyType': t.tipo or 'Sin tipo',
            'amount':      float(t.monto),
            'entrada':     float(t.entrada) if t.entrada is not None else None,
            'salida':      float(t.salida)  if t.salida  is not None else None,
            'resultado':   'investigating',
            'estado':      t.estado,
            'analista':    t.usuario_cajero or '—',
            # Campos extendidos de SuperEfectivo
            'referencia':            t.referencia,
            'cliente':               t.cliente,
            'numero_identificacion': t.numero_identificacion,
            'descripcion':           t.descripcion,
            'hora_minutos':          t.hora_minutos,
        }
        for t in items
    ]

    return Response(_ok({'results': results}, count=total, page=page, page_size=page_size))


@api_view(['POST'])
def etl_run(request):
    """Dispara el ETL contra la API de SuperEfectivo en segundo plano."""
    from . import etl as etl_module

    if etl_module.esta_corriendo():
        return Response(_ok({'corriendo': True, 'mensaje': 'ETL ya está en ejecución.'}))

    fecha_inicio = request.data.get('fecha_inicio') or None
    fecha_fin    = request.data.get('fecha_fin')    or None
    codalmacen   = int(request.data.get('almacen', 0))

    etl_module.run_en_background(
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        codalmacen=codalmacen,
    )
    return Response(_ok({
        'corriendo':     True,
        'mensaje':       'ETL iniciado en segundo plano.',
        'almacen':       codalmacen,
        'fecha_inicio':  fecha_inicio,
        'fecha_fin':     fecha_fin,
    }))


@api_view(['GET'])
def etl_status(request):
    """Estado del ETL y últimas ejecuciones."""
    from . import etl as etl_module

    ultimos = ETLLog.objects.all()[:10]
    data = [
        {
            'id':               e.id,
            'fecha_consulta':   e.fecha_consulta,
            'almacen':          e.almacen,
            'filas_recibidas':  e.filas_recibidas,
            'filas_insertadas': e.filas_insertadas,
            'filas_error':      e.filas_error,
            'iniciado_en':      e.iniciado_en,
            'finalizado_en':    e.finalizado_en,
            'mensaje':          e.mensaje,
        }
        for e in ultimos
    ]
    return Response(_ok(data, corriendo=etl_module.esta_corriendo()))
