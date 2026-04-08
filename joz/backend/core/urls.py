from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/joz/', include('joz.urls')),

    # Documentación OpenAPI
    path('api/joz/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/joz/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/joz/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
