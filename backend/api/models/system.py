from django.db import models
from django.utils import timezone
from .base import BaseModel


class SystemMetrics(BaseModel):
    """Model for storing system metrics data like CPU, memory, disk usage"""
    timestamp = models.DateTimeField(auto_now_add=True)
    cpu_usage = models.FloatField(help_text="CPU usage percentage")
    memory_usage = models.FloatField(help_text="Memory usage percentage")
    disk_usage = models.FloatField(help_text="Disk usage percentage")
    network_rx = models.FloatField(help_text="Network received (bytes/s)")
    network_tx = models.FloatField(help_text="Network transmitted (bytes/s)")
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "System Metrics"
    
    def __str__(self):
        return f"System Metrics at {self.timestamp}"


class Alert(BaseModel):
    """Model for system alerts and notifications"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source = models.CharField(max_length=100)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.severity.upper()}: {self.title}"


class SystemUptimeEvent(BaseModel):
    """Model for tracking system startup and shutdown events"""
    EVENT_TYPES = [
        ('startup', 'System Startup'),
        ('shutdown', 'System Shutdown'),
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=10, choices=EVENT_TYPES)
    boot_time = models.DateTimeField(null=True, blank=True, help_text="System boot time from psutil")
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "System Uptime Events"
    
    def __str__(self):
        return f"{self.get_event_type_display()} at {self.timestamp}"
    
    @classmethod
    def calculate_uptime_percentage(cls, period_days=365):
        """
        Calculate the uptime percentage over the specified period.
        
        Args:
            period_days (int): Number of days to look back for uptime calculation
            
        Returns:
            float: Uptime percentage (0-100)
        """
        from django.utils import timezone
        from datetime import timedelta
        
        end_time = timezone.now()
        start_time = end_time - timedelta(days=period_days)
        
        # Get all events in the period
        events = cls.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time
        ).order_by('timestamp')
        
        total_period_seconds = period_days * 24 * 60 * 60
        total_uptime_seconds = 0
        
        # If no events, check if system is currently running
        if not events.exists():
            import psutil
            import time
            
            # Calculate uptime from boot time
            boot_time = psutil.boot_time()
            current_uptime = time.time() - boot_time
            uptime_in_period = min(current_uptime, total_period_seconds)
            return (uptime_in_period / total_period_seconds) * 100
        
        # Process events to calculate uptime
        last_startup = None
        
        for event in events:
            if event.event_type == 'startup':
                last_startup = event.timestamp
            elif event.event_type == 'shutdown' and last_startup:
                # Calculate uptime between startup and shutdown
                uptime_duration = (event.timestamp - last_startup).total_seconds()
                total_uptime_seconds += uptime_duration
                last_startup = None
        
        # If last event was a startup and no shutdown, count uptime till now
        if last_startup:
            uptime_duration = (end_time - last_startup).total_seconds()
            total_uptime_seconds += uptime_duration
        
        # Handle case where tracking started in the middle of an uptime period
        # Check if system was already running at the start of our tracking period
        earliest_event = events.first()
        if earliest_event and earliest_event.event_type == 'shutdown':
            # System was running before our tracking period started
            # Add uptime from start of period to first shutdown
            uptime_before_shutdown = (earliest_event.timestamp - start_time).total_seconds()
            total_uptime_seconds += uptime_before_shutdown
        
        return min(100.0, (total_uptime_seconds / total_period_seconds) * 100)


class SecurityStatus(BaseModel):
    """Model for security-related information"""
    timestamp = models.DateTimeField(auto_now_add=True)
    security_score = models.IntegerField(help_text="Overall security score (0-100)")
    vulnerabilities_count = models.IntegerField(default=0)
    last_scan_date = models.DateTimeField()
    firewall_status = models.BooleanField(default=True)
    updates_available = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Security Statuses"
    
    def __str__(self):
        return f"Security Status at {self.timestamp} - Score: {self.security_score}"
