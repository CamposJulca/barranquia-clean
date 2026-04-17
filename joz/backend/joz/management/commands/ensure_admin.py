from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEFAULT_USERNAME = 'admin'
DEFAULT_PASSWORD = 'Joz@2025!'


class Command(BaseCommand):
    help = 'Crea el usuario admin de JOZ si no existe'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(username=DEFAULT_USERNAME)
        if created:
            user.email = 'admin@joz.com'
            user.is_staff = True
            user.is_superuser = True
        user.set_password(DEFAULT_PASSWORD)
        user.save()
        action = 'creado' if created else 'contraseña actualizada'
        self.stdout.write(f'[JOZ] Usuario "{DEFAULT_USERNAME}" {action}.')
