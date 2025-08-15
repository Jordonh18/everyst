"""
Enhanced alert configuration and notification models for the everyst API.
"""
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
import json
from .base import BaseModel

User = get_user_model()


class AlertConfiguration(BaseModel):
    """Model for user-configurable alert rules and conditions"""
    
    METRIC_TYPES = [
        ('cpu', 'CPU Usage'),
        ('memory', 'Memory Usage'),
        ('disk', 'Disk Usage'),
        ('network_rx', 'Network Received'),
        ('network_tx', 'Network Transmitted'),
        ('custom', 'Custom Metric'),
    ]
    
    CONDITION_OPERATORS = [
        ('gt', 'Greater Than'),
        ('gte', 'Greater Than or Equal'),
        ('lt', 'Less Than'),
        ('lte', 'Less Than or Equal'),
        ('eq', 'Equal To'),
        ('ne', 'Not Equal To'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    FREQUENCY_TYPES = [
        ('immediate', 'Immediate'),
        ('throttled', 'Throttled'),
        ('scheduled', 'Scheduled'),
        ('batched', 'Batched'),
    ]
    
    # Basic configuration
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_configurations')
    name = models.CharField(max_length=255, help_text="User-friendly name for this alert")
    description = models.TextField(blank=True, help_text="Optional description")
    enabled = models.BooleanField(default=True)
    
    # Metric and condition configuration
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    custom_metric_name = models.CharField(max_length=100, blank=True, help_text="For custom metrics")
    condition_operator = models.CharField(max_length=10, choices=CONDITION_OPERATORS)
    threshold_value = models.FloatField(help_text="Threshold value to trigger alert")
    
    # Time-based configuration
    time_window_minutes = models.PositiveIntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
        help_text="Time window in minutes to evaluate the condition"
    )
    evaluation_frequency_minutes = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(60)],
        help_text="How often to check this condition"
    )
    
    # Alert properties
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='warning')
    frequency_type = models.CharField(max_length=20, choices=FREQUENCY_TYPES, default='throttled')
    
    # Throttling settings (for frequency_type='throttled')
    throttle_minutes = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
        help_text="Minimum minutes between alerts of this type"
    )
    
    # Scheduling settings (for frequency_type='scheduled')
    schedule_cron = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Cron expression for scheduled alerts"
    )
    
    # Advanced configuration (JSON field for future extensibility)
    advanced_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Advanced configuration options"
    )
    
    # Timestamps
    last_evaluated = models.DateTimeField(null=True, blank=True)
    last_triggered = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Alert Configuration"
        verbose_name_plural = "Alert Configurations"
        indexes = [
            models.Index(fields=['user', 'enabled']),
            models.Index(fields=['metric_type', 'enabled']),
            models.Index(fields=['last_evaluated']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_metric_type_display()})"
    
    def is_throttled(self):
        """Check if this alert is currently throttled"""
        if self.frequency_type != 'throttled' or not self.last_triggered:
            return False
        
        throttle_until = self.last_triggered + timezone.timedelta(minutes=self.throttle_minutes)
        return timezone.now() < throttle_until
    
    def should_evaluate(self):
        """Check if this alert should be evaluated now"""
        if not self.enabled:
            return False
        
        if not self.last_evaluated:
            return True
        
        next_evaluation = self.last_evaluated + timezone.timedelta(minutes=self.evaluation_frequency_minutes)
        return timezone.now() >= next_evaluation
    
    def get_condition_display(self):
        """Human-readable condition description"""
        operator_map = {
            'gt': '>',
            'gte': '>=',
            'lt': '<',
            'lte': '<=',
            'eq': '=',
            'ne': '!='
        }
        operator = operator_map.get(self.condition_operator, self.condition_operator)
        return f"{self.get_metric_type_display()} {operator} {self.threshold_value}"


