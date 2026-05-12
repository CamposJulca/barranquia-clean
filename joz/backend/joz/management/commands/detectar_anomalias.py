"""
Motor de detección de anomalías para JOZ — SuperEfectivo.

Evalúa las reglas administrables de ReglaDeteccion según su tipo_motor:

  - zscore:  Monto inusual — Z-score por almacén + tipo + categoría
  - conteo:  Fraccionamiento — Cliente con muchas txns/día por tipo+categoría
  - ratio:   Concentración — Cajero con volumen anómalo vs promedio por tipo+categoría
"""
import re
import logging
from collections import defaultdict
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, StdDev, Sum
from django.utils import timezone

from joz.models import Alerta, ReglaDeteccion, Transaccion, Riesgo
from joz.riesgos import actualizar_riesgo_tiendas

logger = logging.getLogger(__name__)

CLIENTES_BULK = {'99999'}

# ── Patrones para normalizar la descripción libre a categoría ────────────────
_CATEGORIA_PATTERNS = [
    (re.compile(r'^RETIRA POR VALOR', re.I),              'Retiro empeño'),
    (re.compile(r'^ABONA A CAPITAL', re.I),                'Abono a capital'),
    (re.compile(r'^PAGA \d+ MES.*INTERÉS', re.I),         'Pago intereses'),
    (re.compile(r'^Empeño de:', re.I),                     'Empeño'),
    (re.compile(r'^APERTURA DE CAJA ENTRADA', re.I),       'Apertura caja entrada'),
    (re.compile(r'^APERTURA DE CAJA SALIDA', re.I),        'Apertura caja salida'),
    (re.compile(r'^CIERRE DE CAJA ENTRADA', re.I),         'Cierre caja entrada'),
    (re.compile(r'^CIERRE DE CAJA SALIDA', re.I),          'Cierre caja salida'),
    (re.compile(r'ENVIO DE WESTERN', re.I),                'Envío Western Union'),
    (re.compile(r'PAGO DE WESTERN', re.I),                 'Pago Western Union'),
    (re.compile(r'^RENOVACI[OÓ]N', re.I),                  'Renovación'),
    (re.compile(r'^VENTA', re.I),                          'Venta'),
]


def _categorizar_descripcion(desc):
    """Normaliza la descripción libre a una categoría agrupable."""
    if not desc:
        return ''
    desc = desc.strip()
    for pattern, categoria in _CATEGORIA_PATTERNS:
        if pattern.search(desc):
            return categoria
    return 'Otro'


