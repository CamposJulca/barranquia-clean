from django.urls import path
from . import views

urlpatterns = [
    # SKUs
    path('skus/',                views.skus_list,       name='serviparamo-skus-list'),
    path('skus/<str:codigo>/',   views.sku_detail,      name='serviparamo-sku-detail'),

    # Catálogos
    path('categorias/',          views.categorias,      name='serviparamo-categorias'),
    path('familias/',            views.familias,        name='serviparamo-familias'),
    path('familias/erp/',        views.familias_raw,    name='serviparamo-familias-erp'),

    # Órdenes de compra
    path('ordenes/',             views.ordenes_list,    name='serviparamo-ordenes-list'),
    path('ordenes/<str:numfac>/', views.orden_detail,   name='serviparamo-orden-detail'),

    # Pedidos
    path('pedidos/',             views.pedidos_list,    name='serviparamo-pedidos-list'),
    path('pedidos/<int:pedido>/', views.pedido_detail,  name='serviparamo-pedido-detail'),

    # ETL
    path('etl/status/',          views.etl_status,      name='serviparamo-etl-status'),
    path('etl/run/',             views.etl_run,         name='serviparamo-etl-run'),

    # Normalización semántica (existente)
    path('buscar/',              views.buscar,          name='serviparamo-buscar'),
    path('duplicados/',          views.duplicados,      name='serviparamo-duplicados'),
    path('aprobar/',             views.aprobar,         name='serviparamo-aprobar'),
    path('fusionar-familias/',   views.fusionar_familias, name='serviparamo-fusionar'),
    path('stats/',               views.stats,           name='serviparamo-stats'),
]
