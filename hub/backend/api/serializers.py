from rest_framework import serializers


class ServiceSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    icon = serializers.CharField()
    color = serializers.CharField()
    path = serializers.CharField()
    active = serializers.BooleanField()
