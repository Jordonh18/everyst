"""
Serializers for SSH key management.
"""

from rest_framework import serializers
from api.models import SSHKey, SSHSession


class SSHKeySerializer(serializers.ModelSerializer):
    """Serializer for SSH keys - excludes sensitive data."""
    
    class Meta:
        model = SSHKey
        fields = ['id', 'name', 'key_type', 'fingerprint', 'created_at', 'last_used', 'is_active']
        read_only_fields = ['id', 'fingerprint', 'created_at', 'last_used']


class SSHKeyCreateSerializer(serializers.Serializer):
    """Serializer for creating new SSH keys."""
    name = serializers.CharField(max_length=255)
    private_key = serializers.CharField(write_only=True, style={'input_type': 'textarea'})
    
    def validate_private_key(self, value):
        """Validate the SSH private key."""
        validation_result = SSHKey.validate_private_key(value)
        if not validation_result['is_valid']:
            raise serializers.ValidationError(f"Invalid SSH key: {validation_result.get('error', 'Unknown error')}")
        return value
    
    def validate_name(self, value):
        """Ensure name is unique for the user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if SSHKey.objects.filter(user=request.user, name=value).exists():
                raise serializers.ValidationError("An SSH key with this name already exists.")
        return value


class SSHSessionSerializer(serializers.ModelSerializer):
    """Serializer for SSH sessions."""
    
    class Meta:
        model = SSHSession
        fields = ['id', 'host', 'port', 'username', 'session_id', 'started_at', 'ended_at', 'status']
        read_only_fields = ['id', 'session_id', 'started_at', 'ended_at']


class SSHConnectionSerializer(serializers.Serializer):
    """Serializer for initiating SSH connections."""
    host = serializers.CharField(max_length=255)
    port = serializers.IntegerField(default=22, min_value=1, max_value=65535)
    username = serializers.CharField(max_length=100)
    ssh_key_id = serializers.IntegerField(required=False, allow_null=True)
    private_key = serializers.CharField(write_only=True, required=False, style={'input_type': 'textarea'})
    
    def validate(self, data):
        """Ensure either ssh_key_id or private_key is provided."""
        if not data.get('ssh_key_id') and not data.get('private_key'):
            raise serializers.ValidationError("Either ssh_key_id or private_key must be provided.")
        
        if data.get('private_key'):
            validation_result = SSHKey.validate_private_key(data['private_key'])
            if not validation_result['is_valid']:
                raise serializers.ValidationError(f"Invalid SSH key: {validation_result.get('error', 'Unknown error')}")
        
        return data
