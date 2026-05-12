from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('joz', '0008_replace_horario_with_fraccionamiento'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReglaDeteccion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(help_text='Nombre visible de la regla', max_length=200)),
                ('tipo_motor', models.CharField(choices=[('zscore', 'Z-Score (desviación estadística)'), ('conteo', 'Conteo (agrupación y umbral)'), ('ratio', 'Ratio (proporción vs promedio)')], help_text='Motor de evaluación que usa esta regla', max_length=20)),
                ('habilitada', models.BooleanField(default=True)),
                ('orden', models.IntegerField(default=0, help_text='Orden de visualización')),
                ('descripcion_simple', models.TextField(blank=True, default='', help_text='Explicación en lenguaje sencillo')),
                ('descripcion_tecnica', models.TextField(blank=True, default='', help_text='Explicación técnica del cálculo')),
                ('formula', models.CharField(blank=True, default='', help_text='Fórmula matemática (ej: Z = (Monto - μ) / σ)', max_length=300)),
                ('variables', models.JSONField(blank=True, default=list, help_text='Lista de {symbol, meaning} para la fórmula')),
                ('parametros', models.JSONField(default=dict, help_text='Umbrales y config del motor. Ej: {"zscore_media":2,"zscore_alta":3}')),
                ('severidad_reglas', models.JSONField(blank=True, default=list, help_text='Lista de {level, condition, color}')),
                ('icono', models.CharField(blank=True, default='Activity', help_text='Nombre del icono Lucide', max_length=50)),
                ('color', models.CharField(blank=True, default='#f59e0b', max_length=20)),
                ('es_sistema', models.BooleanField(default=False, help_text='Regla del sistema (no eliminable por el usuario)')),
                ('creada_en', models.DateTimeField(auto_now_add=True)),
                ('actualizada_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'joz_reglas_deteccion',
                'ordering': ['orden', 'id'],
            },
        ),
    ]
