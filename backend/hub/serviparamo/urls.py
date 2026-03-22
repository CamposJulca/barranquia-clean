from django.urls import path
from . import views

urlpatterns = [
    path('familias/',         views.familias,         name='serviparamo-familias'),
    path('buscar/',           views.buscar,           name='serviparamo-buscar'),
    path('duplicados/',       views.duplicados,       name='serviparamo-duplicados'),
    path('aprobar/',          views.aprobar,          name='serviparamo-aprobar'),
    path('fusionar-familias/', views.fusionar_familias, name='serviparamo-fusionar'),
    path('stats/',            views.stats,            name='serviparamo-stats'),
]
