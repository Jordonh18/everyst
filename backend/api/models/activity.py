"""
System-wide logging model for tracking application activities.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class ApplicationLog(models.Model):
    """
    Comprehensive logging system for application events, user actions, and security monitoring.
    """
    # Main categories for easier filtering and organization
    CATEGORY_CHOICES = (
        ('auth', 'Authentication'),
        ('user', 'User Management'),
        ('security', 'Security'),
        ('system', 'System'),
        ('network', 'Network'),
        ('api', 'API Access'),
        ('admin', 'Admin Action'),
        ('data', 'Data Change'),
    )
    
    # Specific action types within each category
    ACTION_TYPES = (
        # Authentication actions
        ('auth_login', 'Login'),
        ('auth_logout', 'Logout'),
        ('auth_failed', 'Failed Login'),
        ('auth_password_change', 'Password Change'),
        ('auth_password_reset', 'Password Reset'),
        
        # User management actions
        ('user_create', 'User Created'),
        ('user_update', 'User Updated'),
        ('user_delete', 'User Deleted'),
        ('user_role_change', 'Role Changed'),
        ('user_permission_change', 'Permission Changed'),
        ('user_profile_update', 'Profile Updated'),
        
        # Security actions
        ('security_event', 'Security Event'),
        ('security_scan', 'Security Scan'),
        ('security_alert', 'Security Alert'),
        
        # System actions
        ('system_startup', 'System Startup'),
        ('system_shutdown', 'System Shutdown'),
        ('system_update', 'System Update'),
        ('system_config_change', 'Configuration Change'),
        
        # Network actions
        ('network_scan', 'Network Scan'),
        ('network_device_added', 'Device Added'),
        ('network_device_updated', 'Device Updated'),
        ('network_device_removed', 'Device Removed'),
        ('network_device_status_change', 'Device Status Change'),
        
        # API access
        ('api_access', 'API Access'),
        
        # Admin actions
        ('admin_action', 'Admin Action'),
        
        # Data changes
        ('data_create', 'Data Created'),
        ('data_update', 'Data Updated'),
        ('data_delete', 'Data Deleted'),
    )
    
    # Basic fields
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='logs',
        null=True,  # Allow null for system events and anonymous actions
        blank=True
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Details about the action
    details = models.JSONField(default=dict, blank=True)
    severity = models.CharField(
        max_length=20, 
        choices=[
            ('info', 'Info'),
            ('warning', 'Warning'),
            ('error', 'Error'),
            ('critical', 'Critical')
        ],
        default='info'
    )
    
    # Object identifiers for actions affecting specific resources
    object_type = models.CharField(max_length=50, blank=True, null=True)
    object_id = models.CharField(max_length=50, blank=True, null=True)
    object_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Log retention settings (applied globally but stored with each record)
    retention_days = models.IntegerField(default=90)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Application Log'
        verbose_name_plural = 'Application Logs'
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['category']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['severity']),
            models.Index(fields=['object_type', 'object_id']),
        ]
    
    @classmethod
    def log_activity(cls, user=None, action=None, ip_address=None, user_agent=None, details=None, 
                     category=None, severity='info', object_type=None, object_id=None, object_name=None):
        """
        Log an activity in the application.
        
        Args:
            user: The user who performed the action (can be None for anonymous or system actions)
            action: The type of action performed (one of ACTION_TYPES)
            ip_address: The IP address from which the action was performed
            user_agent: The browser/client used
            details: Additional details about the action (as a dictionary)
            category: The category of the action (one of CATEGORY_CHOICES)
            severity: The severity level of the log (info, warning, error, critical)
            object_type: The type of object affected (e.g., 'User', 'NetworkDevice')
            object_id: The ID of the object affected
            object_name: A human-readable name/identifier for the object
        
        Returns:
            The created ApplicationLog instance
        """
        details = details or {}
        
        # Determine category from action if not provided
        derived_category = category
        if derived_category is None:
            if action.startswith('auth_'):
                derived_category = 'auth'
            elif action.startswith('user_'):
                derived_category = 'user'
            elif action.startswith('security_'):
                derived_category = 'security'
            elif action.startswith('system_'):
                derived_category = 'system'
            elif action.startswith('network_'):
                derived_category = 'network'
            elif action == 'api_access':
                derived_category = 'api'
            elif action.startswith('admin_'):
                derived_category = 'admin'
            elif action.startswith('data_'):
                derived_category = 'data'
            else:
                derived_category = 'system'  # Default category
        
        # Skip logging for localhost API access when category is 'api'
        if derived_category == 'api' and ip_address in ['127.0.0.1', 'localhost', '::1']:
            return None
        
        # Skip logging for api_access actions
        if action == 'api_access':
            return None
        
        # Create log record
        log = cls.objects.create(
            user=user,
            category=derived_category, # Use derived_category
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            severity=severity,
            object_type=object_type,
            object_id=object_id,
            object_name=object_name
        )
        
        return log
    
    @classmethod
    def purge_old_logs(cls, retention_days=None):
        """
        Purge logs older than the specified retention period.
        If retention_days is not specified, use the default value from the model.
        """
        if retention_days is None:
            # Get the default retention period from the most recent log
            latest_log = cls.objects.order_by('-timestamp').first()
            if latest_log:
                retention_days = latest_log.retention_days
            else:
                retention_days = 90  # Default if no logs exist
        
        # Calculate the cutoff date
        cutoff_date = timezone.now() - timezone.timedelta(days=retention_days)
        
        # Delete old logs
        deleted_count, _ = cls.objects.filter(timestamp__lt=cutoff_date).delete()
        
        return deleted_count
    
    def __str__(self):
        user_str = self.user.username if self.user else "System/Anonymous"
        action_name = dict(self.ACTION_TYPES).get(self.action, self.action)
        return f"{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {user_str} - {action_name}"
