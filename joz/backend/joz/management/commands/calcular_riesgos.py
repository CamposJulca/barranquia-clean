"""
Recalcula `Riesgo` por almacén usando la fórmula unificada de
`joz.riesgos.actualizar_riesgo_tiendas`. Es la misma función que invoca
el motor de detección al finalizar cada corrida — este comando existe
para recalcular manualmente sin re-evaluar reglas.
"""
from django.core.management.base import BaseCommand

from joz.riesgos import actualizar_riesgo_tiendas


class Command(BaseCommand):
    help = 'Recalcula riesgos por almacén con la fórmula unificada de joz.riesgos'

    def handle(self, *args, **options):
        n = actualizar_riesgo_tiendas(stdout=self.stdout, style=self.style)
        if n == 0:
            self.stdout.write(self.style.WARNING(
                'No hay transacciones para calcular riesgos.'
            ))
            return
        self.stdout.write(self.style.SUCCESS(
            f'Riesgos recalculados para {n} almacenes.'
        ))
