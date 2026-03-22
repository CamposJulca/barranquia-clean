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
        return f"{self.codigo} — {self.nombre[:60]}"


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


# ── Tablas de staging (espejo del ERP) ──────────────────────────────────────

class RawCategoria(models.Model):
    """Catálogo de categorías (inv_ina01_categoria)."""

    categoria_id = models.CharField(max_length=100, blank=True, default='')
    nombre = models.CharField(max_length=300, blank=True, default='')
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_categorias'

    def __str__(self):
        return f"{self.categoria_id} — {self.nombre}"


class RawFamilia(models.Model):
    """Catálogo de familias (inv_ina01_familia)."""

    familia_id = models.CharField(max_length=100, blank=True, default='')
    nombre = models.CharField(max_length=300, blank=True, default='')
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_familias'

    def __str__(self):
        return f"{self.familia_id} — {self.nombre}"


class RawOrdenEncabezado(models.Model):
    """Encabezado de órdenes de compra (com_orden01)."""

    numfac = models.CharField(max_length=50, db_index=True)
    proveedor_id = models.CharField(max_length=200, blank=True, default='')
    fecha_oc = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=100, blank=True, default='')
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_ordenes_encabezado'

    def __str__(self):
        return f"OC {self.numfac}"


class RawOrdenDetalle(models.Model):
    """Detalle de órdenes de compra (com_orden02)."""

    numfac = models.CharField(max_length=50, db_index=True)
    codigo_item = models.CharField(max_length=100, blank=True, default='')
    descripcion = models.CharField(max_length=500, blank=True, default='')
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    precio_unitario = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_ordenes_detalle'

    def __str__(self):
        return f"OC {self.numfac} — {self.codigo_item}"


class RawPedidoEncabezado(models.Model):
    """Encabezado de pedidos/solicitudes (com_peda01)."""

    pedido = models.IntegerField(db_index=True)
    solicitante = models.CharField(max_length=300, blank=True, default='')
    fecha_pedido = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=100, blank=True, default='')
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_pedidos_encabezado'

    def __str__(self):
        return f"Pedido {self.pedido}"


class RawPedidoDetalle(models.Model):
    """Detalle de pedidos (com_peda02)."""

    pedido = models.IntegerField(db_index=True)
    codigo_item = models.CharField(max_length=100, blank=True, default='')
    descripcion = models.CharField(max_length=500, blank=True, default='')
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_pedidos_detalle'

    def __str__(self):
        return f"Pedido {self.pedido} — {self.codigo_item}"


class RawPresupuestoDetalle(models.Model):
    """Presupuesto detallado por pedido (com_peda03)."""

    pedido = models.IntegerField(db_index=True)
    codigo_item = models.CharField(max_length=100, blank=True, default='')
    descripcion = models.CharField(max_length=500, blank=True, default='')
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    precio = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_presupuesto_detalle'

    def __str__(self):
        return f"Presupuesto pedido {self.pedido} — {self.codigo_item}"


class RawPresupuestoResumen(models.Model):
    """Presupuesto resumen por pedido (com_peda03_mat)."""

    pedido = models.IntegerField(db_index=True)
    familia = models.CharField(max_length=300, blank=True, default='')
    total = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_presupuesto_resumen'

    def __str__(self):
        return f"Resumen pedido {self.pedido}"


class RawKardex(models.Model):
    """Movimientos de inventario / Kardex (inv_ina02)."""

    numfac = models.CharField(max_length=50, db_index=True)
    nomsis = models.CharField(max_length=50, blank=True, default='')
    codigo_item = models.CharField(max_length=100, blank=True, default='')
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    fecha_mov = models.DateField(null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'serviparamo_raw_kardex'

    def __str__(self):
        return f"Kardex {self.numfac} / {self.nomsis}"


class ETLLog(models.Model):
    """Registro de ejecuciones del ETL."""

    tabla_destino = models.CharField(max_length=100)
    filas_insertadas = models.IntegerField(default=0)
    filas_error = models.IntegerField(default=0)
    iniciado_en = models.DateTimeField()
    finalizado_en = models.DateTimeField(null=True, blank=True)
    mensaje = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'serviparamo_etl_log'
        ordering = ['-iniciado_en']

    def __str__(self):
        return f"{self.tabla_destino} @ {self.iniciado_en}"
