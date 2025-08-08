from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView as OriginalTokenRefreshView

# Import views using the clean exports from modular structure
from .views import (
    # Auth views
    HealthCheckView, RegisterView,
    
    # User management
    UserViewSet, UserRoleViewSet, check_users_exist, first_run_check,
    
    # Network views
    NetworkDeviceViewSet, NetworkConnectionViewSet, 
    NetworkScanViewSet, network_topology,
    
    # System views
    SystemMetricsViewSet, AlertViewSet, 
    SecurityStatusViewSet, get_current_metrics,
    
    # Notification views
    NotificationViewSet,
    
    # Activity log views
    ApplicationLogViewSet,
    
    # Network tools
    ping_tool, nmap_tool, dig_tool, nslookup_tool, traceroute_tool,
    whois_tool, ssl_check_tool, netstat_tool, ip_route_tool, tcpdump_tool
)

# SSH Key views
from .views.ssh_keys import SSHKeyViewSet, SSHSessionViewSet

# Import our custom token views
from .views.auth_token import TokenObtainPairView, TokenRefreshView
from .views.logout import LogoutView, LogoutAllView

# Import system logs views
from .views import system_logs as system_logs_views

router = DefaultRouter()
router.register(r'metrics', SystemMetricsViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'security', SecurityStatusViewSet)
router.register(r'users', UserViewSet)
router.register(r'roles', UserRoleViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')

# Network routes
router.register(r'network/devices', NetworkDeviceViewSet)
router.register(r'network/connections', NetworkConnectionViewSet)
router.register(r'network/scans', NetworkScanViewSet)

# SSH routes
router.register(r'ssh/keys', SSHKeyViewSet, basename='ssh-keys')
router.register(r'ssh/sessions', SSHSessionViewSet, basename='ssh-sessions')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/logout-all/', LogoutAllView.as_view(), name='logout-all'),
    path('auth/check-users/', check_users_exist, name='check-users-exist'),
    path('auth/first-run/', first_run_check, name='first-run-check'),
    
    # Activity logs endpoint
    path('activity-logs/', ApplicationLogViewSet.as_view({'get': 'list'}), name='activity-logs'),
    path('activity-logs/purge/', ApplicationLogViewSet.as_view({'post': 'purge'}), name='activity-logs-purge'),
    
    # System logs endpoints
    path('system-logs/', include([
        path('', system_logs_views.list_system_logs, name='system-logs-list'),
        path('dashboard/', system_logs_views.system_logs_dashboard, name='system-logs-dashboard'),
        path('<str:log_name>/read/', system_logs_views.read_system_log, name='system-log-read'),
        path('<str:log_name>/stats/', system_logs_views.system_log_statistics, name='system-log-stats'),
    ])),
    
    # Network topology endpoint
    path('network/topology/', network_topology, name='network-topology'),
    
    # Network tools endpoints
    path('tools/ping/', ping_tool, name='ping-tool'),
    path('tools/nmap/', nmap_tool, name='nmap-tool'),
    path('tools/dig/', dig_tool, name='dig-tool'),
    path('tools/nslookup/', nslookup_tool, name='nslookup-tool'),
    path('tools/traceroute/', traceroute_tool, name='traceroute-tool'),
    path('tools/whois/', whois_tool, name='whois-tool'),
    path('tools/ssl-check/', ssl_check_tool, name='ssl-check-tool'),
    path('tools/netstat/', netstat_tool, name='netstat-tool'),
    path('tools/ip-route/', ip_route_tool, name='ip-route-tool'),
    path('tools/tcpdump/', tcpdump_tool, name='tcpdump-tool'),
    
    # System metrics endpoints
    path('system/metrics/current/', get_current_metrics, name='current-metrics'),
]

urlpatterns += router.urls