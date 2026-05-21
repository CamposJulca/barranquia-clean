from django.urls import path
from . import views

urlpatterns = [
    path('login/',               views.login,             name='joz-login'),
    path('change-password/',     views.change_password,   name='joz-change-password'),
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
    path('etl/schedule/',        views.etl_schedule,      name='joz-etl-schedule'),
    path('sql/execute/',         views.sql_execute,       name='joz-sql-execute'),
    path('sql/schema/',          views.sql_schema,        name='joz-sql-schema'),
    path('consulta/',            views.consulta_realtime, name='joz-consulta-realtime'),
    path('reglas/',              views.reglas_deteccion,      name='joz-reglas'),
    path('reglas/<int:pk>/',     views.regla_deteccion_detalle, name='joz-regla-detalle'),
    path('detectar/',            views.detectar_anomalias, name='joz-detectar-anomalias'),
    path('ia/status/',           views.ia_status,          name='joz-ia-status'),
    path('ia/entrenar/',         views.ia_entrenar,        name='joz-ia-entrenar'),
    path('ia/anomalias/',        views.ia_anomalias,       name='joz-ia-anomalias'),
]
