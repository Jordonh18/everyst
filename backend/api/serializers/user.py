"""
User serializers for the everyst API.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models.role import UserRole

User = get_user_model()

class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for the UserRole model"""
    class Meta:
        model = UserRole
        fields = ('name', 'description', 'priority', 'can_manage_users', 
                  'can_manage_system', 'can_manage_network', 'can_view_all_data', 'can_view_logs')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the custom User model"""
    password = serializers.CharField(write_only=True)
    role_details = UserRoleSerializer(source='role', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 
                  'is_active', 'date_joined', 'last_login', 'profile_image', 'role', 'role_details',
                  'is_staff', 'is_superuser', 'session_timeout_minutes')
        read_only_fields = ('id', 'date_joined', 'last_login', 'role_details',
                           'is_staff', 'is_superuser')
        extra_kwargs = {'password': {'write_only': True}, 'role': {'required': False}}
    
    def create(self, validated_data):
        """Override create method to use create_user for proper password hashing"""
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        return user
        
    def validate_username(self, value):
        """Validate that the username is unique and meets requirements"""
        if not value:
            raise serializers.ValidationError("Username is required.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value
