import re
import time
import threading
import logging

from django.db import connection
from django.db.models import Count, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    CatalogoSKU, CatalogoEmbedding,
    RawCategoria, RawFamilia,
    RawOrdenEncabezado, RawOrdenDetalle,
    RawPedidoEncabezado, RawPedidoDetalle,
    RawPresupuestoDetalle, RawPresupuestoResumen,
    ETLLog,
)
from .serializers import (
    SKUSerializer, SKUResumenSerializer,
    CategoriaSerializer, FamiliaSerializer,
    OrdenEncabezadoSerializer, OrdenDetalleSerializer,
    PedidoEncabezadoSerializer, PedidoDetalleSerializer,
    PresupuestoDetalleSerializer, PresupuestoResumenSerializer,
    ETLLogSerializer,
)

_PAGE_SIZE_DEFAULT = 50
_PAGE_SIZE_MAX = 500

_SEMANTIC_MODEL_NAME = 'all-MiniLM-L6-v2'
_semantic_model = None
_semantic_model_lock = threading.Lock()


def _paginar(qs, request):
    page = max(1, int(request.GET.get('page', 1)))
    page_size = min(int(request.GET.get('page_size', _PAGE_SIZE_DEFAULT)), _PAGE_SIZE_MAX)
    total = qs.count()
    offset = (page - 1) * page_size
    return qs[offset: offset + page_size], total, page, page_size


def _ok(data, count=None, page=None, page_size=None):
    resp = {'ok': True}
    if count is not None:
        resp['count'] = count
    if page is not None:
        resp['page'] = page
        resp['page_size'] = page_size
    resp['data'] = data
    return resp


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'ok': False, 'error': msg}, status=code)


def _get_semantic_model():
    """Carga lazy y thread-safe del modelo semántico."""
    global _semantic_model
    if _semantic_model is None:
        with _semantic_model_lock:
            if _semantic_model is None:
                from sentence_transformers import SentenceTransformer
                _semantic_model = SentenceTransformer(_SEMANTIC_MODEL_NAME)
    return _semantic_model


# ── SKUs ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def skus_list(request):
    """Listado paginado de SKUs. Filtros: familia, categoria, q."""
    qs = CatalogoSKU.objects.all().order_by('codigo')

    familia = request.GET.get('familia', '').strip()
    categoria = request.GET.get('categoria', '').strip()
    q = request.GET.get('q', '').strip()

    if familia:
        qs = qs.filter(Q(familia__icontains=familia) | Q(familia_normalizada__icontains=familia))
    if categoria:
        qs = qs.filter(categoria__icontains=categoria)
    if q:
        qs = qs.filter(Q(nombre__icontains=q) | Q(nombre1__icontains=q) | Q(codigo__icontains=q))

    page_qs, total, page, page_size = _paginar(qs, request)
    return Response(_ok(SKUResumenSerializer(page_qs, many=True).data, total, page, page_size))


@api_view(['GET'])
def sku_detail(request, codigo):
    """Detalle de un SKU por código."""
    try:
        sku = CatalogoSKU.objects.get(codigo=codigo)
    except CatalogoSKU.DoesNotExist:
        return _err('SKU no encontrado.', status.HTTP_404_NOT_FOUND)
    return Response(_ok(SKUSerializer(sku).data))


# ── Catálogos ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
def categorias(request):
    """Listado de categorías."""
    qs = RawCategoria.objects.all().order_by('nombre')
    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(Q(nombre__icontains=q) | Q(categoria_id__icontains=q))
    page_qs, total, page, page_size = _paginar(qs, request)
    return Response(_ok(CategoriaSerializer(page_qs, many=True).data, total, page, page_size))


@api_view(['GET'])
def familias_raw(request):
    """Listado de familias del ERP (tabla raw_familias)."""
    qs = RawFamilia.objects.all().order_by('nombre')
    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(Q(nombre__icontains=q) | Q(familia_id__icontains=q))
    page_qs, total, page, page_size = _paginar(qs, request)
    return Response(_ok(FamiliaSerializer(page_qs, many=True).data, total, page, page_size))


