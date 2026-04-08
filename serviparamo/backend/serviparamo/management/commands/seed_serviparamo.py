"""
Seed ServiPáramo — carga datos de demostración representativos del ERP.

Cubre las mismas tablas que el ETL real:
  CatalogoSKU, RawCategoria, RawFamilia,
  RawOrdenEncabezado, RawOrdenDetalle,
  RawPedidoEncabezado, RawPedidoDetalle,
  RawPresupuestoDetalle, RawPresupuestoResumen, RawKardex

Uso:
    python manage.py seed_serviparamo
    python manage.py seed_serviparamo --clear
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date
from django.utils.dateparse import parse_date

from serviparamo.models import (
    CatalogoSKU, RawCategoria, RawFamilia,
    RawOrdenEncabezado, RawOrdenDetalle,
    RawPedidoEncabezado, RawPedidoDetalle,
    RawPresupuestoDetalle, RawPresupuestoResumen,
    RawKardex, ETLLog,
)
from django.utils import timezone


CATEGORIAS = [
    {"categoria_id": "ELE", "nombre": "Electrónica"},
    {"categoria_id": "HER", "nombre": "Herramientas"},
    {"categoria_id": "INS", "nombre": "Insumos"},
    {"categoria_id": "MAQ", "nombre": "Maquinaria"},
    {"categoria_id": "OFI", "nombre": "Oficina"},
    {"categoria_id": "SEG", "nombre": "Seguridad Industrial"},
    {"categoria_id": "TRA", "nombre": "Transporte"},
    {"categoria_id": "LIM", "nombre": "Limpieza"},
]

FAMILIAS = [
    {"familia_id": "CAB", "nombre": "Cableado"},
    {"familia_id": "COM", "nombre": "Computadores"},
    {"familia_id": "CON", "nombre": "Conectores"},
    {"familia_id": "EQP", "nombre": "Equipos de Medición"},
    {"familia_id": "FIL", "nombre": "Filtros"},
    {"familia_id": "GAS", "nombre": "Gaseosos y Lubricantes"},
    {"familia_id": "IMP", "nombre": "Impresión"},
    {"familia_id": "LAM", "nombre": "Lámparas y Luminarias"},
    {"familia_id": "LUB", "nombre": "Lubricantes"},
    {"familia_id": "MOT", "nombre": "Motores"},
    {"familia_id": "POM", "nombre": "Bombas y Compresores"},
    {"familia_id": "RAD", "nombre": "Radio Frecuencia"},
    {"familia_id": "RED", "nombre": "Redes"},
    {"familia_id": "ROD", "nombre": "Rodamientos"},
    {"familia_id": "TOR", "nombre": "Tornillería"},
    {"familia_id": "VAL", "nombre": "Válvulas"},
]

SKUS = [
    {"codigo":"SKU-001","familia":"COM","categoria":"ELE","nombre":"COMPUTADOR PORTATIL DELL INSPIRON 15","nombre1":"LAPTOP DELL I15","unidad":"UND"},
    {"codigo":"SKU-002","familia":"COM","categoria":"ELE","nombre":"MONITOR LCD 24 PULGADAS SAMSUNG","nombre1":"MONITOR 24 SAMSUNG","unidad":"UND"},
    {"codigo":"SKU-003","familia":"IMP","categoria":"OFI","nombre":"IMPRESORA LASER HP LASERJET PRO M404","nombre1":"HP LASERJET M404","unidad":"UND"},
    {"codigo":"SKU-004","familia":"CAB","categoria":"ELE","nombre":"CABLE UTP CAT6 METRO","nombre1":"CAT6 METRO","unidad":"MTS"},
    {"codigo":"SKU-005","familia":"RED","categoria":"ELE","nombre":"SWITCH CISCO 24 PUERTOS GIGABIT","nombre1":"SWITCH CISCO 24P","unidad":"UND"},
    {"codigo":"SKU-006","familia":"ROD","categoria":"HER","nombre":"RODAMIENTO SKF 6205 2Z","nombre1":"RODAMIENTO 6205 2Z","unidad":"UND"},
    {"codigo":"SKU-007","familia":"TOR","categoria":"HER","nombre":"TORNILLO HEXAGONAL 1/2 X 2 GRADO 8","nombre1":"TORNILLO HEX 1/2X2","unidad":"UND"},
    {"codigo":"SKU-008","familia":"LUB","categoria":"INS","nombre":"ACEITE MOBIL DTE 24 GALON","nombre1":"MOBIL DTE24 GAL","unidad":"GAL"},
    {"codigo":"SKU-009","familia":"FIL","categoria":"INS","nombre":"FILTRO DE AIRE DONALDSON P181052","nombre1":"FILTRO AIRE P181052","unidad":"UND"},
    {"codigo":"SKU-010","familia":"MOT","categoria":"MAQ","nombre":"MOTOR ELECTRICO WEG 5HP 1800RPM 220V","nombre1":"MOTOR WEG 5HP","unidad":"UND"},
    {"codigo":"SKU-011","familia":"POM","categoria":"MAQ","nombre":"BOMBA CENTRIFUGA GRUNDFOS CM5-4","nombre1":"BOMBA GRUNDFOS CM5","unidad":"UND"},
    {"codigo":"SKU-012","familia":"LAM","categoria":"ELE","nombre":"LAMPARA LED INDUSTRIAL 100W","nombre1":"LED INDUSTRIAL 100W","unidad":"UND"},
    {"codigo":"SKU-013","familia":"VAL","categoria":"MAQ","nombre":"VALVULA DE BOLA 3/4 ACERO INOXIDABLE","nombre1":"VALVULA BOLA 3/4 AC","unidad":"UND"},
    {"codigo":"SKU-014","familia":"GAS","categoria":"INS","nombre":"GRASA MOBILUX EP2 KILO","nombre1":"GRASA MOBILUX EP2","unidad":"KG"},
    {"codigo":"SKU-015","familia":"EQP","categoria":"HER","nombre":"MULTIMETRO DIGITAL FLUKE 87V","nombre1":"FLUKE 87V","unidad":"UND"},
    {"codigo":"SKU-016","familia":"RAD","categoria":"SEG","nombre":"RADIO MOTOROLA DP4400E VHF","nombre1":"MOTOROLA DP4400E","unidad":"UND"},
    {"codigo":"SKU-017","familia":"COM","categoria":"ELE","nombre":"TABLET SAMSUNG GALAXY TAB A8","nombre1":"SAMSUNG TAB A8","unidad":"UND"},
    {"codigo":"SKU-018","familia":"LIM","categoria":"LIM","nombre":"DETERGENTE INDUSTRIAL KILOS","nombre1":"DETERGENTE IND KG","unidad":"KG"},
    {"codigo":"SKU-019","familia":"TOR","categoria":"HER","nombre":"TUERCA HEXAGONAL 1/2 GALVANIZADA","nombre1":"TUERCA HEX 1/2 GALV","unidad":"UND"},
    {"codigo":"SKU-020","familia":"CAB","categoria":"ELE","nombre":"CABLE THHN 12 AWG METRO VERDE","nombre1":"CABLE THHN 12 VERDE","unidad":"MTS"},
    {"codigo":"SKU-021","familia":"ROD","categoria":"HER","nombre":"RODAMIENTO FAG 6305 2RSR","nombre1":"RODAMIENTO FAG 6305","unidad":"UND"},
    {"codigo":"SKU-022","familia":"FIL","categoria":"INS","nombre":"FILTRO DE COMBUSTIBLE FLEETGUARD FF5052","nombre1":"FILTRO COMB FF5052","unidad":"UND"},
    {"codigo":"SKU-023","familia":"MOT","categoria":"MAQ","nombre":"VARIADOR DE FRECUENCIA ABB ACS310 7.5KW","nombre1":"VARIADOR ABB ACS310","unidad":"UND"},
    {"codigo":"SKU-024","familia":"POM","categoria":"MAQ","nombre":"COMPRESOR DE AIRE ATLAS COPCO GA11","nombre1":"COMPRESOR ATLAS GA11","unidad":"UND"},
    {"codigo":"SKU-025","familia":"IMP","categoria":"OFI","nombre":"TONER HP CE505A ORIGINAL","nombre1":"TONER HP CE505A","unidad":"UND"},
    # Duplicado intencional para probar detección
    {"codigo":"SKU-020","familia":"CAB","categoria":"ELE","nombre":"CABLE THHN 12 AWG METRO VERDE DUPLICADO","nombre1":"CABLE THHN 12V DUP","unidad":"MTS"},
]

ORDENES_ENC = [
    {"numfac":"OC-2024-001","proveedor_id":"800123456","fecha_oc":"2024-10-01","estado":"CERRADA"},
    {"numfac":"OC-2024-002","proveedor_id":"900234567","fecha_oc":"2024-10-15","estado":"CERRADA"},
    {"numfac":"OC-2024-003","proveedor_id":"800123456","fecha_oc":"2024-11-01","estado":"CERRADA"},
    {"numfac":"OC-2025-001","proveedor_id":"810345678","fecha_oc":"2025-01-10","estado":"CERRADA"},
    {"numfac":"OC-2025-002","proveedor_id":"900234567","fecha_oc":"2025-02-20","estado":"CERRADA"},
    {"numfac":"OC-2025-003","proveedor_id":"800123456","fecha_oc":"2025-04-05","estado":"PENDIENTE"},
    {"numfac":"OC-2025-004","proveedor_id":"810345678","fecha_oc":"2025-05-12","estado":"APROBADA"},
    {"numfac":"OC-2025-005","proveedor_id":"820456789","fecha_oc":"2025-06-03","estado":"PENDIENTE"},
]

ORDENES_DET = [
    {"numfac":"OC-2024-001","codigo_item":"SKU-006","descripcion":"RODAMIENTO SKF 6205 2Z","cantidad":50,"precio_unitario":18500},
    {"numfac":"OC-2024-001","codigo_item":"SKU-007","descripcion":"TORNILLO HEXAGONAL 1/2 X 2 GRADO 8","cantidad":500,"precio_unitario":350},
    {"numfac":"OC-2024-001","codigo_item":"SKU-009","descripcion":"FILTRO DE AIRE DONALDSON P181052","cantidad":10,"precio_unitario":95000},
    {"numfac":"OC-2024-002","codigo_item":"SKU-001","descripcion":"COMPUTADOR PORTATIL DELL INSPIRON 15","cantidad":3,"precio_unitario":3500000},
    {"numfac":"OC-2024-002","codigo_item":"SKU-002","descripcion":"MONITOR LCD 24 PULGADAS SAMSUNG","cantidad":5,"precio_unitario":780000},
    {"numfac":"OC-2024-003","codigo_item":"SKU-008","descripcion":"ACEITE MOBIL DTE 24 GALON","cantidad":20,"precio_unitario":185000},
    {"numfac":"OC-2024-003","codigo_item":"SKU-014","descripcion":"GRASA MOBILUX EP2 KILO","cantidad":30,"precio_unitario":45000},
    {"numfac":"OC-2025-001","codigo_item":"SKU-010","descripcion":"MOTOR ELECTRICO WEG 5HP 1800RPM 220V","cantidad":2,"precio_unitario":1850000},
    {"numfac":"OC-2025-001","codigo_item":"SKU-013","descripcion":"VALVULA DE BOLA 3/4 ACERO INOXIDABLE","cantidad":8,"precio_unitario":125000},
    {"numfac":"OC-2025-002","codigo_item":"SKU-015","descripcion":"MULTIMETRO DIGITAL FLUKE 87V","cantidad":2,"precio_unitario":850000},
    {"numfac":"OC-2025-003","codigo_item":"SKU-004","descripcion":"CABLE UTP CAT6 METRO","cantidad":500,"precio_unitario":2500},
    {"numfac":"OC-2025-003","codigo_item":"SKU-005","descripcion":"SWITCH CISCO 24 PUERTOS GIGABIT","cantidad":1,"precio_unitario":4500000},
    {"numfac":"OC-2025-004","codigo_item":"SKU-011","descripcion":"BOMBA CENTRIFUGA GRUNDFOS CM5-4","cantidad":1,"precio_unitario":6500000},
    {"numfac":"OC-2025-005","codigo_item":"SKU-022","descripcion":"FILTRO DE COMBUSTIBLE FLEETGUARD FF5052","cantidad":15,"precio_unitario":85000},
]

PEDIDOS_ENC = [
    {"pedido":1001,"solicitante":"MANTENIMIENTO","fecha_pedido":"2025-01-05","estado":"ATENDIDO"},
    {"pedido":1002,"solicitante":"SISTEMAS","fecha_pedido":"2025-02-12","estado":"ATENDIDO"},
    {"pedido":1003,"solicitante":"OPERACIONES","fecha_pedido":"2025-03-20","estado":"ATENDIDO"},
    {"pedido":1004,"solicitante":"MANTENIMIENTO","fecha_pedido":"2025-04-08","estado":"PENDIENTE"},
    {"pedido":1005,"solicitante":"LOGISTICA","fecha_pedido":"2025-05-15","estado":"EN PROCESO"},
    {"pedido":1006,"solicitante":"SISTEMAS","fecha_pedido":"2025-06-01","estado":"PENDIENTE"},
]

PEDIDOS_DET = [
    {"pedido":1001,"codigo_item":"SKU-006","descripcion":"RODAMIENTO SKF 6205 2Z","cantidad":10},
    {"pedido":1001,"codigo_item":"SKU-008","descripcion":"ACEITE MOBIL DTE 24 GALON","cantidad":5},
    {"pedido":1002,"codigo_item":"SKU-025","descripcion":"TONER HP CE505A ORIGINAL","cantidad":4},
    {"pedido":1002,"codigo_item":"SKU-003","descripcion":"IMPRESORA LASER HP LASERJET PRO M404","cantidad":1},
    {"pedido":1003,"codigo_item":"SKU-009","descripcion":"FILTRO DE AIRE DONALDSON P181052","cantidad":3},
    {"pedido":1003,"codigo_item":"SKU-022","descripcion":"FILTRO DE COMBUSTIBLE FLEETGUARD FF5052","cantidad":5},
    {"pedido":1004,"codigo_item":"SKU-021","descripcion":"RODAMIENTO FAG 6305 2RSR","cantidad":8},
    {"pedido":1005,"codigo_item":"SKU-016","descripcion":"RADIO MOTOROLA DP4400E VHF","cantidad":2},
    {"pedido":1006,"codigo_item":"SKU-012","descripcion":"LAMPARA LED INDUSTRIAL 100W","cantidad":20},
]

PRESUPUESTO_DET = [
    {"pedido":1001,"codigo_item":"SKU-006","descripcion":"RODAMIENTO SKF 6205 2Z","cantidad":10,"precio":18500},
    {"pedido":1001,"codigo_item":"SKU-008","descripcion":"ACEITE MOBIL DTE 24 GALON","cantidad":5,"precio":185000},
    {"pedido":1002,"codigo_item":"SKU-025","descripcion":"TONER HP CE505A ORIGINAL","cantidad":4,"precio":85000},
    {"pedido":1002,"codigo_item":"SKU-003","descripcion":"IMPRESORA LASER HP","cantidad":1,"precio":1200000},
    {"pedido":1003,"codigo_item":"SKU-009","descripcion":"FILTRO AIRE DONALDSON","cantidad":3,"precio":95000},
    {"pedido":1004,"codigo_item":"SKU-021","descripcion":"RODAMIENTO FAG 6305","cantidad":8,"precio":22000},
    {"pedido":1005,"codigo_item":"SKU-016","descripcion":"RADIO MOTOROLA DP4400E","cantidad":2,"precio":1450000},
    {"pedido":1006,"codigo_item":"SKU-012","descripcion":"LAMPARA LED 100W","cantidad":20,"precio":75000},
]

PRESUPUESTO_RES = [
    {"pedido":1001,"familia":"Rodamientos","total":1017500},
    {"pedido":1002,"familia":"Impresion","total":1540000},
    {"pedido":1003,"familia":"Filtros","total":285000},
    {"pedido":1004,"familia":"Rodamientos","total":176000},
    {"pedido":1005,"familia":"Radio Frecuencia","total":2900000},
    {"pedido":1006,"familia":"Lamparas y Luminarias","total":1500000},
]

KARDEX = [
    {"numfac":"OC-2024-001","nomsis":"COMPRA","codigo_item":"SKU-006","cantidad":50,"fecha_mov":"2024-10-05"},
    {"numfac":"OC-2024-001","nomsis":"COMPRA","codigo_item":"SKU-007","cantidad":500,"fecha_mov":"2024-10-05"},
    {"numfac":"OC-2024-001","nomsis":"COMPRA","codigo_item":"SKU-009","cantidad":10,"fecha_mov":"2024-10-05"},
    {"numfac":"SAL-2024-001","nomsis":"SALIDA","codigo_item":"SKU-006","cantidad":-10,"fecha_mov":"2024-10-20"},
    {"numfac":"SAL-2024-002","nomsis":"SALIDA","codigo_item":"SKU-008","cantidad":-5,"fecha_mov":"2024-11-10"},
    {"numfac":"OC-2024-002","nomsis":"COMPRA","codigo_item":"SKU-001","cantidad":3,"fecha_mov":"2024-10-18"},
    {"numfac":"OC-2024-002","nomsis":"COMPRA","codigo_item":"SKU-002","cantidad":5,"fecha_mov":"2024-10-18"},
    {"numfac":"SAL-2024-003","nomsis":"SALIDA","codigo_item":"SKU-001","cantidad":-1,"fecha_mov":"2024-11-05"},
    {"numfac":"OC-2024-003","nomsis":"COMPRA","codigo_item":"SKU-008","cantidad":20,"fecha_mov":"2024-11-08"},
    {"numfac":"OC-2024-003","nomsis":"COMPRA","codigo_item":"SKU-014","cantidad":30,"fecha_mov":"2024-11-08"},
    {"numfac":"SAL-2025-001","nomsis":"SALIDA","codigo_item":"SKU-009","cantidad":-3,"fecha_mov":"2025-01-15"},
    {"numfac":"OC-2025-001","nomsis":"COMPRA","codigo_item":"SKU-010","cantidad":2,"fecha_mov":"2025-01-20"},
    {"numfac":"OC-2025-001","nomsis":"COMPRA","codigo_item":"SKU-013","cantidad":8,"fecha_mov":"2025-01-20"},
    {"numfac":"SAL-2025-002","nomsis":"SALIDA","codigo_item":"SKU-014","cantidad":-10,"fecha_mov":"2025-02-05"},
    {"numfac":"SAL-2025-003","nomsis":"SALIDA","codigo_item":"SKU-006","cantidad":-20,"fecha_mov":"2025-03-01"},
    {"numfac":"OC-2025-002","nomsis":"COMPRA","codigo_item":"SKU-015","cantidad":2,"fecha_mov":"2025-03-05"},
    {"numfac":"SAL-2025-004","nomsis":"SALIDA","codigo_item":"SKU-007","cantidad":-200,"fecha_mov":"2025-04-10"},
    {"numfac":"SAL-2025-005","nomsis":"SALIDA","codigo_item":"SKU-013","cantidad":-3,"fecha_mov":"2025-05-20"},
    {"numfac":"DEV-2025-001","nomsis":"DEVOLUCION","codigo_item":"SKU-009","cantidad":2,"fecha_mov":"2025-05-25"},
    {"numfac":"SAL-2025-006","nomsis":"SALIDA","codigo_item":"SKU-025","cantidad":-4,"fecha_mov":"2025-06-10"},
]


class Command(BaseCommand):
    help = 'Carga datos de demostración para ServiPáramo (equivalente al ETL del ERP)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Elimina todos los datos antes de insertar',
        )

    def handle(self, *args, **options):
        inicio = timezone.now()

        if options['clear']:
            for Model in [CatalogoSKU, RawCategoria, RawFamilia,
                          RawOrdenEncabezado, RawOrdenDetalle,
                          RawPedidoEncabezado, RawPedidoDetalle,
                          RawPresupuestoDetalle, RawPresupuestoResumen, RawKardex]:
                n = Model.objects.all().delete()[0]
                self.stdout.write(f'  → {Model.__name__}: {n} registros eliminados')

        with transaction.atomic():
            self._seed(RawCategoria, [
                RawCategoria(categoria_id=r['categoria_id'], nombre=r['nombre'], raw_data=r)
                for r in CATEGORIAS
            ])
            self._seed(RawFamilia, [
                RawFamilia(familia_id=r['familia_id'], nombre=r['nombre'], raw_data=r)
                for r in FAMILIAS
            ])
            skus = []
            from collections import Counter
            codigos = [r['codigo'] for r in SKUS]
            conteo = Counter(codigos)
            grupo_map = {}
            g = 1
            for r in SKUS:
                es_dup = conteo[r['codigo']] > 1
                if es_dup and r['codigo'] not in grupo_map:
                    grupo_map[r['codigo']] = g
                    g += 1
                skus.append(CatalogoSKU(
                    codigo=r['codigo'],
                    familia=r['familia'],
                    familia_normalizada=r['familia'].title(),
                    categoria=r['categoria'],
                    nombre=r['nombre'],
                    nombre1=r['nombre1'],
                    unidad=r['unidad'],
                    es_duplicado=es_dup,
                    grupo_duplicado=grupo_map.get(r['codigo']),
                ))
            self._seed(CatalogoSKU, skus)

            self._seed(RawOrdenEncabezado, [
                RawOrdenEncabezado(
                    numfac=r['numfac'], proveedor_id=r['proveedor_id'],
                    fecha_oc=parse_date(r['fecha_oc']), estado=r['estado'],
                    raw_data=r,
                ) for r in ORDENES_ENC
            ])
            self._seed(RawOrdenDetalle, [
                RawOrdenDetalle(
                    numfac=r['numfac'], codigo_item=r['codigo_item'],
                    descripcion=r['descripcion'],
                    cantidad=Decimal(str(r['cantidad'])),
                    precio_unitario=Decimal(str(r['precio_unitario'])),
                    raw_data=r,
                ) for r in ORDENES_DET
            ])
            self._seed(RawPedidoEncabezado, [
                RawPedidoEncabezado(
                    pedido=r['pedido'], solicitante=r['solicitante'],
                    fecha_pedido=parse_date(r['fecha_pedido']), estado=r['estado'],
                    raw_data=r,
                ) for r in PEDIDOS_ENC
            ])
            self._seed(RawPedidoDetalle, [
                RawPedidoDetalle(
                    pedido=r['pedido'], codigo_item=r['codigo_item'],
                    descripcion=r['descripcion'],
                    cantidad=Decimal(str(r['cantidad'])),
                    raw_data=r,
                ) for r in PEDIDOS_DET
            ])
            self._seed(RawPresupuestoDetalle, [
                RawPresupuestoDetalle(
                    pedido=r['pedido'], codigo_item=r['codigo_item'],
                    descripcion=r['descripcion'],
                    cantidad=Decimal(str(r['cantidad'])),
                    precio=Decimal(str(r['precio'])),
                    raw_data=r,
                ) for r in PRESUPUESTO_DET
            ])
            self._seed(RawPresupuestoResumen, [
                RawPresupuestoResumen(
                    pedido=r['pedido'], familia=r['familia'],
                    total=Decimal(str(r['total'])),
                    raw_data=r,
                ) for r in PRESUPUESTO_RES
            ])
            self._seed(RawKardex, [
                RawKardex(
                    numfac=r['numfac'], nomsis=r['nomsis'],
                    codigo_item=r['codigo_item'],
                    cantidad=Decimal(str(r['cantidad'])),
                    fecha_mov=parse_date(r['fecha_mov']),
                    raw_data=r,
                ) for r in KARDEX
            ])

        ETLLog.objects.create(
            tabla_destino='SEED_DEMO',
            filas_insertadas=len(SKUS) + len(CATEGORIAS) + len(FAMILIAS),
            filas_error=0,
            iniciado_en=inicio,
            finalizado_en=timezone.now(),
            mensaje='Seed de demostración cargado correctamente',
        )

        self.stdout.write(self.style.SUCCESS('✓ Seed ServiPáramo completo'))

    def _seed(self, Model, objs):
        Model.objects.bulk_create(objs, ignore_conflicts=True)
        self.stdout.write(f'  → {Model.__name__}: {len(objs)} registros')
