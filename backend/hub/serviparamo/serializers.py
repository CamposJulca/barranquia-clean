from rest_framework import serializers
from .models import CatalogoSKU


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
