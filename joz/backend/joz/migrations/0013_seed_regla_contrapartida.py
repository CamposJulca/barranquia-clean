"""
Data migration: inserta la regla "Transacciones sin contrapartida"
(motor 'contrapartida'). Idempotente vía update_or_create.
"""
from django.db import migrations


REGLA = {
    'nombre': 'Transacciones sin contrapartida',
    'tipo_motor': 'contrapartida',
    'habilitada': True,
    'orden': 4,
    'es_sistema': True,
    'descripcion_simple': (
        'Cuando un almacén envía dinero a otro (traslado o gasto compartido), '
        'tiene que aparecer la entrada correspondiente en el almacén destino. '
        'Si el dinero salió pero nunca entró en el otro lado dentro de la '
        'ventana definida, esta regla lo detecta. Es uno de los hallazgos más '
        'serios porque puede indicar pérdida o desvío de efectivo.'
    ),
    'descripcion_tecnica': (
        'Para cada salida cuya descripción contiene patrones de traslado o '
        'gasto cruzado entre almacenes (TRASLADO, MOVIMIENTO ENTRE, '
        'GASTOS X ALMACEN, SUPER PAGO ALM), determina el almacén destino '
        'esperado leyendo raw_data["almdestino"] o, si falta, parseando la '
        'descripción con regex. Busca una entrada con descripción del mismo '
        'patrón, en el almacén destino, monto coincidente (tolerancia '
        'configurable) y fecha entre f y f+ventana_dias. El matching es 1-a-1: '
        'una entrada solo puede emparejarse con una salida. Si una salida no '
        'encuentra pareja genera alerta alta. Las salidas con destino '
        'indeterminado no generan alerta (no se puede validar contrapartida '
        'sin saber a dónde fue el dinero).'
    ),
    'formula': (
        'salida sin pareja  ⇔  ¬∃ entrada en (destino, [f, f+ventana_dias]) '
        'con |monto_e − monto_s| ≤ tolerancia · monto_s'
    ),
    'variables': [
        {'symbol': 'ventana_dias',         'meaning': 'Días hasta f+N para buscar la entrada-pareja'},
        {'symbol': 'tolerancia_monto_pct', 'meaning': 'Tolerancia porcentual sobre el monto de la salida'},
        {'symbol': 'destino',              'meaning': 'Almacén destino desde raw_data["almdestino"] o regex en descripción'},
        {'symbol': 'patrones',             'meaning': 'TRASLADO, MOVIMIENTO ENTRE, GASTOS X ALMACEN, SUPER PAGO ALM'},
    ],
    'parametros': {
        'ventana_dias':         3,
        'tolerancia_monto_pct': 0.0,
        'tipos_aplicables':     ['Aporte', 'Retiro'],
    },
    'severidad_reglas': [
        {'level': 'Alta', 'condition': 'Salida sin entrada-pareja en la ventana', 'color': 'text-orange-400'},
    ],
    'icono': 'ArrowLeftRight',
    'color': '#ef4444',
}


def crear_regla(apps, schema_editor):
    ReglaDeteccion = apps.get_model('joz', 'ReglaDeteccion')
    ReglaDeteccion.objects.update_or_create(
        nombre=REGLA['nombre'],
        defaults=REGLA,
    )


def borrar_regla(apps, schema_editor):
    ReglaDeteccion = apps.get_model('joz', 'ReglaDeteccion')
    ReglaDeteccion.objects.filter(
        nombre=REGLA['nombre'],
        es_sistema=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('joz', '0012_alter_regladeteccion_tipo_motor'),
    ]

    operations = [
        migrations.RunPython(crear_regla, borrar_regla),
    ]
