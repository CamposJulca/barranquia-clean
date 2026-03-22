from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('services/', views.services_list, name='services-list'),
]
