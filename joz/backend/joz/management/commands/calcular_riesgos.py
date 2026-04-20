"""
Genera registros de Riesgo a partir de transacciones existentes.

Scoring derivado: agrupa transacciones por almacen, calcula porcentaje
relativo de actividad y asigna nivel alto/medio/bajo.
NO es un modelo de anomalias real -- es una aproximacion inicial.
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum
from decimal import Decimal

from joz.models import Transaccion, Riesgo


def _nombre_almacen(codigo):
    if codigo is None:
        return 'Sin almacen'
    return f'ALMACEN {str(codigo).zfill(2)}'


class Command(BaseCommand):
    help = 'Calcula riesgos derivados desde transacciones y pobla el modelo Riesgo'

    def handle(self, *args, **options):
        tiendas = (
            Transaccion.objects
            .filter(almacen__isnull=False)
            .values('almacen')
            .annotate(total=Count('id'), monto_total=Sum('monto'))
            .order_by('-total')
        )

        if not tiendas:
            self.stdout.write(self.style.WARNING('No hay transacciones para calcular riesgos.'))
            return

        max_total = max(t['total'] for t in tiendas)

        creados = 0
        actualizados = 0

        for t in tiendas:
            pct = t['total'] / max_total if max_total else 0

            if pct >= 0.7:
                nivel = 'alto'
            elif pct >= 0.4:
                nivel = 'medio'
            else:
                nivel = 'bajo'

            nombre = _nombre_almacen(t['almacen'])
            monto = Decimal(str(t['monto_total'] or 0))

            defaults = {
                'descripcion': (
                    f'{t["total"]} transacciones registradas, '
                    f'monto acumulado ${monto:,.0f} (scoring derivado)'
                ),
                'nivel': nivel,
                'probabilidad': round(pct, 4),
                'impacto_estimado': monto,
            }

            _, created = Riesgo.objects.update_or_create(
                categoria=nombre,
                defaults=defaults,
            )

            if created:
                creados += 1
            else:
                actualizados += 1

        self.stdout.write(self.style.SUCCESS(
            f'Riesgos calculados: {creados} creados, {actualizados} actualizados.'
        ))
