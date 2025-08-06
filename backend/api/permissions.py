from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Permission to only allow system owners access
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has the owner role
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.name == 'owner'
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admins and owners access
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has admin or owner role
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.name in ['admin', 'owner']
        )


class IsManager(permissions.BasePermission):
    """
    Permission to only allow managers and higher roles access
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has manager or higher role
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.name in ['manager', 'admin', 'owner']
        )


class CanManageUsers(permissions.BasePermission):
    """
    Permission based on the ability to manage users
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to manage users
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.can_manage_users
        )


class CanManageSystem(permissions.BasePermission):
    """
    Permission based on the ability to manage system
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to manage system
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.can_manage_system
        )


class CanManageNetwork(permissions.BasePermission):
    """
    Permission based on the ability to manage network
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to manage network
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.can_manage_network
        )


class CanViewAllData(permissions.BasePermission):
    """
    Permission based on the ability to view all data
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to view all data
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.can_view_all_data
        )


class CanViewLogs(permissions.BasePermission):
    """
    Permission based on the ability to view system logs
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to view logs
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            (request.user.role.name in ['admin', 'owner'] or
             hasattr(request.user.role, 'can_view_logs') and request.user.role.can_view_logs)
        )
