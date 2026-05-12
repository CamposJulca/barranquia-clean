"""
Data migration: inserta las 3 reglas base de detección de anomalías
como registros de ReglaDeteccion con es_sistema=True.
"""
from django.db import migrations


REGLAS_BASE = [
    {
        'nombre': 'Monto inusual',
        'tipo_motor': 'zscore',
        'habilitada': True,
        'orden': 1,
        'es_sistema': True,
        'descripcion_simple': (
            'Imagina que en una tienda los Aportes normalmente son de USD 200 a USD 500. '
            'Si de repente alguien hace un Aporte de USD 15,000, eso es raro. Esta regla '
            'detecta esos montos que se salen mucho de lo normal, comparando cada tipo de '
            'operación (Aporte o Retiro) por separado en cada almacén.'
        ),
        'descripcion_tecnica': (
            'Calcula un Z-score por transacción comparándola contra la media y desviación '
            'estándar de su mismo almacén y tipo de operación. Mientras más lejos del '
            'promedio, mayor la severidad.'
        ),
        'formula': 'Z = (Monto - μ) / σ',
        'variables': [
            {'symbol': 'Monto', 'meaning': 'Valor de la transacción evaluada'},
            {'symbol': 'μ', 'meaning': 'Promedio de montos del mismo almacén y tipo'},
            {'symbol': 'σ', 'meaning': 'Desviación estándar de montos del mismo almacén y tipo'},
        ],
        'parametros': {
            'zscore_media': 2.0,
            'zscore_alta': 3.0,
            'zscore_critica': 4.0,
        },
        'severidad_reglas': [
            {'level': 'Crítica', 'condition': 'Z ≥ Z_critica', 'color': 'text-red-400'},
            {'level': 'Alta', 'condition': 'Z_alta ≤ Z < Z_critica', 'color': 'text-orange-400'},
            {'level': 'Media', 'condition': 'Z_media ≤ Z < Z_alta', 'color': 'text-yellow-400'},
        ],
        'icono': 'Activity',
        'color': '#f59e0b',
    },
    {
        'nombre': 'Fraccionamiento de operaciones',
        'tipo_motor': 'conteo',
        'habilitada': True,
        'orden': 2,
        'es_sistema': True,
        'descripcion_simple': (
            'Si una persona va a la tienda y en vez de hacer 1 Aporte grande, hace 15 '
            'Aportes chiquitos el mismo día, eso es sospechoso. Es como si quisiera pasar '
            'desapercibido partiendo una operación grande en muchas pequeñas. Esta regla '
            'cuenta cuántas operaciones del mismo tipo hace un cliente en un solo día.'
        ),
        'descripcion_tecnica': (
            'Agrupa las transacciones por cliente, fecha, tipo de operación y almacén. '
            'Si el número de transacciones en un grupo supera el umbral configurado, '
            'genera una alerta.'
        ),
        'formula': 'N = count(txns) por cliente + día + tipo + almacén',
        'variables': [
            {'symbol': 'N', 'meaning': 'Cantidad de transacciones del mismo cliente, día, tipo y almacén'},
            {'symbol': 'Umbral', 'meaning': 'Mínimo de transacciones para considerarse fraccionamiento'},
        ],
        'parametros': {
            'min_txns': 5.0,
            'min_txns_alta': 10.0,
            'min_txns_critica': 20.0,
        },
        'severidad_reglas': [
            {'level': 'Crítica', 'condition': 'N ≥ Umbral crítica', 'color': 'text-red-400'},
            {'level': 'Alta', 'condition': 'Umbral alta ≤ N < Umbral crítica', 'color': 'text-orange-400'},
            {'level': 'Media', 'condition': 'Umbral media ≤ N < Umbral alta', 'color': 'text-yellow-400'},
        ],
        'icono': 'Scissors',
        'color': '#8b5cf6',
    },
    {
        'nombre': 'Concentración de cajero',
        'tipo_motor': 'ratio',
        'habilitada': True,
        'orden': 3,
        'es_sistema': True,
        'descripcion_simple': (
            'Si normalmente cada cajero atiende unas 20 operaciones al día, pero un cajero '
            'atiende 80, algo raro pasa. Puede ser que todos los clientes van con el mismo '
            'cajero a propósito, o que ese cajero está registrando operaciones que no debería. '
            'Esta regla compara cuántas operaciones de cada tipo procesa un cajero contra lo '
            'que es normal.'
        ),
        'descripcion_tecnica': (
            'Calcula el promedio de transacciones por cajero por día para cada tipo de '
            'operación. Si un cajero supera ese promedio por el factor configurado, genera alerta.'
        ),
        'formula': 'Ratio = N_cajero_día_tipo / μ_tipo',
        'variables': [
            {'symbol': 'N_cajero_día_tipo', 'meaning': 'Transacciones de ese tipo procesadas por el cajero en el día'},
            {'symbol': 'μ_tipo', 'meaning': 'Promedio de transacciones de ese tipo por cajero por día'},
        ],
        'parametros': {
            'ratio_media': 2.0,
            'ratio_alta': 3.0,
        },
        'severidad_reglas': [
            {'level': 'Alta', 'condition': 'Ratio ≥ Ratio_alta', 'color': 'text-orange-400'},
            {'level': 'Media', 'condition': 'Ratio_media ≤ Ratio < Ratio_alta', 'color': 'text-yellow-400'},
        ],
        'icono': 'Users',
        'color': '#06b6d4',
    },
]


def crear_reglas(apps, schema_editor):
    ReglaDeteccion = apps.get_model('joz', 'ReglaDeteccion')
    for regla_data in REGLAS_BASE:
        ReglaDeteccion.objects.update_or_create(
            nombre=regla_data['nombre'],
            defaults=regla_data,
        )


def borrar_reglas(apps, schema_editor):
    ReglaDeteccion = apps.get_model('joz', 'ReglaDeteccion')
    ReglaDeteccion.objects.filter(
        nombre__in=[r['nombre'] for r in REGLAS_BASE],
        es_sistema=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('joz', '0009_regladeteccion_es_sistema'),
    ]

    operations = [
        migrations.RunPython(crear_reglas, borrar_reglas),
    ]
