from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('joz', '0010_seed_reglas_base'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ConfigDeteccion',
        ),
    ]
