"""
Activity log serializers for the everyst API.
"""
from rest_framework import serializers
from api.models.activity import ApplicationLog
from api.serializers.user import UserSerializer

class ApplicationLogSerializer(serializers.ModelSerializer):
    """Serializer for the ApplicationLog model"""
    user = UserSerializer(read_only=True)

    class Meta:
        model = ApplicationLog
        fields = '__all__'