class AlertDeliveryMethod(BaseModel):
    """Model for configuring how alerts are delivered"""
    
    DELIVERY_TYPES = [
        ('in_app', 'In-App Notification'),
        ('email', 'Email'),
        ('teams', 'Microsoft Teams'),
        ('slack', 'Slack'),
        ('discord', 'Discord'),
        ('webhook', 'Custom Webhook'),
        ('sms', 'SMS'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_methods')
    alert_configuration = models.ForeignKey(
        AlertConfiguration, 
        on_delete=models.CASCADE, 
        related_name='delivery_methods'
    )
    
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPES)
    enabled = models.BooleanField(default=True)
    
    # Configuration for different delivery types (JSON field for flexibility)
    configuration = models.JSONField(
        default=dict,
        help_text="Delivery-specific configuration (e.g., email addresses, webhook URLs)"
    )
    
    # Retry configuration
    max_retries = models.PositiveIntegerField(default=3)
    retry_delay_minutes = models.PositiveIntegerField(default=5)
    
    class Meta:
        ordering = ['delivery_type']
        verbose_name = "Alert Delivery Method"
        verbose_name_plural = "Alert Delivery Methods"
        unique_together = ['alert_configuration', 'delivery_type']
    
    def __str__(self):
        return f"{self.alert_configuration.name} → {self.get_delivery_type_display()}"


class AlertExecution(BaseModel):
    """Model for tracking alert executions and their results"""
    
    EXECUTION_STATUSES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial Success'),
        ('throttled', 'Throttled'),
    ]
    
    alert_configuration = models.ForeignKey(
        AlertConfiguration,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    
    # Execution details
    executed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=EXECUTION_STATUSES)
    
    # Metric values at time of execution
    metric_value = models.FloatField(help_text="The metric value that triggered this alert")
    threshold_value = models.FloatField(help_text="The threshold that was exceeded")
    
    # Delivery results
    delivery_results = models.JSONField(
        default=dict,
        help_text="Results of delivery attempts for each configured method"
    )
    
    # Error information
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-executed_at']
        verbose_name = "Alert Execution"
        verbose_name_plural = "Alert Executions"
        indexes = [
            models.Index(fields=['alert_configuration', 'executed_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.alert_configuration.name} - {self.get_status_display()} at {self.executed_at}"


class UserNotificationPreferences(BaseModel):
    """Model for user-specific notification preferences"""
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='notification_preferences'
    )
    
    # General preferences
    email_notifications_enabled = models.BooleanField(default=True)
    in_app_notifications_enabled = models.BooleanField(default=True)
    push_notifications_enabled = models.BooleanField(default=True)
    
    # Notification timing
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True, help_text="Start of quiet hours")
    quiet_hours_end = models.TimeField(null=True, blank=True, help_text="End of quiet hours")
    
    # Alert severity preferences
    min_severity_email = models.CharField(
        max_length=10,
        choices=AlertConfiguration.SEVERITY_LEVELS,
        default='warning',
        help_text="Minimum severity for email alerts"
    )
    min_severity_push = models.CharField(
        max_length=10,
        choices=AlertConfiguration.SEVERITY_LEVELS,
        default='info',
        help_text="Minimum severity for push notifications"
    )
    
    # Frequency limits
    max_emails_per_hour = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Maximum emails to send per hour"
    )
    max_push_per_hour = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(200)],
        help_text="Maximum push notifications per hour"
    )
    
    # Advanced preferences
    group_similar_alerts = models.BooleanField(
        default=True,
        help_text="Group similar alerts together"
    )
    auto_mark_read_after_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Auto-mark notifications as read after X minutes (0 = disabled)"
    )
    
    class Meta:
        verbose_name = "User Notification Preferences"
        verbose_name_plural = "User Notification Preferences"
    
    def __str__(self):
        return f"Notification preferences for {self.user.username}"
    
    def is_in_quiet_hours(self):
        """Check if current time is within user's quiet hours"""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        now = timezone.now().time()
        start = self.quiet_hours_start
        end = self.quiet_hours_end
        
        if start <= end:
            return start <= now <= end
        else:
            # Quiet hours span midnight
            return now >= start or now <= end


class NotificationHistory(BaseModel):
    """Enhanced model for persistent notification history"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_history')
    
    # Basic notification fields
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    notification_type = models.CharField(
        max_length=20,
        choices=[
            ('info', 'Info'),
            ('success', 'Success'),
            ('warning', 'Warning'),
            ('error', 'Error'),
            ('system', 'System'),
            ('alert', 'Alert'),
        ],
        default='info'
    )
    
    # Status and categorization
    read = models.BooleanField(default=False)
    category = models.CharField(max_length=50, blank=True, help_text="e.g., 'alerts', 'system', 'integrations'")
    source = models.CharField(max_length=100, blank=True, help_text="Source system or component")
    
    # Alert relationship (if this notification came from an alert)
    alert_configuration = models.ForeignKey(
        AlertConfiguration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    alert_execution = models.ForeignKey(
        AlertExecution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Delivery tracking
    delivery_methods = models.JSONField(
        default=list,
        help_text="List of delivery methods used for this notification"
    )
    
    # Additional metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata for the notification"
    )
    
    # Timestamps
    delivered_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-delivered_at']
        verbose_name = "Notification History"
        verbose_name_plural = "Notification History"
        indexes = [
            models.Index(fields=['user', 'read']),
            models.Index(fields=['user', 'delivered_at']),
            models.Index(fields=['category']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.title} → {self.user.username}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=['read', 'read_at'])
