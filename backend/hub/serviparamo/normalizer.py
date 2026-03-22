"""
Normalización y clustering ServiPáramo — Fase 3
K-Means sobre embeddings + detección de duplicados por similitud coseno.
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barranquia.settings')
django.setup()

import numpy as np
from collections import Counter
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics.pairwise import cosine_similarity
from serviparamo.models import CatalogoSKU, CatalogoEmbedding

UMBRAL_DUPLICADO = 0.92   # similitud coseno mínima para considerar duplicado
BATCH_SIMILITUD = 1000    # SKUs a procesar por vez al buscar similares


def _familia_mayoritaria(familias: list[str]) -> str:
    """Retorna la familia más frecuente del cluster, excluyendo vacíos."""
    validas = [f for f in familias if f and f != 'SIN FAMILIA']
    if not validas:
        return 'SIN FAMILIA'
    return Counter(validas).most_common(1)[0][0]


def run(n_clusters: int = 0):
    print("=== Normalización y clustering ServiPáramo ===")

    embeddings_qs = CatalogoEmbedding.objects.select_related('sku').all()
    total = embeddings_qs.count()

    if total == 0:
        print("No hay embeddings. Ejecuta embeddings.py primero.")
        return

    print(f"Cargando {total:,} embeddings…")
    registros = list(embeddings_qs)
    skus = [r.sku for r in registros]
    vectores = np.array([r.vector for r in registros], dtype=np.float32)

    # ── K-Means ─────────────────────────────────────────────────────────────
    if n_clusters == 0:
        familias_unicas = len(set(s.familia_normalizada for s in skus if s.familia_normalizada))
        n_clusters = max(50, min(familias_unicas * 3, total // 10))

    print(f"Clustering K-Means con k={n_clusters}…")
    kmeans = MiniBatchKMeans(
        n_clusters=n_clusters,
        random_state=42,
        batch_size=min(10000, total),
        n_init=3,
    )
    labels = kmeans.fit_predict(vectores)

    # Asignar cluster_id y familia_normalizada por cluster
    print("Asignando familias normalizadas por cluster…")
    cluster_familias: dict[int, list[str]] = {}
    for i, label in enumerate(labels):
        cluster_familias.setdefault(label, []).append(skus[i].familia_normalizada)

    cluster_nombre: dict[int, str] = {
        cid: _familia_mayoritaria(fams)
        for cid, fams in cluster_familias.items()
    }

    # ── Detección de similares por bloque ───────────────────────────────────
    print(f"Detectando duplicados (umbral coseno={UMBRAL_DUPLICADO})…")
    grupo_map: dict[int, int] = {}   # sku.id → grupo_duplicado
    grupo_actual = 1

    for inicio in range(0, total, BATCH_SIMILITUD):
        bloque = vectores[inicio: inicio + BATCH_SIMILITUD]
        sims = cosine_similarity(bloque, vectores)   # (batch, total)

        for bi, fila in enumerate(sims):
            idx_actual = inicio + bi
            sku_actual = skus[idx_actual]
            if sku_actual.id in grupo_map:
                continue
            # índices con similitud alta (excluye self)
            similares = np.where(fila >= UMBRAL_DUPLICADO)[0]
            similares = [j for j in similares if j != idx_actual]
            if similares:
                # incluir el sku actual en el grupo
                todos = [idx_actual] + list(similares)
                # si alguno ya tiene grupo, usar ese
                grupo_existente = next(
                    (grupo_map[skus[j].id] for j in todos if skus[j].id in grupo_map),
                    None,
                )
                if grupo_existente is None:
                    grupo_existente = grupo_actual
                    grupo_actual += 1
                for j in todos:
                    grupo_map[skus[j].id] = grupo_existente

        if (inicio // BATCH_SIMILITUD) % 10 == 0:
            print(f"  {min(inicio + BATCH_SIMILITUD, total):,} / {total:,}…", end='\r')

    print()

    # ── Actualización masiva ─────────────────────────────────────────────────
    print("Actualizando registros en base de datos…")
    actualizados = []
    for i, sku in enumerate(skus):
        sku.cluster_id = int(labels[i])
        sku.familia_normalizada = cluster_nombre[int(labels[i])]
        gid = grupo_map.get(sku.id)
        sku.es_duplicado = gid is not None
        sku.grupo_duplicado = gid
        actualizados.append(sku)

    CatalogoSKU.objects.bulk_update(
        actualizados,
        fields=['cluster_id', 'familia_normalizada', 'es_duplicado', 'grupo_duplicado'],
        batch_size=2000,
    )

    total_dups = sum(1 for s in actualizados if s.es_duplicado)
    print(f"✓ Clustering completado.")
    print(f"  Clusters generados    : {n_clusters}")
    print(f"  SKUs duplicados       : {total_dups:,} ({total_dups/total*100:.1f}%)")
    print(f"  Grupos de duplicados  : {grupo_actual - 1}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--clusters', type=int, default=0, help='Número de clusters (0=auto)')
    args = parser.parse_args()
    run(n_clusters=args.clusters)
