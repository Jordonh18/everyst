"""
This file centralizes all serializer imports and exports in a clean way.
All serializers are imported and then re-exported for use across the application.
"""

# User-related serializers
from .user import UserRoleSerializer, UserSerializer

# Network-related serializers
from .network import (
    NetworkDeviceSerializer, 
    NetworkDeviceCreateUpdateSerializer,
    NetworkConnectionSerializer, 
    NetworkScanSerializer,
    NetworkTopologySerializer
)

# System-related serializers
from .system import (
    SystemMetricsSerializer,
    AlertSerializer,
    SecurityStatusSerializer
)

# Notification-related serializers
from .notification import NotificationSerializer

# Activity log-related serializers
from .activity import ApplicationLogSerializer

# Define what's exported when doing 'from api.serializers import *'
__all__ = [
    # User-related serializers
    'UserRoleSerializer',
    'UserSerializer',
    
    # Network-related serializers
    'NetworkDeviceSerializer',
    'NetworkDeviceCreateUpdateSerializer',
    'NetworkConnectionSerializer',
    'NetworkScanSerializer',
    'NetworkTopologySerializer',
    
    # System-related serializers
    'SystemMetricsSerializer',
    'AlertSerializer',
    'SecurityStatusSerializer',
    
    # Notification-related serializers
    'NotificationSerializer',

    # Activity log-related serializers
    'ApplicationLogSerializer'
]
