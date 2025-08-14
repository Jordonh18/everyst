from django.contrib import admin
from .models import SystemMetrics, Alert, SecurityStatus, NetworkDevice, NetworkConnection, NetworkScan, Notification, User, GitHubAPICache

@admin.register(SystemMetrics)
class SystemMetricsAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'cpu_usage', 'memory_usage', 'disk_usage')
    readonly_fields = ('timestamp',)
    list_filter = ('timestamp',)

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'title', 'severity', 'status', 'source')
    list_filter = ('severity', 'status', 'source')
    search_fields = ('title', 'message')

@admin.register(SecurityStatus)
class SecurityStatusAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'security_score', 'vulnerabilities_count', 'last_scan_date', 'firewall_status')
    readonly_fields = ('timestamp',)
    list_filter = ('firewall_status',)

@admin.register(NetworkDevice)
class NetworkDeviceAdmin(admin.ModelAdmin):
    list_display = ('label', 'type', 'ip', 'hostname', 'status', 'last_seen', 'is_manually_added')
    list_filter = ('type', 'status', 'is_manually_added', 'is_ignored')
    search_fields = ('label', 'ip', 'hostname', 'mac')
    readonly_fields = ('id', 'created_at', 'updated_at')

@admin.register(NetworkConnection)
class NetworkConnectionAdmin(admin.ModelAdmin):
    list_display = ('source', 'target', 'type', 'status', 'bandwidth', 'latency')
    list_filter = ('type', 'status')
    readonly_fields = ('id', 'created_at', 'updated_at')

@admin.register(NetworkScan)
class NetworkScanAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'status', 'discovered_devices', 'duration', 'scan_method')
    list_filter = ('status', 'scan_method')
    readonly_fields = ('id', 'timestamp')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('date_joined', 'last_login')
    
    def get_search_results(self, request, queryset, search_term):
        """
        Custom search that supports case-insensitive username and email searches
        """
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            # Add case-insensitive search for username and email
            from django.db.models import Q
            queryset |= self.model.objects.filter(
                Q(username__icontains=search_term) |
                Q(email__icontains=search_term)
            )
        return queryset, use_distinct

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'type', 'timestamp', 'is_read', 'is_system')
    list_filter = ('type', 'is_read', 'is_system')
    search_fields = ('title', 'message')
    readonly_fields = ('timestamp',)


@admin.register(GitHubAPICache)
class GitHubAPICacheAdmin(admin.ModelAdmin):
    list_display = ('url', 'etag', 'status_code', 'cached_at')
    list_filter = ('status_code', 'cached_at')
    search_fields = ('url', 'etag')
    readonly_fields = ('cached_at', 'created_at', 'updated_at')
    
    def has_add_permission(self, request):
        # Prevent manual addition of cache entries
        return False
