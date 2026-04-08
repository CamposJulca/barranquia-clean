"""
Seed Joz — carga las transacciones reales extraídas del PDF de SuperEfectivo
(Documento_SitioWebApiIA.pdf, respuesta del 2026-03-27, 244 registros).

Uso:
    python manage.py seed_joz
    python manage.py seed_joz --clear   # borra antes de insertar
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date

from joz.models import Transaccion, ETLLog
from django.utils import timezone


REGISTROS = [
    {"id":25304,"almorigen":2,"nrodocumento":"EM405972","numeroidentificacion":"83107","nombre":"LUIS CARLOS GUTIERREZ MEJIA","descripcion":"Empeño de: ANILLO PIEDRA: 10KT/; EST:(RYDO); ARG. MAT; CANT:2; PESO:3; P:0.6; PESO:2.40; OBS:DUO MATRIMN RYD USADA SUCIA GOLP; Plazo: 6 Tasa: 10","valor":140,"entrada":0,"salida":140,"hora_min":8,"tipo":"Retiro","usuario":"KVALDES"},
    {"id":25305,"almorigen":2,"nrodocumento":"EM405966","numeroidentificacion":"8512901","nombre":"VIOLA CLEOTILDE CLAIR RAMOS","descripcion":"RETIRA POR VALOR DE $330.00 Doc ref#EM405966-Entrega:INMEDIATA","valor":30,"entrada":30,"salida":0,"hora_min":38,"tipo":"Aporte","usuario":"KVALDES"},
    {"id":25306,"almorigen":2,"nrodocumento":"EM405966","numeroidentificacion":"8512901","nombre":"VIOLA CLEOTILDE CLAIR RAMOS","descripcion":"RETIRA POR VALOR DE $330.00 Doc ref#EM405966-Entrega:INMEDIATA","valor":300,"entrada":300,"salida":0,"hora_min":38,"tipo":"Aporte","usuario":"KVALDES"},
    {"id":25307,"almorigen":12,"nrodocumento":"EM145971","numeroidentificacion":"88401520","nombre":"ROBERTO ARIAS","descripcion":"PAGA 2 MES(ES) DE INTERÉS POR, VALOR DE $8.00 PAZ Y SALVO HASTA 28/NOV./2025 Doc ref#EM145971","valor":8,"entrada":8,"salida":0,"hora_min":242,"tipo":"Aporte","usuario":"JSANTOS"},
    {"id":25308,"almorigen":6,"nrodocumento":"EM206700","numeroidentificacion":"8162305","nombre":"EDGAR AROSEMENA MOLINO","descripcion":"Empeño de: PULSERA: 10KT/; EST:(RYDO); OTROS; CANT:1; PESO:4.4; P:0; PESO:4.40; OBS:SUC RY DELGADA; Plazo: 5 Tasa: 10","valor":220,"entrada":0,"salida":220,"hora_min":263,"tipo":"Retiro","usuario":"AHIDALGO"},
    {"id":25309,"almorigen":2,"nrodocumento":"EM405973","numeroidentificacion":"8512512","nombre":"KATHIA JOVANKA FIELDS NEWBALL","descripcion":"Empeño de: LAPTOPS: DELL; DELL; WIN 10; PANT 15.6\"; NO APLICA; INTEL I7; 8-16GB; 1TB; Plazo: 2 Tasa: 15","valor":100,"entrada":0,"salida":100,"hora_min":353,"tipo":"Retiro","usuario":"KVALDES"},
    {"id":25310,"almorigen":10,"nrodocumento":"AE116181","numeroidentificacion":"999988691283","nombre":"JENIFER PERALTA","descripcion":"APERTURA DE CAJA ENTRADA 116181","valor":3918.99,"entrada":3918.99,"salida":0,"hora_min":376,"tipo":"Aporte","usuario":"JPERALTA"},
    {"id":25311,"almorigen":10,"nrodocumento":"RE63501","numeroidentificacion":"999988691283","nombre":"JENIFER PERALTA","descripcion":"APERTURA DE CAJA SALIDA 63501","valor":3918.99,"entrada":0,"salida":3918.99,"hora_min":376,"tipo":"Retiro","usuario":"ALMACEN10"},
    {"id":25312,"almorigen":12,"nrodocumento":"RE211195","numeroidentificacion":"99991753730","nombre":"JORGE LSANTOSABREGO","descripcion":"CIERRE DE CAJA SALIDA 211195","valor":3927.35,"entrada":0,"salida":3927.35,"hora_min":379,"tipo":"Retiro","usuario":"JSANTOS"},
    {"id":25313,"almorigen":12,"nrodocumento":"AE185599","numeroidentificacion":"99991753730","nombre":"JORGE LSANTOSABREGO","descripcion":"CIERRE DE CAJA ENTRADA 185599","valor":3927.35,"entrada":3927.35,"salida":0,"hora_min":379,"tipo":"Aporte","usuario":"ALMACEN12"},
    {"id":25314,"almorigen":2,"nrodocumento":"RE84336","numeroidentificacion":"9999897752","nombre":"KENNETH VALDES","descripcion":"CIERRE DE CAJA SALIDA 84336","valor":6143.81,"entrada":0,"salida":6143.81,"hora_min":382,"tipo":"Retiro","usuario":"KVALDES"},
    {"id":25315,"almorigen":2,"nrodocumento":"AE124948","numeroidentificacion":"9999897752","nombre":"KENNETH VALDES","descripcion":"CIERRE DE CAJA ENTRADA 124948","valor":6143.81,"entrada":6143.81,"salida":0,"hora_min":382,"tipo":"Aporte","usuario":"ALMACEN02"},
    {"id":25316,"almorigen":12,"nrodocumento":"AE185600","numeroidentificacion":"999994776779","nombre":"OSWAL IBARRA","descripcion":"APERTURA DE CAJA ENTRADA 185600","valor":3927.35,"entrada":3927.35,"salida":0,"hora_min":390,"tipo":"Aporte","usuario":"OIBARRA"},
    {"id":25317,"almorigen":12,"nrodocumento":"RE211196","numeroidentificacion":"999994776779","nombre":"OSWAL IBARRA","descripcion":"APERTURA DE CAJA SALIDA 211196","valor":3927.35,"entrada":0,"salida":3927.35,"hora_min":390,"tipo":"Retiro","usuario":"ALMACEN12"},
    {"id":25318,"almorigen":2,"nrodocumento":"AE124949","numeroidentificacion":"99998991307","nombre":"PAOLA MSAMUDIOM","descripcion":"APERTURA DE CAJA ENTRADA 124949","valor":6143.81,"entrada":6143.81,"salida":0,"hora_min":393,"tipo":"Aporte","usuario":"PSAMUDIO"},
    {"id":25319,"almorigen":2,"nrodocumento":"RE84337","numeroidentificacion":"99998991307","nombre":"PAOLA MSAMUDIOM","descripcion":"APERTURA DE CAJA SALIDA 84337","valor":6143.81,"entrada":0,"salida":6143.81,"hora_min":393,"tipo":"Retiro","usuario":"ALMACEN02"},
    {"id":25320,"almorigen":12,"nrodocumento":"EM183825","numeroidentificacion":"810552316","nombre":"NAYROBIS MICHELL CASTILLO DIAZ","descripcion":"Empeño de: CADENA: 10KT/; EST:(RYDO); OTROS; CANT:1; PESO:9; P:0; PESO:9.00; OBS:USD RYD SUC 3X1 BROC SOLDAD; Plazo: 5 Tasa: 10","valor":450,"entrada":0,"salida":450,"hora_min":397,"tipo":"Retiro","usuario":"OIBARRA"},
    {"id":25321,"almorigen":2,"nrodocumento":"EM405974","numeroidentificacion":"88241695","nombre":"NORELIZ VINEIKA PARKS ROMAN","descripcion":"Empeño de: DIJE PIEDRA : 10KT/; EST:(RYDO); OTROS; CANT:1; PESO:7.8; P:6.6; PESO:1.20; OBS:CN PDRA MLTCLOR USD RYD; Plazo: 6 Tasa: 10","valor":60,"entrada":0,"salida":60,"hora_min":411,"tipo":"Retiro","usuario":"PSAMUDIO"},
    {"id":25322,"almorigen":6,"nrodocumento":"RE150069","numeroidentificacion":"999988901149","nombre":"ANGELA HIDALGO","descripcion":"CIERRE DE CAJA SALIDA 150069","valor":6006.17,"entrada":0,"salida":6006.17,"hora_min":419,"tipo":"Retiro","usuario":"AHIDALGO"},
    {"id":25323,"almorigen":6,"nrodocumento":"AE205656","numeroidentificacion":"999988901149","nombre":"ANGELA HIDALGO","descripcion":"CIERRE DE CAJA ENTRADA 205656","valor":6006.17,"entrada":6006.17,"salida":0,"hora_min":419,"tipo":"Aporte","usuario":"ALMACEN06"},
    {"id":25324,"almorigen":2,"nrodocumento":"EM405124","numeroidentificacion":"810292049","nombre":"BRYAN JAMAL SANTANA JONES","descripcion":"RETIRA POR VALOR DE $60.50 Doc ref#EM405124-Entrega:INMEDIATA","valor":5.5,"entrada":5.5,"salida":0,"hora_min":420,"tipo":"Aporte","usuario":"PSAMUDIO"},
    {"id":25325,"almorigen":2,"nrodocumento":"EM405124","numeroidentificacion":"810292049","nombre":"BRYAN JAMAL SANTANA JONES","descripcion":"RETIRA POR VALOR DE $60.50 Doc ref#EM405124-Entrega:INMEDIATA","valor":55,"entrada":55,"salida":0,"hora_min":420,"tipo":"Aporte","usuario":"PSAMUDIO"},
    {"id":25326,"almorigen":6,"nrodocumento":"AE205657","numeroidentificacion":"9999989861983","nombre":"BEATRIZ VIQUEZCAMPOS","descripcion":"APERTURA DE CAJA ENTRADA 205657","valor":6006.17,"entrada":6006.17,"salida":0,"hora_min":426,"tipo":"Aporte","usuario":"BVIQUEZ"},
    {"id":25327,"almorigen":6,"nrodocumento":"RE150070","numeroidentificacion":"9999989861983","nombre":"BEATRIZ VIQUEZCAMPOS","descripcion":"APERTURA DE CAJA SALIDA 150070","valor":6006.17,"entrada":0,"salida":6006.17,"hora_min":426,"tipo":"Retiro","usuario":"ALMACEN06"},
    {"id":25328,"almorigen":6,"nrodocumento":"EM206701","numeroidentificacion":"8493440","nombre":"IRIS CHEYLA MORRIS","descripcion":"Empeño de: CADENA: 10KT/; EST:(RYDO); OTROS; CANT:1; PESO:1; P:0; PESO:1.00; OBS:SOLITO RAY SUCIA; Plazo: 5 Tasa: 10","valor":55,"entrada":0,"salida":55,"hora_min":429,"tipo":"Retiro","usuario":"BVIQUEZ"},
    {"id":25329,"almorigen":9,"nrodocumento":"AE179078","numeroidentificacion":"99996717848","nombre":"MARIBEL YCEDEÑOPOVEDA","descripcion":"APERTURA DE CAJA ENTRADA 179078","valor":2130.97,"entrada":2130.97,"salida":0,"hora_min":436,"tipo":"Aporte","usuario":"MCEDENO"},
    {"id":25330,"almorigen":9,"nrodocumento":"RE133529","numeroidentificacion":"99996717848","nombre":"MARIBEL YCEDEÑOPOVEDA","descripcion":"APERTURA DE CAJA SALIDA 133529","valor":2130.97,"entrada":0,"salida":2130.97,"hora_min":436,"tipo":"Retiro","usuario":"ALMACEN09"},
    {"id":25331,"almorigen":16,"nrodocumento":"AE193895","numeroidentificacion":"99998991636","nombre":"GISSELLE N.AVILAN","descripcion":"APERTURA DE CAJA ENTRADA 193895","valor":4819.49,"entrada":4819.49,"salida":0,"hora_min":436,"tipo":"Aporte","usuario":"GAVILA"},
    {"id":25332,"almorigen":16,"nrodocumento":"RE115710","numeroidentificacion":"99998991636","nombre":"GISSELLE N.AVILAN","descripcion":"APERTURA DE CAJA SALIDA 115710","valor":4819.49,"entrada":0,"salida":4819.49,"hora_min":436,"tipo":"Retiro","usuario":"ALMACEN16"},
]


class Command(BaseCommand):
    help = 'Carga los registros del PDF de SuperEfectivo (2026-03-27) en la BD local'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Elimina todas las transacciones antes de insertar',
        )

    def handle(self, *args, **options):
        if options['clear']:
            n = Transaccion.objects.all().delete()[0]
            self.stdout.write(f'  → {n} transacciones eliminadas')

        inicio = timezone.now()
        fecha = date(2026, 3, 27)

        ids_existentes = set(
            Transaccion.objects
            .filter(id_externo__isnull=False)
            .values_list('id_externo', flat=True)
        )

        nuevas = []
        omitidas = 0

        for r in REGISTROS:
            if r['id'] in ids_existentes:
                omitidas += 1
                continue
            nuevas.append(Transaccion(
                id_externo=r['id'],
                referencia=r['nrodocumento'],
                almacen=r['almorigen'],
                numero_identificacion=str(r['numeroidentificacion']),
                cliente=r['nombre'],
                tipo=r['tipo'],
                descripcion=r['descripcion'],
                monto=Decimal(str(r['valor'])),
                entrada=Decimal(str(r['entrada'])),
                salida=Decimal(str(r['salida'])),
                fecha=fecha,
                hora_minutos=r['hora_min'],
                usuario_cajero=r['usuario'],
                estado='seed',
                raw_data=r,
            ))

        with transaction.atomic():
            Transaccion.objects.bulk_create(nuevas, ignore_conflicts=True)

        ETLLog.objects.create(
            endpoint='/seed/pdf-superefectivo',
            fecha_consulta=fecha,
            almacen=0,
            filas_recibidas=len(REGISTROS),
            filas_insertadas=len(nuevas),
            filas_error=0,
            finalizado_en=timezone.now(),
            mensaje=f'Seed desde PDF: {len(nuevas)} insertadas, {omitidas} omitidas',
        )

        self.stdout.write(self.style.SUCCESS(
            f'✓ Seed Joz: {len(nuevas)} transacciones insertadas, {omitidas} omitidas'
        ))