@api_view(['GET'])
def familias(request):
    """Lista de familias normalizadas con conteo de ítems (catálogo procesado)."""
    qs = (
        CatalogoSKU.objects
        .values('familia_normalizada')
        .annotate(total=Count('id'), duplicados=Count('id', filter=Q(es_duplicado=True)))
        .order_by('-total')
    )
    return Response(list(qs))


# ── Órdenes de compra ─────────────────────────────────────────────────────────

@api_view(['GET'])
def ordenes_list(request):
    """Listado paginado de órdenes de compra (encabezado)."""
    qs = RawOrdenEncabezado.objects.all().order_by('-fecha_oc', 'numfac')

    estado = request.GET.get('estado', '').strip()
    proveedor = request.GET.get('proveedor', '').strip()
    if estado:
        qs = qs.filter(estado__icontains=estado)
    if proveedor:
        qs = qs.filter(proveedor_id__icontains=proveedor)

    page_qs, total, page, page_size = _paginar(qs, request)
    return Response(_ok(OrdenEncabezadoSerializer(page_qs, many=True).data, total, page, page_size))


@api_view(['GET'])
def orden_detail(request, numfac):
    """Detalle completo de una OC: encabezado + ítems."""
    try:
        encabezado = RawOrdenEncabezado.objects.get(numfac=numfac)
    except RawOrdenEncabezado.DoesNotExist:
        return _err('Orden no encontrada.', status.HTTP_404_NOT_FOUND)

    items = RawOrdenDetalle.objects.filter(numfac=numfac)
    return Response(_ok({
        'encabezado': OrdenEncabezadoSerializer(encabezado).data,
        'items': OrdenDetalleSerializer(items, many=True).data,
    }))


# ── Pedidos ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
def pedidos_list(request):
    """Listado paginado de pedidos (encabezado)."""
    qs = RawPedidoEncabezado.objects.all().order_by('-pedido')

    estado = request.GET.get('estado', '').strip()
    solicitante = request.GET.get('solicitante', '').strip()
    if estado:
        qs = qs.filter(estado__icontains=estado)
    if solicitante:
        qs = qs.filter(solicitante__icontains=solicitante)

    page_qs, total, page, page_size = _paginar(qs, request)
    return Response(_ok(PedidoEncabezadoSerializer(page_qs, many=True).data, total, page, page_size))


@api_view(['GET'])
def pedido_detail(request, pedido):
    """Detalle completo de un pedido: encabezado + ítems + presupuesto."""
    try:
        encabezado = RawPedidoEncabezado.objects.get(pedido=pedido)
    except RawPedidoEncabezado.DoesNotExist:
        return _err('Pedido no encontrado.', status.HTTP_404_NOT_FOUND)

    return Response(_ok({
        'encabezado': PedidoEncabezadoSerializer(encabezado).data,
        'items': PedidoDetalleSerializer(
            RawPedidoDetalle.objects.filter(pedido=pedido), many=True
        ).data,
        'presupuesto_detalle': PresupuestoDetalleSerializer(
            RawPresupuestoDetalle.objects.filter(pedido=pedido), many=True
        ).data,
        'presupuesto_resumen': PresupuestoResumenSerializer(
            RawPresupuestoResumen.objects.filter(pedido=pedido), many=True
        ).data,
    }))


