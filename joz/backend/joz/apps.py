import os

from django.apps import AppConfig


class JozConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'joz'

    def ready(self):
        # Evitar doble inicio en autoreload de Django (RUN_MAIN='true' en el hijo)
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            try:
                from joz.scheduler import iniciar_scheduler
                iniciar_scheduler()
            except Exception:
                pass