class Command(BaseCommand):
    help = 'Detecta anomalías según las reglas administrables de JOZ'

    def add_arguments(self, parser):
        parser.add_argument('--limpiar', action='store_true',
                            help='Elimina alertas existentes antes de regenerar')
        parser.add_argument('--dry-run', action='store_true',
                            help='Solo muestra detecciones sin crear alertas')
        parser.add_argument('--dias', type=int, default=0,
                            help='Analizar solo los últimos N días (0=todos)')

    def handle(self, *args, **options):
        limpiar = options['limpiar']
        dry_run = options['dry_run']
        dias = options['dias']

        # Cargar reglas habilitadas
        reglas = list(ReglaDeteccion.objects.filter(habilitada=True).order_by('orden', 'id'))
        if not reglas:
            self.stdout.write(self.style.WARNING('No hay reglas habilitadas.'))
            return

        self.stdout.write(f'{len(reglas)} reglas habilitadas:')
        for r in reglas:
            self.stdout.write(f'  [{r.tipo_motor}] {r.nombre}')

        if limpiar and not dry_run:
            borradas = Alerta.objects.all().delete()[0]
            self.stdout.write(f'  Alertas previas eliminadas: {borradas}')

        qs = Transaccion.objects.all()
        if dias > 0:
            from datetime import timedelta
            desde = timezone.now().date() - timedelta(days=dias)
            qs = qs.filter(fecha__gte=desde)
            self.stdout.write(f'Filtrando últimos {dias} días (desde {desde})')

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('No hay transacciones.'))
            return

        self.stdout.write(f'Analizando {total:,} transacciones...\n')
        alertas = []

        # Ejecutar cada regla según su motor
        MOTORES = {
            'zscore': self._motor_zscore,
            'conteo': self._motor_conteo,
            'ratio':  self._motor_ratio,
        }

        for regla in reglas:
            motor_fn = MOTORES.get(regla.tipo_motor)
            if motor_fn is None:
                self.stdout.write(self.style.WARNING(
                    f'  Motor desconocido "{regla.tipo_motor}" en regla "{regla.nombre}", saltando.'
                ))
                continue
            alertas += motor_fn(qs, regla)

        # Deduplicar contra alertas existentes
        if not limpiar:
            existentes = set(
                Alerta.objects.values_list('transaccion_id', 'tipo').distinct()
            )
            alertas = [a for a in alertas if (a['transaccion_id'], a['tipo']) not in existentes]

        self.stdout.write(f'\nTotal anomalías detectadas: {len(alertas)}')

        if dry_run:
            for a in alertas[:40]:
                self.stdout.write(
                    f"  [{a['severidad'].upper():8s}] {a['tipo']}"
                    f" — score={a['score']}"
                )
            if len(alertas) > 40:
                self.stdout.write(f'  ... y {len(alertas) - 40} más')
            self._resumen(alertas)
            return

        objs = [
            Alerta(
                transaccion_id=a['transaccion_id'],
                tipo=a['tipo'],
                descripcion=a['descripcion'],
                severidad=a['severidad'],
                score_anomalia=a['score'],
                estado='abierta',
            )
            for a in alertas
        ]
        Alerta.objects.bulk_create(objs, batch_size=500)
        self._resumen(alertas)

        # Post-proceso: Score por tienda
        self._actualizar_riesgo_tiendas()

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _resumen(self, alertas):
        por_sev = defaultdict(int)
        por_tipo = defaultdict(int)
        for a in alertas:
            por_sev[a['severidad']] += 1
            por_tipo[a['tipo']] += 1

        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(alertas)} alertas creadas'))
        self.stdout.write('  Por severidad:')
        for s in ['critica', 'alta', 'media', 'baja']:
            if por_sev[s]:
                self.stdout.write(f'    {s}: {por_sev[s]}')
        self.stdout.write('  Por regla:')
        for t, c in sorted(por_tipo.items(), key=lambda x: -x[1]):
            self.stdout.write(f'    {t}: {c}')

    def _param(self, regla, key, default=0):
        """Lee un parámetro numérico de la regla con fallback."""
        return float(regla.parametros.get(key, default))

    # ═════════════════════════════════════════════════════════════════════════
    # Motor zscore — Monto inusual (Z-score por almacén + tipo + categoría)
    # ═════════════════════════════════════════════════════════════════════════
    def _motor_zscore(self, qs, regla):
        from datetime import timedelta

        z_media = self._param(regla, 'zscore_media', 2.0)
        z_alta = self._param(regla, 'zscore_alta', 3.0)
        z_critica = self._param(regla, 'zscore_critica', 4.0)
        ventana_dias = int(self._param(regla, 'ventana_dias', 60))

        self.stdout.write(f'  [{regla.nombre}] Z-score >{z_media} por almacén+tipo+categoría (ventana {ventana_dias} días)...')

        base_qs = qs.filter(almacen__isnull=False, tipo__isnull=False).exclude(tipo='')

        # Filtrar ventana temporal para la base estadística
        if ventana_dias > 0:
            desde = timezone.now().date() - timedelta(days=ventana_dias)
            base_qs = base_qs.filter(fecha__gte=desde)

        # Cargar transacciones y agrupar por (almacen, tipo, categoría)
        txn_data = list(
            base_qs.values_list('id', 'almacen', 'tipo', 'descripcion', 'monto', 'cliente', 'fecha')
        )

        # Agrupar montos por (almacen, tipo, categoría)
        grupos = defaultdict(list)
        for tid, almacen, tipo, desc, monto, cliente, fecha in txn_data:
            cat = _categorizar_descripcion(desc)
            grupos[(almacen, tipo, cat)].append((tid, float(monto), cliente, fecha))

        alertas = []
        for (almacen, tipo_txn, cat), txns in grupos.items():
            n = len(txns)
            if n < 5:
                continue

            montos = [m for _, m, _, _ in txns]
            avg = sum(montos) / n
            std = (sum((m - avg) ** 2 for m in montos) / n) ** 0.5

            if std == 0 or avg == 0:
                continue

            cat_label = f' [{cat}]' if cat else ''

            for tid, m, cliente, fecha in txns:
                z = (m - avg) / std
                if z < z_media:
                    continue

                if z >= z_critica:
                    severidad = 'critica'
                    score = min(99, 85 + z * 2)
                elif z >= z_alta:
                    severidad = 'alta'
                    score = min(84, 70 + z * 5)
                else:
                    severidad = 'media'
                    score = min(69, 50 + z * 5)

                alertas.append({
                    'transaccion_id': tid,
                    'tipo': regla.nombre,
                    'descripcion': (
                        f'{tipo_txn}{cat_label} por ${m:,.0f} en almacén {almacen} ({fecha}). '
                        f'Z-score {z:.1f} vs {tipo_txn}{cat_label} '
                        f'(promedio ${avg:,.0f}, σ ${std:,.0f}, n={n}). '
                        f'Cliente: {cliente or "N/A"}.'
                    ),
                    'severidad': severidad,
                    'score': round(min(score, 99), 1),
                })

        self.stdout.write(f'    → {len(alertas)} anomalías')
        return alertas

    # ═════════════════════════════════════════════════════════════════════════
    # Motor conteo — Fraccionamiento de operaciones
    # ═════════════════════════════════════════════════════════════════════════
    def _motor_conteo(self, qs, regla):
        min_txns = int(self._param(regla, 'min_txns', 5))
        min_alta = int(self._param(regla, 'min_txns_alta', 10))
        min_critica = int(self._param(regla, 'min_txns_critica', 20))

        self.stdout.write(
            f'  [{regla.nombre}] ≥{min_txns} txns/cliente/día por tipo+categoría...'
        )

        txn_data = list(
            qs.exclude(numero_identificacion__in=CLIENTES_BULK)
            .exclude(numero_identificacion='')
            .values_list('id', 'numero_identificacion', 'cliente', 'fecha',
                         'tipo', 'descripcion', 'almacen', 'monto')
        )

        # Agrupar por (cliente_id, fecha, tipo, categoría, almacen)
        grupos = defaultdict(lambda: {'ids': [], 'montos': [], 'cliente': ''})
        for tid, num_id, cliente, fecha, tipo, desc, almacen, monto in txn_data:
            cat = _categorizar_descripcion(desc)
            key = (num_id, fecha, tipo, cat, almacen)
            grupos[key]['ids'].append(tid)
            grupos[key]['montos'].append(float(monto))
            grupos[key]['cliente'] = cliente or num_id

        alertas = []
        for (num_id, fecha, tipo, cat, almacen), data in grupos.items():
            n = len(data['ids'])
            if n < min_txns:
                continue

            total = sum(data['montos'])
            avg = total / n

            if n >= min_critica:
                severidad = 'critica'
                score = min(99, 85 + n)
            elif n >= min_alta:
                severidad = 'alta'
                score = min(84, 65 + n * 2)
            else:
                severidad = 'media'
                score = min(64, 45 + n * 3)

            cat_label = f' [{cat}]' if cat else ''

            alertas.append({
                'transaccion_id': data['ids'][0],
                'tipo': regla.nombre,
                'descripcion': (
                    f'{data["cliente"]} realizó '
                    f'{n} {tipo}{cat_label} en almacén {almacen} el {fecha}. '
                    f'Total: ${total:,.0f} '
                    f'(promedio ${avg:,.0f}/txn).'
                ),
                'severidad': severidad,
                'score': round(min(score, 99), 1),
            })

        self.stdout.write(f'    → {len(alertas)} anomalías')
        return alertas

    # ═════════════════════════════════════════════════════════════════════════
    # Motor ratio — Concentración de cajero
    # ═════════════════════════════════════════════════════════════════════════
    def _motor_ratio(self, qs, regla):
        ratio_media = self._param(regla, 'ratio_media', 2.0)
        ratio_alta = self._param(regla, 'ratio_alta', 3.0)

        self.stdout.write(
            f'  [{regla.nombre}] ratio >{ratio_media}x promedio por tipo+categoría...'
        )

        txn_data = list(
            qs.exclude(usuario_cajero='')
            .filter(tipo__isnull=False).exclude(tipo='')
            .values_list('id', 'usuario_cajero', 'fecha', 'tipo', 'descripcion', 'monto')
        )

        # Agrupar por (cajero, fecha, tipo, categoría)
        por_cajero = defaultdict(lambda: {'ids': [], 'total': 0})
        for tid, cajero, fecha, tipo, desc, monto in txn_data:
            cat = _categorizar_descripcion(desc)
            key = (cajero, fecha, tipo, cat)
            por_cajero[key]['ids'].append(tid)
            por_cajero[key]['total'] += float(monto or 0)

        # Promedio global por (tipo, categoría)
        avg_por_grupo = defaultdict(list)
        for (cajero, fecha, tipo, cat), data in por_cajero.items():
            avg_por_grupo[(tipo, cat)].append(len(data['ids']))

        avg_grupo = {}
        for key, counts in avg_por_grupo.items():
            avg_grupo[key] = sum(counts) / len(counts) if counts else 0

        alertas = []
        for (cajero, fecha, tipo, cat), data in por_cajero.items():
            n = len(data['ids'])
            avg = avg_grupo.get((tipo, cat), 0)
            if avg == 0:
                continue
            ratio = n / avg
            if ratio < ratio_media:
                continue

            severidad = 'alta' if ratio >= ratio_alta else 'media'
            score = min(99, 55 + ratio * 10)

            cat_label = f' [{cat}]' if cat else ''

            alertas.append({
                'transaccion_id': data['ids'][0],
                'tipo': regla.nombre,
                'descripcion': (
                    f'Cajero {cajero} procesó {n} '
                    f'{tipo}{cat_label} el {fecha} '
                    f'({ratio:.1f}x el promedio de '
                    f'{avg:.0f}/cajero/día para {tipo}{cat_label}). '
                    f'Monto: ${data["total"]:,.0f}.'
                ),
                'severidad': severidad,
                'score': round(min(score, 99), 1),
            })

        self.stdout.write(f'    → {len(alertas)} anomalías')
        return alertas

    # ═════════════════════════════════════════════════════════════════════════
    # Post-proceso — Actualizar riesgo por tienda (delegado a joz.riesgos)
    # ═════════════════════════════════════════════════════════════════════════
    def _actualizar_riesgo_tiendas(self):
        self.stdout.write('\n  [Riesgo por tienda] Actualizando...')
        actualizar_riesgo_tiendas(stdout=self.stdout, style=self.style)
