"""
This file centralizes all permissions imports and exports in a clean way.
All permissions are imported and then re-exported for use across the application.
"""

# Role-based permissions
from .role_permissions import IsFirstUser
from .access_permissions import (
    IsOwner, 
    IsAdmin, 
    IsManager, 
    CanManageUsers, 
    CanManageSystem, 
    CanManageNetwork,
    CanViewLogs
)

# Define what's exported when doing 'from api.permissions import *'
__all__ = [
    'IsFirstUser',
    'IsOwner',
    'IsAdmin',
    'IsManager',
    'CanManageUsers',
    'CanManageSystem',
    'CanManageNetwork',
    'CanViewLogs',
]
