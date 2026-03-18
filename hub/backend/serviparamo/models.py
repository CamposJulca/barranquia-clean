from django.db import models


class CatalogoSKU(models.Model):
    """Catálogo de SKUs extraído de SQL Server (inv_ina01)."""

    codigo = models.CharField(max_length=50, db_index=True)
    familia = models.CharField(max_length=150, blank=True, default='')
    familia_normalizada = models.CharField(max_length=150, blank=True, default='')
    categoria = models.CharField(max_length=150, blank=True, default='')
    nombre = models.CharField(max_length=500, blank=True, default='')
    nombre1 = models.CharField(max_length=500, blank=True, default='')
    unidad = models.CharField(max_length=20, blank=True, default='')
    cluster_id = models.IntegerField(null=True, blank=True)
    es_duplicado = models.BooleanField(default=False)
    grupo_duplicado = models.IntegerField(null=True, blank=True, db_index=True)
    aprobado = models.BooleanField(default=False)
    cargado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'serviparamo_catalogo_skus'
        indexes = [
            models.Index(fields=['familia']),
            models.Index(fields=['familia_normalizada']),
            models.Index(fields=['es_duplicado']),
        ]

    def __str__(self):
        return f"{self.codigo} — {self.descrip1[:60]}"


class CatalogoEmbedding(models.Model):
    """Embeddings semánticos para cada SKU."""

    sku = models.OneToOneField(
        CatalogoSKU,
        on_delete=models.CASCADE,
        related_name='embedding',
        db_column='sku_id',
    )
    vector = models.JSONField()  # lista de floats (384 dims)
    texto_fuente = models.TextField()
    generado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'serviparamo_catalogo_embeddings'

    def __str__(self):
        return f"Embedding SKU {self.sku_id}"
