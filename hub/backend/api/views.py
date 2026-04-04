from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status

SERVICES_DATA = [
    {
        'id': 'avantika',
        'name': 'Avantika',
        'description': 'Plataforma de gestión',
        'icon': '🤖',
        'color': '#6c63ff',
        'path': '/avantika',
        'active': True,
    },
    {
        'id': 'joz',
        'name': 'Joz',
        'description': 'Sistema de análisis',
        'icon': '📊',
        'color': '#00d4ff',
        'path': '/joz',
        'active': True,
    },
    {
        'id': 'powerbi',
        'name': 'Power BI',
        'description': 'Reportes y dashboards',
        'icon': '📈',
        'color': '#ff6b6b',
        'path': '/powerbi',
        'active': True,
    },
    {
        'id': 'serviparamo',
        'name': 'ServiPáramo',
        'description': 'Servicio de páramos',
        'icon': '🌿',
        'color': '#51cf66',
        'path': '/serviparamo',
        'active': True,
    },
]


@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    request.user.auth_token.delete()
    return Response({'status': 'ok'})


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'service': 'BarranquIA Hub'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def services_list(request):
    return Response(SERVICES_DATA)
