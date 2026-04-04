from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count

from .models import SKU, PronosticoDemanda, SugerenciaReposicion


def _ok(data, **kwargs):
    return {'ok': True, 'data': data, **kwargs}


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'ok': False, 'error': msg}, status=code)


@api_view(['GET'])
def stats(request):
    """Resumen general del inventario."""
    total = SKU.objects.count()
    return Response(_ok({
        'total_skus': total,
        'clasificacion_a': SKU.objects.filter(clasificacion_abc='A').count(),
        'clasificacion_b': SKU.objects.filter(clasificacion_abc='B').count(),
        'clasificacion_c': SKU.objects.filter(clasificacion_abc='C').count(),
        'bajo_punto_reorden': SKU.objects.filter(
            stock_actual__lt=Q(punto_reorden)
        ).count() if total else 0,
        'sugerencias_pendientes': SugerenciaReposicion.objects.filter(atendido=False).count(),
    }))


@api_view(['GET'])
def clasificacion_abc(request):
    """SKUs con clasificación ABC. Filtros: categoria, estado."""
    qs = SKU.objects.all().order_by('clasificacion_abc', 'codigo')
    categoria = request.GET.get('categoria', '').strip()
    estado = request.GET.get('estado', '').strip()
    if categoria:
        qs = qs.filter(categoria__icontains=categoria)
    if estado:
        qs = qs.filter(estado__icontains=estado)

    data = list(qs.values(
        'id', 'codigo', 'descripcion', 'categoria',
        'clasificacion_abc', 'estado', 'stock_actual', 'punto_reorden',
    ))
    return Response(_ok(data, count=len(data)))


@api_view(['POST'])
def predecir_demanda(request):
    """Genera un pronóstico de demanda para un SKU."""
    sku_id = request.data.get('sku_id')
    fecha_inicio = request.data.get('fecha_inicio')
    fecha_fin = request.data.get('fecha_fin')

    if not all([sku_id, fecha_inicio, fecha_fin]):
        return _err('Se requieren sku_id, fecha_inicio y fecha_fin.')

    try:
        sku = SKU.objects.get(id=sku_id)
    except SKU.DoesNotExist:
        return _err('SKU no encontrado.', status.HTTP_404_NOT_FOUND)

    # Devuelve el pronóstico más reciente si existe, o placeholder
    pronostico = (
        PronosticoDemanda.objects
        .filter(sku=sku, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin)
        .order_by('-generado_en')
        .first()
    )
    if pronostico:
        return Response(_ok({
            'sku': sku.codigo,
            'fecha_inicio': pronostico.fecha_inicio,
            'fecha_fin': pronostico.fecha_fin,
            'cantidad_pronosticada': float(pronostico.cantidad_pronosticada),
            'confianza': pronostico.confianza,
            'modelo_version': pronostico.modelo_version,
        }))

    return Response(_ok({
        'sku': sku.codigo,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'cantidad_pronosticada': None,
        'mensaje': 'Sin pronóstico disponible. Ejecute el modelo de demanda.',
    }))


@api_view(['GET'])
def sugerencias_reposicion(request):
    """Sugerencias de reposición pendientes. Filtros: sku_id, categoria."""
    qs = SugerenciaReposicion.objects.filter(atendido=False).select_related('sku')
    sku_id = request.GET.get('sku_id', '').strip()
    categoria = request.GET.get('categoria', '').strip()
    if sku_id:
        qs = qs.filter(sku_id=sku_id)
    if categoria:
        qs = qs.filter(sku__categoria__icontains=categoria)

    data = [
        {
            'id': s.id,
            'sku_id': s.sku_id,
            'sku_codigo': s.sku.codigo,
            'descripcion': s.sku.descripcion,
            'cantidad_sugerida': float(s.cantidad_sugerida),
            'urgencia': s.urgencia,
            'motivo': s.motivo,
            'generado_en': s.generado_en,
        }
        for s in qs
    ]
    return Response(_ok(data, count=len(data)))


@api_view(['POST'])
def set_parametros(request):
    """Actualiza parámetros del modelo (placeholder)."""
    return Response(_ok({'mensaje': 'Parámetros recibidos.', 'params': request.data}))


@api_view(['POST'])
def log_feedback(request):
    """Registra feedback sobre una predicción (placeholder)."""
    return Response(_ok({'mensaje': 'Feedback registrado.'}))
