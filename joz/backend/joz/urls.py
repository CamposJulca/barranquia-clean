from django.urls import path
from . import views

urlpatterns = [
    path('login/',               views.login,             name='joz-login'),
    path('config/deteccion/',   views.config_deteccion,   name='joz-config-deteccion'),
    path('stats/',               views.stats,             name='joz-stats'),
    path('anomalias-por-dia/',   views.anomalias_por_dia, name='joz-anomalias'),
    path('alertas/',             views.alertas,           name='joz-alertas'),
    path('alertas/<int:pk>/',    views.alertas,           name='joz-alerta-detail'),
    path('riesgos/',             views.riesgos,           name='joz-riesgos'),
    path('riesgos/<int:pk>/',    views.riesgo_detalle,    name='joz-riesgo-detalle'),
    path('historial/',           views.historial,         name='joz-historial'),
    path('etl/run/',             views.etl_run,           name='joz-etl-run'),
    path('etl/status/',          views.etl_status,        name='joz-etl-status'),
]
