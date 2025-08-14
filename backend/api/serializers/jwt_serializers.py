"""
Custom JWT serializers for the everyst API.
"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that supports:
    1. Username or email authentication
    2. Case-insensitive username matching
    
    This serializer overrides the default simple-jwt behavior to use our
    custom authentication backend.
    """
    
    def validate(self, attrs):
        """
        Validate the username/email and password combination.
        
        This method overrides the parent validate method to use our custom
        authentication backend that supports email/username and case-insensitive login.
        """
        # Get the username/email and password from the request
        username_or_email = attrs.get(self.username_field)
        password = attrs.get('password')
        
        # Use Django's authenticate function with our custom backend
        user = authenticate(
            request=self.context.get('request'),
            username=username_or_email,
            password=password
        )
        
        if user is None:
            # Authentication failed - raise the same error as the parent class
            raise serializers.ValidationError(
                'No active account found with the given credentials'
            )
        
        if not user.is_active:
            raise serializers.ValidationError(
                'User account is disabled.'
            )
        
        # Store the user for access in the view
        self.user = user
        
        # Call the parent's validate method with the authenticated user
        # We need to temporarily set the username field to the user's actual username
        # so the parent validate method works correctly
        original_username = attrs[self.username_field]
        attrs[self.username_field] = user.username
        
        # Call parent validate to get the token data
        data = super().validate(attrs)
        
        # Restore the original username for logging purposes
        attrs[self.username_field] = original_username
        
        return data
    
    @classmethod
    def get_token(cls, user):
        """
        Generate token for the given user.
        
        This method adds custom claims to reduce database calls for common user info.
        """
        token = super().get_token(user)
        
        # Add custom claims to the token to reduce database calls
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name or ''
        token['last_name'] = user.last_name or ''
        token['is_active'] = user.is_active
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        
        # Add role information if available
        if user.role:
            token['role'] = user.role.name
            token['role_details'] = {
                'name': user.role.name,
                'description': user.role.description,
                'priority': user.role.priority,
                'can_manage_users': user.role.can_manage_users,
                'can_manage_system': user.role.can_manage_system,
                'can_manage_network': user.role.can_manage_network,
                'can_view_all_data': user.role.can_view_all_data,
                'can_view_logs': getattr(user.role, 'can_view_logs', False),
            }
        else:
            token['role'] = None
            token['role_details'] = None
        
        return token