# ── ETL ───────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def etl_status(request):
    """Último registro del ETL por tabla + estado de ejecución."""
    tablas = ETLLog.objects.values('tabla_destino').distinct()
    resultado = []
    for t in tablas:
        ultimo = (
            ETLLog.objects
            .filter(tabla_destino=t['tabla_destino'])
            .order_by('-iniciado_en')
            .first()
        )
        if ultimo:
            resultado.append(ETLLogSerializer(ultimo).data)

    ultimo_global = ETLLog.objects.order_by('-iniciado_en').first()
    resumen = None
    if ultimo_global:
        resumen = {
            'total_tablas': len(resultado),
            'tablas_con_error': sum(1 for r in resultado if (r.get('filas_error') or 0) > 0),
            'ultimo_inicio': ultimo_global.iniciado_en.isoformat() if ultimo_global.iniciado_en else None,
            'ultimo_fin': ultimo_global.finalizado_en.isoformat() if ultimo_global.finalizado_en else None,
            'ultimo_mensaje': ultimo_global.mensaje or '',
        }

    response_data = _ok(resultado)
    response_data['corriendo'] = _etl_lock.locked()
    response_data['resumen'] = resumen
    return Response(response_data)


_etl_lock = threading.Lock()
_etl_running = False


@api_view(['POST'])
def etl_run(request):
    """
    Dispara el ETL en segundo plano.
    Parámetro opcional: {"tablas": ["CatalogoSKU", "RawCategoria"]}
    """
    global _etl_running

    if not _etl_lock.acquire(blocking=False):
        return Response(
            {'ok': False, 'error': 'El ETL ya está en ejecución.'},
            status=status.HTTP_409_CONFLICT,
        )

    _etl_running = True
    tablas = request.data.get('tablas', None)

    def _run():
        global _etl_running
        logger = logging.getLogger(__name__)
        try:
            from serviparamo.etl import run as run_etl
            run_etl(tablas=tablas)

            # Opción A: indexación automática tras ETL de catálogo.
            should_index = False
            if tablas is None:
                should_index = True
            elif isinstance(tablas, (list, tuple, set)):
                should_index = 'CatalogoSKU' in tablas
            else:
                should_index = str(tablas) == 'CatalogoSKU'

            if should_index:
                try:
                    from serviparamo.embeddings import run as run_embeddings
                    run_embeddings(solo_faltantes=True)
                except Exception as emb_exc:
                    # No abortar el ETL si falla la indexación semántica.
                    logger.error(f"Indexación semántica falló tras ETL: {emb_exc}")
        except Exception as e:
            logger.error(f"ETL falló: {e}")
        finally:
            _etl_running = False
            _etl_lock.release()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return Response({
        'ok': True,
        'mensaje': 'ETL iniciado en segundo plano.',
        'tablas': tablas or 'todas',
    })


# ── Búsqueda semántica ────────────────────────────────────────────────────────

@api_view(['GET'])
def buscar_status(request):
    """Estado operativo de búsqueda semántica."""
    total_items = CatalogoSKU.objects.count()
    con_embedding = CatalogoEmbedding.objects.count()
    pct_embedding = round(con_embedding / total_items * 100, 1) if total_items else 0

    try:
        _get_semantic_model()
        motor_disponible = True
    except Exception:
        motor_disponible = False

    return Response(_ok({
        'total_items': total_items,
        'con_embedding': con_embedding,
        'pct_embedding': pct_embedding,
        'etl_corriendo': _etl_lock.locked(),
        'motor_disponible': motor_disponible,
        'index_ready': con_embedding > 0,
    }))


