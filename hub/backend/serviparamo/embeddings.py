"""
Embeddings semánticos ServiPáramo — Fase 2
Genera vectores con all-MiniLM-L6-v2 para cada SKU y los guarda en PostgreSQL.
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barranquia.settings')
django.setup()

from sentence_transformers import SentenceTransformer
from serviparamo.models import CatalogoSKU, CatalogoEmbedding

MODEL_NAME = 'all-MiniLM-L6-v2'
BATCH_SIZE = 512


def _texto_sku(sku: CatalogoSKU) -> str:
    partes = [sku.familia, sku.categoria, sku.nombre, sku.nombre1]
    return ' '.join(p for p in partes if p).strip()


def run(solo_faltantes: bool = True):
    print("=== Generando embeddings ServiPáramo ===")
    print(f"Modelo: {MODEL_NAME}")

    modelo = SentenceTransformer(MODEL_NAME)

    qs = CatalogoSKU.objects.all()
    if solo_faltantes:
        ids_con_embedding = CatalogoEmbedding.objects.values_list('sku_id', flat=True)
        qs = qs.exclude(id__in=ids_con_embedding)
        print(f"SKUs sin embedding: {qs.count():,}")
    else:
        CatalogoEmbedding.objects.all().delete()
        print(f"SKUs totales: {qs.count():,}")

    skus = list(qs.only('id', 'familia', 'categoria', 'nombre', 'nombre1'))
    total = len(skus)

    if total == 0:
        print("Nada que procesar.")
        return

    textos = [_texto_sku(s) for s in skus]

    print("Generando vectores…")
    vectores = modelo.encode(
        textos,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    print("Guardando en base de datos…")
    embeddings = [
        CatalogoEmbedding(
            sku=skus[i],
            vector=vectores[i].tolist(),
            texto_fuente=textos[i],
        )
        for i in range(total)
    ]

    CatalogoEmbedding.objects.bulk_create(
        embeddings,
        batch_size=500,
        update_conflicts=True,
        update_fields=['vector', 'texto_fuente', 'generado_en'],
        unique_fields=['sku'],
    )

    print(f"✓ {total:,} embeddings guardados.")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--todos', action='store_true', help='Regenerar todos, no solo faltantes')
    args = parser.parse_args()
    run(solo_faltantes=not args.todos)
