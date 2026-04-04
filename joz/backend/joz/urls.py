from django.urls import path
from . import views

urlpatterns = [
    path('stats/',               views.stats,             name='joz-stats'),
    path('anomalias-por-dia/',   views.anomalias_por_dia, name='joz-anomalias'),
    path('alertas/',             views.alertas,           name='joz-alertas'),
    path('alertas/<int:pk>/',    views.alertas,           name='joz-alerta-detail'),
    path('riesgos/',             views.riesgos,           name='joz-riesgos'),
    path('historial/',           views.historial,         name='joz-historial'),
]
