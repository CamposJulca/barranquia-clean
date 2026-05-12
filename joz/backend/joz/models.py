from django.db import models


class Transaccion(models.Model):
    """Transacción financiera proveniente de la API de SuperEfectivo."""

    # Campos de identificación
    id_externo      = models.IntegerField(null=True, blank=True, db_index=True,
                                          help_text="ID del movimiento en SuperEfectivo")
    referencia      = models.CharField(max_length=100, db_index=True,
                                       help_text="nrodocumento de la API")
    # Almacén
    almacen         = models.IntegerField(null=True, blank=True, db_index=True,
                                          help_text="Código de almacén (1-30)")
    # Cliente
    numero_identificacion = models.CharField(max_length=50, blank=True, default='',
                                             help_text="Cédula/ID del cliente")
    cliente         = models.CharField(max_length=300, blank=True, default='',
                                       help_text="Nombre completo del cliente")
    # Movimiento
    tipo            = models.CharField(max_length=100, blank=True, default='',
                                       help_text="Aporte o Retiro")
    descripcion     = models.TextField(blank=True, default='',
                                       help_text="Descripción libre del movimiento (detalle del empeño)")
    monto           = models.DecimalField(max_digits=18, decimal_places=2,
                                          help_text="Valor total del movimiento")
    entrada         = models.DecimalField(max_digits=18, decimal_places=2,
                                          null=True, blank=True,
                                          help_text="Monto de entrada (campo 'entrada' de la API)")
    salida          = models.DecimalField(max_digits=18, decimal_places=2,
                                          null=True, blank=True,
                                          help_text="Monto de salida (campo 'salida' de la API)")
    # Fecha y hora
    fecha           = models.DateField(db_index=True)
    hora_minutos    = models.IntegerField(null=True, blank=True,
                                          help_text="Minutos desde medianoche (hora.totalMinutes de la API)")
    # Operación
    usuario_cajero  = models.CharField(max_length=100, blank=True, default='',
                                       help_text="Usuario cajero que registró el movimiento")
    estado          = models.CharField(max_length=100, blank=True, default='cargado')
    # Auditoría
    raw_data        = models.JSONField(default=dict)
    cargado_en      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'joz_transacciones'
        ordering = ['-fecha', '-hora_minutos']
        indexes = [
            models.Index(fields=['fecha', 'almacen']),
            models.Index(fields=['tipo', 'fecha']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['id_externo'],
                name='uq_transaccion_id_externo',
                condition=models.Q(id_externo__isnull=False),
            ),
        ]

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
    calculado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'joz_riesgos'
        ordering = ['-calculado_en']

    def __str__(self):
        return f"{self.categoria} — {self.nivel}"


class ReglaDeteccion(models.Model):
    """
    Regla de detección de anomalías — administrable por el usuario.

    Cada regla usa un motor de evaluación (tipo_motor) con parámetros
    configurables. Los 3 motores disponibles son:
      - zscore:  compara monto contra media+desviación del grupo
      - conteo:  cuenta transacciones por agrupación y alerta si supera umbral
      - ratio:   compara volumen individual contra promedio del grupo
    """

    MOTOR_CHOICES = [
        ('zscore', 'Z-Score (desviación estadística)'),
        ('conteo', 'Conteo (agrupación y umbral)'),
        ('ratio', 'Ratio (proporción vs promedio)'),
        ('contrapartida', 'Contrapartida (matching salida↔entrada)'),
    ]

    nombre = models.CharField(max_length=200,
        help_text='Nombre visible de la regla')
    tipo_motor = models.CharField(max_length=20, choices=MOTOR_CHOICES,
        help_text='Motor de evaluación que usa esta regla')
    habilitada = models.BooleanField(default=True)
    orden = models.IntegerField(default=0,
        help_text='Orden de visualización')

    # Documentación para el usuario
    descripcion_simple = models.TextField(blank=True, default='',
        help_text='Explicación en lenguaje sencillo')
    descripcion_tecnica = models.TextField(blank=True, default='',
        help_text='Explicación técnica del cálculo')
    formula = models.CharField(max_length=300, blank=True, default='',
        help_text='Fórmula matemática (ej: Z = (Monto - μ) / σ)')
    variables = models.JSONField(default=list, blank=True,
        help_text='Lista de {symbol, meaning} para la fórmula')

    # Parámetros del motor (JSON flexible según tipo_motor)
    parametros = models.JSONField(default=dict,
        help_text='Umbrales y config del motor. Ej: {"zscore_media":2,"zscore_alta":3}')

    # Reglas de severidad
    severidad_reglas = models.JSONField(default=list, blank=True,
        help_text='Lista de {level, condition, color}')

    # Meta para UI
    icono = models.CharField(max_length=50, blank=True, default='Activity',
        help_text='Nombre del icono Lucide')
    color = models.CharField(max_length=20, blank=True, default='#f59e0b')

    # Protección: las reglas del sistema no se pueden eliminar
    es_sistema = models.BooleanField(default=False,
        help_text='Regla del sistema (no eliminable por el usuario)')

    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'joz_reglas_deteccion'
        ordering = ['orden', 'id']

    def __str__(self):
        estado = 'ON' if self.habilitada else 'OFF'
        return f'[{estado}] {self.nombre} ({self.tipo_motor})'


class ETLLog(models.Model):
    """Registro de auditoría de cada ejecución del ETL contra la API de SuperEfectivo."""

    ORIGEN_CHOICES = [
        ('manual', 'Manual'),
        ('programado', 'Programado'),
    ]

    endpoint        = models.CharField(max_length=200)
    fecha_consulta  = models.DateField(help_text="Fecha de los movimientos consultados")
    almacen         = models.IntegerField(default=0, help_text="0 = todos los almacenes")
    filas_recibidas = models.IntegerField(default=0)
    filas_insertadas= models.IntegerField(default=0)
    filas_error     = models.IntegerField(default=0)
    iniciado_en     = models.DateTimeField(auto_now_add=True)
    finalizado_en   = models.DateTimeField(null=True, blank=True)
    mensaje         = models.TextField(blank=True, default='')
    origen          = models.CharField(max_length=20, choices=ORIGEN_CHOICES,
                                       default='manual', db_index=True)

    class Meta:
        db_table = 'joz_etl_log'
        ordering = ['-iniciado_en']

    def __str__(self):
        return f"ETL {self.fecha_consulta} — {self.filas_insertadas} insertadas"
