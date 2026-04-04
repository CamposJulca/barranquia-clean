from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from .models import Transaccion, Alerta, Riesgo


def _ok(data, **kwargs):
    return {'ok': True, 'data': data, **kwargs}


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'ok': False, 'error': msg}, status=code)


@api_view(['GET'])
def stats(request):
    """Resumen general del sistema JOZ."""
    hoy = timezone.now().date()
    hace_30_dias = hoy - timedelta(days=30)
    return Response(_ok({
        'total_transacciones': Transaccion.objects.count(),
        'alertas_abiertas': Alerta.objects.filter(estado='abierta').count(),
        'alertas_criticas': Alerta.objects.filter(severidad='critica', estado='abierta').count(),
        'riesgos_altos': Riesgo.objects.filter(nivel='alto').count(),
        'transacciones_30d': Transaccion.objects.filter(fecha__gte=hace_30_dias).count(),
    }))


@api_view(['GET'])
def anomalias_por_dia(request):
    """Conteo de anomalías agrupadas por día (últimos 30 días)."""
    hace_30_dias = timezone.now().date() - timedelta(days=30)
    qs = (
        Alerta.objects
        .filter(generado_en__date__gte=hace_30_dias)
        .extra(select={'dia': 'DATE(generado_en)'})
        .values('dia')
        .annotate(total=Count('id'))
        .order_by('dia')
    )
    return Response(_ok(list(qs)))


@api_view(['GET', 'PATCH'])
def alertas(request, pk=None):
    """Listado de alertas o actualización de una alerta."""
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

    qs = Alerta.objects.all()
    severidad = request.GET.get('severidad', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    if severidad:
        qs = qs.filter(severidad=severidad)
    if estado_filter:
        qs = qs.filter(estado=estado_filter)

    page = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', 50)), 200)
    total = qs.count()
    offset = (page - 1) * page_size
    items = qs[offset:offset + page_size]

    data = [
        {
            'id': a.id,
            'tipo': a.tipo,
            'descripcion': a.descripcion,
            'severidad': a.severidad,
            'estado': a.estado,
            'score_anomalia': a.score_anomalia,
            'generado_en': a.generado_en,
        }
        for a in items
    ]
    return Response(_ok(data, count=total, page=page, page_size=page_size))


@api_view(['GET'])
def riesgos(request):
    """Listado de riesgos calculados."""
    qs = Riesgo.objects.all().order_by('-calculado_en')
    nivel = request.GET.get('nivel', '').strip()
    if nivel:
        qs = qs.filter(nivel=nivel)
    data = [
        {
            'id': r.id,
            'categoria': r.categoria,
            'descripcion': r.descripcion,
            'nivel': r.nivel,
            'probabilidad': r.probabilidad,
            'impacto_estimado': float(r.impacto_estimado) if r.impacto_estimado else None,
            'calculado_en': r.calculado_en,
        }
        for r in qs
    ]
    return Response(_ok(data, count=len(data)))


@api_view(['GET'])
def historial(request):
    """Historial de transacciones. Filtros: fecha_desde, fecha_hasta, tipo."""
    qs = Transaccion.objects.all()
    desde = request.GET.get('fecha_desde', '').strip()
    hasta = request.GET.get('fecha_hasta', '').strip()
    tipo = request.GET.get('tipo', '').strip()
    if desde:
        qs = qs.filter(fecha__gte=desde)
    if hasta:
        qs = qs.filter(fecha__lte=hasta)
    if tipo:
        qs = qs.filter(tipo__icontains=tipo)

    page = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', 50)), 200)
    total = qs.count()
    offset = (page - 1) * page_size
    items = qs[offset:offset + page_size]

    data = list(items.values('id', 'referencia', 'tipo', 'monto', 'fecha', 'cliente', 'estado'))
    return Response(_ok(data, count=total, page=page, page_size=page_size))
