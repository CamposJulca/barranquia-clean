from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/serviparamo/', include('serviparamo.urls')),

    # Documentación OpenAPI
    path('api/serviparamo/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/serviparamo/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/serviparamo/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
