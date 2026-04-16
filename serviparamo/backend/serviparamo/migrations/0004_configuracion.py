from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('serviparamo', '0003_staging_tables'),
    ]

    operations = [
        migrations.CreateModel(
            name='Configuracion',
            fields=[
                ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ('nombre_empresa', models.CharField(default='Serviparamo Ingeniería', max_length=120)),
                ('correo_administrador', models.EmailField(default='admin@serviparamo.com', max_length=254)),
                ('zona_horaria', models.CharField(default='America/Bogota', max_length=64)),
                ('etl_auto_sync_activo', models.BooleanField(default=False)),
                ('etl_intervalo_horas', models.PositiveSmallIntegerField(default=24)),
                ('etl_timeout_minutos', models.PositiveSmallIntegerField(default=60)),
                ('etl_solo_faltantes_embeddings', models.BooleanField(default=True)),
                ('pref_notificaciones_email', models.BooleanField(default=True)),
                ('pref_alertas_duplicados', models.BooleanField(default=True)),
                ('pref_reporte_normalizacion_semanal', models.BooleanField(default=True)),
                ('pref_umbral_confianza', models.PositiveSmallIntegerField(default=85)),
                ('pref_umbral_similitud', models.PositiveSmallIntegerField(default=92)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'serviparamo_configuracion',
            },
        ),
    ]