@api_view(['GET'])
def buscar(request):
    """Búsqueda semántica por texto libre usando embeddings."""
    q = request.GET.get('q', '').strip()
    limite = min(int(request.GET.get('limit', 20)), 100)

    if not q:
        return _err('Parámetro q requerido.')

    total_embeddings = CatalogoEmbedding.objects.count()
    logger = logging.getLogger(__name__)

    try:
        import numpy as np

        if total_embeddings == 0:
            raise RuntimeError('Sin embeddings disponibles')

        modelo = _get_semantic_model()
        vector_query = modelo.encode([q], normalize_embeddings=True)[0]

        embeddings_qs = CatalogoEmbedding.objects.select_related('sku').all()
        resultados = []
        embeddings_evaluados = 0
        for emb in embeddings_qs.iterator(chunk_size=2000):
            v = np.array(emb.vector, dtype=np.float32)
            sim = float(np.dot(vector_query, v))
            resultados.append((sim, emb.sku))
            embeddings_evaluados += 1

        resultados.sort(key=lambda x: x[0], reverse=True)
        data = []
        for sim, sku in resultados[:limite]:
            row = SKUResumenSerializer(sku).data
            row['similitud'] = round(sim, 4)
            data.append(row)

        response_data = _ok(data, count=len(data))
        response_data['motor'] = 'semantic'
        response_data['embeddings_evaluados'] = embeddings_evaluados
        response_data['total_embeddings'] = total_embeddings
        return Response(response_data)

    except Exception as exc:
        logger.warning(f"Búsqueda semántica en fallback textual: {exc}")
        qs = CatalogoSKU.objects.filter(
            Q(nombre__icontains=q) | Q(nombre1__icontains=q) |
            Q(familia__icontains=q) | Q(codigo__icontains=q)
        )[:limite]
        data = SKUResumenSerializer(qs, many=True).data
        response_data = _ok(data, count=len(data))
        response_data['motor'] = 'fallback_texto'
        response_data['embeddings_evaluados'] = 0
        response_data['total_embeddings'] = total_embeddings
        return Response(response_data)


# ── Duplicados y aprobaciones ─────────────────────────────────────────────────

@api_view(['GET'])
def duplicados(request):
    """Grupos de SKUs duplicados detectados."""
    familia = request.GET.get('familia', '')
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)

    qs = CatalogoSKU.objects.filter(es_duplicado=True, grupo_duplicado__isnull=False)
    if familia:
        qs = qs.filter(familia_normalizada__icontains=familia)

    grupos_ids = (
        qs.values('grupo_duplicado')
        .annotate(n=Count('id'))
        .order_by('-n')
    )
    total_grupos = grupos_ids.count()
    offset = (page - 1) * page_size
    grupos_page = grupos_ids[offset: offset + page_size]

    resultado = []
    for g in grupos_page:
        gid = g['grupo_duplicado']
        skus = CatalogoSKU.objects.filter(grupo_duplicado=gid)
        resultado.append({
            'grupo_duplicado': gid,
            'total': g['n'],
            'aprobados': skus.filter(aprobado=True).count(),
            'familia_sugerida': skus.first().familia_normalizada if skus.exists() else '',
            'items': SKUSerializer(skus, many=True).data,
        })

    return Response({
        'total_grupos': total_grupos,
        'page': page,
        'page_size': page_size,
        'grupos': resultado,
    })


@api_view(['POST'])
def aprobar(request):
    """Aprobar la normalización de un ítem o grupo."""
    sku_id = request.data.get('sku_id')
    grupo_id = request.data.get('grupo_id')
    familia_nueva = request.data.get('familia_normalizada', '').strip()

    if not sku_id and not grupo_id:
        return _err('Se requiere sku_id o grupo_id.')

    qs = (
        CatalogoSKU.objects.filter(id=sku_id)
        if sku_id else
        CatalogoSKU.objects.filter(grupo_duplicado=grupo_id)
    )

    if not qs.exists():
        return _err('No encontrado.', status.HTTP_404_NOT_FOUND)

    update_fields = {'aprobado': True}
    if familia_nueva:
        update_fields['familia_normalizada'] = familia_nueva

    actualizados = qs.update(**update_fields)
    return Response({'aprobados': actualizados})


@api_view(['POST'])
def fusionar_familias(request):
    """Fusiona todos los ítems de familia_origen hacia familia_destino."""
    origen = request.data.get('familia_origen', '').strip()
    destino = request.data.get('familia_destino', '').strip()

    if not origen or not destino:
        return _err('Se requieren familia_origen y familia_destino.')

    actualizados = CatalogoSKU.objects.filter(familia_normalizada=origen).update(
        familia_normalizada=destino
    )
    return Response({'fusionados': actualizados, 'destino': destino})


