"""
User management views for the everyst API.
"""
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from api.serializers.user import UserSerializer, UserRoleSerializer
from api.models.role import UserRole
from api.permissions import CanManageUsers
from ..models import ApplicationLog

User = get_user_model()

class UserRoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for user roles
    """
    queryset = UserRole.objects.all().order_by('priority')
    serializer_class = UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated & CanManageUsers]

    @action(detail=False, methods=['get'])
    def default_roles(self, request):
        """Return the default roles"""
        # This will create default roles if they don't exist
        UserRole.create_default_roles()
        
        # Return all roles
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint for users
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow users to see their own profile unless they have permissions"""
        user = self.request.user
        
        # Check if user has role and permissions
        if hasattr(user, 'role') and user.role:
            # System owners or admins can see all users
            if user.role.name in ['owner', 'admin'] or user.is_staff or user.is_superuser:
                return User.objects.all()
            
            # Users with manage_users permission can see all users
            if user.role.can_manage_users:
                return User.objects.all()
        
        # Regular users can only see themselves
        return User.objects.filter(id=user.id)
    
    def get_permissions(self):
        """
        Override permissions based on action
        """
        if self.action in ['list', 'retrieve']:
            # Regular permissions for viewing users
            return [IsAuthenticated()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy', 'set_role']:
            # Only users who can manage users can modify
            from api.permissions import CanManageUsers
            return [IsAuthenticated(), CanManageUsers()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Return the current user's profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
        
    def create(self, request, *args, **kwargs):
        """Override create method to prevent multiple system owners"""
        # Extract the role from the request data
        role_name = request.data.get('role')
        
        # If trying to create a new owner, check if one already exists
        if (role_name == 'owner'):
            from api.models.role import UserRole
            # Check if there's already an owner
            existing_owner = User.objects.filter(role__name='owner').exists()
            if existing_owner:
                return Response(
                    {"detail": "There can only be one system owner. Transfer ownership from the current owner first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Continue with the standard create process
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        user = serializer.save()
        
        # Get client IP and user agent
        ip_address = self._get_client_ip(self.request)
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        ApplicationLog.log_activity(
            user=self.request.user,
            action='user_create',
            category='user',
            severity='info',
            ip_address=ip_address,
            user_agent=user_agent,
            object_type='user',
            object_id=str(user.id),
            object_name=user.username,
            details={
                'message': f'New user created: {user.username} ({user.first_name} {user.last_name})',
                'created_by': self.request.user.username,
                'user_role': user.role.name if user.role else 'No role assigned',
                'user_email': user.email
            }
        )

    def perform_update(self, serializer):
        user = serializer.save()
        
        # Get client IP and user agent
        ip_address = self._get_client_ip(self.request)
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        ApplicationLog.log_activity(
            user=self.request.user,
            action='user_update',
            category='user',
            severity='info',
            ip_address=ip_address,
            user_agent=user_agent,
            object_type='user',
            object_id=str(user.id),
            object_name=user.username,
            details={
                'message': f'User profile updated: {user.username} ({user.first_name} {user.last_name})',
                'updated_by': self.request.user.username,
                'current_role': user.role.name if user.role else 'No role assigned'
            }
        )

    def perform_destroy(self, instance):
        # Get client IP and user agent
        ip_address = self._get_client_ip(self.request)
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        
        ApplicationLog.log_activity(
            user=self.request.user,
            action='user_delete',
            category='user',
            severity='warning',
            ip_address=ip_address,
            user_agent=user_agent,
            object_type='user',
            object_id=str(instance.id),
            object_name=instance.username,
            details={
                'message': f'User account deleted: {instance.username} ({instance.first_name} {instance.last_name})',
                'deleted_by': self.request.user.username,
                'deleted_user_role': instance.role.name if instance.role else 'No role assigned',
                'deleted_user_email': instance.email
            }
        )
        instance.delete()

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        """Set the role for a user"""
        from api.models.role import UserRole
        
        user = self.get_object()
        role_name = request.data.get('role')
        
        if not role_name:
            return Response({"detail": "Role name is required"}, 
                         status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get the requested role
            role = UserRole.objects.get(name=role_name)
            
            # Check if current user is trying to set a higher privileged role
            # Only owners can create other owners
            if role.name == 'owner' and request.user.role.name != 'owner':
                return Response(
                    {"detail": "Only owners can assign the owner role"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Only owners and admins can create admins
            if role.name == 'admin' and request.user.role.name not in ['owner', 'admin']:
                return Response(
                    {"detail": "Only owners and admins can assign the admin role"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Don't allow users to change their own role (prevent privilege escalation)
            if str(user.id) == str(request.user.id):
                return Response(
                    {"detail": "You cannot change your own role"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Check if trying to create a second system owner
            if role.name == 'owner':
                existing_owner = User.objects.filter(role__name='owner').exclude(id=user.id).exists()
                if existing_owner:
                    return Response(
                        {"detail": "There can only be one system owner. Transfer ownership from the current owner first."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Check if we're demoting the system owner and ensure there's another owner first
            if user.role and user.role.name == 'owner' and role.name != 'owner':
                # If trying to demote the current owner, ensure there's another owner first
                other_owner = User.objects.filter(role__name='owner').exclude(id=user.id).exists()
                if not other_owner:
                    return Response(
                        {"detail": "Cannot demote the system owner. Transfer ownership to another user first."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            # Set the role
            user.role = role
            
            # Update is_staff and is_superuser flags based on role
            if role.name == 'owner':
                user.is_staff = True
                user.is_superuser = True
            elif role.name == 'admin':
                user.is_staff = True
                user.is_superuser = False
            else:
                user.is_staff = False
                user.is_superuser = False
                
            user.save()
            
            ApplicationLog.log_activity(
                user=request.user,
                action='user_role_change',
                category='user',
                severity='info',
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                object_type='user',
                object_id=str(user.id),
                object_name=user.username,
                details={
                    'message': f'Role changed: {user.username} assigned role {role.name}',
                    'changed_by': request.user.username,
                    'previous_role': user.role.name if user.role else 'No role',
                    'new_role': role.name,
                    'target_user': user.username
                }
            )
            
            # Return updated user data
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except UserRole.DoesNotExist:
            return Response({"detail": f"Role '{role_name}' does not exist"}, 
                         status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """Change the user's password"""
        user = self.get_object()
        
        # Only allow users to change their own password unless they're staff
        if str(user.id) != str(request.user.id) and not request.user.is_staff:
            return Response({"detail": "You don't have permission to change this user's password"},
                         status=status.HTTP_403_FORBIDDEN)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({"detail": "Current and new password are required"}, 
                         status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the current password is correct
        if not user.check_password(current_password):
            return Response({"detail": "Current password is incorrect"}, 
                         status=status.HTTP_400_BAD_REQUEST)
        
        # Update the password
        user.set_password(new_password)
        user.save()
        
        ApplicationLog.log_activity(
            user=request.user, # Can be self or other user if admin
            action='auth_password_change',
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            object_type='User',
            object_id=str(user.id),
            object_name=user.username,
            details={'message': f'Password changed for user {user.username}.'},
            severity='info'
        )
        
        return Response({"detail": "Password changed successfully"}, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Override delete method to prevent deletion of system owners and self-deletion"""
        user = self.get_object()
        
        # Prevent users from deleting themselves
        if str(user.id) == str(request.user.id):
            return Response(
                {"detail": "You cannot delete your own account"}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Prevent deletion of system owners
        if user.role and user.role.name == 'owner':
            return Response(
                {"detail": "System owners cannot be deleted for security reasons"}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # If checks pass, proceed with deletion
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get', 'post'], url_path='profile-image')
    def profile_image(self, request, pk=None):
        """Get or update the user's profile image"""
        user = self.get_object()
        
        # Only allow users to change their own image unless they're staff
        if str(user.id) != str(request.user.id) and not request.user.is_staff:
            return Response({"detail": "You don't have permission to access this user's profile image"},
                         status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            # If user has a profile image, return it
            if user.profile_image:
                return Response(request.build_absolute_uri(user.profile_image.url))
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'POST':
            # Check if image file is in request (handle both 'image' and empty request.FILES)
            if not request.FILES:
                return Response({"detail": "No image file provided"}, 
                             status=status.HTTP_400_BAD_REQUEST)
            
            # Get the first file from request.FILES (assuming it's the image)
            image = next(iter(request.FILES.values()))
            
            # Delete old profile image if exists
            if user.profile_image:
                user.profile_image.delete(save=False)
            
            # Save new profile image
            user.profile_image = image
            user.save()
            
            return Response({
                "detail": "Profile image updated successfully",
                "url": request.build_absolute_uri(user.profile_image.url)
            }, status=status.HTTP_200_OK)
    
    def _get_client_ip(self, request):
        """
        Extract the client IP address from the request
        Handles proxy servers by checking X-Forwarded-For
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Get the client IP (first in the list)
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

@api_view(['GET'])
def check_users_exist(request):
    """
    Check if any users exist in the system.
    This endpoint is used during initial setup but requires authentication.
    """
    if request.user.is_authenticated:
        user_count = User.objects.count()
        return Response({
            'users_exist': user_count > 0,
            'user_count': user_count
        })
    return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([AllowAny])
def first_run_check(request):
    """
    Minimal first run check endpoint that returns only status codes.
    200 OK: Users exist, should show login page
    204 No Content: No users exist, should show registration page
    
    This endpoint doesn't reveal any information about the system
    other than whether it has been set up or not.
    """
    user_exists = User.objects.exists()
    if user_exists:
        return Response(status=status.HTTP_200_OK)
    else:
        return Response(status=status.HTTP_204_NO_CONTENT)
