"""
Custom JWT token views for the everyst API.
Extends the functionality of Simple JWT.
"""
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView as OriginalTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView as OriginalTokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from api.models.auth_security import LoginAttempt
from api.models.activity import ApplicationLog
from api.utils.auth import should_change_password

User = get_user_model()

class TokenObtainPairView(OriginalTokenObtainPairView):
    """
    Enhanced JWT token view that adds security features:
    - Account lockout after too many failed attempts
    - Login attempt logging
    - IP tracking
    """
    def post(self, request, *args, **kwargs):
        # Extract username and IP address
        username = request.data.get('username', '')
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check if the account is locked
        is_locked, unlock_time = LoginAttempt.is_account_locked(username, ip_address)
        if is_locked:
            # Log the locked account attempt
            ApplicationLog.log_activity(
                user=None,
                action='auth_failed',
                category='security',
                severity='warning',
                ip_address=ip_address,
                user_agent=user_agent,
                object_type='user_account',
                object_name=username,
                details={
                    'message': f'Login attempt blocked for user {username} - account temporarily locked',
                    'reason': 'Account temporarily locked due to multiple failed attempts',
                    'unlock_time': unlock_time.isoformat(),
                    'attempted_username': username
                }
            )
            
            # Calculate time remaining in minutes
            time_remaining = int((unlock_time - timezone.now()).total_seconds() / 60) + 1
            return Response(
                {
                    "detail": f"Account temporarily locked due to too many failed login attempts. "
                              f"Please try again in {time_remaining} minutes."
                }, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Proceed with token generation
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            
            # Record successful login
            LoginAttempt.record_attempt(
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                was_successful=True
            )
            
            # Log successful login to ApplicationLog
            user = User.objects.filter(username=username).first()
            if user:
                ApplicationLog.log_activity(
                    user=user,
                    action='auth_login',
                    category='auth',
                    severity='info',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    object_type='user_session',
                    object_name=username,
                    details={
                        'message': f'User {username} logged in successfully',
                        'login_method': 'JWT',
                        'user_id': str(user.id),
                        'timestamp': timezone.now().isoformat()
                    }
                )
            
            # Get the validated data
            response_data = serializer.validated_data
            
            # Update the user's last login IP if possible
            if user and hasattr(user, 'last_login_ip'):
                user.last_login_ip = ip_address
                user.save(update_fields=['last_login_ip'])
            
            # Check if the user's password should be changed
            if user:
                should_change, reason = should_change_password(user)
                if should_change:
                    response_data['password_expired'] = True
                    response_data['password_message'] = reason
                else:
                    response_data['password_expired'] = False
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except (InvalidToken, TokenError) as e:
            # Record failed login attempt
            LoginAttempt.record_attempt(
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                was_successful=False
            )
            
            # Log failed login to ApplicationLog
            ApplicationLog.log_activity(
                user=None,  # Failed login - no user object
                action='auth_failed',
                category='auth',
                severity='warning',
                ip_address=ip_address,
                user_agent=user_agent,
                object_type='user_session',
                object_name=username,
                details={
                    'message': f'Failed login attempt for user {username} - invalid credentials',
                    'error': str(e),
                    'attempted_username': username,
                    'reason': 'Invalid username or password'
                }
            )
            
            # Return error response
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            # Handle validation errors
            LoginAttempt.record_attempt(
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                was_successful=False
            )
            
            # Log failed login to ApplicationLog
            ApplicationLog.log_activity(
                user=None,  # Failed login - no user object
                action='auth_failed',
                category='auth',
                severity='error',
                ip_address=ip_address,
                user_agent=user_agent,
                object_type='user_session',
                object_name=username,
                details={
                    'message': f'System error during login attempt for user {username}',
                    'error': str(e),
                    'attempted_username': username,
                    'reason': 'System validation error'
                }
            )
            
            # Pass through the original error
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_client_ip(self, request):
        """
        Extract the client IP address from the request
        Handles proxy servers by checking multiple headers
        """
        # Check various proxy headers in order of preference
        headers_to_check = [
            'HTTP_CF_CONNECTING_IP',      # Cloudflare
            'HTTP_X_FORWARDED_FOR',       # Standard proxy header
            'HTTP_X_REAL_IP',             # Nginx proxy
            'HTTP_X_CLIENT_IP',           # Alternative header
            'REMOTE_ADDR'                 # Direct connection
        ]
        
        for header in headers_to_check:
            ip = request.META.get(header)
            if ip:
                # For comma-separated IPs, take the first (original client)
                if ',' in ip:
                    ip = ip.split(',')[0].strip()
                # Skip private/local IPs if we have multiple options
                if not ip.startswith(('127.', '10.', '192.168.', '172.')) or header == 'REMOTE_ADDR':
                    return ip
        
        # Fallback to REMOTE_ADDR if nothing else found
        return request.META.get('REMOTE_ADDR', 'unknown')


class TokenRefreshView(OriginalTokenRefreshView):
    """
    Enhanced refresh token view with additional security
    """
    pass  # We inherit the original behavior but can add custom logic here if needed
