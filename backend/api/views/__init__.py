"""
This file centralizes all view imports and exports in a clean way.
All views are imported and then re-exported for consistent import paths.
"""

# Authentication views
from .auth import HealthCheckView, RegisterView

# User management views
from .user import UserViewSet, UserRoleViewSet, check_users_exist, first_run_check

# Network-related views
from .network import (
    NetworkDeviceViewSet,
    NetworkConnectionViewSet,
    NetworkScanViewSet,
    network_topology
)

# Network tools views
from .network_tools import (
    ping_tool, nmap_tool, dig_tool, nslookup_tool, traceroute_tool,
    whois_tool, ssl_check_tool, netstat_tool, ip_route_tool, tcpdump_tool
)

# System monitoring views
from .system import (
    SystemMetricsViewSet, 
    AlertViewSet, 
    SecurityStatusViewSet, 
    get_current_metrics
)

# Notification views
from .notification import NotificationViewSet

# Activity log views
from .activity import ApplicationLogViewSet

# Define __all__ to specify what 'from api.views import *' should import,
# and also for clarity on what this package exports.
__all__ = [
    # Authentication views
    'HealthCheckView',
    'RegisterView',
    
    # User management views
    'UserViewSet',
    'check_users_exist',
    'first_run_check',
    'UserRoleViewSet',
    
    # Network-related views
    'NetworkDeviceViewSet',
    'NetworkConnectionViewSet',
    'NetworkScanViewSet',
    'network_topology',
    
    # Network tools
    'ping_tool',
    'nmap_tool',
    'dig_tool',
    'nslookup_tool',
    'traceroute_tool',
    'whois_tool',
    'ssl_check_tool',
    'netstat_tool',
    'ip_route_tool',
    'tcpdump_tool',
    
    # System-related views
    'SystemMetricsViewSet',
    'AlertViewSet',
    'SecurityStatusViewSet',
    'get_current_metrics',
    
    # Notification views
    'NotificationViewSet',
    
    # Activity log views
    'ApplicationLogViewSet'
]
