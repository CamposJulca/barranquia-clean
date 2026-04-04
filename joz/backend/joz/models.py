from django.db import models


class Transaccion(models.Model):
    """Transacción financiera registrada en el sistema JOZ."""

    referencia = models.CharField(max_length=100, db_index=True)
    tipo = models.CharField(max_length=100, blank=True, default='')
    monto = models.DecimalField(max_digits=18, decimal_places=2)
    fecha = models.DateField(db_index=True)
    cliente = models.CharField(max_length=300, blank=True, default='')
    estado = models.CharField(max_length=100, blank=True, default='pendiente')
    raw_data = models.JSONField(default=dict)
    cargado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'joz_transacciones'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.referencia} — {self.monto}"


class Alerta(models.Model):
    """Alerta de anomalía detectada por el motor de IA."""

    SEVERIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]
    ESTADO_CHOICES = [
        ('abierta', 'Abierta'),
        ('en_revision', 'En revisión'),
        ('resuelta', 'Resuelta'),
        ('descartada', 'Descartada'),
    ]

    transaccion = models.ForeignKey(
        Transaccion, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='alertas',
    )
    tipo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    severidad = models.CharField(max_length=20, choices=SEVERIDAD_CHOICES, default='media')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='abierta')
    score_anomalia = models.FloatField(null=True, blank=True)
    generado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'joz_alertas'
        ordering = ['-generado_en']

    def __str__(self):
        return f"[{self.severidad.upper()}] {self.tipo}"


class Riesgo(models.Model):
    """Riesgo operativo o financiero calculado."""

    categoria = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    nivel = models.CharField(
        max_length=20,
        choices=[('bajo', 'Bajo'), ('medio', 'Medio'), ('alto', 'Alto')],
        default='medio',
    )
    probabilidad = models.FloatField(null=True, blank=True)
    impacto_estimado = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    calculado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'joz_riesgos'
        ordering = ['-calculado_en']

    def __str__(self):
        return f"{self.categoria} — {self.nivel}"
