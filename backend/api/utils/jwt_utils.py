"""
JWT utility functions for extracting user information from tokens.
"""
import jwt
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from typing import Optional, Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

logger = logging.getLogger('auth.jwt_utils')
User = get_user_model()


def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode a JWT token and return the payload.
    
    Args:
        token: The JWT token string
        
    Returns:
        Dict containing the token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.SIMPLE_JWT['SIGNING_KEY'],
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception) as e:
        logger.warning(f"JWT decode failed: {str(e)}")
        return None


def get_user_info_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract user information from JWT token claims.
    
    Args:
        token: The JWT token string
        
    Returns:
        Dict containing user information from token claims or None if invalid
    """
    payload = decode_jwt_token(token)
    if not payload:
        return None
    
    # Extract user information from custom claims
    user_info = {
        'id': payload.get(settings.SIMPLE_JWT['USER_ID_CLAIM']),
        'username': payload.get('username'),
        'email': payload.get('email'),
        'first_name': payload.get('first_name', ''),
        'last_name': payload.get('last_name', ''),
        'is_active': payload.get('is_active', True),
        'is_staff': payload.get('is_staff', False),
        'is_superuser': payload.get('is_superuser', False),
        'role': payload.get('role'),
        'role_details': payload.get('role_details'),
    }
    
    # Only return if we have essential user information
    if user_info['id'] and user_info['username']:
        return user_info
    
    return None


def get_user_from_token_claims(token: str):
    """
    Get user information from JWT token claims, falling back to database if needed.
    
    This function first tries to get user info from token claims. If the claims
    are missing or incomplete, it falls back to querying the database.
    
    Args:
        token: The JWT token string
        
    Returns:
        User object with information from token claims or database
    """
    payload = decode_jwt_token(token)
    if not payload:
        return None
    
    user_id = payload.get(settings.SIMPLE_JWT['USER_ID_CLAIM'])
    if not user_id:
        return None
    
    # Try to get user info from token claims first
    user_info = get_user_info_from_token(token)
    
    if user_info and user_info.get('username') and user_info.get('email'):
        # Create a user-like object with information from token claims
        # This avoids database calls for most user information
        try:
            # We still need to verify the user exists and is active in the database
            # but we can do this with a lightweight query
            db_user = User.objects.only('id', 'is_active').get(
                id=user_id, 
                is_active=True
            )
            
            # Create a user object populated with token claims
            db_user.username = user_info['username']
            db_user.email = user_info['email']
            db_user.first_name = user_info['first_name']
            db_user.last_name = user_info['last_name']
            db_user.is_staff = user_info['is_staff']
            db_user.is_superuser = user_info['is_superuser']
            
            # Add role information from claims
            if user_info['role_details']:
                # Create a mock role object to avoid database query
                class MockRole:
                    def __init__(self, role_details):
                        self.name = role_details.get('name', '')
                        self.description = role_details.get('description', '')
                        self.priority = role_details.get('priority', 0)
                        self.can_manage_users = role_details.get('can_manage_users', False)
                        self.can_manage_system = role_details.get('can_manage_system', False)
                        self.can_manage_network = role_details.get('can_manage_network', False)
                        self.can_view_all_data = role_details.get('can_view_all_data', False)
                        self.can_view_logs = role_details.get('can_view_logs', False)
                
                db_user.role = MockRole(user_info['role_details'])
            else:
                db_user.role = None
            
            return db_user
            
        except User.DoesNotExist:
            logger.warning(f"User {user_id} not found in database")
            return None
        except Exception as e:
            logger.warning(f"Error creating user from claims: {str(e)}")
            # Fall back to full database query
            pass
    
    # Fallback to full database query if token claims are insufficient
    try:
        return User.objects.select_related('role').get(id=user_id, is_active=True)
    except User.DoesNotExist:
        logger.warning(f"User {user_id} not found in database")
        return None


def should_refresh_token_claims(token: str) -> bool:
    """
    Check if the token claims might be outdated and should be refreshed.
    
    This is useful for determining when to fall back to database queries
    for critical operations or when user data might have changed.
    
    Args:
        token: The JWT token string
        
    Returns:
        Boolean indicating if claims might be outdated
    """
    payload = decode_jwt_token(token)
    if not payload:
        return True
    
    # Check if essential claims are missing
    essential_claims = ['username', 'email', 'is_active']
    for claim in essential_claims:
        if claim not in payload:
            return True
    
    # Token claims seem current
    return False
