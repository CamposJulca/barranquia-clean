from django.db import models


class SKU(models.Model):
    """Catálogo de SKUs de Avantika Colombia."""

    codigo = models.CharField(max_length=100, unique=True, db_index=True)
    descripcion = models.CharField(max_length=500, blank=True, default='')
    categoria = models.CharField(max_length=200, blank=True, default='')
    unidad = models.CharField(max_length=50, blank=True, default='')
    clasificacion_abc = models.CharField(
        max_length=1, blank=True, default='',
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C')],
    )
    estado = models.CharField(max_length=100, blank=True, default='activo')
    stock_actual = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    punto_reorden = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'avantika_skus'

    def __str__(self):
        return f"{self.codigo} — {self.descripcion[:60]}"


class PronosticoDemanda(models.Model):
    """Pronóstico de demanda generado por modelo ML."""

    sku = models.ForeignKey(SKU, on_delete=models.CASCADE, related_name='pronosticos')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    cantidad_pronosticada = models.DecimalField(max_digits=18, decimal_places=4)
    confianza = models.FloatField(null=True, blank=True)
    modelo_version = models.CharField(max_length=50, blank=True, default='v1')
    generado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'avantika_pronosticos'
        ordering = ['-generado_en']

    def __str__(self):
        return f"Pronóstico {self.sku.codigo} {self.fecha_inicio}→{self.fecha_fin}"


class SugerenciaReposicion(models.Model):
    """Sugerencia de reposición de inventario."""

    sku = models.ForeignKey(SKU, on_delete=models.CASCADE, related_name='sugerencias')
    cantidad_sugerida = models.DecimalField(max_digits=18, decimal_places=4)
    urgencia = models.CharField(
        max_length=20, default='normal',
        choices=[('baja', 'Baja'), ('normal', 'Normal'), ('alta', 'Alta'), ('critica', 'Crítica')],
    )
    motivo = models.TextField(blank=True, default='')
    generado_en = models.DateTimeField(auto_now_add=True)
    atendido = models.BooleanField(default=False)

    class Meta:
        db_table = 'avantika_sugerencias_reposicion'
        ordering = ['-generado_en']

    def __str__(self):
        return f"Reposición {self.sku.codigo} — {self.urgencia}"
