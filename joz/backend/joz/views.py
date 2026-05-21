import os
import logging

from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Sum, Min, Max
from django.utils import timezone
from datetime import timedelta, date, datetime
from decimal import Decimal, InvalidOperation

import requests as http_requests

from .models import Transaccion, Alerta, Riesgo, ETLLog, ConfigDeteccion, ReglaDeteccion

logger = logging.getLogger(__name__)


# ── Auth ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {'error': 'Credenciales invalidas'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username})


@api_view(['POST'])
def change_password(request):
    """Cambiar contraseña del usuario autenticado."""
    user = request.user
    current = request.data.get('current_password', '')
    new_pw = request.data.get('new_password', '')

    if not user.check_password(current):
        return Response(
            {'error': 'La contraseña actual es incorrecta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(new_pw) < 6:
        return Response(
            {'error': 'La nueva contraseña debe tener al menos 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_pw)
    user.save()

    # Regenerar token
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    return Response({
        'ok': True,
        'message': 'Contraseña actualizada.',
        'token': token.key,
    })


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


# ── Operaciones internas (NO son flujo financiero del cliente) ───────────────
# Se excluyen de los KPIs de entradas/salidas porque distorsionan los promedios:
#   1. Aperturas y cierres de caja: el cajero saca/mete plata para iniciar o
#      cerrar el turno. Es contabilidad interna, no movimiento de cliente.
#   2. Traslados entre puntos: dinero que se mueve de un almacén a otro
#      (típicamente montos altos que inflan los promedios por transacción).
APERTURA_CIERRE_FILTER = (
    Q(descripcion__istartswith='apertura')
    | Q(descripcion__istartswith='cierre')
)
TRASLADO_FILTER = (
    Q(descripcion__icontains='traslado')
    | Q(descripcion__icontains='transferencia entre')
    | Q(descripcion__icontains='movimiento entre almac')
)
OPERACIONES_INTERNAS_FILTER = APERTURA_CIERRE_FILTER | TRASLADO_FILTER

# Alias retrocompatible — usar OPERACIONES_INTERNAS_FILTER en código nuevo.
ADMIN_OPS_FILTER = OPERACIONES_INTERNAS_FILTER


def _es_operacion_interna(descripcion: str) -> bool:
    """Versión en memoria de OPERACIONES_INTERNAS_FILTER (para datos del proxy ERP)."""
    desc = (descripcion or '').lower()
    if desc.startswith('apertura') or desc.startswith('cierre'):
        return True
    if 'traslado' in desc:
        return True
    if 'transferencia entre' in desc:
        return True
    if 'movimiento entre almac' in desc:
        return True
    return False


def _serializar_config_deteccion(config):
    return {
        'id': config.id,
        # 1. Monto inusual
        'enabled_desviacion_monto': config.enabled_desviacion_monto,
        'zscore_media': config.zscore_media,
        'zscore_alta': config.zscore_alta,
        'zscore_critica': config.zscore_critica,
        # 2. Fraccionamiento
        'enabled_fraccionamiento': config.enabled_fraccionamiento,
        'fraccionamiento_min_txns': config.fraccionamiento_min_txns,
        'fraccionamiento_min_txns_alta': config.fraccionamiento_min_txns_alta,
        'fraccionamiento_min_txns_critica': config.fraccionamiento_min_txns_critica,
        # 3. Concentración cajero
        'enabled_concentracion_cajero': config.enabled_concentracion_cajero,
        'cajero_ratio': config.cajero_ratio,
        'cajero_ratio_alta': config.cajero_ratio_alta,
        # Meta
        'updated_at': config.updated_at.isoformat() if config.updated_at else None,
    }


def _coerce_bool(value, field_name):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ('true', '1', 'si', 'sí', 'yes'):
            return True
        if normalized in ('false', '0', 'no'):
            return False
    raise ValueError(f'`{field_name}` debe ser booleano.')


def _coerce_int(value, field_name, min_value, max_value):
    if isinstance(value, bool):
        raise ValueError(f'`{field_name}` debe ser un entero.')
    try:
        parsed = int(str(value).strip())
    except (ValueError, TypeError):
        raise ValueError(f'`{field_name}` debe ser un entero válido.')
    if parsed < min_value or parsed > max_value:
        raise ValueError(f'`{field_name}` debe estar entre {min_value} y {max_value}.')
    return parsed


def _coerce_decimal(value, field_name, min_value, max_value):
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, AttributeError, TypeError):
        raise ValueError(f'`{field_name}` debe ser numérico.')
    if parsed < min_value or parsed > max_value:
        raise ValueError(f'`{field_name}` debe estar entre {min_value} y {max_value}.')
    return parsed


# ── Vistas ────────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
def config_deteccion(request):
    """
    Configuración de reglas de detección (singleton pk=1).
    GET   -> estado actual
    PATCH -> actualización parcial
    """
    config, _ = ConfigDeteccion.objects.get_or_create(pk=1)

    if request.method == 'GET':
        return Response(_ok(_serializar_config_deteccion(config)))

    if not isinstance(request.data, dict):
        return _err('Payload inválido. Se esperaba un objeto JSON.')

    payload = request.data
    updates = {}
    field_errors = {}

    # ── Campos booleanos (toggles de reglas) ─────────────────────────
    bool_fields = [
        'enabled_desviacion_monto',
        'enabled_fraccionamiento',
        'enabled_concentracion_cajero',
    ]
    for field in bool_fields:
        if field in payload:
            try:
                updates[field] = _coerce_bool(payload.get(field), field)
            except ValueError as exc:
                field_errors[field] = str(exc)

    # ── Campos float (umbrales) ──────────────────────────────────────
    float_fields = {
        'zscore_media': (0.5, 10.0),
        'zscore_alta': (1.0, 15.0),
        'zscore_critica': (1.5, 20.0),
        'cajero_ratio': (1.0, 50.0),
        'cajero_ratio_alta': (1.0, 50.0),
    }
    for field, (mn, mx) in float_fields.items():
        if field in payload:
            try:
                val = float(str(payload.get(field)).strip())
                if val < mn or val > mx:
                    raise ValueError(f'`{field}` debe estar entre {mn} y {mx}.')
                updates[field] = val
            except (ValueError, TypeError) as exc:
                field_errors[field] = str(exc)

    # ── Campos enteros ───────────────────────────────────────────────
    int_fields = {
        'fraccionamiento_min_txns': (2, 50),
        'fraccionamiento_min_txns_alta': (3, 100),
        'fraccionamiento_min_txns_critica': (5, 200),
    }
    for field, (mn, mx) in int_fields.items():
        if field in payload:
            try:
                updates[field] = _coerce_int(payload.get(field), field, mn, mx)
            except ValueError as exc:
                field_errors[field] = str(exc)

    if field_errors:
        return Response(
            {
                'ok': False,
                'error': 'Errores de validación en la configuración.',
                'fields': field_errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not updates:
        return Response(_ok(_serializar_config_deteccion(config)))

    for field_name, value in updates.items():
        setattr(config, field_name, value)
    config.save(update_fields=[*updates.keys(), 'updated_at'])

    return Response(_ok(_serializar_config_deteccion(config)))


@api_view(['GET'])
def stats(request):
    """
    Resumen general del sistema JOZ.
    Acepta filtros opcionales: fecha_desde, fecha_hasta (YYYY-MM-DD).
    """
    hoy = timezone.now().date()
    hace_30_dias = hoy - timedelta(days=30)

    # Filtros de fecha opcionales
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()

    txn_qs = Transaccion.objects.all()
    alerta_qs = Alerta.objects.all()
    if fecha_desde:
        txn_qs = txn_qs.filter(fecha__gte=fecha_desde)
        alerta_qs = alerta_qs.filter(transaccion__fecha__gte=fecha_desde)
    if fecha_hasta:
        txn_qs = txn_qs.filter(fecha__lte=fecha_hasta)
        alerta_qs = alerta_qs.filter(transaccion__fecha__lte=fecha_hasta)

    # Distribución de riesgos (modelo Riesgo)
    dist = {
        'alto':  Riesgo.objects.filter(nivel='alto').count(),
        'medio': Riesgo.objects.filter(nivel='medio').count(),
        'bajo':  Riesgo.objects.filter(nivel='bajo').count(),
    }

    # Tiendas: top 10 almacenes con alertas reales y nivel del modelo Riesgo
    tiendas_qs = (
        txn_qs
        .filter(almacen__isnull=False)
        .values('almacen')
        .annotate(total_txns=Count('id'))
        .order_by('-total_txns')[:10]
    )

    alertas_por_almacen = dict(
        alerta_qs
        .filter(transaccion__almacen__isnull=False)
        .values('transaccion__almacen')
        .annotate(c=Count('id'))
        .values_list('transaccion__almacen', 'c')
    )

    riesgo_por_almacen = {}
    for r in Riesgo.objects.all():
        parts = r.categoria.split()
        if len(parts) == 2 and parts[1].isdigit():
            riesgo_por_almacen[int(parts[1])] = NIVEL_MAP.get(r.nivel, 'low')

    tiendas = [
        {
            'id':             t['almacen'],
            'nombre':         _nombre_almacen(t['almacen']),
            'codigo':         t['almacen'],
            'nivel_riesgo':   riesgo_por_almacen.get(t['almacen'], 'low'),
            'anomalias_count':alertas_por_almacen.get(t['almacen'], 0),
            'activa':         True,
        }
        for t in tiendas_qs
    ]

    # Agregados reales de transacciones (filtrados por rango).
    # entrada/salida excluyen aperturas y cierres de caja — solo flujo financiero real.
    agg_total = txn_qs.aggregate(
        total_entrada=Sum('entrada', filter=~ADMIN_OPS_FILTER),
        total_salida=Sum('salida', filter=~ADMIN_OPS_FILTER),
        total_monto=Sum('monto'),
    )
    agg_hoy = txn_qs.filter(fecha=hoy).aggregate(
        txns_hoy=Count('id'),
        monto_hoy=Sum('monto'),
    )
    ayer = hoy - timedelta(days=1)
    agg_ayer = txn_qs.filter(fecha=ayer).aggregate(
        txns_ayer=Count('id'),
        monto_ayer=Sum('monto'),
    )

    # Aportes/Retiros excluyen operaciones internas (aperturas/cierres de caja
    # y traslados entre puntos) — solo flujo financiero del cliente.
    aportes_qs     = txn_qs.filter(tipo='Aporte').exclude(OPERACIONES_INTERNAS_FILTER)
    retiros_qs     = txn_qs.filter(tipo='Retiro').exclude(OPERACIONES_INTERNAS_FILTER)
    aportes_count  = aportes_qs.count()
    retiros_count  = retiros_qs.count()
    aportes_monto  = aportes_qs.aggregate(v=Sum('entrada'))['v'] or 0
    retiros_monto  = retiros_qs.aggregate(v=Sum('salida'))['v'] or 0

    # Conteo de operaciones internas excluidas (transparencia para el cliente).
    aperturas_cierres_count = txn_qs.filter(APERTURA_CIERRE_FILTER).count()
    traslados_count         = txn_qs.filter(TRASLADO_FILTER).count()

    # Desglose por almacén — agregamos sobre todos los asientos.
    # El ERP origen descompone cada operación en múltiples filas contables
    # (ej. RETIRA $385 = $35 + $350); sumarlas reconstruye el monto real.
    # Para `cantidad` (operaciones distintas) contamos referencias únicas
    # más las filas sin referencia, así no inflamos por número de asientos.
    # Excluimos operaciones internas (aperturas/cierres/traslados) de total y
    # cantidad para que la suma de los almacenes cuadre con Aportes+Retiros.
    txn_neto_qs = txn_qs.exclude(OPERACIONES_INTERNAS_FILTER)
    por_almacen_con_ref = (
        txn_neto_qs.filter(referencia__gt='', almacen__isnull=False)
        .values('almacen')
        .annotate(cantidad=Count('referencia', distinct=True))
    )
    por_almacen_sin_ref = (
        txn_neto_qs.filter(Q(referencia='') | Q(referencia__isnull=True),
                           almacen__isnull=False)
        .values('almacen')
        .annotate(cantidad=Count('id'))
    )
    cantidad_por_almacen = {}
    for row in por_almacen_con_ref:
        cantidad_por_almacen[row['almacen']] = cantidad_por_almacen.get(row['almacen'], 0) + row['cantidad']
    for row in por_almacen_sin_ref:
        cantidad_por_almacen[row['almacen']] = cantidad_por_almacen.get(row['almacen'], 0) + row['cantidad']

    por_almacen_qs = (
        txn_qs.filter(almacen__isnull=False)
        .values('almacen')
        .annotate(
            total_monto=Sum('monto', filter=~OPERACIONES_INTERNAS_FILTER),
            total_entrada=Sum('entrada', filter=~ADMIN_OPS_FILTER),
            total_salida=Sum('salida', filter=~ADMIN_OPS_FILTER),
        )
        .order_by('-total_monto')
    )
    por_almacen = [
        {
            'nombre': _nombre_almacen(a['almacen']),
            'codigo': a['almacen'],
            'cantidad': cantidad_por_almacen.get(a['almacen'], 0),
            'total': float(a['total_monto'] or 0),
            'entrada': float(a['total_entrada'] or 0),
            'salida': float(a['total_salida'] or 0),
        }
        for a in por_almacen_qs
    ]

    # Desglose por tipo de operación (calculado en backend)
    tipos_map = {}
    for t in txn_qs.values('descripcion').annotate(
        count=Count('id'),
        monto=Sum('monto'),
        count_entrada=Count('id', filter=Q(entrada__gt=0)),
        count_salida=Count('id', filter=Q(salida__gt=0)),
        monto_entrada=Sum('entrada'),
        monto_salida=Sum('salida'),
    ).order_by('-count'):
        desc = (t['descripcion'] or '').lower()
        total_count = t['count']
        total_monto = float(t['monto'] or 0)

        if desc.startswith('empeño'):
            buckets = [('Empeño', total_count, total_monto)]
        elif desc.startswith('retira'):
            buckets = [('Retiro de empeño', total_count, total_monto)]
        elif desc.startswith('abona') or desc.startswith('paga'):
            buckets = [('Abono / Interés', total_count, total_monto)]
        elif desc.startswith('apertura'):
            buckets = [('Apertura de caja', total_count, total_monto)]
        elif desc.startswith('cierre'):
            buckets = [('Cierre de caja', total_count, total_monto)]
        elif desc.startswith('venta'):
            buckets = [('Venta', total_count, total_monto)]
        elif 'western' in desc:
            buckets = []
            if t['count_entrada']:
                buckets.append(('Western entrada', t['count_entrada'], float(t['monto_entrada'] or 0)))
            if t['count_salida']:
                buckets.append(('Western salida', t['count_salida'], float(t['monto_salida'] or 0)))
        elif (
            'traslado' in desc
            or 'transferencia entre' in desc
            or 'movimiento entre almac' in desc
        ):
            buckets = []
            if t['count_entrada']:
                buckets.append(('Traslado entrada', t['count_entrada'], float(t['monto_entrada'] or 0)))
            if t['count_salida']:
                buckets.append(('Traslado salida', t['count_salida'], float(t['monto_salida'] or 0)))
        else:
            buckets = [('Otro', total_count, total_monto)]

        for key, count, monto in buckets:
            if key not in tipos_map:
                tipos_map[key] = {'count': 0, 'monto': 0}
            tipos_map[key]['count'] += count
            tipos_map[key]['monto'] += monto

    # Rango temporal de los datos (filtrados)
    fechas_extremas = txn_qs.aggregate(
        fecha_min=Min('fecha'), fecha_max=Max('fecha'),
    )
    # Rango GLOBAL (sin filtro) — el frontend lo usa para acotar el date picker
    # y mostrar al usuario qué ventana de datos hay realmente cargada.
    fechas_globales = Transaccion.objects.aggregate(
        fecha_min=Min('fecha'), fecha_max=Max('fecha'),
    )

    return Response(_ok({
        # KPIs principales (datos reales)
        'total_transacciones':      txn_qs.count(),
        'transacciones_analizadas': txn_qs.count(),
        'transacciones_hoy':        agg_hoy['txns_hoy'] or 0,
        'monto_hoy':                float(agg_hoy['monto_hoy'] or 0),
        'transacciones_ayer':       agg_ayer['txns_ayer'] or 0,
        'monto_ayer':               float(agg_ayer['monto_ayer'] or 0),
        'total_entrada':            float(agg_total['total_entrada'] or 0),
        'total_salida':             float(agg_total['total_salida'] or 0),
        'total_monto':              float(agg_total['total_monto'] or 0),
        'aportes_count':            aportes_count,
        'retiros_count':            retiros_count,
        'aportes_monto':            float(aportes_monto),
        'retiros_monto':            float(retiros_monto),
        # Operaciones internas excluidas de aportes/retiros (transparencia).
        'operaciones_internas': {
            'total':              aperturas_cierres_count + traslados_count,
            'aperturas_cierres':  aperturas_cierres_count,
            'traslados':          traslados_count,
        },
        # Rango temporal
        'fecha_desde':              fechas_extremas['fecha_min'].isoformat() if fechas_extremas['fecha_min'] else None,
        'fecha_hasta':              fechas_extremas['fecha_max'].isoformat() if fechas_extremas['fecha_max'] else None,
        'data_range': {
            'min': fechas_globales['fecha_min'].isoformat() if fechas_globales['fecha_min'] else None,
            'max': fechas_globales['fecha_max'].isoformat() if fechas_globales['fecha_max'] else None,
        },
        # Alertas / anomalías
        'alertas_hoy':              alerta_qs.filter(generado_en__date=hoy).count(),
        'alertas_abiertas':         alerta_qs.filter(estado='abierta').count(),
        'alertas_criticas':         alerta_qs.filter(severidad='critica', estado='abierta').count(),
        'anomalias_detectadas':     alerta_qs.count(),
        'distribucion_riesgo':      dist,
        'riesgos_altos':            dist['alto'],
        # Tiendas
        'tiendas':  tiendas,
        'top5':     tiendas[:5],
        'transacciones_30d': txn_qs.filter(fecha__gte=hace_30_dias).count(),
        # Desgloses calculados en backend (sin límite de paginación)
        'por_almacen': por_almacen,
        'por_tipo': tipos_map,
    }))


@api_view(['GET'])
def anomalias_por_dia(request):
    """
    Volumen de transacciones + alertas agrupado por día.
    Acepta filtros: fecha_desde, fecha_hasta (YYYY-MM-DD) o dias (int).
    """
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()

    if fecha_desde:
        desde = fecha_desde
    else:
        dias = min(int(request.GET.get('dias', 30)), 60)
        desde = timezone.now().date() - timedelta(days=dias - 1)

    # Transacciones por día — excluyen aperturas/cierres de caja (no son flujo financiero real).
    txn_filter = Transaccion.objects.filter(fecha__gte=desde).exclude(ADMIN_OPS_FILTER)
    if fecha_hasta:
        txn_filter = txn_filter.filter(fecha__lte=fecha_hasta)
    qs = (
        txn_filter
        .values('fecha', 'tipo')
        .annotate(total=Count('id'), monto=Sum('monto'))
        .order_by('fecha')
    )

    por_fecha: dict = {}
    for row in qs:
        d = str(row['fecha'])
        if d not in por_fecha:
            por_fecha[d] = {
                'date': d, 'transacciones': 0, 'aportes': 0, 'retiros': 0,
                'monto': 0, 'alertas': 0, 'criticas': 0, 'altas': 0,
            }
        por_fecha[d]['transacciones'] += row['total']
        por_fecha[d]['monto'] += float(row['monto'] or 0)
        if row['tipo'] == 'Aporte':
            por_fecha[d]['aportes'] = row['total']
        elif row['tipo'] == 'Retiro':
            por_fecha[d]['retiros'] = row['total']

    # Alertas por día (fecha de la transacción asociada)
    alerta_filter = Alerta.objects.filter(transaccion__fecha__gte=desde)
    if fecha_hasta:
        alerta_filter = alerta_filter.filter(transaccion__fecha__lte=fecha_hasta)
    alertas_qs = (
        alerta_filter
        .values('transaccion__fecha', 'severidad')
        .annotate(n=Count('id'))
    )
    for row in alertas_qs:
        d = str(row['transaccion__fecha'])
        if d not in por_fecha:
            por_fecha[d] = {
                'date': d, 'transacciones': 0, 'aportes': 0, 'retiros': 0,
                'monto': 0, 'alertas': 0, 'criticas': 0, 'altas': 0,
            }
        por_fecha[d]['alertas'] += row['n']
        if row['severidad'] == 'critica':
            por_fecha[d]['criticas'] += row['n']
        elif row['severidad'] == 'alta':
            por_fecha[d]['altas'] += row['n']

    anomalias = sorted(por_fecha.values(), key=lambda x: x['date'])
    return Response(_ok({'anomalias': anomalias}))


@api_view(['GET', 'PATCH', 'DELETE'])
def alertas(request, pk=None):
    """
    GET     → Listado de alertas paginado.
              Formato: { results: [{ id, date, store, anomalyType, amount, riskLevel, estado }] }
    PATCH   → Actualizar una alerta (con pk) o varias (sin pk + body {ids, estado}).
    DELETE  → Eliminar una alerta (con pk) o varias (sin pk + body {ids} o {todos:true}).
    """
    if request.method == 'PATCH':
        # Bulk: PATCH /alertas/ con body {ids:[...], estado:'...'}
        if pk is None:
            ids = request.data.get('ids') or []
            nuevo_estado = request.data.get('estado')
            if not isinstance(ids, list) or not ids:
                return _err('Se requiere lista de ids.')
            if nuevo_estado not in dict(Alerta.ESTADO_CHOICES):
                return _err(f'Estado inválido. Opciones: {list(dict(Alerta.ESTADO_CHOICES).keys())}')
            actualizadas = Alerta.objects.filter(pk__in=ids).update(
                estado=nuevo_estado,
                actualizado_en=timezone.now(),
            )
            return Response(_ok({'actualizadas': actualizadas, 'estado': nuevo_estado}))

        # Singular
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

    if request.method == 'DELETE':
        # Bulk: DELETE /alertas/ con body {ids:[...]} o {todos:true}
        if pk is None:
            todos = bool(request.data.get('todos'))
            ids = request.data.get('ids') or []
            if todos:
                eliminadas, _ = Alerta.objects.all().delete()
                return Response(_ok({'eliminadas': eliminadas, 'todos': True}))
            if not isinstance(ids, list) or not ids:
                return _err('Se requiere lista de ids o todos=true.')
            eliminadas, _ = Alerta.objects.filter(pk__in=ids).delete()
            return Response(_ok({'eliminadas': eliminadas}))

        # Singular
        try:
            alerta = Alerta.objects.get(pk=pk)
        except Alerta.DoesNotExist:
            return _err('Alerta no encontrada.', status.HTTP_404_NOT_FOUND)
        alerta.delete()
        return Response(_ok({'id': pk, 'eliminada': True}))

    qs = Alerta.objects.select_related('transaccion').all()
    severidad = request.GET.get('severidad', '').strip()
    estado_filter = request.GET.get('estado', '').strip()
    nivel_riesgo = request.GET.get('nivel_riesgo', '').strip().lower()
    almacen_filter = request.GET.get('almacen', '').strip() or request.GET.get('tienda', '').strip()
    q = request.GET.get('q', '').strip()
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()

    # Filtrar por fecha de la transacción (evento real), NO por generado_en
    # (que es cuándo el motor creó la alerta — todas las alertas de una corrida
    # comparten esa fecha y rompen el histórico).
    if fecha_desde:
        qs = qs.filter(transaccion__fecha__gte=fecha_desde)
    if fecha_hasta:
        qs = qs.filter(transaccion__fecha__lte=fecha_hasta)

    if severidad:
        qs = qs.filter(severidad=severidad)
    if estado_filter:
        qs = qs.filter(estado=estado_filter)
    if nivel_riesgo:
        severidad_por_nivel = {
            'low': ['baja'],
            'medium': ['media'],
            'high': ['alta', 'critica'],
            'bajo': ['baja'],
            'medio': ['media'],
            'alto': ['alta', 'critica'],
        }
        severidades = severidad_por_nivel.get(nivel_riesgo)
        if severidades:
            qs = qs.filter(severidad__in=severidades)

    if almacen_filter:
        # Permite valores como "12" o etiquetas como "ALMACEN 12".
        digits = ''.join(ch for ch in almacen_filter if ch.isdigit())
        normalized = digits or almacen_filter
        try:
            qs = qs.filter(transaccion__almacen=int(normalized))
        except ValueError:
            qs = qs.none()

    tipo_filter = request.GET.get('tipo', '').strip()
    if tipo_filter:
        qs = qs.filter(tipo=tipo_filter)

    if q:
        qs = qs.filter(
            Q(tipo__icontains=q) |
            Q(descripcion__icontains=q)
        )

    page      = max(1, int(request.GET.get('page', 1)))
    # Cap alto para que rangos amplios no queden cortados a 200 ítems del día más
    # reciente (ordenamos por fecha DESC). 2000 cubre rangos típicos de 1-2 meses.
    page_size = min(int(request.GET.get('page_size', 50)), 2000)
    total     = qs.count()
    offset    = (page - 1) * page_size
    items     = qs[offset:offset + page_size]

    results = []
    for a in items:
        tx = a.transaccion
        results.append({
            'id':          a.id,
            # date = fecha del evento (transacción), para coherencia con el filtro y el ETL.
            'date':        tx.fecha.isoformat() if tx else a.generado_en.date().isoformat(),
            # detected_at = cuándo el motor creó la alerta (puede ser muy posterior).
            'detected_at': a.generado_en.date().isoformat(),
            'store':       _nombre_almacen(tx.almacen) if tx else '—',
            'almacen_codigo': tx.almacen if tx else None,
            'anomalyType': a.tipo,
            'amount':      float(tx.monto) if tx else 0,
            'riskLevel':   RIESGO_MAP.get(a.severidad, 'low'),
            'estado':      a.estado,
            'score':       a.score_anomalia,
            'descripcion': a.descripcion,
        })

    # Tipos de anomalía para el filtro: unión de reglas activas + tipos históricos.
    # Si solo trajéramos los tipos de alertas existentes, una regla recién activada
    # (que aún no ha corrido detección) no aparecería en el filtro.
    tipos_alertas = set(
        Alerta.objects.values_list('tipo', flat=True).distinct()
    )
    tipos_reglas_activas = set(
        ReglaDeteccion.objects.filter(habilitada=True).values_list('nombre', flat=True)
    )
    tipos_anomalia = sorted(tipos_alertas | tipos_reglas_activas)

    return Response(_ok({
        'results':   results,
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'tipos_anomalia': tipos_anomalia,
    }))


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

    # Tiendas: transacciones + alertas reales + nivel de riesgo del modelo
    tiendas_qs = (
        Transaccion.objects
        .filter(almacen__isnull=False)
        .values('almacen')
        .annotate(total_txns=Count('id'), monto_total=Sum('monto'))
        .order_by('-total_txns')
    )

    alertas_por_almacen = dict(
        Alerta.objects
        .filter(transaccion__almacen__isnull=False)
        .values('transaccion__almacen')
        .annotate(c=Count('id'))
        .values_list('transaccion__almacen', 'c')
    )

    # Mapear nivel de riesgo desde la tabla Riesgo (calculado por el motor)
    riesgo_por_almacen = {}
    for r in Riesgo.objects.all():
        # Extraer código de almacén del nombre "ALMACEN XX"
        parts = r.categoria.split()
        if len(parts) == 2 and parts[1].isdigit():
            riesgo_por_almacen[int(parts[1])] = NIVEL_MAP.get(r.nivel, 'low')

    tiendas = [
        {
            'id':              t['almacen'],
            'nombre':          _nombre_almacen(t['almacen']),
            'codigo':          t['almacen'],
            'nivel_riesgo':    riesgo_por_almacen.get(t['almacen'], 'low'),
            'anomalias_count': alertas_por_almacen.get(t['almacen'], 0),
            'total_txns':      t['total_txns'],
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
def riesgo_detalle(request, pk):
    """
    Detalle de riesgo operativo.
    Formato: { motivo_riesgo, datos_asociados, contexto_anomalia }
    """
    try:
        riesgo = Riesgo.objects.get(pk=pk)
    except Riesgo.DoesNotExist:
        return _err('Riesgo no encontrado.', status.HTTP_404_NOT_FOUND)

    # Extraer código de almacén desde la categoría "ALMACEN XX"
    parts = riesgo.categoria.split()
    almacen_code = None
    if len(parts) == 2 and parts[1].isdigit():
        almacen_code = int(parts[1])

    # Filtrar alertas del almacén específico (no solo por severidad global)
    alertas_qs = Alerta.objects.all()
    if almacen_code is not None:
        alertas_qs = alertas_qs.filter(transaccion__almacen=almacen_code)

    return Response(_ok({
        'id': riesgo.id,
        'motivo_riesgo': {
            'categoria': riesgo.categoria,
            'descripcion': riesgo.descripcion or '—',
        },
        'datos_asociados': {
            'nivel': riesgo.nivel,
            'nivel_riesgo': NIVEL_MAP.get(riesgo.nivel, 'low'),
            'probabilidad': riesgo.probabilidad,
            'impacto_estimado': float(riesgo.impacto_estimado) if riesgo.impacto_estimado else None,
            'calculado_en': riesgo.calculado_en.isoformat(),
        },
        'contexto_anomalia': {
            'total_alertas_nivel': alertas_qs.count(),
            'alertas_abiertas': alertas_qs.filter(estado='abierta').count(),
            'tipos_frecuentes': [
                row['tipo'] for row in
                alertas_qs.values('tipo')
                .annotate(c=Count('id'))
                .order_by('-c')[:5]
            ],
        },
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
    origen  = request.GET.get('origen', '').strip()
    q       = request.GET.get('q', '').strip()

    if desde:
        qs = qs.filter(fecha__gte=desde)
    if hasta:
        qs = qs.filter(fecha__lte=hasta)
    if tipo:
        qs = qs.filter(tipo__icontains=tipo)
    if almacen:
        qs = qs.filter(almacen=almacen)
    if origen == 'real':
        qs = qs.filter(estado='cargado')
    elif origen == 'prueba':
        qs = qs.filter(estado='seed')
    if q:
        qs = qs.filter(
            Q(cliente__icontains=q) |
            Q(referencia__icontains=q) |
            Q(numero_identificacion__icontains=q) |
            Q(descripcion__icontains=q)
        )

    # ── Deduplicar por (referencia, fecha) ────────────────────
    # El ERP origen descompone cada operación en múltiples asientos
    # contables del mismo día (ej. "RETIRA $385" se guarda como dos filas:
    # $35 interés + $350 capital). Agrupamos por (nrodocumento, fecha) para
    # reconstruir el monto real de cada evento del día sin colapsar movimientos
    # de días distintos del mismo contrato de empeño (intereses, abonos,
    # retiro final), que son eventos de negocio independientes.
    from django.db.models import Max as _Max

    con_ref_aggs = (
        qs.filter(referencia__gt='')
        .values('referencia', 'fecha')
        .annotate(
            rep_id=_Max('id'),
            sum_monto=Sum('monto'),
            sum_entrada=Sum('entrada'),
            sum_salida=Sum('salida'),
        )
    )
    # Mapa rep_id -> sumas agregadas (para sobrescribir los campos del representante)
    sumas_por_rep_id = {
        row['rep_id']: {
            'monto':   row['sum_monto'],
            'entrada': row['sum_entrada'],
            'salida':  row['sum_salida'],
        }
        for row in con_ref_aggs
    }
    con_ref_ids = list(sumas_por_rep_id.keys())

    sin_ref_ids = list(
        qs.filter(Q(referencia='') | Q(referencia__isnull=True))
        .values_list('id', flat=True)
    )
    qs_dedup = (
        Transaccion.objects
        .filter(Q(id__in=con_ref_ids) | Q(id__in=sin_ref_ids))
        .order_by('-fecha', '-hora_minutos')
    )

    # Totales reales (sin paginación) para las tarjetas de resumen.
    # Sumamos sobre el queryset original filtrado (no el deduplicado), excluyendo
    # solo aperturas/cierres. Como cada referencia agrupa todos sus asientos,
    # el total coincide con la suma agregada que se muestra en la tabla.
    totales_agg = qs.aggregate(
        total_entrada=Sum('entrada', filter=~ADMIN_OPS_FILTER),
        total_salida=Sum('salida', filter=~ADMIN_OPS_FILTER),
        total_monto=Sum('monto'),
    )
    total_count = qs_dedup.count()

    page      = max(1, int(request.GET.get('page', 1)))
    # Cap alto: la tabla del detalle de almacén ordena por fecha DESC,
    # con cap bajo solo se ven los días más recientes y parece que el filtro
    # tomó un único día. 2000 cubre rangos típicos de 1-2 meses por almacén.
    page_size = min(int(request.GET.get('page_size', 50)), 2000)
    total     = total_count
    offset    = (page - 1) * page_size
    items     = qs_dedup[offset:offset + page_size]

    def _val(t, sumas, campo, fallback):
        """Usa la suma agregada si la fila representa un grupo, sino el valor de la fila."""
        if sumas is not None:
            v = sumas[campo]
            return v if v is not None else fallback
        return fallback

    results = []
    for t in items:
        sumas = sumas_por_rep_id.get(t.id)
        monto_final   = _val(t, sumas, 'monto',   t.monto)
        entrada_final = _val(t, sumas, 'entrada', t.entrada)
        salida_final  = _val(t, sumas, 'salida',  t.salida)
        results.append({
            'id':          t.id,
            'date':        t.fecha.isoformat(),
            'store':       _nombre_almacen(t.almacen),
            'anomalyType': t.tipo or 'Sin tipo',
            'amount':      float(monto_final) if monto_final is not None else 0.0,
            'entrada':     float(entrada_final) if entrada_final is not None else None,
            'salida':      float(salida_final)  if salida_final  is not None else None,
            'estado':      t.estado,
            'analista':    t.usuario_cajero or '—',
            'referencia':            t.referencia,
            'cliente':               t.cliente,
            'numero_identificacion': t.numero_identificacion,
            'descripcion':           t.descripcion,
            'hora_minutos':          t.hora_minutos,
        })

    totales = {
        'total_entrada': totales_agg['total_entrada'],
        'total_salida':  totales_agg['total_salida'],
        'total_monto':   totales_agg['total_monto'],
        'total_count':   total_count,
    }

    return Response(_ok({
        'results':   results,
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'totales': {
            'entrada': float(totales['total_entrada'] or 0),
            'salida':  float(totales['total_salida'] or 0),
            'monto':   float(totales['total_monto'] or 0),
            'count':   total,
        },
    }))


@api_view(['POST'])
def etl_run(request):
    """
    ETL deshabilitado temporalmente — no se conecta a la API externa.
    Los datos se cargan mediante el comando seed: python manage.py seed_joz
    """
    return Response(_ok({
        'corriendo':     False,
        'mensaje':       'ETL deshabilitado: la conexión a la API externa está suspendida. '
                         'Use "python manage.py seed_joz" para cargar datos de prueba.',
    }), status=status.HTTP_200_OK)


@api_view(['GET'])
def etl_status(request):
    """Estado del ETL y últimas ejecuciones."""
    from . import etl as etl_module

    ultimos = ETLLog.objects.all()[:20]
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
            'origen':           e.origen,
        }
        for e in ultimos
    ]
    return Response(_ok(data, corriendo=etl_module.esta_corriendo()))


@api_view(['GET'])
def etl_schedule(request):
    """Estado del scheduler de tareas programadas y resumen acumulado."""
    from joz.scheduler import obtener_estado

    estado = obtener_estado()

    # Resumen de ejecuciones programadas
    from django.db.models import Sum, Count
    programados = ETLLog.objects.filter(origen='programado')
    resumen = programados.aggregate(
        total_ejecuciones=Count('id'),
        total_recibidas=Sum('filas_recibidas'),
        total_insertadas=Sum('filas_insertadas'),
        total_errores=Sum('filas_error'),
    )

    # Últimas 10 ejecuciones programadas
    ultimas = programados[:10]
    historial = [
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
        for e in ultimas
    ]

    # Total acumulado global (manual + programado)
    global_agg = ETLLog.objects.aggregate(
        total_insertadas_global=Sum('filas_insertadas'),
        total_recibidas_global=Sum('filas_recibidas'),
    )

    return Response(_ok({
        'scheduler': estado,
        'resumen_programado': {
            'total_ejecuciones': resumen['total_ejecuciones'] or 0,
            'total_recibidas': resumen['total_recibidas'] or 0,
            'total_insertadas': resumen['total_insertadas'] or 0,
            'total_errores': resumen['total_errores'] or 0,
        },
        'acumulado_global': {
            'total_insertadas': global_agg['total_insertadas_global'] or 0,
            'total_recibidas': global_agg['total_recibidas_global'] or 0,
        },
        'historial': historial,
    }))


# ── Consola SQL ──────────────────────────────────────────────────────────────

@api_view(['POST'])
def sql_execute(request):
    """
    Ejecuta una consulta SQL de solo lectura contra la BD local.
    Solo permite SELECT — bloquea cualquier sentencia de escritura.
    """
    from django.db import connection
    import time

    query = (request.data.get('query') or '').strip()
    if not query:
        return _err('Se requiere un campo "query" con la sentencia SQL.')

    # Validar que sea solo lectura
    normalized = query.upper().lstrip().lstrip('(')
    blocked = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
               'CREATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'VACUUM']
    first_word = normalized.split()[0] if normalized.split() else ''
    if first_word in blocked:
        return _err(f'Solo se permiten consultas SELECT. Sentencia bloqueada: {first_word}')
    if not normalized.startswith('SELECT') and not normalized.startswith('WITH') and not normalized.startswith('EXPLAIN'):
        return _err('Solo se permiten consultas SELECT, WITH o EXPLAIN.')

    limit = min(int(request.data.get('limit', 500)), 2000)

    try:
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SET statement_timeout = '10s'")
            cursor.execute(query)
            columns = [col.name for col in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(limit)
            elapsed = round(time.time() - start, 3)
            cursor.execute("RESET statement_timeout")
    except Exception as exc:
        logger.warning(f"SQL Console error: {exc}")
        return _err(str(exc))

    # Convertir Decimal/date a tipos serializables
    def _clean(val):
        if isinstance(val, Decimal):
            return float(val)
        if isinstance(val, (date, datetime)):
            return val.isoformat()
        return val

    data = [
        {col: _clean(row[i]) for i, col in enumerate(columns)}
        for row in rows
    ]

    return Response(_ok({
        'columns': columns,
        'rows': data,
        'count': len(data),
        'truncated': len(rows) >= limit,
        'elapsed': elapsed,
    }))


@api_view(['GET'])
def sql_schema(request):
    """Retorna el esquema de las tablas JOZ para autocompletado."""
    from django.db import connection

    tables = ['joz_transacciones', 'joz_alertas', 'joz_riesgos',
              'joz_config_deteccion', 'joz_etl_log']
    schema = {}

    with connection.cursor() as cursor:
        for table in tables:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, [table])
            schema[table] = [
                {'column': r[0], 'type': r[1], 'nullable': r[2] == 'YES'}
                for r in cursor.fetchall()
            ]

    return Response(_ok(schema))


# ── Reglas de detección (CRUD) ────────────────────────────────────────────────

MOTOR_VALIDOS = {'zscore', 'conteo', 'ratio'}

PARAMETROS_REQUERIDOS = {
    'zscore': ['zscore_media', 'zscore_alta', 'zscore_critica'],
    'conteo': ['min_txns', 'min_txns_alta', 'min_txns_critica'],
    'ratio':  ['ratio_media', 'ratio_alta'],
}


def _serializar_regla(r):
    return {
        'id': r.id,
        'nombre': r.nombre,
        'tipo_motor': r.tipo_motor,
        'habilitada': r.habilitada,
        'orden': r.orden,
        'descripcion_simple': r.descripcion_simple,
        'descripcion_tecnica': r.descripcion_tecnica,
        'formula': r.formula,
        'variables': r.variables,
        'parametros': r.parametros,
        'severidad_reglas': r.severidad_reglas,
        'icono': r.icono,
        'color': r.color,
        'es_sistema': r.es_sistema,
        'creada_en': r.creada_en.isoformat() if r.creada_en else None,
        'actualizada_en': r.actualizada_en.isoformat() if r.actualizada_en else None,
    }


def _validar_regla(data, parcial=False):
    """Valida datos de una regla. Retorna (campos_limpios, errores)."""
    campos = {}
    errores = {}

    nombre = data.get('nombre')
    if nombre is not None:
        nombre = str(nombre).strip()
        if not nombre:
            errores['nombre'] = 'El nombre es obligatorio.'
        else:
            campos['nombre'] = nombre
    elif not parcial:
        errores['nombre'] = 'El nombre es obligatorio.'

    tipo_motor = data.get('tipo_motor')
    if tipo_motor is not None:
        if tipo_motor not in MOTOR_VALIDOS:
            errores['tipo_motor'] = f'Motor inválido. Opciones: {sorted(MOTOR_VALIDOS)}'
        else:
            campos['tipo_motor'] = tipo_motor
    elif not parcial:
        errores['tipo_motor'] = 'El tipo de motor es obligatorio.'

    if 'habilitada' in data:
        try:
            campos['habilitada'] = _coerce_bool(data['habilitada'], 'habilitada')
        except ValueError as exc:
            errores['habilitada'] = str(exc)

    for field in ('descripcion_simple', 'descripcion_tecnica', 'formula', 'icono', 'color'):
        if field in data:
            campos[field] = str(data[field] or '')

    for field in ('variables', 'severidad_reglas'):
        if field in data:
            if not isinstance(data[field], list):
                errores[field] = f'{field} debe ser una lista.'
            else:
                campos[field] = data[field]

    if 'orden' in data:
        try:
            campos['orden'] = int(data['orden'])
        except (ValueError, TypeError):
            errores['orden'] = 'orden debe ser un entero.'

    if 'parametros' in data:
        if not isinstance(data['parametros'], dict):
            errores['parametros'] = 'parametros debe ser un objeto JSON.'
        else:
            motor = tipo_motor or campos.get('tipo_motor')
            if motor and motor in PARAMETROS_REQUERIDOS:
                faltantes = [k for k in PARAMETROS_REQUERIDOS[motor] if k not in data['parametros']]
                if faltantes:
                    errores['parametros'] = f'Faltan claves requeridas para motor {motor}: {faltantes}'
                else:
                    # Validar que son numéricos
                    params_clean = {}
                    for k, v in data['parametros'].items():
                        try:
                            params_clean[k] = float(v)
                        except (ValueError, TypeError):
                            errores['parametros'] = f'El parámetro "{k}" debe ser numérico.'
                            break
                    if 'parametros' not in errores:
                        campos['parametros'] = params_clean
            else:
                campos['parametros'] = data['parametros']

    return campos, errores


@api_view(['GET', 'POST'])
def reglas_deteccion(request):
    """
    GET  → Listar todas las reglas ordenadas por 'orden'.
    POST → Crear regla nueva.
    """
    if request.method == 'GET':
        reglas = ReglaDeteccion.objects.all().order_by('orden', 'id')
        return Response(_ok([_serializar_regla(r) for r in reglas]))

    # POST — Crear regla
    campos, errores = _validar_regla(request.data)
    if errores:
        return Response({'ok': False, 'error': 'Errores de validación.', 'fields': errores},
                        status=status.HTTP_400_BAD_REQUEST)

    # Verificar nombre único
    if ReglaDeteccion.objects.filter(nombre=campos['nombre']).exists():
        return Response({'ok': False, 'error': f'Ya existe una regla con el nombre "{campos["nombre"]}"'},
                        status=status.HTTP_400_BAD_REQUEST)

    regla = ReglaDeteccion.objects.create(**campos)
    return Response(_ok(_serializar_regla(regla)), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def regla_deteccion_detalle(request, pk):
    """
    GET    → Detalle de regla.
    PUT    → Actualizar regla completa.
    PATCH  → Actualizar parcial (ej: toggle habilitada).
    DELETE → Eliminar regla (solo si no es del sistema).
    """
    try:
        regla = ReglaDeteccion.objects.get(pk=pk)
    except ReglaDeteccion.DoesNotExist:
        return _err('Regla no encontrada.', status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_ok(_serializar_regla(regla)))

    if request.method == 'DELETE':
        if regla.es_sistema:
            return _err('No se puede eliminar una regla del sistema. Solo puede desactivarla.')
        regla.delete()
        return Response(_ok({'eliminada': True}))

    # PUT / PATCH
    parcial = request.method == 'PATCH'
    campos, errores = _validar_regla(request.data, parcial=parcial)
    if errores:
        return Response({'ok': False, 'error': 'Errores de validación.', 'fields': errores},
                        status=status.HTTP_400_BAD_REQUEST)

    # Verificar nombre único (si cambió)
    if 'nombre' in campos and campos['nombre'] != regla.nombre:
        if ReglaDeteccion.objects.filter(nombre=campos['nombre']).exclude(pk=pk).exists():
            return Response({'ok': False, 'error': f'Ya existe una regla con el nombre "{campos["nombre"]}"'},
                            status=status.HTTP_400_BAD_REQUEST)

    # Reglas del sistema: no permitir cambiar tipo_motor ni es_sistema
    if regla.es_sistema and 'tipo_motor' in campos and campos['tipo_motor'] != regla.tipo_motor:
        return _err('No se puede cambiar el motor de una regla del sistema.')

    for field, value in campos.items():
        setattr(regla, field, value)
    regla.save()

    return Response(_ok(_serializar_regla(regla)))


# ── Detección de anomalías ────────────────────────────────────────────────────

@api_view(['POST'])
def detectar_anomalias(request):
    """
    Ejecuta el motor de detección de anomalías en segundo plano.
    Params opcionales: limpiar (bool), dias (int).
    """
    import threading
    from django.core.management import call_command
    from io import StringIO

    limpiar = request.data.get('limpiar', False)
    dias = int(request.data.get('dias', 0))

    def _run():
        out = StringIO()
        args = []
        if limpiar:
            args.append('--limpiar')
        kwargs = {'stdout': out, 'dias': dias}
        try:
            call_command('detectar_anomalias', *args, **kwargs)
            logger.info(f"[Detección] Finalizado: {out.getvalue()[-200:]}")
        except Exception as exc:
            logger.error(f"[Detección] Error: {exc}")

    threading.Thread(target=_run, daemon=True).start()

    return Response(_ok({
        'mensaje': 'Detección de anomalías iniciada en segundo plano.',
        'limpiar': limpiar,
        'dias': dias,
    }))


# ── Consulta en tiempo real a SuperEfectivo ──────────────────────────────────

API_BASE_URL = os.environ.get('JOZ_API_URL', '').rstrip('/')
API_USUARIO  = os.environ.get('JOZ_API_USUARIO', '')
API_PASSWORD = os.environ.get('JOZ_API_PASSWORD', '')
API_TOKEN    = os.environ.get('JOZ_API_TOKEN', '')
API_TIMEOUT  = 30


def _api_auth_payload():
    return {
        'usuario':  API_USUARIO,
        'password': API_PASSWORD,
        'token':    API_TOKEN,
    }


def _parse_hora_api(hora_obj):
    """Convierte {hours, minutes, seconds} de la API a 'HH:MM:SS'."""
    if not isinstance(hora_obj, dict):
        return None
    h = hora_obj.get('hours', 0)
    m = hora_obj.get('minutes', 0)
    s = hora_obj.get('seconds', 0)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _serializar_movimiento(row):
    """Transforma un registro crudo de la API a formato limpio para el frontend."""
    return {
        'id':                    row.get('id'),
        'almacen_origen':        row.get('almorigen'),
        'almacen_destino':       row.get('almdestino'),
        'referencia':            row.get('nrodocumento', ''),
        'referencia_fisica':     row.get('nrodocumentofisico', ''),
        'numero_identificacion': str(row.get('numeroidentificacion', '')),
        'cliente':               row.get('nombre', ''),
        'descripcion':           row.get('descripcion', ''),
        'valor':                 row.get('valor', 0),
        'entrada':               row.get('entrada', 0),
        'salida':                row.get('salida', 0),
        'fecha':                 (row.get('fecha', '') or '')[:10],
        'hora':                  _parse_hora_api(row.get('hora')),
        'tipo':                  row.get('tipo', ''),
        'usuario':               row.get('usuario', ''),
    }


@api_view(['GET'])
def consulta_realtime(request):
    """
    Consulta en TIEMPO REAL a la API de SuperEfectivo.
    No guarda en BD — retorna datos frescos directamente.

    Query params:
        fecha_inicio  YYYY-MM-DD (default: hoy)
        fecha_fin     YYYY-MM-DD (default: hoy)
        almacen       int, 0=todos (default: 0)
        tipo          filtro: Aporte | Retiro
        q             búsqueda libre en cliente/descripción/referencia
        page          paginación (default: 1)
        page_size     registros por página (default: 50, max: 200)
    """
    if not API_BASE_URL or not API_USUARIO:
        return _err(
            'API de SuperEfectivo no configurada. Revisar variables JOZ_API_*',
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    hoy = date.today().isoformat()
    fecha_inicio = request.GET.get('fecha_inicio', hoy).strip() or hoy
    fecha_fin    = request.GET.get('fecha_fin', hoy).strip() or hoy
    codalmacen   = int(request.GET.get('almacen', 0))

    url = f"{API_BASE_URL}/api/AportesRetiros/Movimientos/porfecha"
    params = {
        'Codalmacen':  codalmacen,
        'fechaInicio': fecha_inicio,
        'fechaFin':    fecha_fin,
    }

    try:
        resp = http_requests.post(
            url, params=params, json=_api_auth_payload(),
            timeout=API_TIMEOUT, verify=True,
        )
        resp.raise_for_status()
    except http_requests.RequestException as exc:
        logger.error(f"Error consultando SuperEfectivo: {exc}")
        return _err(
            f'Error de conexión con SuperEfectivo: {exc}',
            status.HTTP_502_BAD_GATEWAY,
        )

    data = resp.json()
    if data.get('codigo') != 200:
        return _err(
            f"SuperEfectivo respondió: {data.get('msj', 'error desconocido')}",
            status.HTTP_502_BAD_GATEWAY,
        )

    registros = data.get('list', [])

    # Filtros opcionales del lado servidor
    tipo_filter = request.GET.get('tipo', '').strip()
    q_filter    = request.GET.get('q', '').strip().lower()

    if tipo_filter:
        registros = [r for r in registros if r.get('tipo', '').lower() == tipo_filter.lower()]
    if q_filter:
        registros = [
            r for r in registros
            if q_filter in (r.get('nombre', '') or '').lower()
            or q_filter in (r.get('descripcion', '') or '').lower()
            or q_filter in str(r.get('nrodocumento', '')).lower()
            or q_filter in str(r.get('numeroidentificacion', '')).lower()
        ]

    # Resumen rápido — separa flujo de cliente (entradas/salidas reales) de
    # operaciones internas (aperturas/cierres de caja, traslados entre puntos).
    # El cliente ve ambos en la tabla, pero los KPIs solo cuentan flujo real.
    registros_flujo_real = [
        r for r in registros if not _es_operacion_interna(r.get('descripcion', ''))
    ]
    registros_internos = [
        r for r in registros if _es_operacion_interna(r.get('descripcion', ''))
    ]

    total_entrada = sum(float(r.get('entrada', 0) or 0) for r in registros_flujo_real)
    total_salida  = sum(float(r.get('salida', 0) or 0) for r in registros_flujo_real)
    total_valor   = sum(float(r.get('valor', 0) or 0) for r in registros_flujo_real)

    aperturas_cierres = sum(
        1 for r in registros_internos
        if (r.get('descripcion', '') or '').lower().startswith(('apertura', 'cierre'))
    )
    traslados = len(registros_internos) - aperturas_cierres

    # Paginación
    page      = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', 50)), 200)
    total     = len(registros)
    offset    = (page - 1) * page_size
    pagina    = registros[offset:offset + page_size]

    results = [_serializar_movimiento(r) for r in pagina]

    return Response(_ok({
        'results':        results,
        'count':          total,
        'page':           page,
        'page_size':      page_size,
        'fecha_inicio':   fecha_inicio,
        'fecha_fin':      fecha_fin,
        'almacen':        codalmacen,
        'resumen': {
            'total_registros': total,
            'total_entrada':   total_entrada,
            'total_salida':    total_salida,
            'total_valor':     total_valor,
            'aportes':         sum(
                1 for r in registros_flujo_real if r.get('tipo') == 'Aporte'
            ),
            'retiros':         sum(
                1 for r in registros_flujo_real if r.get('tipo') == 'Retiro'
            ),
            # Desglose de operaciones internas que NO se cuentan en aportes/retiros.
            # Se exponen al frontend para transparencia con el cliente.
            'operaciones_internas': {
                'total':              len(registros_internos),
                'aperturas_cierres':  aperturas_cierres,
                'traslados':          traslados,
            },
        },
    }))


# ── Inteligencia Artificial ──────────────────────────────────────────────────

@api_view(['GET'])
def ia_status(request):
    """Estado del modelo de IA (Isolation Forest)."""
    from . import ml
    return Response(_ok(ml.obtener_estado()))


@api_view(['POST'])
def ia_entrenar(request):
    """Entrena el modelo Isolation Forest con las transacciones actuales."""
    from . import ml
    import threading

    contamination = float(request.data.get('contamination', 0.05))

    def _train():
        ml.entrenar(contamination=contamination)

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()

    return Response(_ok({
        'mensaje': 'Entrenamiento iniciado en segundo plano.',
        'contamination': contamination,
    }))


@api_view(['GET'])
def ia_anomalias(request):
    """Devuelve las anomalías detectadas por el modelo de IA."""
    from . import ml

    estado = ml.obtener_estado()
    if not estado.get('entrenado'):
        return _err('Modelo no entrenado. Entrene primero desde el panel de IA.')

    distribucion = ml.obtener_distribucion()
    if isinstance(distribucion, dict) and 'error' in distribucion:
        return _err(distribucion['error'])

    return Response(_ok({
        'modelo': estado,
        **distribucion,
    }))