# ── Stats ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def stats(request):
    """Resumen general del catálogo."""
    total = CatalogoSKU.objects.count()
    duplicados_count = CatalogoSKU.objects.filter(es_duplicado=True).count()
    aprobados_count = CatalogoSKU.objects.filter(aprobado=True).count()
    sin_familia = CatalogoSKU.objects.filter(
        Q(familia='') | Q(familia_normalizada='SIN FAMILIA')
    ).count()
    familias_count = CatalogoSKU.objects.values('familia_normalizada').distinct().count()
    grupos_count = (
        CatalogoSKU.objects.filter(grupo_duplicado__isnull=False)
        .values('grupo_duplicado').distinct().count()
    )
    con_embedding = CatalogoEmbedding.objects.count()

    return Response({
        'total_items': total,
        'duplicados': duplicados_count,
        'pct_duplicados': round(duplicados_count / total * 100, 1) if total else 0,
        'aprobados': aprobados_count,
        'sin_familia': sin_familia,
        'familias_normalizadas': familias_count,
        'grupos_duplicados': grupos_count,
        'con_embedding': con_embedding,
        'pct_embedding': round(con_embedding / total * 100, 1) if total else 0,
        'total_categorias': RawCategoria.objects.count(),
        'total_familias_erp': RawFamilia.objects.count(),
        'total_ordenes': RawOrdenEncabezado.objects.count(),
        'total_pedidos': RawPedidoEncabezado.objects.count(),
    })


# ── Query Console ─────────────────────────────────────────────────────────────

_ALLOWED_TABLES = {
    'serviparamo_catalogo_skus',
    'serviparamo_catalogo_embeddings',
    'serviparamo_raw_categorias',
    'serviparamo_raw_familias',
    'serviparamo_raw_ordenes_encabezado',
    'serviparamo_raw_ordenes_detalle',
    'serviparamo_raw_pedidos_encabezado',
    'serviparamo_raw_pedidos_detalle',
    'serviparamo_raw_presupuesto_detalle',
    'serviparamo_raw_presupuesto_resumen',
    'serviparamo_raw_kardex',
    'serviparamo_etl_log',
}

_ROW_LIMIT = 1000


def _validate_query(sql: str) -> str | None:
    """Retorna mensaje de error si la query no es permitida, None si es válida."""
    stripped = sql.strip().lower()
    if not stripped:
        return 'La consulta está vacía.'
    first_word = stripped.split()[0]
    if first_word != 'select':
        return 'Solo se permiten consultas SELECT.'
    dangerous = re.compile(
        r'\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|exec|execute|copy|pg_)\b',
        re.IGNORECASE,
    )
    if dangerous.search(sql):
        return 'La consulta contiene operaciones no permitidas.'
    return None


@api_view(['POST'])
def query_console(request):
    """
    Ejecuta una consulta SELECT contra la base de datos local (PostgreSQL).
    Body: { "sql": "SELECT ..." }
    Respuesta: { ok, columns, rows, row_count, elapsed_ms }
    """
    sql = (request.data.get('sql') or '').strip()
    error = _validate_query(sql)
    if error:
        return _err(error)

    # Inyectar LIMIT si no viene
    if not re.search(r'\blimit\b', sql, re.IGNORECASE):
        sql = f"{sql.rstrip(';')} LIMIT {_ROW_LIMIT}"

    try:
        t0 = time.monotonic()
        with connection.cursor() as cur:
            cur.execute(sql)
            columns = [desc[0] for desc in cur.description] if cur.description else []
            rows = [list(row) for row in cur.fetchall()]
        elapsed_ms = round((time.monotonic() - t0) * 1000)

        # Serializar tipos no-JSON
        for row in rows:
            for i, val in enumerate(row):
                if hasattr(val, 'isoformat'):
                    row[i] = val.isoformat()
                elif val is None:
                    row[i] = None
                else:
                    try:
                        import json; json.dumps(val)
                    except (TypeError, ValueError):
                        row[i] = str(val)

        return Response({
            'ok': True,
            'columns': columns,
            'rows': rows,
            'row_count': len(rows),
            'elapsed_ms': elapsed_ms,
        })
    except Exception as e:
        return _err(f'Error en la consulta: {e}')
