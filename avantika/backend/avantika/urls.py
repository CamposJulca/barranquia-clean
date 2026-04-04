from django.urls import path
from . import views

urlpatterns = [
    path('stats/',                   views.stats,                  name='avantika-stats'),
    path('clasificacion-abc/',       views.clasificacion_abc,      name='avantika-abc'),
    path('predecir-demanda/',        views.predecir_demanda,       name='avantika-forecast'),
    path('sugerencias-reposicion/',  views.sugerencias_reposicion, name='avantika-sugerencias'),
    path('parametros/',              views.set_parametros,         name='avantika-parametros'),
    path('log-feedback/',            views.log_feedback,           name='avantika-feedback'),
]
