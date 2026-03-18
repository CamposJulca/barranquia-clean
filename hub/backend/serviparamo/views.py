from django.db.models import Count, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import CatalogoSKU, CatalogoEmbedding
from .serializers import SKUSerializer, SKUResumenSerializer


@api_view(['GET'])
def familias(request):
    """Lista de familias normalizadas con conteo de ítems."""
    qs = (
        CatalogoSKU.objects
        .values('familia_normalizada')
        .annotate(total=Count('id'), duplicados=Count('id', filter=Q(es_duplicado=True)))
        .order_by('-total')
    )
    return Response(list(qs))


@api_view(['GET'])
def buscar(request):
    """Búsqueda semántica por texto libre usando embeddings."""
    q = request.GET.get('q', '').strip()
    limite = min(int(request.GET.get('limit', 20)), 100)

    if not q:
        return Response({'error': 'Parámetro q requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        modelo = SentenceTransformer('all-MiniLM-L6-v2')
        vector_query = modelo.encode([q], normalize_embeddings=True)[0]

        embeddings_qs = CatalogoEmbedding.objects.select_related('sku').all()
        resultados = []

        for emb in embeddings_qs.iterator(chunk_size=2000):
            v = np.array(emb.vector, dtype=np.float32)
            sim = float(np.dot(vector_query, v))
            resultados.append((sim, emb.sku))

        resultados.sort(key=lambda x: x[0], reverse=True)
        top = resultados[:limite]

        data = []
        for sim, sku in top:
            row = SKUResumenSerializer(sku).data
            row['similitud'] = round(sim, 4)
            data.append(row)

        return Response(data)

    except ImportError:
        # Fallback: búsqueda por texto si no hay sentence_transformers
        qs = CatalogoSKU.objects.filter(
            Q(nombre__icontains=q) | Q(nombre1__icontains=q) |
            Q(familia__icontains=q) | Q(codigo__icontains=q)
        )[:limite]
        return Response(SKUResumenSerializer(qs, many=True).data)


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
        return Response(
            {'error': 'Se requiere sku_id o grupo_id.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if sku_id:
        qs = CatalogoSKU.objects.filter(id=sku_id)
    else:
        qs = CatalogoSKU.objects.filter(grupo_duplicado=grupo_id)

    if not qs.exists():
        return Response({'error': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

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
        return Response(
            {'error': 'Se requieren familia_origen y familia_destino.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actualizados = CatalogoSKU.objects.filter(familia_normalizada=origen).update(
        familia_normalizada=destino
    )
    return Response({'fusionados': actualizados, 'destino': destino})


@api_view(['GET'])
def stats(request):
    """Resumen general del catálogo."""
    total = CatalogoSKU.objects.count()
    duplicados_count = CatalogoSKU.objects.filter(es_duplicado=True).count()
    aprobados_count = CatalogoSKU.objects.filter(aprobado=True).count()
    sin_familia = CatalogoSKU.objects.filter(Q(familia='') | Q(familia_normalizada='SIN FAMILIA')).count()
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
    })
