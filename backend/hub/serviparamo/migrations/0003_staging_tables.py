from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('serviparamo', '0002_campos_reales'),
    ]

    operations = [
        # Fix __str__ bug in CatalogoSKU (old reference to descrip1 field)
        # No schema change needed — just model-level fix

        # RawCategoria
        migrations.CreateModel(
            name='RawCategoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('categoria_id', models.CharField(blank=True, default='', max_length=100)),
                ('nombre', models.CharField(blank=True, default='', max_length=300)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_categorias'},
        ),

        # RawFamilia
        migrations.CreateModel(
            name='RawFamilia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('familia_id', models.CharField(blank=True, default='', max_length=100)),
                ('nombre', models.CharField(blank=True, default='', max_length=300)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_familias'},
        ),

        # RawOrdenEncabezado
        migrations.CreateModel(
            name='RawOrdenEncabezado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numfac', models.CharField(db_index=True, max_length=50)),
                ('proveedor_id', models.CharField(blank=True, default='', max_length=200)),
                ('fecha_oc', models.DateField(blank=True, null=True)),
                ('estado', models.CharField(blank=True, default='', max_length=100)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_ordenes_encabezado'},
        ),

        # RawOrdenDetalle
        migrations.CreateModel(
            name='RawOrdenDetalle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numfac', models.CharField(db_index=True, max_length=50)),
                ('codigo_item', models.CharField(blank=True, default='', max_length=100)),
                ('descripcion', models.CharField(blank=True, default='', max_length=500)),
                ('cantidad', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('precio_unitario', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_ordenes_detalle'},
        ),

        # RawPedidoEncabezado
        migrations.CreateModel(
            name='RawPedidoEncabezado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pedido', models.IntegerField(db_index=True)),
                ('solicitante', models.CharField(blank=True, default='', max_length=300)),
                ('fecha_pedido', models.DateField(blank=True, null=True)),
                ('estado', models.CharField(blank=True, default='', max_length=100)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_pedidos_encabezado'},
        ),

        # RawPedidoDetalle
        migrations.CreateModel(
            name='RawPedidoDetalle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pedido', models.IntegerField(db_index=True)),
                ('codigo_item', models.CharField(blank=True, default='', max_length=100)),
                ('descripcion', models.CharField(blank=True, default='', max_length=500)),
                ('cantidad', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_pedidos_detalle'},
        ),

        # RawPresupuestoDetalle
        migrations.CreateModel(
            name='RawPresupuestoDetalle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pedido', models.IntegerField(db_index=True)),
                ('codigo_item', models.CharField(blank=True, default='', max_length=100)),
                ('descripcion', models.CharField(blank=True, default='', max_length=500)),
                ('cantidad', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('precio', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_presupuesto_detalle'},
        ),

        # RawPresupuestoResumen
        migrations.CreateModel(
            name='RawPresupuestoResumen',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pedido', models.IntegerField(db_index=True)),
                ('familia', models.CharField(blank=True, default='', max_length=300)),
                ('total', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_presupuesto_resumen'},
        ),

        # RawKardex
        migrations.CreateModel(
            name='RawKardex',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numfac', models.CharField(db_index=True, max_length=50)),
                ('nomsis', models.CharField(blank=True, default='', max_length=50)),
                ('codigo_item', models.CharField(blank=True, default='', max_length=100)),
                ('cantidad', models.DecimalField(blank=True, decimal_places=4, max_digits=18, null=True)),
                ('fecha_mov', models.DateField(blank=True, null=True)),
                ('raw_data', models.JSONField(default=dict)),
                ('cargado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'serviparamo_raw_kardex'},
        ),

        # ETLLog
        migrations.CreateModel(
            name='ETLLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tabla_destino', models.CharField(max_length=100)),
                ('filas_insertadas', models.IntegerField(default=0)),
                ('filas_error', models.IntegerField(default=0)),
                ('iniciado_en', models.DateTimeField()),
                ('finalizado_en', models.DateTimeField(blank=True, null=True)),
                ('mensaje', models.TextField(blank=True, default='')),
            ],
            options={
                'db_table': 'serviparamo_etl_log',
                'ordering': ['-iniciado_en'],
            },
        ),
    ]
