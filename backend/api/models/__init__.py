"""
This file centralizes all model imports and exports in a clean way.
All models are imported and then re-exported for use across the application.
"""

# Base model
from .base import BaseModel

# User-related models
from .role import UserRole
from .user import User, UserManager

# Network-related models
from .network import NetworkDevice, NetworkConnection, NetworkScan

# System-related models
from .system import SystemMetrics, Alert, SecurityStatus

# Notification model
from .notification import Notification

# Activity-related models
from .activity import ApplicationLog

# Define what's exported when doing 'from api.models import *'
__all__ = [
    'BaseModel',
    'User',
    'UserManager',
    'UserRole',
    'NetworkDevice',
    'NetworkConnection',
    'NetworkScan',
    'SystemMetrics',
    'Alert',
    'SecurityStatus',
    'Notification',
    'ApplicationLog',
]
