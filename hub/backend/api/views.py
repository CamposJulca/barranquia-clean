from rest_framework.decorators import api_view
from rest_framework.response import Response

SERVICES_DATA = [
    {
        'id': 'avantika',
        'name': 'Avantika',
        'description': 'Plataforma de gestión',
        'icon': '🤖',
        'color': '#6c63ff',
        'path': '/avantika/',
        'active': True,
    },
    {
        'id': 'joz',
        'name': 'Joz',
        'description': 'Sistema de análisis',
        'icon': '📊',
        'color': '#00d4ff',
        'path': '/joz/',
        'active': True,
    },
    {
        'id': 'serviparamo',
        'name': 'ServiPáramo',
        'description': 'Servicio de páramos',
        'icon': '🌿',
        'color': '#51cf66',
        'path': '/serviparamo/',
        'active': True,
    },
]


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'service': 'BarranquIA Hub'})


@api_view(['GET'])
def services_list(request):
    return Response(SERVICES_DATA)
