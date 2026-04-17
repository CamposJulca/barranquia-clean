from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEFAULT_USERNAME = 'admin@boost.net.co'
DEFAULT_PASSWORD = 'Barranquia@2025!'


class Command(BaseCommand):
    help = 'Crea el usuario admin del Hub si no existe'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(username=DEFAULT_USERNAME)
        if created:
            user.email = DEFAULT_USERNAME
            user.is_staff = True
            user.is_superuser = True
        user.set_password(DEFAULT_PASSWORD)
        user.save()
        action = 'creado' if created else 'contraseña actualizada'
        self.stdout.write(f'[Hub] Usuario "{DEFAULT_USERNAME}" {action}.')
