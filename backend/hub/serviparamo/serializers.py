from rest_framework import serializers
from .models import (
    CatalogoSKU,
    RawCategoria, RawFamilia,
    RawOrdenEncabezado, RawOrdenDetalle,
    RawPedidoEncabezado, RawPedidoDetalle,
    RawPresupuestoDetalle, RawPresupuestoResumen,
    RawKardex, ETLLog,
)


class SKUSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogoSKU
        fields = [
            'id', 'codigo', 'familia', 'familia_normalizada', 'categoria',
            'nombre', 'nombre1', 'unidad', 'cluster_id',
            'es_duplicado', 'grupo_duplicado', 'aprobado',
        ]


class SKUResumenSerializer(serializers.ModelSerializer):
    """Versión compacta para listas grandes."""
    class Meta:
        model = CatalogoSKU
        fields = ['id', 'codigo', 'familia_normalizada', 'nombre', 'es_duplicado', 'aprobado']


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawCategoria
        fields = ['id', 'categoria_id', 'nombre', 'cargado_en']


class FamiliaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawFamilia
        fields = ['id', 'familia_id', 'nombre', 'cargado_en']


class OrdenEncabezadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawOrdenEncabezado
        fields = ['id', 'numfac', 'proveedor_id', 'fecha_oc', 'estado', 'cargado_en']


class OrdenDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawOrdenDetalle
        fields = ['id', 'numfac', 'codigo_item', 'descripcion', 'cantidad', 'precio_unitario']


class PedidoEncabezadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawPedidoEncabezado
        fields = ['id', 'pedido', 'solicitante', 'fecha_pedido', 'estado', 'cargado_en']


class PedidoDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawPedidoDetalle
        fields = ['id', 'pedido', 'codigo_item', 'descripcion', 'cantidad']


class PresupuestoDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawPresupuestoDetalle
        fields = ['id', 'pedido', 'codigo_item', 'descripcion', 'cantidad', 'precio']


class PresupuestoResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawPresupuestoResumen
        fields = ['id', 'pedido', 'familia', 'total']


class KardexSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawKardex
        fields = ['id', 'numfac', 'nomsis', 'codigo_item', 'cantidad', 'fecha_mov']


class ETLLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ETLLog
        fields = [
            'id', 'tabla_destino', 'filas_insertadas', 'filas_error',
            'iniciado_en', 'finalizado_en', 'mensaje',
        ]
