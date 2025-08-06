"""
Access permissions based on user roles for the everyst API.
"""
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
            (request.user.role.can_manage_users or 
             request.user.role.name in ['admin', 'owner'])
        )


class CanManageSystem(permissions.BasePermission):
    """
    Permission based on the ability to manage system settings
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to manage system
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            (request.user.role.can_manage_system or 
             request.user.role.name in ['admin', 'owner'])
        )


class CanManageNetwork(permissions.BasePermission):
    """
    Permission based on the ability to manage network settings
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has permission to manage network
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role is not None and
            (request.user.role.can_manage_network or 
             request.user.role.name in ['admin', 'owner'])
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
            (getattr(request.user.role, 'can_view_logs', False) or 
             request.user.role.name in ['admin', 'owner'])
        )
