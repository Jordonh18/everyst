"""
Authentication module for Socket.IO connections.

This module handles JWT authentication for socket connections
and maintains user session mapping. It uses JWT claims to reduce
database calls when possible.
"""

import logging
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from asgiref.sync import sync_to_async
from typing import Optional, Dict, Any, Tuple, Union
from api.utils.jwt_utils import get_user_from_token_claims
from .server import sio, connected_clients, user_sessions, session_users

# Set up logging
logger = logging.getLogger('socket_server.auth')

User = get_user_model()


def get_user_from_token(token_str: str):
    """
    Validate JWT token and return the user.
    
    This function first tries to get user information from JWT claims
    to reduce database calls, falling back to database queries when needed.
    
    Args:
        token_str: The authorization token string (Bearer format)
        
    Returns:
        User: The authenticated user or None if validation fails
    """
    try:
        if not token_str or not token_str.startswith('Bearer '):
            return None
        
        token = token_str.split(' ')[1]
        
        # Try to get user from token claims first (reduces database load)
        user = get_user_from_token_claims(token)
        
        if user:
            logger.debug(f"Socket auth: User {user.username} authenticated via JWT claims")
            return user
        
        # Fallback to traditional JWT validation and database lookup
        payload = jwt.decode(
            token, 
            settings.SIMPLE_JWT['SIGNING_KEY'],
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        
        user_id = payload.get(settings.SIMPLE_JWT['USER_ID_CLAIM'])
        if not user_id:
            return None
            
        # Close any old database connections before creating new ones
        close_old_connections()
        
        user = User.objects.select_related('role').filter(id=user_id, is_active=True).first()
        if user:
            logger.debug(f"Socket auth: User {user.username} authenticated via database fallback")
        return user
        
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist, Exception) as e:
        logger.warning(f"Socket token validation failed: {str(e)}")
        return None


async def get_user_from_sid(sid: str):
    """
    Get user ID and User object from a session ID.
    
    Args:
        sid: Socket.IO session ID
        
    Returns:
        Tuple[str, User]: A tuple containing (user_id, user) or (None, None) if not found
    """
    if sid not in session_users:
        return None, None
    
    user_id = session_users[sid]
    
    # Get the user object
    try:
        # Use sync_to_async to make the database query
        @sync_to_async
        def get_user():
            close_old_connections()
            return User.objects.filter(id=user_id, is_active=True).first()
        
        user = await get_user()
        return user_id, user
    except Exception as e:
        logger.error(f"Error retrieving user: {e}")
        return user_id, None


@sio.event
async def connect(sid, environ):
    """
    Handle client connection and initial authentication.
    
    Args:
        sid: Socket.IO session ID
        environ: WSGI environment dictionary with request details
    """
    # Look for token in query string first (for Socket.IO connection)
    query = environ.get('QUERY_STRING', '')
    token = None
    
    # Extract token from query parameters
    import urllib.parse
    params = urllib.parse.parse_qs(query)
    if 'token' in params and params['token']:
        token = params['token'][0]
        logger.debug(f"Token found in query string for {sid}")
    
    # If no token in query, check authorization header
    if not token:
        auth_header = environ.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    # Try to authenticate with token if provided
    user = None
    if token:
        user = get_user_from_token(f"Bearer {token}")
    
    if user:
        user_id = str(user.id)
        # Register user session
        user_sessions[user_id] = sid
        session_users[sid] = user_id
        logger.info(f"User {user_id} authenticated on connect")
    else:
        logger.debug(f"No valid authentication for {sid}")


@sio.event
async def disconnect(sid):
    """
    Handle client disconnection.
    
    Args:
        sid: Socket.IO session ID
    """
    logger.info(f"Client disconnected: {sid}")
    if sid in connected_clients:
        del connected_clients[sid]
    
    # Remove user mapping if this session is associated with a user
    if sid in session_users:
        user_id = session_users[sid]
        del session_users[sid]
        if user_id in user_sessions and user_sessions[user_id] == sid:
            del user_sessions[user_id]
            logger.info(f"User {user_id} session mapping removed")


@sio.event
async def authenticate(sid, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Authenticate a user with a JWT token.
    
    Args:
        sid: Socket.IO session ID
        data: Dictionary containing the authentication token
        
    Returns:
        Dict: Authentication result with status and message
    """
    try:
        token = data.get('token')
        if not token:
            return {'status': 'error', 'message': 'No token provided'}
        
        user = get_user_from_token(f"Bearer {token}")
        if not user:
            return {'status': 'error', 'message': 'Invalid token'}
        
        user_id = str(user.id)
        # Register user session
        user_sessions[user_id] = sid
        session_users[sid] = user_id
        
        logger.info(f"User {user_id} authenticated via authenticate event")
        
        # Get unread notification count for the user (sync_to_async for DB operation)
        @sync_to_async
        def get_unread_count():
            from api.models.notification import Notification
            close_old_connections()
            return Notification.objects.filter(
                user=user,
                is_read=False
            ).count()
        
        unread_count = await get_unread_count()
        
        return {
            'status': 'success', 
            'message': 'Authentication successful',
            'user_id': user_id,
            'email': user.email,
            'unread_notifications': unread_count
        }
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return {'status': 'error', 'message': str(e)}


@sio.event
async def register_user(sid, data):
    """
    Register a user ID with their socket session (deprecated, use authenticate instead).
    
    This is kept for backward compatibility.
    
    Args:
        sid: Socket.IO session ID
        data: Dictionary containing the user_id
    """
    try:
        user_id = data.get('user_id')
        if user_id:
            # This is for backwards compatibility
            user_sessions[user_id] = sid
            session_users[sid] = user_id
            logger.info(f"User {user_id} registered with session {sid} via legacy method")
            return {'status': 'success', 'message': 'User registered (deprecated method)'}
        return {'status': 'error', 'message': 'No user_id provided'}
    except Exception as e:
        logger.error(f"Error in register_user: {e}")
        return {'status': 'error', 'message': str(e)}
