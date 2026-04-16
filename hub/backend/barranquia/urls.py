from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# Catch-all: serve React frontend for all non-API routes
urlpatterns += [
    # Evita interceptar assets estáticos/favicons como HTML.
    re_path(
        r'^(?!api/|admin/|static/|assets/|favicon\.ico$|favicon\.svg$).*$',
        TemplateView.as_view(template_name='index.html')
    ),
]
