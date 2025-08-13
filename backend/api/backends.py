"""
Custom authentication backends for the everyst API.
"""
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameBackend(BaseBackend):
    """
    Custom authentication backend that allows users to login with either:
    1. Username (case-insensitive)
    2. Email address
    
    This backend supports the issue #18 requirement to make login more flexible
    and case-insensitive.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user by username (case-insensitive) or email.
        
        Args:
            request: The current request
            username: The username or email provided by the user
            password: The password provided by the user
            **kwargs: Additional keyword arguments
            
        Returns:
            User object if authentication succeeds, None otherwise
        """
        if username is None or password is None:
            return None
            
        # Try to find user by username (case-insensitive) or email
        try:
            # Use Q objects to search by either username (case-insensitive) or email
            user = User.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except User.DoesNotExist:
            # No user found with this username or email
            return None
        except User.MultipleObjectsReturned:
            # This shouldn't happen since both username and email are unique
            # But if it does, we'll return None for security
            return None
            
        # Check if the password is correct and the user is active
        if user.check_password(password) and user.is_active:
            return user
            
        return None
    
    def get_user(self, user_id):
        """
        Get user by ID for session management.
        
        Args:
            user_id: The user's primary key
            
        Returns:
            User object if found, None otherwise
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
